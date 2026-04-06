import * as bookingRepository from './booking.repository';
import * as calendarService from './calendar.service';
import * as emailService from './email.service';
import { CreateBookingRequest, CreateBookingResponse } from './booking.types';
import logger from '../../utils/logger';

export async function createBooking(
  bookingRequest: CreateBookingRequest,
): Promise<CreateBookingResponse> {
  try {
    const meetingTime = new Date(bookingRequest.meeting_time);

    // Check for slot collision before creating the calendar event
    const slotTaken = await bookingRepository.isSlotTaken(meetingTime);
    if (slotTaken) {
      return {
        success: false,
        error: {
          code: 'SLOT_TAKEN',
          message:
            'This time slot has already been booked. Please choose a different time.',
        },
      };
    }

    let meetLink: string;

    try {
      meetLink = await calendarService.generateMeetLink(
        bookingRequest.student_name,
        bookingRequest.email,
        meetingTime,
        bookingRequest.percentile,
        bookingRequest.category,
        bookingRequest.branch_preference,
        bookingRequest.meeting_purpose.trim(),
      );
    } catch (calendarError) {
      logger.error('Failed to generate meeting link', calendarError);
      return {
        success: false,
        error: {
          code: 'CALENDAR_ERROR',
          message: 'Failed to generate meeting link. Please try again.',
        },
      };
    }

    // Insert booking record with meet_link
    const booking = await bookingRepository.createBooking({
      student_name: bookingRequest.student_name,
      email: bookingRequest.email,
      phone: bookingRequest.phone,
      percentile: bookingRequest.percentile,
      category: bookingRequest.category,
      branch_preference: bookingRequest.branch_preference,
      meeting_purpose: bookingRequest.meeting_purpose.trim(),
      meeting_time: meetingTime,
      meet_link: meetLink,
    });

    // Send email in background (truly non-blocking - don't await)
    emailService
      .sendBookingConfirmation({
        studentName: bookingRequest.student_name,
        email: bookingRequest.email,
        meetingTime: meetingTime,
        meetLink: meetLink,
        category: bookingRequest.category,
        branchPreference: bookingRequest.branch_preference,
        meetingPurpose: bookingRequest.meeting_purpose.trim(),
        percentile: bookingRequest.percentile,
      })
      .then((emailSent) => {
        const emailStatus = emailSent ? 'sent' : 'failed';
        bookingRepository
          .updateEmailStatus(booking.id, emailStatus)
          .catch((err) => logger.error('Failed to update email status', err));
        if (!emailSent) {
          logger.warn(`Booking ${booking.id} created but email failed to send`);
        } else {
          logger.info(`Email sent successfully for booking ${booking.id}`);
        }
      })
      .catch((err) => {
        logger.error('Email sending error', err);
      });

    // Return booking_id + meet_link immediately (don't wait for email)
    return {
      success: true,
      message: 'Booking created successfully',
      data: {
        booking_id: booking.id,
        meet_link: meetLink,
      },
    };
  } catch (error) {
    logger.error('Failed to create booking', error);

    return {
      success: false,
      error: {
        code: 'BOOKING_ERROR',
        message: 'Failed to create booking',
      },
    };
  }
}

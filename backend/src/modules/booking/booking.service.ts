import * as bookingRepository from './booking.repository';
import * as calendarService from './calendar.service';
import * as emailService from './email.service';
import { CreateBookingRequest, CreateBookingResponse } from './booking.types';
import logger from '../../utils/logger';

export async function createBooking(
  bookingRequest: CreateBookingRequest,
): Promise<CreateBookingResponse> {
  // Step 1: Validate input
  const validationError = validateBookingRequest(bookingRequest);
  if (validationError) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: validationError,
      },
    };
  }

  try {
    const meetingTime = new Date(bookingRequest.meeting_time);
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

    // Step 3: Insert booking record with meet_link
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

    // Step 4: Send email in background (truly non-blocking - don't await)
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

    // Step 5: Return booking_id + meet_link immediately (don't wait for email)
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

/**
 * Validate booking request
 */
function validateBookingRequest(request: CreateBookingRequest): string | null {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(request.email)) {
    return 'Invalid email format';
  }

  // Validate percentile range
  if (request.percentile < 0 || request.percentile > 100) {
    return 'Percentile must be between 0 and 100';
  }

  // Validate meeting_time is in future
  const meetingTime = new Date(request.meeting_time);
  if (isNaN(meetingTime.getTime())) {
    return 'Invalid meeting time format';
  }

  if (meetingTime < new Date(Date.now() + 3 * 60 * 60 * 1000)) {
    return 'Booking must be made at least 3 hours in advance';
  }

  if (meetingTime > new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)) {
    return 'Booking cannot be scheduled more than 90 days in advance';
  }

  // Validate required fields
  if (
    !request.student_name ||
    !request.phone ||
    !request.category ||
    !request.branch_preference ||
    !request.meeting_purpose?.trim()
  ) {
    return 'All fields are required';
  }

  if (request.meeting_purpose.trim().length < 3) {
    return 'Purpose of meeting must be at least 3 characters';
  }

  return null;
}

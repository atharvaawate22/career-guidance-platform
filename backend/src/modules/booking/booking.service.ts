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
    // Step 2: Generate Google Meet link
    const meetingTime = new Date(bookingRequest.meeting_time);
    const meetLink = await calendarService.generateMeetLink(
      bookingRequest.student_name,
      bookingRequest.email,
      meetingTime,
      bookingRequest.percentile,
      bookingRequest.category,
      bookingRequest.branch_preference,
    );

    // Step 3: Insert booking record with meet_link
    const booking = await bookingRepository.createBooking({
      student_name: bookingRequest.student_name,
      email: bookingRequest.email,
      phone: bookingRequest.phone,
      percentile: bookingRequest.percentile,
      category: bookingRequest.category,
      branch_preference: bookingRequest.branch_preference,
      meeting_time: meetingTime,
      meet_link: meetLink,
    });

    // Step 4: Attempt email send (non-blocking)
    const emailSent = await emailService.sendBookingConfirmation({
      studentName: bookingRequest.student_name,
      email: bookingRequest.email,
      meetingTime: meetingTime,
      meetLink: meetLink,
      category: bookingRequest.category,
      branchPreference: bookingRequest.branch_preference,
      percentile: bookingRequest.percentile,
    });

    // Step 5: Update email status
    const emailStatus = emailSent ? 'sent' : 'failed';
    await bookingRepository.updateEmailStatus(booking.id, emailStatus);

    if (!emailSent) {
      logger.info(`Booking ${booking.id} created but email failed to send`);
    }

    // Step 6: Return booking_id + meet_link
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

    // If calendar fails, reject booking
    if (error instanceof Error && error.message.includes('meet link')) {
      return {
        success: false,
        error: {
          code: 'CALENDAR_ERROR',
          message: 'Failed to generate meeting link. Please try again.',
        },
      };
    }

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

  if (meetingTime <= new Date()) {
    return 'Meeting time must be in the future';
  }

  // Validate required fields
  if (
    !request.student_name ||
    !request.phone ||
    !request.category ||
    !request.branch_preference
  ) {
    return 'All fields are required';
  }

  return null;
}

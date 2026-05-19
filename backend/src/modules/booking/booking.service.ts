import * as bookingRepository from './booking.repository';
import * as calendarService from './calendar.service';
import * as emailService from './email.service';
import { CreateBookingRequest, CreateBookingResponse } from './booking.types';
import logger from '../../utils/logger';

function isPgUniqueViolation(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  return (
    'code' in error &&
    (error as { code?: string }).code === '23505'
  );
}

/** Returns true if the date falls on a Saturday (6) or Sunday (0) in IST. */
function isWeekend(date: Date): boolean {
  // Convert UTC to IST (+05:30 = 330 minutes) for day-of-week check
  const istOffset = 5.5 * 60 * 60 * 1000;
  const dayIST = new Date(date.getTime() + istOffset).getUTCDay();
  return dayIST === 0 || dayIST === 6;
}

export async function createBooking(
  bookingRequest: CreateBookingRequest,
): Promise<CreateBookingResponse> {
  try {
    const meetingTime = new Date(bookingRequest.meeting_time);

    // ── Guard: weekends are not available ────────────────────────────────────
    if (isWeekend(meetingTime)) {
      return {
        success: false,
        error: {
          code: 'SLOT_UNAVAILABLE',
          message: 'Sessions are only available Monday to Friday. Please choose a weekday.',
        },
      };
    }

    // ── Guard: no duplicate active booking for same email ────────────────────
    const existing = await bookingRepository.getExistingActiveBookingByEmail(
      bookingRequest.email,
    );
    if (existing) {
      const bookedDate = existing.meeting_time.toLocaleDateString('en-IN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        timeZone: 'Asia/Kolkata',
      });
      const bookedTime = existing.meeting_time.toLocaleTimeString('en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true,
        timeZone: 'Asia/Kolkata',
      });
      return {
        success: false,
        error: {
          code: 'DUPLICATE_BOOKING',
          message: `You already have a session booked on ${bookedDate} at ${bookedTime} IST. Please cancel it before booking a new one.`,
        },
      };
    }

    // ── Step 1: Insert into DB first ─────────────────────────────────────────
    // We create the booking row before generating a Google Meet link so that
    // a DB failure (e.g. duplicate time slot) does not leave an orphaned
    // calendar event with no corresponding booking record.
    let booking;
    try {
      booking = await bookingRepository.createBooking({
        student_name: bookingRequest.student_name,
        email: bookingRequest.email,
        phone: bookingRequest.phone,
        percentile: bookingRequest.percentile,
        category: bookingRequest.category,
        branch_preference: bookingRequest.branch_preference,
        meeting_purpose: bookingRequest.meeting_purpose.trim(),
        meeting_time: meetingTime,
        // Placeholder; will be updated below after the Meet link is generated.
        meet_link: '',
      });
    } catch (error) {
      if (isPgUniqueViolation(error)) {
        return {
          success: false,
          error: {
            code: 'SLOT_TAKEN',
            message:
              'This time slot was just booked by someone else. Please choose a different time.',
          },
        };
      }
      throw error;
    }

    // ── Step 2: Generate Google Meet link ────────────────────────────────────
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
      // Calendar failed but the booking exists in DB.
      // Return success:true with a warning — the admin can add the Meet link manually.
      return {
        success: true,
        warning: 'Your session is booked! A Meet link could not be generated automatically — our team will send it to your email within a few hours.',
        data: {
          booking_id: booking.id,
          meet_link: null,
          student_name: bookingRequest.student_name,
          meeting_time: bookingRequest.meeting_time,
        },
      };
    }

    // ── Step 3: Persist the Meet link back to the booking row ────────────────
    await bookingRepository.updateMeetLink(booking.id, meetLink);

    // Email is fire-and-forget; failures are logged but do NOT affect the
    // HTTP response. The client receives the meet link immediately.
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

    return {
      success: true,
      message: 'Booking created successfully',
      data: {
        booking_id: booking.id,
        meet_link: meetLink,
        student_name: bookingRequest.student_name,
        meeting_time: bookingRequest.meeting_time,
      },
    };
  } catch (error) {
    logger.error('Failed to create booking', error);

    return {
      success: false,
      error: {
        code: 'BOOKING_ERROR',
        message: 'Something went wrong while creating your booking. Please try again.',
      },
    };
  }
}

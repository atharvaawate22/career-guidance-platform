import { query } from '../../config/database';
import { Booking } from './booking.types';

export async function createBooking(bookingData: {
  student_name: string;
  email: string;
  phone: string;
  percentile: number;
  category: string;
  branch_preference: string;
  meeting_time: Date;
  meet_link: string;
}): Promise<Booking> {
  const result = await query(
    `INSERT INTO bookings 
    (student_name, email, phone, percentile, category, branch_preference, meeting_time, meet_link) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
    RETURNING id, student_name, email, phone, percentile, category, branch_preference, meeting_time, meet_link, booking_status, email_status, created_at`,
    [
      bookingData.student_name,
      bookingData.email,
      bookingData.phone,
      bookingData.percentile,
      bookingData.category,
      bookingData.branch_preference,
      bookingData.meeting_time,
      bookingData.meet_link,
    ],
  );
  return result.rows[0];
}

export async function updateEmailStatus(
  bookingId: string,
  status: string,
): Promise<void> {
  await query('UPDATE bookings SET email_status = $1 WHERE id = $2', [
    status,
    bookingId,
  ]);
}

export async function getAllBookings(): Promise<Booking[]> {
  const result = await query(
    `SELECT id, student_name, email, phone, percentile, category, branch_preference, meeting_time, meet_link, booking_status, email_status, created_at 
    FROM bookings 
    ORDER BY meeting_time DESC`,
  );
  return result.rows;
}

export async function updateBookingStatus(
  bookingId: string,
  status: string,
): Promise<void> {
  await query('UPDATE bookings SET booking_status = $1 WHERE id = $2', [
    status,
    bookingId,
  ]);
}

export async function deleteBooking(bookingId: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM bookings WHERE id = $1 RETURNING id',
    [bookingId],
  );
  return result.rows.length > 0;
}

/**
 * Returns booked HH:MM slot strings (IST) for a given date (YYYY-MM-DD, IST).
 * Only counts confirmed/pending bookings (not cancelled/no_show).
 */
export async function getBookedSlotsForDate(
  dateIST: string,
): Promise<string[]> {
  const result = await query(
    `SELECT TO_CHAR((meeting_time AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata', 'HH24:MI') AS slot
     FROM bookings
     WHERE DATE((meeting_time AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata') = $1
       AND booking_status NOT IN ('cancelled', 'no_show')`,
    [dateIST],
  );
  return result.rows.map((r: { slot: string }) => r.slot);
}

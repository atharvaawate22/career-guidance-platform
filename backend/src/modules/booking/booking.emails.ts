import { Booking } from './booking.types';

export interface BookingEmailTemplate {
  subject: string;
  html: string;
  text: string;
}

const bookingUrl = () =>
  `${process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'https://career-guidance-platform-gilt.vercel.app'}/book`;

const formatSessionTime = (meetingTime: Date) => {
  const date = meetingTime.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
  const time = meetingTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
  return { date, time };
};

export function bookingCancellationEmail(
  booking: Booking,
  reason?: string,
): BookingEmailTemplate {
  const { date, time } = formatSessionTime(new Date(booking.meeting_time));
  const rebookUrl = bookingUrl();
  const reasonText = reason?.trim()
    ? `\nReason: ${reason.trim()}\n`
    : '';

  return {
    subject: 'Consultation Session Cancelled - CET Hub',
    text: `
Dear ${booking.student_name},

Your CET Hub consultation session has been cancelled.

Cancelled session:
Date: ${date}
Time: ${time}
${reasonText}
You can book another available slot here:
${rebookUrl}

Regards,
CET Hub Team
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <h1 style="color: #b91c1c;">Consultation Session Cancelled</h1>
    <p>Dear <strong>${booking.student_name}</strong>,</p>
    <p>Your CET Hub consultation session has been cancelled.</p>
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Time:</strong> ${time}</p>
      ${reason?.trim() ? `<p><strong>Reason:</strong> ${reason.trim()}</p>` : ''}
    </div>
    <p>You can book another available slot whenever needed.</p>
    <p><a href="${rebookUrl}" style="display: inline-block; background: #0f172a; color: #ffffff; padding: 12px 18px; border-radius: 6px; text-decoration: none;">Book a New Session</a></p>
    <p>Regards,<br><strong>CET Hub Team</strong></p>
  </div>
</body>
</html>
    `.trim(),
  };
}

export function bookingRescheduledEmail(
  booking: Booking,
): BookingEmailTemplate {
  const { date, time } = formatSessionTime(new Date(booking.meeting_time));

  return {
    subject: 'Consultation Session Rescheduled - CET Hub',
    text: `
Dear ${booking.student_name},

Your CET Hub consultation session has been rescheduled.

New session details:
Date: ${date}
Time: ${time}
Google Meet: ${booking.meet_link || 'Our team will share the Meet link separately.'}

Please join at the updated time.

Regards,
CET Hub Team
    `.trim(),
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <h1 style="color: #0f766e;">Consultation Session Rescheduled</h1>
    <p>Dear <strong>${booking.student_name}</strong>,</p>
    <p>Your CET Hub consultation session has been rescheduled.</p>
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px;">
      <p><strong>New date:</strong> ${date}</p>
      <p><strong>New time:</strong> ${time}</p>
      <p><strong>Google Meet:</strong> ${
        booking.meet_link
          ? `<a href="${booking.meet_link}">${booking.meet_link}</a>`
          : 'Our team will share the Meet link separately.'
      }</p>
    </div>
    <p>Please join at the updated time.</p>
    <p>Regards,<br><strong>CET Hub Team</strong></p>
  </div>
</body>
</html>
    `.trim(),
  };
}

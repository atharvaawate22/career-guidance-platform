import logger from '../../utils/logger';
import nodemailer from 'nodemailer';

interface BookingConfirmation {
  studentName: string;
  email: string;
  meetingTime: Date;
  meetLink: string;
  category: string;
  branchPreference: string;
  percentile: number;
}

/**
 * Send booking confirmation email
 *
 * Supports SMTP (Gmail, etc.) and mock mode for development
 *
 * Required env vars:
 * - EMAIL_PROVIDER (smtp or mock)
 * - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM (if using smtp)
 *
 * @returns true if email sent successfully, false otherwise
 */
export async function sendBookingConfirmation(
  booking: BookingConfirmation,
): Promise<boolean> {
  try {
    const emailProvider = process.env.EMAIL_PROVIDER || 'mock';

    logger.info(
      `Sending booking confirmation to ${booking.email} via ${emailProvider}`,
    );

    if (emailProvider === 'mock') {
      // Mock email sending for development
      logger.info('EMAIL_PROVIDER not configured, using mock email service');
      logger.info(`Mock email sent to ${booking.email}:`);
      logger.info(`  Subject: Consultation Booking Confirmed`);
      logger.info(`  Meeting Time: ${booking.meetingTime.toLocaleString()}`);
      logger.info(`  Meet Link: ${booking.meetLink}`);
      return true;
    }

    // Send actual email based on provider
    if (emailProvider === 'smtp') {
      return await sendViaSMTP(booking);
    }

    logger.warn(`Unknown EMAIL_PROVIDER: ${emailProvider}, using mock instead`);
    return true;
  } catch (error) {
    logger.error('Failed to send booking confirmation email', error);
    return false;
  }
}

/**
 * Format email content
 */
function formatEmailContent(booking: BookingConfirmation): string {
  const date = booking.meetingTime.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const time = booking.meetingTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
Dear ${booking.studentName},

Your consultation booking has been confirmed!

Booking Details:
----------------
Date: ${date}
Time: ${time}
Duration: 30 minutes

Category: ${booking.category}
Branch Preference: ${booking.branchPreference}
Your Percentile: ${booking.percentile}

Google Meet Link:
${booking.meetLink}

Please join the meeting at the scheduled time using the link above.

Important Notes:
- Keep your percentile card ready for reference
- Prepare any specific questions about admissions
- The counselor will guide you through college options

Best regards,
MHT CET Guidance Team
  `.trim();
}

/**
 * Format email content as HTML
 */
function formatEmailHTML(booking: BookingConfirmation): string {
  const date = booking.meetingTime.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const time = booking.meetingTime.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .detail-row { margin: 10px 0; }
    .label { font-weight: bold; color: #667eea; }
    .meet-link { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .notes { background: #fff3cd; padding: 15px; border-left: 4px solid #ffc107; margin: 20px 0; }
    .footer { text-align: center; color: #666; margin-top: 20px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Booking Confirmed!</h1>
    </div>
    <div class="content">
      <p>Dear <strong>${booking.studentName}</strong>,</p>
      <p>Your consultation booking has been confirmed!</p>
      
      <div class="details">
        <h3>Booking Details</h3>
        <div class="detail-row"><span class="label">Date:</span> ${date}</div>
        <div class="detail-row"><span class="label">Time:</span> ${time}</div>
        <div class="detail-row"><span class="label">Duration:</span> 30 minutes</div>
        <hr style="margin: 15px 0; border: none; border-top: 1px solid #eee;">
        <div class="detail-row"><span class="label">Category:</span> ${booking.category}</div>
        <div class="detail-row"><span class="label">Branch Preference:</span> ${booking.branchPreference}</div>
        <div class="detail-row"><span class="label">Your Percentile:</span> ${booking.percentile}</div>
      </div>
      
      <div style="text-align: center;">
        <a href="${booking.meetLink}" class="meet-link">Join Google Meet</a>
      </div>
      
      <div class="notes">
        <strong>Important Notes:</strong>
        <ul>
          <li>Keep your percentile card ready for reference</li>
          <li>Prepare any specific questions about admissions</li>
          <li>The counselor will guide you through college options</li>
        </ul>
      </div>
      
      <p>If you need to reschedule, please contact us.</p>
      
      <p>Best regards,<br><strong>MHT CET Guidance Team</strong></p>
    </div>
    <div class="footer">
      <p>This is an automated email. Please do not reply to this message.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Send email via SMTP
 */
async function sendViaSMTP(booking: BookingConfirmation): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // Use TLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailContent = formatEmailContent(booking);

    // Verify connection before sending
    await transporter.verify();
    logger.info('SMTP connection verified successfully');

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: booking.email,
      subject: '✅ Consultation Booking Confirmed - MHT CET Guidance',
      text: mailContent,
      html: formatEmailHTML(booking),
    });

    logger.info(`✓ Email sent successfully to ${booking.email} via SMTP`);
    return true;
  } catch (error) {
    logger.error(`✗ SMTP email failed to ${booking.email}:`, {
      message: (error as any)?.message,
      code: (error as any)?.code,
      response: (error as any)?.response,
      responseCode: (error as any)?.responseCode,
    });
    return false;
  }
}

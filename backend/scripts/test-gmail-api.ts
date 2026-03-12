import dotenv from 'dotenv';
dotenv.config();
import { google } from 'googleapis';

async function test() {
  console.log('Testing Gmail API...');
  console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? '✓ set' : '✗ missing');
  console.log('GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? '✓ set' : '✗ missing');
  console.log('GOOGLE_REFRESH_TOKEN:', process.env.GOOGLE_REFRESH_TOKEN ? '✓ set' : '✗ missing');
  console.log('EMAIL_PROVIDER:', process.env.EMAIL_PROVIDER);
  console.log('SMTP_FROM:', process.env.SMTP_FROM);
  console.log('');

  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

  const gmail = google.gmail({ version: 'v1', auth });
  const from = process.env.SMTP_FROM || process.env.GOOGLE_CALENDAR_ID || '';
  const to = from; // send to self as test

  const messageParts = [
    `From: MHT CET Guidance <${from}>`,
    `To: ${to}`,
    `Subject: Test email - MHT CET Gmail API`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    'This is a test email from the Gmail API. If you received this, email sending is working!',
  ];
  const raw = Buffer.from(messageParts.join('\r\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  try {
    const result = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
    console.log('✅ SUCCESS: Email sent! Message ID:', result.data.id);
  } catch (e: any) {
    console.error('❌ FAILED:', e.message);
    console.error('Details:', JSON.stringify(e.errors || e.response?.data, null, 2));
  }
}

test();

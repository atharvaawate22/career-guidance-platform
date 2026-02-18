/**
 * Test Email Service
 *
 * This script tests if your email configuration is working.
 *
 * USAGE:
 * 1. Configure SMTP settings in .env
 * 2. Run: npx ts-node scripts/test-email.ts
 */

import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

async function testEmailService() {
  console.log('\n========================================');
  console.log('Testing Email Service Configuration');
  console.log('========================================\n');

  // Check if credentials are set
  const requiredVars = [
    'EMAIL_PROVIDER',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
    'SMTP_FROM',
  ];

  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    console.error('❌ Missing environment variables:');
    missing.forEach((varName) => console.error(`   - ${varName}`));
    console.error('\nPlease configure SMTP settings in .env file.');
    process.exit(1);
  }

  console.log('✓ All environment variables are set\n');
  console.log('Configuration:');
  console.log(`  Provider: ${process.env.EMAIL_PROVIDER}`);
  console.log(`  SMTP Host: ${process.env.SMTP_HOST}`);
  console.log(`  SMTP Port: ${process.env.SMTP_PORT}`);
  console.log(`  SMTP User: ${process.env.SMTP_USER}`);
  console.log(`  SMTP From: ${process.env.SMTP_FROM}`);
  console.log('\nTesting SMTP connection...\n');

  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // Use TLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify connection
    await transporter.verify();
    console.log('✓ SMTP connection successful\n');

    // Send test email
    console.log('Sending test email...');
    const testRecipient = process.env.SMTP_USER; // Send to yourself

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: testRecipient,
      subject: 'Test Email - MHT CET Platform',
      text: `This is a test email from your MHT CET Career Guidance Platform.

If you received this email, your email service is configured correctly!

Configuration:
- SMTP Host: ${process.env.SMTP_HOST}
- SMTP Port: ${process.env.SMTP_PORT}
- From: ${process.env.SMTP_FROM}

Date: ${new Date().toLocaleString()}`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .success { background: #d4edda; color: #155724; padding: 15px; border-radius: 5px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Test Email Successful!</h1>
    </div>
    <div class="content">
      <div class="success">
        <strong>Success!</strong> If you received this email, your email service is configured correctly.
      </div>
      <h3>Configuration Details:</h3>
      <ul>
        <li><strong>SMTP Host:</strong> ${process.env.SMTP_HOST}</li>
        <li><strong>SMTP Port:</strong> ${process.env.SMTP_PORT}</li>
        <li><strong>From:</strong> ${process.env.SMTP_FROM}</li>
      </ul>
      <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      <p>Your MHT CET Career Guidance Platform is ready to send booking confirmations!</p>
    </div>
  </div>
</body>
</html>`,
    });

    console.log(`✓ Test email sent successfully to ${testRecipient}\n`);
    console.log('========================================');
    console.log('✅ ALL TESTS PASSED!');
    console.log('========================================\n');
    console.log('Your email service is configured correctly.');
    console.log('Booking confirmations will be sent via SMTP.\n');
    console.log('Check your inbox for the test email!');
  } catch (error: any) {
    console.error('\n❌ Email test failed:', error.message);
    console.error('\nCommon issues:');
    console.error(
      '1. Incorrect App Password (must be 16 characters without spaces)',
    );
    console.error('2. 2-Step Verification not enabled on Google account');
    console.error(
      '3. "Less secure app access" needs to be enabled (for older accounts)',
    );
    console.error('4. Network/firewall blocking SMTP connection');
    console.error('\nVerify your settings and try again.');
    process.exit(1);
  }
}

testEmailService();

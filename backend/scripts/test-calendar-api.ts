/**
 * Test Google Calendar API Integration
 * 
 * This script tests if your Google Calendar API credentials are working.
 * 
 * USAGE:
 * 1. Complete the setup in GOOGLE_CALENDAR_SETUP.md
 * 2. Update .env with real credentials
 * 3. Run: npx ts-node scripts/test-calendar-api.ts
 */

import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

async function testCalendarAPI() {
  console.log('\n========================================');
  console.log('Testing Google Calendar API');
  console.log('========================================\n');

  // Check if credentials are set
  const requiredVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_REDIRECT_URI',
    'GOOGLE_REFRESH_TOKEN',
  ];

  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    console.error('❌ Missing environment variables:');
    missing.forEach((varName) => console.error(`   - ${varName}`));
    console.error('\nPlease complete the setup steps first.');
    process.exit(1);
  }

  console.log('✓ All environment variables are set\n');
  console.log('Testing API connection...\n');

  try {
    // Initialize OAuth2 client
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );

    auth.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
    });

    // Test 1: List calendars
    const calendar = google.calendar({ version: 'v3', auth });
    console.log('Test 1: Fetching calendar list...');
    
    const calendarList = await calendar.calendarList.list();
    const primaryCalendar = calendarList.data.items?.find(
      (cal) => cal.id === process.env.GOOGLE_CALENDAR_ID || cal.id === 'primary',
    );

    if (!primaryCalendar) {
      console.error('❌ Could not find target calendar');
      process.exit(1);
    }

    console.log(`✓ Calendar found: ${primaryCalendar.summary}`);
    console.log(`  Calendar ID: ${primaryCalendar.id}\n`);

    // Test 2: Create a test event with Meet link
    console.log('Test 2: Creating test event with Google Meet link...');
    
    const testDate = new Date();
    testDate.setDate(testDate.getDate() + 7); // 1 week from now

    const event = {
      summary: 'Test Event - Calendar API Integration',
      description: 'This is a test event created by the booking system',
      start: {
        dateTime: testDate.toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: new Date(testDate.getTime() + 30 * 60000).toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      conferenceData: {
        createRequest: {
          requestId: `test-${Date.now()}`,
          conferenceSolutionKey: {
            type: 'hangoutsMeet',
          },
        },
      },
    };

    const createdEvent = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      conferenceDataVersion: 1,
      requestBody: event,
    });

    if (!createdEvent.data.hangoutLink) {
      console.error('❌ Event created but no Meet link generated');
      console.error('   This might be a permissions issue.');
      process.exit(1);
    }

    console.log('✓ Test event created successfully!');
    console.log(`  Event ID: ${createdEvent.data.id}`);
    console.log(`  Meet Link: ${createdEvent.data.hangoutLink}`);
    console.log(`  Event Link: ${createdEvent.data.htmlLink}\n`);

    // Test 3: Delete the test event
    console.log('Test 3: Cleaning up test event...');
    
    await calendar.events.delete({
      calendarId: process.env.GOOGLE_CALENDAR_ID || 'primary',
      eventId: createdEvent.data.id!,
    });

    console.log('✓ Test event deleted\n');

    // Success summary
    console.log('========================================');
    console.log('✅ ALL TESTS PASSED!');
    console.log('========================================\n');
    console.log('Your Google Calendar API is configured correctly.');
    console.log('The booking system will now create real Google Meet links.\n');
    console.log('Next steps:');
    console.log('1. Restart your backend server');
    console.log('2. Test by creating a booking via the API');
    console.log('3. Check your Google Calendar for the event\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED\n');
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      
      if (error.message.includes('invalid_grant')) {
        console.error('\nYour refresh token is invalid or expired.');
        console.error('Get a new refresh token:');
        console.error('  Option 1: Use OAuth2 Playground');
        console.error('  Option 2: Run: npx ts-node scripts/get-refresh-token.ts\n');
      } else if (error.message.includes('API has not been used')) {
        console.error('\nGoogle Calendar API is not enabled.');
        console.error('Enable it at: https://console.cloud.google.com/apis/library\n');
      } else if (error.message.includes('insufficient permission')) {
        console.error('\nInsufficient permissions.');
        console.error('Make sure you added the Calendar API scopes in OAuth consent screen.\n');
      }
    } else {
      console.error('Unexpected error:', error);
    }
    
    process.exit(1);
  }
}

testCalendarAPI();

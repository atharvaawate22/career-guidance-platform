import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config();

async function listCalendars() {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );

  auth.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  const calendar = google.calendar({ version: 'v3', auth });

  console.log('Fetching your calendars...\n');
  const calendarList = await calendar.calendarList.list();

  console.log('Available calendars:');
  console.log('===================\n');

  calendarList.data.items?.forEach((cal, index) => {
    console.log(`${index + 1}. ${cal.summary}`);
    console.log(`   ID: ${cal.id}`);
    console.log(`   Primary: ${cal.primary || false}`);
    console.log();
  });

  const primary = calendarList.data.items?.find((cal) => cal.primary);
  if (primary) {
    console.log(`\n✓ Your primary calendar ID is: ${primary.id}`);
    console.log(`  Use this in .env: GOOGLE_CALENDAR_ID=${primary.id}`);
  }
}

listCalendars().catch(console.error);

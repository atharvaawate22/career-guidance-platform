/**
 * Google OAuth2 Refresh Token Generator
 * 
 * This script helps you get a refresh token for Google Calendar API.
 * 
 * USAGE:
 * 1. Set your GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env
 * 2. Run: npx ts-node scripts/get-refresh-token.ts
 * 3. Follow the URL printed in console
 * 4. Authorize the app
 * 5. Copy the code from the URL
 * 6. Paste it back in the terminal
 * 7. Copy the refresh token to your .env file
 */

import { google } from 'googleapis';
import * as readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/auth/google/callback',
);

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
];

async function getRefreshToken() {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('❌ Error: GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in .env');
    console.error('   Please follow steps 1-4 in GOOGLE_CALENDAR_SETUP.md first');
    process.exit(1);
  }

  // Generate auth URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent', // Force consent screen to get refresh token
  });

  console.log('\n========================================');
  console.log('Google Calendar OAuth2 Setup');
  console.log('========================================\n');
  console.log('Step 1: Open this URL in your browser:\n');
  console.log(authUrl);
  console.log('\n');
  console.log('Step 2: Authorize the application');
  console.log('Step 3: Copy the code from the redirect URL\n');
  console.log('Note: You will be redirected to http://localhost:5000/auth/google/callback?code=...');
  console.log('      Copy everything after "code=" from the URL\n');
  console.log('========================================\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Paste the authorization code here: ', async (code) => {
    rl.close();

    try {
      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.refresh_token) {
        console.error('\n❌ Error: No refresh token received.');
        console.error('   This might happen if you\'ve authorized before.');
        console.error('   Try revoking access at: https://myaccount.google.com/permissions');
        console.error('   Then run this script again.');
        process.exit(1);
      }

      console.log('\n✅ Success! Your credentials:\n');
      console.log('========================================');
      console.log('Add these to your backend/.env file:');
      console.log('========================================\n');
      console.log(`GOOGLE_CLIENT_ID=${process.env.GOOGLE_CLIENT_ID}`);
      console.log(`GOOGLE_CLIENT_SECRET=${process.env.GOOGLE_CLIENT_SECRET}`);
      console.log(`GOOGLE_REDIRECT_URI=${process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/auth/google/callback'}`);
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log(`GOOGLE_CALENDAR_ID=primary`);
      console.log('\n========================================\n');
      console.log('⚠️  IMPORTANT: Keep your refresh token secret!');
      console.log('   Never commit it to version control.\n');
    } catch (error) {
      console.error('\n❌ Error getting tokens:', error);
      console.error('\nMake sure:');
      console.error('1. You copied the entire code from the URL');
      console.error('2. Your redirect URI matches exactly in Google Cloud Console');
      console.error('3. You completed the authorization in the browser');
      process.exit(1);
    }
  });
}

getRefreshToken();

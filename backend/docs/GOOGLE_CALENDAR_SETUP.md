# Google Calendar API Setup Guide

This guide will help you configure Google Calendar API with OAuth2 for automated Google Meet link generation.

## Prerequisites
- ✅ `googleapis` package installed (already done)
- ✅ Environment variables added to `.env` (already done)
- ✅ Production code uncommented in `calendar.service.ts` (already done)

## Manual Steps Required

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Enter project name: `MHT-CET-Guidance-Platform`
4. Click **"Create"**
5. Wait for project creation (you'll see a notification)

### Step 2: Enable Google Calendar API

1. In the Google Cloud Console, make sure your project is selected
2. Go to **"APIs & Services"** → **"Library"**
3. Search for **"Google Calendar API"**
4. Click on it and click **"Enable"**
5. Wait for API to be enabled

### Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services"** → **"OAuth consent screen"**
2. Select **"External"** (unless you have a Google Workspace)
3. Click **"Create"**

**Fill in the required fields:**
- **App name**: `MHT CET Guidance Platform`
- **User support email**: Your email address
- **Developer contact email**: Your email address

4. Click **"Save and Continue"**
5. On **"Scopes"** page, click **"Add or Remove Scopes"**
6. Search and select:
   - `.../auth/calendar` (See, edit, share, and permanently delete all calendars)
   - `.../auth/calendar.events` (View and edit events on all calendars)
7. Click **"Update"** → **"Save and Continue"**
8. On **"Test users"** page, click **"Add Users"**
9. Add your Gmail address (the one that will create calendar events)
10. Click **"Save and Continue"** → **"Back to Dashboard"**

### Step 4: Create OAuth2 Credentials

1. Go to **"APIs & Services"** → **"Credentials"**
2. Click **"Create Credentials"** → **"OAuth client ID"**
3. Select **"Web application"**
4. **Name**: `Career Guidance Booking System`

**Configure redirect URIs:**
- Under **"Authorized redirect URIs"**, click **"Add URI"**
- Enter: `http://localhost:5000/auth/google/callback`
- Click **"Create"**

5. A dialog will appear with your credentials:
   - **Client ID**: Copy this (looks like: `123456789-abc...xyz.apps.googleusercontent.com`)
   - **Client Secret**: Copy this (looks like: `GOCSPX-abc...xyz`)
   - Keep this dialog open or download the JSON

### Step 5: Get Refresh Token

This is the most complex step. You need to get a refresh token by going through OAuth flow once.

**Option A: Use OAuth2 Playground (Recommended)**

1. Go to [OAuth2 Playground](https://developers.google.com/oauthplayground/)
2. Click the **⚙️ (settings icon)** in top right
3. Check **"Use your own OAuth credentials"**
4. Enter:
   - **OAuth Client ID**: Paste your Client ID from Step 4
   - **OAuth Client secret**: Paste your Client Secret from Step 4
5. Click **"Close"**
6. In left sidebar under **"Step 1"**, scroll to find **"Calendar API v3"**
7. Expand it and check:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
8. Click **"Authorize APIs"**
9. Sign in with your Google account (the one added as test user)
10. Click **"Allow"** on all permission requests
11. You'll be redirected back to playground
12. Click **"Exchange authorization code for tokens"**
13. Copy the **"Refresh token"** (looks like: `1//0abc...xyz`)
    - ⚠️ **IMPORTANT**: Save this immediately, you won't see it again!

**Option B: Programmatic Method (Advanced)**

If you prefer, I can create a separate script to get the refresh token programmatically.

### Step 6: Update Environment Variables

1. Open `backend/.env` file
2. Replace the placeholder values with your actual credentials:

```env
GOOGLE_CLIENT_ID=123456789-abc...xyz.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc...xyz
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback
GOOGLE_REFRESH_TOKEN=1//0abc...xyz
GOOGLE_CALENDAR_ID=primary
```

**Notes:**
- `GOOGLE_CALENDAR_ID=primary` uses your primary calendar
- To use a different calendar, go to Google Calendar → Settings → Find the calendar → Copy the Calendar ID

### Step 7: Test the Integration

1. Restart your backend server:
   ```powershell
   Stop-Process -Name node -Force -ErrorAction SilentlyContinue
   cd backend
   npm run dev
   ```

2. Test booking creation:
   ```powershell
   $futureTime = (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss")
   $bookingBody = @{
     student_name = "Test Student"
     email = "test@example.com"
     phone = "+91 9876543210"
     percentile = 95.5
     category = "OPEN"
     branch_preference = "Computer Engineering"
     meeting_time = $futureTime
   } | ConvertTo-Json
   
   Invoke-RestMethod -Uri "http://localhost:5000/api/bookings" -Method POST -ContentType "application/json" -Body $bookingBody
   ```

3. Check your Google Calendar - you should see the event with a Meet link!

## Troubleshooting

### "Invalid grant" error
- Your refresh token expired or is invalid
- Go back to OAuth2 Playground and get a new refresh token

### "Access not configured" error
- Google Calendar API is not enabled
- Go back to Step 2 and enable it

### "Redirect URI mismatch" error
- The redirect URI in your code doesn't match the one in Google Cloud Console
- Make sure `http://localhost:5000/auth/google/callback` is exactly in your authorized redirect URIs

### "Calendar API has not been used" error
- Wait 1-2 minutes after enabling the API
- Try again

### "Insufficient permission" error
- You didn't add the correct scopes
- Go back to Step 3 and add the calendar scopes

## Security Notes

⚠️ **IMPORTANT**: Never commit your `.env` file to version control!

- The `.env` file is already in `.gitignore`
- Refresh tokens are sensitive - treat them like passwords
- In production:
  - Use environment variables from your hosting platform
  - Rotate credentials regularly
  - Use a service account instead of user OAuth for server-to-server

## Production Checklist

Before deploying to production:

- [ ] Update `GOOGLE_REDIRECT_URI` to your production domain
- [ ] Add production redirect URI to Google Cloud Console
- [ ] Change OAuth consent screen from "Testing" to "Published"
- [ ] Remove test users restrictions (or switch to internal if Google Workspace)
- [ ] Consider using a service account for better security
- [ ] Set up monitoring for API quota limits
- [ ] Enable billing on Google Cloud (Calendar API is free for moderate use)

## Current Status

✅ **Completed Automatically:**
- Environment variables template created
- Production code uncommented
- TypeScript types configured
- Error handling implemented

⚠️ **Requires Manual Setup:**
- Google Cloud Console project creation
- OAuth2 credentials generation
- Refresh token retrieval
- Environment variable values

Once you complete the manual steps, your application will automatically create real Google Meet links for bookings!

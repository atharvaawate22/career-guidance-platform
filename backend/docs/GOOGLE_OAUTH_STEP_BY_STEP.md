# Google Cloud Console - OAuth Setup Guide

Complete step-by-step guide to configure Google Calendar API OAuth2 credentials.

---

## Prerequisites

✅ Google account (Gmail)  
✅ Access to Google Cloud Console

**Estimated Time**: 15 minutes

---

## Part 1: Create Google Cloud Project (3 minutes)

### Step 1.1: Access Google Cloud Console

1. Open your browser
2. Go to: **https://console.cloud.google.com/**
3. Sign in with your Google account
4. Wait for the console dashboard to load

### Step 1.2: Create New Project

1. At the top of the page, click **"Select a project"** dropdown (next to Google Cloud logo)
2. In the popup window, click **"NEW PROJECT"** button (top right)
3. Fill in project details:
   - **Project name**: `MHT-CET-Guidance-Platform`
   - **Organization**: Leave as "No organization"
   - **Location**: Leave as default
4. Click **"CREATE"** button
5. Wait 10-15 seconds for project creation
6. You'll see a notification: "Create Project: MHT-CET-Guidance-Platform"

### Step 1.3: Select Your Project

1. Click the notification **"Select Project"** link
   - OR click the project dropdown again and select `MHT-CET-Guidance-Platform`
2. Verify project name appears in top bar

---

## Part 2: Enable Google Calendar API (2 minutes)

### Step 2.1: Open API Library

1. In the left sidebar, click ☰ (hamburger menu) if needed
2. Navigate to: **"APIs & Services"** → **"Library"**
   - OR use search: Type "API Library" in top search bar
3. You should see "API Library" page with searchable API catalog

### Step 2.2: Find Calendar API

1. In the search box, type: **`Google Calendar API`**
2. Click on **"Google Calendar API"** card (should be first result)
   - Icon: Blue calendar icon
   - Description: "Manipulates events and other calendar data"

### Step 2.3: Enable the API

1. Click the blue **"ENABLE"** button
2. Wait 5-10 seconds for API to enable
3. You'll see: "API enabled" notification
4. You're now on the "Google Calendar API" overview page

---

## Part 3: Configure OAuth Consent Screen (5 minutes)

### Step 3.1: Open Consent Screen Settings

1. In left sidebar, click **"OAuth consent screen"**
   - Under "APIs & Services" section
2. You'll see "Configure Consent Screen" page

### Step 3.2: Choose User Type

1. Select **"External"** radio button
   - External: Any Google account can access (for testing)
   - Internal: Only available if you have Google Workspace
2. Click **"CREATE"** button

### Step 3.3: Fill OAuth Consent Screen (Page 1/4)

**Required fields marked with \* :**

1. **App name\*** : `MHT CET Guidance Platform`

2. **User support email\*** :
   - Click dropdown
   - Select your Gmail address

3. **App logo**: Skip (optional)

4. **Application home page**: Leave empty

5. **Application privacy policy link**: Leave empty

6. **Application terms of service link**: Leave empty

7. **Authorized domains**: Leave empty

8. **Developer contact information\*** :
   - Email addresses: Enter your Gmail address
   - Example: `youremail@gmail.com`

9. Click **"SAVE AND CONTINUE"** button (bottom)

### Step 3.4: Add Scopes (Page 2/4)

1. You're now on "Scopes" page
2. Click **"ADD OR REMOVE SCOPES"** button
3. A side panel "Update selected scopes" opens on the right

**Select Calendar Scopes:**

4. Scroll down or use **Filter** search box at top
5. Search for: `calendar`
6. Find and CHECK these two scopes:

   ✅ **`.../auth/calendar`**
   - Description: "See, edit, share, and permanently delete all the calendars you can access using Google Calendar"
   - This is the main scope

   ✅ **`.../auth/calendar.events`**
   - Description: "View and edit events on all your calendars"
   - This is for event management

7. Verify both are checked (should see 2 scopes selected at top)
8. Click **"UPDATE"** button (bottom of panel)
9. Back on main page, you should see:
   - "Your sensitive scopes: 2"
10. Click **"SAVE AND CONTINUE"** button

### Step 3.5: Add Test Users (Page 3/4)

1. You're now on "Test users" page
2. Click **"+ ADD USERS"** button
3. A popup "Add test users" appears
4. Enter your Gmail address:
   - Example: `youremail@gmail.com`
   - ⚠️ Use the SAME Gmail that will create calendar events
5. Click **"ADD"** button
6. You should see your email in the test users list
7. Click **"SAVE AND CONTINUE"** button

### Step 3.6: Review Summary (Page 4/4)

1. You're now on "Summary" page
2. Review your settings:
   - App name: MHT CET Guidance Platform
   - User support email: Your email
   - Scopes: 2 scopes
   - Test users: 1 user
3. Click **"BACK TO DASHBOARD"** button

**✅ OAuth Consent Screen Configuration Complete!**

---

## Part 4: Create OAuth2 Credentials (5 minutes)

### Step 4.1: Open Credentials Page

1. In left sidebar, click **"Credentials"**
   - Under "APIs & Services" section
2. You'll see "Credentials" page (may be empty)

### Step 4.2: Create OAuth Client ID

1. Click **"+ CREATE CREDENTIALS"** button (top)
2. Select **"OAuth client ID"** from dropdown
3. You'll see "Create OAuth client ID" page

### Step 4.3: Choose Application Type

1. **Application type**: Select **"Web application"** from dropdown
   - ⚠️ Important: Must be "Web application", not "Desktop" or "Mobile"

### Step 4.4: Configure Web Application

1. **Name**: `Career Guidance Booking System`
   - This is just for your reference

2. **Authorized JavaScript origins**:
   - Leave empty (not needed for server-side flow)

3. **Authorized redirect URIs**:
   - Click **"+ ADD URI"** button
   - In the text field that appears, enter EXACTLY:
     ```
     http://localhost:5000/auth/google/callback
     ```
   - ⚠️ **Critical**: Must be exact match (lowercase, no trailing slash)
   - ⚠️ Port 5000 must match your backend PORT in .env

4. Click **"CREATE"** button (bottom)

### Step 4.5: Save Your Credentials

A popup appears: **"OAuth client created"**

**⚠️ IMPORTANT: Copy these NOW! You won't see Client Secret again!**

1. **Your Client ID**:

   ```
   123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com
   ```

   - Click the copy icon 📋 next to it
   - Paste somewhere safe (Notepad, etc.)

2. **Your Client Secret**:

   ```
   GOCSPX-AbCdEfGhIjKlMnOpQrStUvWxYz
   ```

   - Click the copy icon 📋 next to it
   - Paste somewhere safe (Notepad, etc.)

3. **Optional**: Click **"DOWNLOAD JSON"** to save as file

4. Click **"OK"** button to close popup

### Step 4.6: Verify Credentials

1. You should now see your credential in the list:
   - Name: "Career Guidance Booking System"
   - Type: "OAuth 2.0 Client ID"
2. You can click on it anytime to view Client ID (but not Secret)

**✅ OAuth2 Credentials Created!**

---

## Part 5: Get Refresh Token (5 minutes)

Now you need a refresh token to authenticate your application.

### Option A: OAuth2 Playground (Recommended - Easier)

#### Step 5A.1: Open OAuth2 Playground

1. Open new browser tab
2. Go to: **https://developers.google.com/oauthplayground/**
3. You'll see "OAuth 2.0 Playground" interface

#### Step 5A.2: Configure Your Credentials

1. Click the **⚙️ (gear/settings icon)** in the top-right corner
2. A panel "OAuth 2.0 configuration" opens
3. Check the box: ☑️ **"Use your own OAuth credentials"**
4. Two fields appear:

   **OAuth Client ID**:
   - Paste your Client ID from Step 4.5
   - Example: `123456789012-abc...xyz.apps.googleusercontent.com`

   **OAuth Client secret**:
   - Paste your Client Secret from Step 4.5
   - Example: `GOCSPX-AbC...XyZ`

5. Click **"Close"** button (bottom of panel)

#### Step 5A.3: Select Calendar API Scopes

1. In the left sidebar, you'll see "Step 1: Select & authorize APIs"
2. Scroll down the list of APIs to find **"Calendar API v3"**
3. Click to expand it (click the ▶ arrow)
4. Check these two boxes:

   ☑️ `https://www.googleapis.com/auth/calendar`  
   ☑️ `https://www.googleapis.com/auth/calendar.events`

5. Both scopes should now be checked

#### Step 5A.4: Authorize APIs

1. Scroll down if needed
2. Click blue **"Authorize APIs"** button (bottom left)
3. A Google sign-in popup opens

#### Step 5A.5: Sign In and Authorize

1. **Choose account**:
   - Select your Gmail account (the test user you added)

2. **App verification warning** (You may see this):
   - "Google hasn't verified this app"
   - Click **"Continue"** (bottom left)
   - This is normal for testing mode

3. **Permission screen**:
   - "OAuth 2.0 Playground wants to access your Google Account"
   - Shows: "See, edit, share, and permanently delete all calendars..."
   - Scroll down
   - Click **"Allow"** button

4. You'll be redirected back to OAuth2 Playground

#### Step 5A.6: Exchange Code for Token

1. You're now on "Step 2" automatically
2. You'll see an "Authorization code" in a text field
3. Click blue **"Exchange authorization code for tokens"** button
4. Wait 2-3 seconds

#### Step 5A.7: Copy Refresh Token

1. On the right side panel, you'll see "Token response"
2. Look for **"Refresh token"**:

   ```json
   {
     "access_token": "ya29.a0...",
     "expires_in": 3599,
     "refresh_token": "1//0abc...xyz",
     ...
   }
   ```

3. **Copy the refresh_token value**: `1//0abc...xyz`
   - ⚠️ **CRITICAL**: Copy the ENTIRE string (may be very long)
   - It starts with `1//0`
   - Paste somewhere safe (Notepad, etc.)

**✅ Refresh Token Obtained!**

---

### Option B: Use Custom Script (Alternative)

If OAuth2 Playground didn't work, use our helper script:

#### Step 5B.1: Update .env First

1. Open `backend/.env` in your editor
2. Add your Client ID and Client Secret:
   ```env
   GOOGLE_CLIENT_ID=your_actual_client_id_here
   GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
   ```
3. Save file

#### Step 5B.2: Run Script

1. Open PowerShell
2. Navigate to backend:
   ```powershell
   cd backend
   ```
3. Run the script:
   ```powershell
   npx ts-node scripts/get-refresh-token.ts
   ```

#### Step 5B.3: Follow Script Instructions

1. Script will print a URL
2. Copy the URL and open in browser
3. Authorize the application (like Option A steps 5A.5)
4. After redirect, copy the **code** from URL:
   - URL looks like: `http://localhost:5000/auth/google/callback?code=4/0A...xyz`
   - Copy everything after `code=`
5. Paste code back in PowerShell
6. Script will print your refresh token
7. Copy the refresh token

---

## Part 6: Update Environment Variables (2 minutes)

### Step 6.1: Open .env File

1. Open your code editor (VS Code, etc.)
2. Navigate to: `backend/.env`
3. You should see these lines:
   ```env
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback
   GOOGLE_REFRESH_TOKEN=your_refresh_token_here
   GOOGLE_CALENDAR_ID=primary
   ```

### Step 6.2: Replace Placeholder Values

Replace the following with your ACTUAL credentials from above:

1. **GOOGLE_CLIENT_ID**:
   - Replace `your_client_id_here` with your Client ID
   - Example: `123456789012-abc...xyz.apps.googleusercontent.com`

2. **GOOGLE_CLIENT_SECRET**:
   - Replace `your_client_secret_here` with your Client Secret
   - Example: `GOCSPX-AbC...XyZ`

3. **GOOGLE_REFRESH_TOKEN**:
   - Replace `your_refresh_token_here` with your Refresh Token
   - Example: `1//0abc...xyz`

**Keep these as-is (don't change):**

- ✓ `GOOGLE_REDIRECT_URI` (already correct)
- ✓ `GOOGLE_CALENDAR_ID` (primary is correct)

### Step 6.3: Save File

**⚠️ Important**: Make sure .env is in .gitignore (it is by default)

Final result should look like:

```env
GOOGLE_CLIENT_ID=123456789012-abcd...apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-AbCd...WxYz
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback
GOOGLE_REFRESH_TOKEN=1//0abc...xyz
GOOGLE_CALENDAR_ID=primary
```

**✅ Environment Variables Updated!**

---

## Part 7: Test Integration (3 minutes)

### Step 7.1: Run Test Script

1. Open PowerShell
2. Navigate to backend:
   ```powershell
   cd C:\Users\Rugved\Projects\career-guidance-platform\backend
   ```
3. Run test:
   ```powershell
   npx ts-node scripts/test-calendar-api.ts
   ```

### Step 7.2: Expected Output

If successful, you should see:

```
========================================
Testing Google Calendar API
========================================

✓ All environment variables are set

Testing API connection...

Test 1: Fetching calendar list...
✓ Calendar found: Your Email
  Calendar ID: your.email@gmail.com

Test 2: Creating test event with Google Meet link...
✓ Test event created successfully!
  Event ID: abc123xyz
  Meet Link: https://meet.google.com/abc-defg-hijk
  Event Link: https://calendar.google.com/event?eid=...

Test 3: Cleaning up test event...
✓ Test event deleted

========================================
✅ ALL TESTS PASSED!
========================================

Your Google Calendar API is configured correctly.
The booking system will now create real Google Meet links.
```

### Step 7.3: If Tests Fail

**"invalid_grant" error**:

- Refresh token is invalid/expired
- Go back to Part 5 and get a new refresh token

**"API has not been used" error**:

- Wait 1-2 minutes after enabling API
- Try again

**"insufficient permission" error**:

- Calendar scopes not added correctly
- Go back to Part 3, Step 3.4 and re-add scopes

---

## Part 8: Restart Backend & Test Booking (3 minutes)

### Step 8.1: Restart Backend Server

1. Stop current backend (if running):

   ```powershell
   Stop-Process -Name node -Force -ErrorAction SilentlyContinue
   ```

2. Start backend:

   ```powershell
   cd backend
   npm run dev
   ```

3. Wait for: "Server running on port 5000"

### Step 8.2: Create Test Booking

```powershell
$futureTime = (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss")
$bookingBody = @{
  student_name = "Test Student"
  email = "your.email@gmail.com"
  phone = "+91 9876543210"
  percentile = 95.5
  category = "OPEN"
  branch_preference = "Computer Engineering"
  meeting_time = $futureTime
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/bookings" -Method POST -ContentType "application/json" -Body $bookingBody

Write-Host "Booking ID: $($response.data.booking_id)"
Write-Host "Meet Link: $($response.data.meet_link)"
```

### Step 8.3: Verify in Google Calendar

1. Open: **https://calendar.google.com/**
2. Look for tomorrow's date
3. You should see event: "Career Guidance Consultation - Test Student"
4. Click on it to see Google Meet link

**✅ Integration Complete! Real Meet links are now generated!**

---

## Quick Checklist

Use this to verify you completed all steps:

- [ ] Created Google Cloud project
- [ ] Enabled Google Calendar API
- [ ] Configured OAuth consent screen (app name, support email)
- [ ] Added calendar scopes (2 scopes)
- [ ] Added test user (your Gmail)
- [ ] Created OAuth2 web application credentials
- [ ] Set redirect URI: `http://localhost:5000/auth/google/callback`
- [ ] Copied Client ID
- [ ] Copied Client Secret
- [ ] Obtained refresh token (OAuth2 Playground or script)
- [ ] Updated backend/.env with all 3 credentials
- [ ] Ran test script (test-calendar-api.ts)
- [ ] All tests passed
- [ ] Restarted backend server
- [ ] Created test booking
- [ ] Verified event in Google Calendar

---

## Troubleshooting Reference

| Error                     | Cause                 | Solution                             |
| ------------------------- | --------------------- | ------------------------------------ |
| "invalid_grant"           | Refresh token expired | Get new token from OAuth2 Playground |
| "redirect_uri_mismatch"   | URI doesn't match     | Check exact URI in Google Console    |
| "API not enabled"         | Calendar API disabled | Enable in API Library                |
| "insufficient permission" | Missing scopes        | Re-add in OAuth consent screen       |
| "Access blocked"          | App not verified      | Add your email as test user          |
| "Token revoked"           | User revoked access   | Re-authorize from scratch            |

---

## Production Deployment Notes

Before going live:

1. **Update redirect URI** to production domain:
   - Google Console → Credentials → Edit OAuth client
   - Add: `https://yourdomain.com/auth/google/callback`
   - Update .env: `GOOGLE_REDIRECT_URI`

2. **Publish OAuth consent screen**:
   - Currently in "Testing" mode (max 100 users)
   - Go to OAuth consent screen
   - Click "PUBLISH APP" to remove limit

3. **Google verification** (if publishing):
   - Submit app for verification if needed
   - Required only if going public with sensitive scopes

---

## Security Best Practices

⚠️ **Critical Security Rules**:

1. **Never commit .env file** to Git (already in .gitignore)
2. **Never share** Client Secret or Refresh Token publicly
3. **Rotate credentials** every 6 months in production
4. **Use service account** instead of OAuth for production (more secure)
5. **Monitor API usage** in Google Cloud Console
6. **Set up billing alerts** (Calendar API is free with limits)

---

**Setup Complete!** 🎉

Your application now creates real Google Meet links automatically for every booking.

For questions, refer to:

- Full guide: `GOOGLE_CALENDAR_SETUP.md`
- Quick reference: `GOOGLE_CALENDAR_QUICK_REFERENCE.md`

# Google Calendar API & OAuth2 Setup Guide
**Comprehensive Master Guide**

This guide provides a single, unified walkthrough to configure Google Calendar API integration with OAuth2, acquire your refresh token, populate environment variables, and verify Meet link booking automation.

---

## 📋 Prerequisites
*   ✅ Google Account (Gmail)
*   ✅ Access to the [Google Cloud Console](https://console.cloud.google.com/)
*   ✅ `googleapis` package installed (handled automatically)

---

## Part 1: Google Cloud Console Setup (10 mins)

### 1.1 Create a Google Cloud Project
1.  Go to [Google Cloud Console](https://console.cloud.google.com/) and sign in.
2.  Click the project dropdown in the top bar (next to Google Cloud logo) $\to$ click **"New Project"**.
3.  Enter project name: `MHT-CET-Guidance-Platform`.
4.  Leave Organization/Location as default $\to$ click **"Create"**.
5.  Wait for project creation $\to$ select it from the notification panel or the project dropdown.

### 1.2 Enable Google Calendar API
1.  In the left sidebar, navigate to **"APIs & Services"** $\to$ **"Library"**.
2.  Search for **"Google Calendar API"** and click on it.
3.  Click the blue **"Enable"** button $\to$ wait 5 seconds for authorization to complete.

### 1.3 Configure OAuth Consent Screen
1.  In the left sidebar, click **"OAuth consent screen"**.
2.  Select **"External"** (accessible to any Google account for testing) $\to$ click **"Create"**.
3.  **App Information (Page 1/4):**
    *   *App Name:* `MHT CET Guidance Platform`
    *   *User Support Email:* Select your Gmail address
    *   *Developer Contact Email:* Enter your Gmail address
    *   Click **"Save and Continue"**.
4.  **Scopes (Page 2/4):**
    *   Click **"Add or Remove Scopes"** $\to$ search for `calendar`.
    *   Check both:
        *   `.../auth/calendar` (See, edit, share, and delete all calendars)
        *   `.../auth/calendar.events` (View and edit events on all calendars)
    *   Click **"Update"** at the bottom of the panel $\to$ click **"Save and Continue"**.
5.  **Test Users (Page 3/4):**
    *   Click **"+ Add Users"** $\to$ enter the Gmail address you will use for testing.
    *   Click **"Add"** $\to$ click **"Save and Continue"** $\to$ click **"Back to Dashboard"**.

### 1.4 Create OAuth2 Credentials
1.  In the left sidebar, click **"Credentials"**.
2.  Click **"+ Create Credentials"** $\to$ select **"OAuth client ID"**.
3.  **Application Type:** Select **"Web application"**.
4.  **Name:** `Career Guidance Booking System`.
5.  **Authorized Redirect URIs:**
    *   Click **"+ Add URI"** $\to$ enter EXACTLY:
        ```text
        http://localhost:5000/auth/google/callback
        ```
    *   Click **"Create"**.
6.  An **"OAuth client created"** popup will appear. **Copy and save both immediately:**
    *   **Client ID** (looks like: `123456...apps.googleusercontent.com`)
    *   **Client Secret** (looks like: `GOCSPX-AbCd...`)

---

## Part 2: Get OAuth Refresh Token (5 mins)

### Option A: OAuth2 Playground (Recommended — Easiest)
1.  Go to the [Google OAuth2 Playground](https://developers.google.com/oauthplayground/).
2.  Click the **⚙️ (settings gear icon)** in the top right corner.
3.  Check **"Use your own OAuth credentials"**.
4.  Paste your **OAuth Client ID** and **OAuth Client Secret** $\to$ click **"Close"**.
5.  **Step 1 (Select Scopes):** Scroll down to **"Calendar API v3"**, expand it, and check both:
    *   `https://www.googleapis.com/auth/calendar`
    *   `https://www.googleapis.com/auth/calendar.events`
6.  Click **"Authorize APIs"** $\to$ sign in with your test Gmail account $\to$ click **"Allow"** on the warnings.
7.  **Step 2 (Exchange Code):** You'll be redirected back to the playground. Click **"Exchange authorization code for tokens"**.
8.  **Step 3 (Copy Token):** In the JSON response on the right, copy the **`refresh_token`** string (starts with `1//0...`).

### Option B: Local CLI Script
1.  Add your credentials to your local `.env` file first:
    ```env
    GOOGLE_CLIENT_ID=your_client_id
    GOOGLE_CLIENT_SECRET=your_client_secret
    ```
2.  Run the helper script from the `backend/` directory:
    ```bash
    npx ts-node scripts/get-refresh-token.ts
    ```
3.  Copy the URL generated, authorize in the browser, paste the returned code back in the console, and copy your refresh token.

---

## Part 3: Environment Setup & Verification

### 3.1 Update `.env` File
In `backend/.env`, replace placeholders with your real credentials:
```env
GOOGLE_CLIENT_ID=your_client_id_from_cloud_console
GOOGLE_CLIENT_SECRET=your_client_secret_from_cloud_console
GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback
GOOGLE_REFRESH_TOKEN=your_refresh_token_from_step_2
GOOGLE_CALENDAR_ID=primary
```

### 3.2 Run Automated Tests
Execute the built-in diagnostic integration test from the `backend/` folder:
```bash
npx ts-node scripts/test-calendar-api.ts
```
*Expected Output:*
```text
✓ All environment variables are set
Test 1: Fetching calendar list... ✓ Calendar found: youremail@gmail.com
Test 2: Creating test event with Meet link... ✓ Test event created successfully!
Test 3: Cleaning up test event... ✓ Test event deleted
✅ ALL TESTS PASSED!
```

---

## 🔧 Troubleshooting & Production Deployment

### Common Errors
*   `invalid_grant`: Refresh token is expired or revoked. Re-run Part 2 to get a new token.
*   `redirect_uri_mismatch`: Make sure `http://localhost:5000/auth/google/callback` is exactly matching inside Google Cloud Console credentials.
*   `insufficient permission`: You did not check/allow the calendar scopes on the consent screen.

### Going Live (Production Steps)
When deploying your website live:
1.  **Redirect URI:** Update `GOOGLE_REDIRECT_URI` to `https://api.yourdomain.com/auth/google/callback` inside Google Console $\to$ Credentials.
2.  **Publish Screen:** Go to Google Console $\to$ OAuth consent screen $\to$ click **"Publish App"** to transition from Testing to Live mode.

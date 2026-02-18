# Google Calendar Integration - Quick Reference

## ✅ What Was Done Automatically

1. **Dependencies**
   - `googleapis` package already installed

2. **Environment Variables** (`backend/.env`)

   ```env
   GOOGLE_CLIENT_ID=your_client_id_here
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:5000/auth/google/callback
   GOOGLE_REFRESH_TOKEN=your_refresh_token_here
   GOOGLE_CALENDAR_ID=primary
   ```

3. **Production Code** (`backend/src/modules/booking/calendar.service.ts`)
   - Uncommented Google Calendar API integration
   - Imports `googleapis` library
   - Uses OAuth2 authentication
   - Creates events with Google Meet links

4. **Helper Scripts Created**
   - `backend/scripts/get-refresh-token.ts` - Get OAuth refresh token
   - `backend/scripts/test-calendar-api.ts` - Test API integration

5. **Documentation**
   - `backend/GOOGLE_CALENDAR_SETUP.md` - Complete setup guide

## ⚠️ What You Need to Do Manually

### 1. Google Cloud Console Setup (15 minutes)

Follow the detailed guide: `backend/GOOGLE_CALENDAR_SETUP.md`

**Quick Steps:**

1. Create project at https://console.cloud.google.com/
2. Enable Google Calendar API
3. Configure OAuth consent screen
4. Create OAuth2 credentials
5. Get refresh token

### 2. Get Your Credentials

**Option A: OAuth2 Playground (Easier)**

- https://developers.google.com/oauthplayground/
- Use your own OAuth credentials
- Get refresh token in 5 minutes

**Option B: Use Our Script**

```powershell
cd backend
npx ts-node scripts/get-refresh-token.ts
```

### 3. Update .env File

Replace placeholder values in `backend/.env` with real credentials from Google Cloud Console.

### 4. Test Integration

```powershell
# Test API connection
cd backend
npx ts-node scripts/test-calendar-api.ts

# Should output: ✅ ALL TESTS PASSED!
```

### 5. Restart & Test

```powershell
# Restart backend
Stop-Process -Name node -Force -ErrorAction SilentlyContinue
cd backend
npm run dev

# Test booking with real Meet link
$futureTime = (Get-Date).AddDays(1).ToString("yyyy-MM-ddTHH:mm:ss")
$bookingBody = @{
  student_name = "Test Student"
  email = "your.email@example.com"
  phone = "+91 9876543210"
  percentile = 95.5
  category = "OPEN"
  branch_preference = "Computer Engineering"
  meeting_time = $futureTime
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:5000/api/bookings" -Method POST -ContentType "application/json" -Body $bookingBody
```

## 📋 Verification Checklist

- [ ] Google Cloud project created
- [ ] Calendar API enabled
- [ ] OAuth consent screen configured
- [ ] OAuth2 credentials created
- [ ] Refresh token obtained
- [ ] .env file updated with real values
- [ ] Test script passes (`test-calendar-api.ts`)
- [ ] Backend server restarted
- [ ] Test booking creates real Meet link
- [ ] Event visible in Google Calendar

## 🔧 Troubleshooting Commands

```powershell
# Check if credentials are loaded
cd backend
node -e "require('dotenv').config(); console.log('CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET')"

# Test database connection
$env:PGPASSWORD = 'Atharva@14'
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -U postgres -d career_guidance -c "SELECT COUNT(*) FROM bookings;"

# View recent bookings
$env:PGPASSWORD = 'Atharva@14'
& 'C:\Program Files\PostgreSQL\18\bin\psql.exe' -U postgres -d career_guidance -c "SELECT student_name, email, meet_link, created_at FROM bookings ORDER BY created_at DESC LIMIT 3;"

# Check backend logs
cd backend
npm run dev
# Look for: "Generated meet link" or "Google Calendar credentials not configured"
```

## 🚨 Common Errors

### "Google Calendar credentials not configured"

- ✅ **Expected** until you complete manual setup
- System falls back to mock Meet links
- No action needed during development

### "invalid_grant"

- ❌ Refresh token expired/invalid
- **Fix**: Get new refresh token (Step 2 above)

### "API has not been used"

- ❌ Calendar API not enabled
- **Fix**: Enable at https://console.cloud.google.com/apis/library

### "insufficient permission"

- ❌ Missing OAuth scopes
- **Fix**: Add calendar scopes in OAuth consent screen

## 📚 Additional Resources

- **Full Guide**: `backend/GOOGLE_CALENDAR_SETUP.md`
- **Google Calendar API Docs**: https://developers.google.com/calendar/api/v3/reference
- **OAuth2 Playground**: https://developers.google.com/oauthplayground/
- **Google Cloud Console**: https://console.cloud.google.com/

## 🎯 Current Status

**Mode**: Development (Mock Meet Links)

- System generates mock links like: `https://meet.google.com/abc-defg-hijk`
- Bookings work but links are not real
- No Google Calendar events created

**After Manual Setup**: Production (Real Meet Links)

- System generates real Google Meet links
- Events created in your Google Calendar
- Calendar invites sent to students
- Full integration active

---

**Time Estimate**: 15-20 minutes for first-time setup
**Difficulty**: Medium (requires Google Cloud Console access)

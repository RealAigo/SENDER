# Solution: Email Tracking Not Working

## Problem Summary

You opened an email but it's not showing as "opened" on the website. The diagnostic shows:
- ✅ Database tables are set up correctly
- ✅ Tracking code is in place
- ❌ **0 tracking events recorded**
- ❌ **TRACKING_BASE_URL is set to `localhost:3001`**

## Root Cause

**Email clients (Gmail, Outlook, etc.) CANNOT access `localhost` URLs.** When you open an email, the email client tries to load the tracking pixel from `http://localhost:3001/api/tracking/open/...`, but it fails because localhost only works on your computer, not on remote email servers.

## Solution 1: Use ngrok (Quick Fix for Testing)

### Step 1: Install ngrok

**Windows:**
1. Download: https://ngrok.com/download
2. Extract `ngrok.exe` to a folder
3. Or use: `choco install ngrok` (if you have Chocolatey)

### Step 2: Start ngrok

Open a **new terminal window** and run:
```bash
ngrok http 3001
```

You'll see:
```
Forwarding   https://abc123.ngrok.io -> http://localhost:3001
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

### Step 3: Update Backend Configuration

1. Open `backend/.env` file
2. Add or update this line:
   ```env
   TRACKING_BASE_URL=https://abc123.ngrok.io
   ```
   (Replace with your actual ngrok URL)

3. **Restart your backend server**:
   - Stop it (Ctrl+C)
   - Start it again: `npm start` (in backend folder)

### Step 4: Send a NEW Campaign

⚠️ **IMPORTANT**: Old campaigns still have the localhost URL. You MUST send a **NEW campaign** after setting up ngrok.

### Step 5: Test

1. Open the email in your email client
2. **Enable images** if prompted:
   - Gmail: Click "Display images" or enable "Always display images"
   - Outlook: Click "Click here to download pictures"
3. Check backend logs - you should see:
   ```
   [Tracking] Email open detected - Token: ...
   [Tracking] ✅ First open recorded for recipient X
   ```
4. Refresh the campaign detail page - should show "✓ Yes" for opened

## Solution 2: Test Manually (Without ngrok)

If you want to test the tracking system without ngrok:

### Step 1: Get Tracking URL

Run this script to get a tracking URL from a recent campaign:
```bash
node backend/scripts/get-tracking-url.js
```

### Step 2: Test the URL

1. Copy one of the tracking URLs (e.g., `http://localhost:3001/api/tracking/open/24-12-8bab15ddaa196a05`)
2. Open it in your browser
3. Check backend logs - should show tracking event
4. Run diagnostic:
   ```bash
   node backend/scripts/check-tracking-status.js
   ```
5. Refresh campaign detail page - should show as opened

**Note**: This only works for testing. Real email tracking requires a public URL.

## Solution 3: Deploy Backend (Production)

For production, deploy your backend to a server:

1. **Deploy backend** to:
   - Heroku
   - DigitalOcean
   - AWS
   - Any VPS/server

2. **Set environment variable**:
   ```env
   TRACKING_BASE_URL=https://your-backend-domain.com
   ```

3. **Send campaigns** - tracking will work automatically

## Verify It's Working

After fixing, run:
```bash
node backend/scripts/check-tracking-status.js
```

You should see:
- ✅ Tracking events found
- ✅ Recipients with opens found
- ✅ Using public URL (not localhost)

## Common Issues

### Issue 1: Email Client Blocks Images

**Gmail/Outlook block images by default for privacy**

**Fix**: 
- Gmail: Click "Display images" or enable "Always display images from this sender"
- Outlook: Click "Click here to download pictures"
- Or check in webmail interface

### Issue 2: ngrok URL Changes

**ngrok free tier gives you a new URL each time you restart**

**Fix**: 
- Use ngrok with a static domain (paid plan)
- Or update `.env` each time you restart ngrok
- Or deploy to a permanent server

### Issue 3: Campaign Sent Before Fix

**Old campaigns have localhost URL in the email**

**Fix**: Send a NEW campaign after setting up ngrok or deploying

### Issue 4: Backend Not Running

**The tracking endpoint returns 404 or connection error**

**Fix**: 
1. Make sure backend is running: `cd backend && npm start`
2. Check it's on port 3001
3. Test: Open `http://localhost:3001/api/health` in browser

## Step-by-Step Quick Fix

1. ✅ Install ngrok: https://ngrok.com/download
2. ✅ Start ngrok: `ngrok http 3001` (in new terminal)
3. ✅ Copy HTTPS URL (e.g., `https://abc123.ngrok.io`)
4. ✅ Add to `backend/.env`: `TRACKING_BASE_URL=https://abc123.ngrok.io`
5. ✅ Restart backend server
6. ✅ Send NEW campaign
7. ✅ Open email and enable images
8. ✅ Check tracking works!

## Testing Checklist

- [ ] ngrok is running and showing HTTPS URL
- [ ] `TRACKING_BASE_URL` is set in `backend/.env`
- [ ] Backend server restarted after updating `.env`
- [ ] NEW campaign sent (not old one)
- [ ] Email opened with images enabled
- [ ] Backend logs show tracking event
- [ ] Campaign detail page shows "✓ Yes" for opened
- [ ] Country is displayed (if available)

## Need Help?

If tracking still doesn't work after following these steps:

1. **Check backend logs** when opening email - look for `[Tracking]` messages
2. **Run diagnostic**: `node backend/scripts/check-tracking-status.js`
3. **Test manually**: `node backend/scripts/get-tracking-url.js` then open URL in browser
4. **Verify ngrok**: Make sure ngrok is still running and URL hasn't changed
5. **Check email source**: View email source and search for `tracking/open` to verify pixel URL



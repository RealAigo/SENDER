# Fix Email Tracking - Step by Step

## Problem Identified

Your tracking URL is set to `http://localhost:3001`, which email clients **cannot access**. When you open an email, Gmail/Outlook tries to load the tracking pixel from localhost, but it fails because localhost only works on your computer.

## Quick Fix Using ngrok

### Step 1: Install ngrok

**Windows:**
1. Download from: https://ngrok.com/download
2. Extract `ngrok.exe` to a folder (e.g., `C:\ngrok\`)
3. Add to PATH or use full path

**Or use Chocolatey:**
```powershell
choco install ngrok
```

### Step 2: Start ngrok

Open a **new terminal** and run:
```bash
ngrok http 3001
```

You'll see output like:
```
Forwarding   https://abc123.ngrok.io -> http://localhost:3001
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

### Step 3: Update Backend Configuration

1. Open `backend/.env` file
2. Add or update:
   ```env
   TRACKING_BASE_URL=https://abc123.ngrok.io
   ```
   (Replace `abc123.ngrok.io` with your actual ngrok URL)

3. **Restart your backend server** (stop with Ctrl+C, then start again)

### Step 4: Send a NEW Campaign

⚠️ **Important**: Old campaigns still have the localhost URL. You need to send a **NEW campaign** after setting up ngrok.

### Step 5: Test

1. Open the email in your email client
2. **Enable images** if prompted (Gmail: "Display images" or "Always display images")
3. Check backend logs - you should see:
   ```
   [Tracking] Email open detected - Token: ...
   [Tracking] ✅ First open recorded for recipient X
   ```
4. Refresh the campaign detail page - should show "✓ Yes" for opened

## Alternative: Test Manually

If you want to test without ngrok:

1. **Send a test campaign** to your email
2. **View email source** (in Gmail: three dots → "Show original")
3. **Find the tracking pixel URL** - search for `tracking/open`
4. **Copy the URL** (e.g., `http://localhost:3001/api/tracking/open/123-456-abc`)
5. **Open it in your browser** - this simulates an email open
6. **Check backend logs** - should show tracking event
7. **Refresh campaign page** - should show as opened

## Verify It's Working

After fixing, run the diagnostic:
```bash
node backend/scripts/check-tracking-status.js
```

You should see:
- ✅ Tracking events found
- ✅ Recipients with opens found
- ✅ Using public URL (not localhost)

## Common Issues

### Issue 1: Email Client Blocks Images

**Gmail/Outlook block images by default**

**Fix**: 
- Gmail: Click "Display images" or enable "Always display images"
- Outlook: Click "Click here to download pictures"
- Or check in webmail interface

### Issue 2: ngrok URL Changes

**ngrok free tier gives you a new URL each time**

**Fix**: 
- Use ngrok with a static domain (paid plan)
- Or update `.env` each time you restart ngrok
- Or deploy to a permanent server

### Issue 3: Campaign Sent Before Fix

**Old campaigns have localhost URL**

**Fix**: Send a NEW campaign after setting up ngrok

## Production Solution

For production, deploy your backend to a server (Heroku, DigitalOcean, AWS, etc.) and set:
```env
TRACKING_BASE_URL=https://your-backend-domain.com
```

## Next Steps

1. ✅ Install ngrok
2. ✅ Start ngrok: `ngrok http 3001`
3. ✅ Update `backend/.env` with ngrok URL
4. ✅ Restart backend
5. ✅ Send NEW campaign
6. ✅ Open email and enable images
7. ✅ Check tracking works!



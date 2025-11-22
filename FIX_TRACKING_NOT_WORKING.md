# Fix: Email Tracking Not Working

## Problem

You opened the email but tracking isn't working. The most common issue is that the tracking URL uses `localhost:3001`, which email clients cannot access.

## Why It's Not Working

When you send an email, the tracking pixel URL looks like:
```
http://localhost:3001/api/tracking/open/123-456-abc
```

Email clients (Gmail, Outlook, etc.) run on remote servers and **cannot access your localhost**. They can't load the tracking pixel, so opens aren't tracked.

## Solutions

### Solution 1: Use ngrok (Best for Testing)

1. **Install ngrok** (if not installed):
   - Download from: https://ngrok.com/download
   - Or: `npm install -g ngrok`

2. **Start ngrok** to expose your backend:
   ```bash
   ngrok http 3001
   ```

3. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

4. **Add to backend `.env`**:
   ```env
   TRACKING_BASE_URL=https://abc123.ngrok.io
   ```

5. **Restart your backend server**

6. **Send a NEW campaign** (old emails still have localhost URL)

### Solution 2: Deploy Backend (Production)

If you're deploying to production:
1. Deploy backend to a server (Heroku, DigitalOcean, etc.)
2. Set `TRACKING_BASE_URL` to your production URL:
   ```env
   TRACKING_BASE_URL=https://your-backend-domain.com
   ```

### Solution 3: Test Locally with Email Source

1. **Send a test campaign** to your email
2. **View email source** (in Gmail: three dots → "Show original")
3. **Find the tracking pixel URL** - should be in the HTML
4. **Copy the URL** and open it in your browser
5. **Check backend logs** - should show tracking event
6. **Refresh campaign page** - should show as opened

## Quick Test

1. **Check if tracking endpoint works**:
   Open in browser: `http://localhost:3001/api/tracking/open/test-123-abc`
   - Should download a 1x1 pixel image
   - If error, endpoint isn't working

2. **Check backend logs when sending**:
   You should see:
   ```
   [EmailSender] Adding tracking pixel for recipient X, campaign Y
   [EmailSender] Tracking URL: http://localhost:3001/api/tracking/open/...
   [EmailSender] ✅ Tracking pixel added to email
   ```

3. **Check backend logs when opening email**:
   You should see:
   ```
   [Tracking] Email open detected - Token: ...
   [Tracking] ✅ First open recorded for recipient X
   ```

## Common Issues

### Issue 1: Email Client Blocks Images

**Gmail/Outlook block images by default**

**Fix**: 
- Gmail: Click "Display images" or "Always display images"
- Outlook: Click "Click here to download pictures"
- Or check in webmail interface

### Issue 2: Campaign Sent Before Fix

**Old campaigns have localhost URL**

**Fix**: Send a NEW campaign after setting up ngrok or deploying

### Issue 3: Database Migration Not Run

**Missing columns/tables**

**Fix**: Run migrations:
```bash
mysql -u root -p email_sender < database/migration_email_tracking_simple.sql
mysql -u root -p email_sender < database/migration_add_country_to_tracking_simple.sql
```

## Step-by-Step Fix

1. **Install ngrok** (if testing locally):
   ```bash
   # Windows: Download from ngrok.com
   # Or use: choco install ngrok
   ```

2. **Start ngrok**:
   ```bash
   ngrok http 3001
   ```

3. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`)

4. **Update backend `.env`**:
   ```env
   TRACKING_BASE_URL=https://abc123.ngrok.io
   ```

5. **Restart backend**:
   ```bash
   # Stop backend (Ctrl+C)
   # Start again
   npm start
   ```

6. **Send a NEW test campaign**

7. **Open the email** (enable images if needed)

8. **Check backend logs** - should show tracking

9. **Refresh campaign detail page** - should show opened

## Verify It's Working

After fixing, you should see in backend logs when opening email:

```
[Tracking] Email open detected - Token: 123-456-abc...
[Tracking] Country detected: United States (US)
[Tracking] ✅ First open recorded for recipient 123 (user@example.com)
```

And in the campaign detail page:
- "Opened" column shows: ✓ Yes
- "Country" column shows: United States (US)

## Note About localhost

**localhost URLs will NEVER work from email clients**. You MUST use:
- ngrok (for testing)
- A deployed server (for production)
- Or test by manually opening the tracking URL in your browser


# Troubleshoot Email Open Tracking

If email opens are not being tracked, follow these steps:

## Step 1: Check Database Setup

Run the diagnostic script:

```bash
node backend/scripts/test-tracking.js
```

This will check:
- ✅ If `email_open_tracking` table exists
- ✅ If `country` columns exist
- ✅ If `opened_at` column exists in `campaign_recipients`
- ✅ Recent campaigns and their recipients
- ✅ Tracking logs

## Step 2: Check Backend Logs

When you open an email, check your backend terminal. You should see:

```
[Tracking] Email open detected - Token: 123-456-abc...
[Tracking] Country detected: United States (US)
[Tracking] ✅ First open recorded for recipient 123 (user@example.com)
```

If you don't see these logs, the tracking pixel isn't being loaded.

## Step 3: Verify Tracking Pixel in Email

### Option A: View Email Source

1. Open the email in your email client
2. View email source/HTML
3. Search for `tracking/open` or `api/tracking`
4. You should see something like:
   ```html
   <img src="http://localhost:3001/api/tracking/open/123-456-abc..." 
        width="1" height="1" 
        style="display:none;" 
        alt="" />
   ```

### Option B: Check Backend Logs When Sending

When sending a campaign, you should see:
```
[EmailSender] Adding tracking pixel for recipient 123, campaign 456
[EmailSender] Tracking URL: http://localhost:3001/api/tracking/open/123-456-abc...
[EmailSender] ✅ Tracking pixel added to email
```

## Step 4: Common Issues

### Issue 1: Email Client Blocks Images

**Problem**: Many email clients (Gmail, Outlook) block images by default.

**Solution**: 
- Gmail: Click "Display images" or "Always display images from this sender"
- Outlook: Click "Click here to download pictures"
- Or check email in a different client

**Test**: Try opening the email in a different email client or webmail.

### Issue 2: Tracking URL Uses localhost

**Problem**: If tracking URL is `http://localhost:3001`, it won't work from email clients (they can't access your local machine).

**Solution**: 
1. If testing locally, use a service like ngrok to expose your backend:
   ```bash
   ngrok http 3001
   ```
2. Add to backend `.env`:
   ```env
   TRACKING_BASE_URL=https://your-ngrok-url.ngrok.io
   ```
3. Restart backend
4. Send a new campaign (old emails will still have localhost URL)

### Issue 3: Database Migration Not Run

**Problem**: `opened_at` column or `email_open_tracking` table doesn't exist.

**Solution**: Run migrations:
```bash
mysql -u root -p email_sender < database/migration_email_tracking_simple.sql
mysql -u root -p email_sender < database/migration_add_country_to_tracking_simple.sql
```

### Issue 4: Tracking Endpoint Not Accessible

**Test**: Open this URL in your browser:
```
http://localhost:3001/api/tracking/open/test-123-abc
```

You should see a 1x1 pixel image (or download a GIF file). If you get an error, the endpoint isn't working.

### Issue 5: Campaign Sent Before Tracking Was Added

**Problem**: Campaigns sent before tracking was implemented won't have tracking pixels.

**Solution**: Send a new test campaign after ensuring tracking is set up.

## Step 5: Manual Test

1. **Send a test campaign** to your own email
2. **Check backend logs** - should show tracking pixel being added
3. **Open email source** - verify pixel URL is in the HTML
4. **Open the email** (enable images if needed)
5. **Check backend logs** - should show tracking event
6. **Refresh campaign detail page** - should show email as opened

## Step 6: Check Database Directly

Query the database to see if opens are being recorded:

```sql
-- Check if any opens were recorded
SELECT * FROM email_open_tracking ORDER BY opened_at DESC LIMIT 10;

-- Check recipients with opens
SELECT id, email, opened_at, opened_count, country 
FROM campaign_recipients 
WHERE opened_at IS NOT NULL 
ORDER BY opened_at DESC;
```

## Step 7: Test Tracking Endpoint Manually

Test the tracking endpoint directly:

1. Get a recipient ID and campaign ID from your database
2. Visit in browser:
   ```
   http://localhost:3001/api/tracking/open/{recipientId}-{campaignId}-test
   ```
3. Check backend logs - should show tracking attempt
4. Check database - should see entry in `email_open_tracking`

## Quick Fixes

### Fix 1: Ensure TRACKING_BASE_URL is Set

Add to `backend/.env`:
```env
TRACKING_BASE_URL=http://localhost:3001
```

Or if using ngrok:
```env
TRACKING_BASE_URL=https://your-ngrok-url.ngrok.io
```

### Fix 2: Restart Backend

After making changes, always restart your backend server.

### Fix 3: Send New Campaign

Old campaigns won't have tracking pixels. Send a new test campaign.

## Still Not Working?

1. **Check backend terminal** for any errors
2. **Check browser console** (F12) when viewing campaign detail page
3. **Verify database** - run `test-tracking.js` script
4. **Check email source** - verify pixel is in the HTML
5. **Try different email client** - some block images more aggressively

## Expected Behavior

When working correctly:
1. ✅ Email sent with tracking pixel
2. ✅ Email opened → pixel loads → backend logs show tracking
3. ✅ Database updated with open timestamp and country
4. ✅ Campaign detail page shows "✓ Yes" and country name

If any step fails, check the logs and database to identify where it's breaking.


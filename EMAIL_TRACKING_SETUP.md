# Email Open Tracking & Auto-Retry Setup Guide

This guide explains the new email tracking and automatic retry features.

## Features Added

### 1. Email Open Tracking
- Tracks when emails are opened by recipients
- Uses a 1x1 transparent tracking pixel
- Records IP address and user agent
- Calculates open rates for campaigns

### 2. Automatic Campaign Retry
- Automatically resumes campaigns after daily limit resets
- Queues campaigns when daily limit is reached
- Processes retry queue every 5 minutes
- Pauses campaigns instead of failing when limit is reached

## Database Migration

Run the migration to add the necessary tables:

```bash
mysql -u root -p email_sender < database/migration_email_tracking.sql
```

Or in phpMyAdmin:
1. Select `email_sender` database
2. Go to SQL tab
3. Copy and paste contents of `database/migration_email_tracking.sql`
4. Click "Go"

## What Gets Added

### New Tables
1. **email_open_tracking** - Detailed open tracking logs
2. **campaign_retry_queue** - Queue for campaigns waiting to retry

### Updated Tables
1. **campaign_recipients** - Added `opened_at` and `opened_count` columns

## How It Works

### Email Open Tracking

1. **Tracking Pixel**: Each email includes a 1x1 transparent image
2. **URL Format**: `/api/tracking/open/{recipientId}-{campaignId}-{hash}`
3. **When Opened**: 
   - First open: Records timestamp and increments count
   - Subsequent opens: Only increments count
   - Tracks IP address and user agent

### Automatic Retry

1. **Daily Limit Reached**: 
   - Campaign is paused (not failed)
   - Queued for retry at next day 00:00
   - Recipients remain in "pending" status

2. **Retry Processor**:
   - Runs every 5 minutes
   - Checks for campaigns ready to retry
   - Automatically resumes paused campaigns
   - Continues sending to pending recipients

3. **Hourly Limits**:
   - Recipients are marked as failed
   - Campaign continues (doesn't pause)

## Environment Variables

Add to your `.env` file (optional):

```env
# Base URL for tracking pixels (defaults to CORS_ORIGIN)
TRACKING_BASE_URL=http://localhost:3001
```

## API Endpoints

### Campaign Details (Updated)
`GET /api/campaigns/:id`

Now includes:
```json
{
  "openStats": {
    "totalSent": 100,
    "totalOpened": 45,
    "openRate": 45.00,
    "uniqueOpens": 45,
    "totalOpens": 67,
    "firstOpen": "2024-01-01T10:00:00Z",
    "lastOpen": "2024-01-02T15:30:00Z"
  }
}
```

### Campaign List (Updated)
`GET /api/campaigns`

Now includes `openRate` for each campaign.

## Frontend Updates Needed

To display open rates in the frontend:

1. **Campaign List**: Show open rate percentage
2. **Campaign Detail**: 
   - Display open statistics
   - Show opened vs not opened recipients
   - Show open timeline

## Testing

### Test Open Tracking

1. Send a test campaign
2. Open the email in your email client
3. Check campaign detail page - should show email as opened
4. Open email again - count should increment

### Test Auto-Retry

1. Set a low daily limit (e.g., 10 emails)
2. Create campaign with 20 recipients
3. Start campaign
4. After 10 emails sent, campaign should pause
5. Check `campaign_retry_queue` table - should have entry
6. Wait until next day 00:00 (or manually update `retry_at`)
7. Campaign should automatically resume

## Troubleshooting

### Tracking pixel not working
- Check `TRACKING_BASE_URL` in `.env`
- Verify tracking route is accessible: `GET /api/tracking/open/test`
- Check backend logs for tracking errors

### Auto-retry not working
- Check backend logs for retry processor messages
- Verify `campaign_retry_queue` table exists
- Check if retry processor is running (should see logs every 5 minutes)
- Manually trigger: Check `campaign_retry_queue` table and update `retry_at` to past time

### Open rates showing 0%
- Verify emails are being opened
- Check `email_open_tracking` table for entries
- Verify tracking pixel URL is correct in emails
- Some email clients block images by default

## Notes

- **Privacy**: Tracking pixels are standard in email marketing
- **Accuracy**: Some email clients block images, so open rates may be lower than actual
- **Retry Timing**: Retry processor checks every 5 minutes (configurable in `server.js`)
- **Daily Limits**: Only daily limits trigger auto-retry, hourly limits mark recipients as failed


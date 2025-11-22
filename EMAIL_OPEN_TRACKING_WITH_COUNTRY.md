# Email Open Tracking with Country Detection

This feature tracks email opens and detects the country where the email was opened.

## Features

✅ **Email Open Tracking**: Tracks when emails are opened
✅ **Country Detection**: Automatically detects country from IP address
✅ **Multiple Opens**: Tracks how many times each email was opened
✅ **Visual Indicators**: Shows opened status and country in recipients table

## Database Migration

### Step 1: Add Country Columns

If you already have the `email_open_tracking` table, run this migration:

```bash
mysql -u root -p email_sender < database/migration_add_country_to_tracking_simple.sql
```

Or in phpMyAdmin:
1. Select `email_sender` database
2. Go to SQL tab
3. Copy and paste contents of `database/migration_add_country_to_tracking_simple.sql`
4. Click "Go"

**Note**: If you see "Duplicate column name" errors, that means columns already exist - that's fine!

### Step 2: Verify Migration

Check that columns were added:

```sql
DESCRIBE email_open_tracking;
```

You should see:
- `country` (VARCHAR(100))
- `country_code` (VARCHAR(2))

## How It Works

### Country Detection

1. **IP Address Capture**: When email is opened, the tracking pixel request includes the recipient's IP address
2. **Geolocation API**: Uses ip-api.com (free service) to get country from IP
3. **Storage**: Country name and code are stored in `email_open_tracking` table
4. **Display**: Country is shown in the Recipients table

### API Used

- **Service**: ip-api.com
- **Free Tier**: 45 requests/minute (no API key needed)
- **Fields**: Country name and country code (2-letter ISO code)

## Frontend Display

The Recipients table now shows:

1. **Opened Column**:
   - ✓ Yes (green badge) - if email was opened
   - ✗ No (grey badge) - if email was not opened
   - Shows open count if opened multiple times

2. **Country Column**:
   - Shows country name (e.g., "United States")
   - Shows country code in parentheses (e.g., "US")
   - Shows "-" if country is unknown or email not opened

## Example Display

| Email | Status | Opened | Country | SMTP Server | Sent At |
|-------|--------|--------|---------|-------------|----------|
| user@example.com | SENT | ✓ Yes (2x) | United States (US) | 1 | 11/22/2025, 4:40:46 PM |
| user2@example.com | SENT | ✗ No | - | 1 | 11/22/2025, 4:40:47 PM |

## Limitations

1. **Localhost/Private IPs**: Cannot detect country for localhost (127.0.0.1) or private IPs (192.168.x.x, 10.x.x.x)
2. **VPN/Proxy**: Country may reflect VPN/proxy location, not actual user location
3. **Rate Limits**: ip-api.com has 45 requests/minute limit (should be fine for normal use)
4. **Image Blocking**: Some email clients block images by default, so opens won't be tracked

## Testing

1. **Send a test campaign** to your own email
2. **Open the email** in your email client
3. **Check the campaign detail page** - should show:
   - Opened: ✓ Yes
   - Country: Your country (if not localhost)

## Troubleshooting

### Country shows "Unknown"

- **Localhost**: If testing locally, IP will be 127.0.0.1 - country will be "Unknown"
- **API Error**: Check backend logs for geolocation API errors
- **Network Issue**: Backend needs internet access to call geolocation API

### Opens not being tracked

- **Image Blocking**: Some email clients block images by default
- **Check tracking URL**: Verify tracking pixel URL is correct in email HTML
- **Backend Logs**: Check for errors in tracking endpoint

### Migration Errors

If you get "Duplicate column name" errors:
- Columns already exist - that's fine!
- Just verify with: `DESCRIBE email_open_tracking;`

## API Details

The geolocation uses ip-api.com:
- **Endpoint**: `https://ip-api.com/json/{ip}?fields=status,country,countryCode`
- **Free**: No API key required
- **Limit**: 45 requests/minute
- **Timeout**: 2 seconds (falls back to "Unknown" if timeout)

## Privacy Note

- IP addresses are stored for tracking purposes
- Country information is derived from IP addresses
- This is standard practice in email marketing
- Users can block images to prevent tracking


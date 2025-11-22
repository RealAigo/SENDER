# Quick Fix: SMTP Test 400 Error

## Common Cause: Port Field Missing

If you see "Host: smtp.yandex.com:465" in the display, it means the **port is included in the host field** instead of being in a separate port field.

## Step-by-Step Fix

### 1. Click "Edit" on your SMTP server

### 2. Check and Fix These Fields:

**Host Field:**
- ❌ Wrong: `smtp.yandex.com:465`
- ✅ Correct: `smtp.yandex.com`

**Port Field:**
- ❌ Wrong: Empty or 0
- ✅ Correct: `465` (or `587` for TLS)

### 3. Verify Other Fields:
- **Username**: Should be your full email (e.g., `anasselbachiri@yandex.com`)
- **Password**: Must be filled (required)
- **From Email**: Should match your email
- **Secure**: Should be checked (✓) for ports 465 or 587

### 4. Save and Test Again

## Yandex Mail SMTP Settings

For Yandex Mail, use these exact settings:

- **Host**: `smtp.yandex.com`
- **Port**: `465` (SSL) or `587` (TLS)
- **Secure**: Yes (checked)
- **Username**: Your full Yandex email
- **Password**: Your Yandex password (or App Password if 2FA is enabled)
- **From Email**: Your Yandex email

## After Fixing

1. Click "Save" to update the SMTP server
2. Click "Test" again
3. You should now see either:
   - ✅ "SMTP connection successful" - Great! You're all set.
   - ❌ A detailed error message - This will tell you exactly what's wrong.

## Still Getting Errors?

Check the backend console (terminal where you ran `npm start`) for detailed error messages. The console will show:
- Which fields are missing
- What values are in each field
- Any connection errors

## Need More Help?

Run the diagnostic script:
```bash
cd backend
node scripts/check-smtp.js 1
```

This will show you exactly what's wrong with your SMTP configuration.






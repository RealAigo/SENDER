# Debugging SMTP 400 Error

## Step 1: Check Backend Console

When you click "Test", check the **backend terminal** (where you ran `npm start`). You should see:

```
Testing SMTP server 1 (smtp1): {
  host: 'smtp.yandex.com:465',
  port: null,  // or 0 or undefined
  secure: true,
  username: 'anasselbachiri@yandex.com',
  hasPassword: true/false,
  passwordLength: 0 or some number
}
```

This will tell you exactly what's in the database.

## Step 2: Check Browser Console

In the browser console (F12), expand the error object. You should see:
- `status: 400`
- `data: { ... }` - Click to expand this

The `data` object should contain:
- `error`: The error message
- `missingFields`: Array of missing fields
- `fieldDetails`: Details about each field
- `message`: Human-readable message

## Step 3: Most Likely Issue

Based on your display showing `Host: smtp.yandex.com:465`, the problem is:

1. **Port is in the Host field** instead of separate Port field
2. **Port field is empty or 0** in the database

## Quick Fix

1. Click **"Edit"** on the SMTP server
2. In the **Host** field, change:
   - From: `smtp.yandex.com:465`
   - To: `smtp.yandex.com`
3. In the **Port** field, enter: `465`
4. Make sure **Password** is filled
5. Click **"Save"**
6. Click **"Test"** again

## Verify Database

You can also check the database directly:

```sql
SELECT id, name, host, port, username, 
       CASE WHEN password IS NULL OR password = '' THEN 'EMPTY' ELSE 'EXISTS' END as password_status
FROM smtp_servers 
WHERE id = 1;
```

This will show you exactly what's stored.

## Expected Result After Fix

After fixing, when you test, you should see either:

✅ **Success:**
```
SMTP connection successful!

Host: smtp.yandex.com
Port: 465
Secure: Yes (TLS/SSL)
```

❌ **Detailed Error:**
```
SMTP Connection Failed

Error: Missing required SMTP configuration fields: port

❌ Missing Required Fields: port

Field Details:
  • port: empty

💡 Solution: Click "Edit" on the SMTP server and fill in the missing fields.
```






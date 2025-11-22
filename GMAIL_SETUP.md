# Gmail SMTP Setup Guide

## Common Issues and Solutions

### 1. Connection Timeout (ETIMEDOUT)

**Symptoms:**
- Error: "Connection timeout"
- Error Code: ETIMEDOUT
- Connection fails after 15-30 seconds

**Possible Causes & Solutions:**

#### A. App Password Required
Gmail requires an **App Password** (not your regular password) if:
- 2-Factor Authentication (2FA) is enabled
- "Less secure app access" is disabled (deprecated by Google)

**Solution:**
1. Enable 2FA on your Google account: https://myaccount.google.com/security
2. Generate an App Password:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Enter "Email Sender" as the name
   - Copy the 16-character password
3. Use this App Password in the SMTP configuration (not your regular password)

#### B. Port 465 vs 587
Gmail supports both ports, but 587 is often more reliable:

**Port 587 (Recommended):**
- Uses STARTTLS
- More likely to work through firewalls
- Better compatibility

**Port 465:**
- Uses SSL
- May be blocked by some firewalls
- Can timeout if network doesn't allow direct SSL

**Solution:** Try switching to port 587:
1. Edit your SMTP server
2. Change Port from `465` to `587`
3. Keep "Secure" checked (it will automatically use STARTTLS)
4. Save and test again

#### C. Firewall/Network Issues
Your firewall or network might be blocking SMTP connections.

**Solution:**
1. Check if your firewall allows outbound connections on ports 465/587
2. Try from a different network (mobile hotspot, different WiFi)
3. Check if your ISP blocks SMTP ports
4. Try port 587 instead of 465 (often less blocked)

### 2. Authentication Failed (EAUTH)

**Symptoms:**
- Error: "Authentication failed"
- Error Code: EAUTH

**Solution:**
- Use App Password (see above)
- Make sure username is your full Gmail address
- Double-check password (no extra spaces)

### 3. SSL/TLS Errors

**Symptoms:**
- "Wrong version number"
- SSL certificate errors

**Solution:**
- Port 587: Secure should be checked (uses STARTTLS)
- Port 465: Secure should be checked (uses SSL)
- The system now automatically sets this based on port

## Recommended Gmail Settings

### Option 1: Port 587 (Recommended)
```
Host: smtp.gmail.com
Port: 587
Secure: Yes (checked) - will use STARTTLS
Username: your-email@gmail.com
Password: [App Password - 16 characters]
From Email: your-email@gmail.com
```

### Option 2: Port 465
```
Host: smtp.gmail.com
Port: 465
Secure: Yes (checked) - will use SSL
Username: your-email@gmail.com
Password: [App Password - 16 characters]
From Email: your-email@gmail.com
```

## Step-by-Step Setup

1. **Enable 2FA** (if not already enabled)
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" → "Other (Custom name)"
   - Name it "Email Sender"
   - Copy the 16-character password (looks like: `abcd efgh ijkl mnop`)

3. **Configure SMTP Server**
   - Host: `smtp.gmail.com`
   - Port: `587` (recommended) or `465`
   - Secure: Yes (checked)
   - Username: Your full Gmail address
   - Password: The 16-character App Password (remove spaces if any)
   - From Email: Your Gmail address

4. **Test Connection**
   - Click "Test" button
   - Should see "SMTP connection successful"

## Troubleshooting Checklist

- [ ] 2FA is enabled on Google account
- [ ] App Password is generated (16 characters)
- [ ] Using App Password (not regular password)
- [ ] Username is full email address
- [ ] Port is 587 or 465
- [ ] Secure checkbox is checked
- [ ] Firewall allows outbound SMTP
- [ ] Network allows SMTP connections
- [ ] Try port 587 if 465 times out

## Still Having Issues?

1. **Check backend console** - Look for detailed error messages
2. **Try port 587** - More reliable than 465
3. **Verify App Password** - Generate a new one if needed
4. **Test from different network** - Rule out firewall issues
5. **Check Gmail account** - Make sure it's not locked or restricted

## Alternative: Use Gmail API

If SMTP continues to have issues, consider using Gmail API instead (requires OAuth2 setup, more complex but more reliable).


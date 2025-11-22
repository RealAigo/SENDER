# Troubleshooting Guide

## SMTP Connection Issues

### "Failed to test SMTP connection"

This error can occur for several reasons. Follow these steps to diagnose and fix:

### 1. Check SMTP Credentials

**Common Issues:**
- Wrong username or password
- For Gmail: You must use an **App Password**, not your regular password
- Password may have been encrypted with a different key

**Solutions:**
- Double-check username and password
- For Gmail: 
  1. Enable 2-Factor Authentication
  2. Go to https://myaccount.google.com/apppasswords
  3. Generate an App Password
  4. Use this App Password (16 characters) instead of your regular password

### 2. Verify SMTP Settings

**Common SMTP Settings:**

**Gmail:**
- Host: `smtp.gmail.com`
- Port: `587` (TLS) or `465` (SSL)
- Secure: `Yes` (checked)
- Username: Your full Gmail address
- Password: App Password (not regular password)

**Outlook/Hotmail:**
- Host: `smtp-mail.outlook.com`
- Port: `587`
- Secure: `Yes` (checked)
- Username: Your Outlook email
- Password: Your Outlook password

**Yahoo:**
- Host: `smtp.mail.yahoo.com`
- Port: `587` or `465`
- Secure: `Yes` (checked)
- Username: Your Yahoo email
- Password: App Password (similar to Gmail)

### 3. Check Network/Firewall

**Symptoms:**
- Error: "ETIMEDOUT" or "Connection timeout"
- Error: "ECONNREFUSED"

**Solutions:**
- Ensure your firewall allows outbound connections on SMTP ports (587, 465, 25)
- Check if your network blocks SMTP connections
- Try from a different network to rule out network issues
- Some ISPs block port 25; use 587 or 465 instead

### 4. SSL/TLS Certificate Issues

**Symptoms:**
- Error mentions "certificate" or "SSL"
- Error: "UNABLE_TO_VERIFY_LEAF_SIGNATURE"

**Solutions:**
- Try changing the "Secure" checkbox (SSL/TLS setting)
- Port 587 usually uses TLS (Secure = Yes)
- Port 465 usually uses SSL (Secure = Yes)
- Port 25 usually doesn't use encryption (Secure = No, not recommended)

### 5. Encryption Key Issues

**Symptoms:**
- Error: "Decryption failed"
- Password seems correct but connection fails

**Solutions:**
- The encryption key in `.env` may have changed
- Update the SMTP server password in the system
- Ensure `ENCRYPTION_KEY` in backend `.env` is set correctly
- If you changed the encryption key, all existing passwords need to be re-entered

### 6. Port Issues

**Common Ports:**
- **587**: Submission port (TLS) - Most common, recommended
- **465**: SMTPS (SSL) - Legacy but still used
- **25**: SMTP (unencrypted) - Often blocked by ISPs, not recommended

**Solutions:**
- Try port 587 first (most reliable)
- If 587 doesn't work, try 465
- Avoid port 25 if possible

### 7. Rate Limiting

**Symptoms:**
- Connection works initially but fails after some time
- Error: "Too many connections"

**Solutions:**
- Some SMTP servers limit connections per IP
- Wait a few minutes and try again
- Check your daily/hourly limits in the system

## Step-by-Step Debugging

1. **Test with a simple email client first**
   - Use Outlook, Thunderbird, or Mail app
   - If it works there, the credentials are correct
   - If it doesn't work, fix credentials first

2. **Check backend logs**
   - Look at the terminal where backend is running
   - Error messages will show more details
   - Look for specific error codes (EAUTH, ETIMEDOUT, etc.)

3. **Verify database**
   - Check if SMTP server was saved correctly
   - Ensure password field is not empty
   - Try deleting and re-adding the SMTP server

4. **Test connection manually**
   - You can test SMTP connection using command line tools
   - Or use online SMTP testers (be careful with credentials)

## Common Error Messages

### "EAUTH" or "Authentication failed"
- **Cause**: Wrong username or password
- **Fix**: Verify credentials, use App Password for Gmail

### "ETIMEDOUT" or "Connection timeout"
- **Cause**: Network issue, firewall, or wrong host/port
- **Fix**: Check network, verify host and port

### "ECONNREFUSED"
- **Cause**: Wrong host or port, or server is down
- **Fix**: Verify SMTP server address and port

### "Decryption failed"
- **Cause**: Encryption key changed or password not encrypted
- **Fix**: Update the SMTP password in the system

### "Certificate" or "SSL" errors
- **Cause**: SSL/TLS configuration mismatch
- **Fix**: Toggle the "Secure" setting, try different port

## Getting More Help

If you're still having issues:

1. **Check the detailed error message** - The system now shows specific error details
2. **Review backend console** - Look for detailed error logs
3. **Test credentials elsewhere** - Verify they work in another email client
4. **Check SMTP provider documentation** - Each provider has specific requirements

## Testing Checklist

Before reporting an issue, verify:

- [ ] SMTP host is correct
- [ ] Port is correct (usually 587)
- [ ] Username is correct (full email address)
- [ ] Password is correct (App Password for Gmail)
- [ ] Secure/SSL setting matches the port
- [ ] Firewall allows outbound SMTP connections
- [ ] Backend `.env` has correct `ENCRYPTION_KEY`
- [ ] Backend server is running
- [ ] Database connection is working






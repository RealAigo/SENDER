# Common Error Messages & Solutions

## HTTP 400 Bad Request

### "Missing required fields"
**Cause**: One or more required fields are empty when creating/updating SMTP server.

**Required Fields:**
- Name
- Host
- Port
- Username
- Password (when creating new server)
- From Email

**Solution**: Fill in all required fields marked with * in the form.

---

### "Invalid port number"
**Cause**: Port is not a valid number or is outside the valid range (1-65535).

**Solution**: 
- Enter a number between 1 and 65535
- Common SMTP ports: 587, 465, 25
- Make sure port field contains only numbers

---

### "Invalid email format"
**Cause**: The "From Email" field doesn't contain a valid email address.

**Solution**: 
- Enter a valid email format: `user@example.com`
- Check for typos
- Make sure it includes @ symbol and domain

---

### "Name cannot be empty" / "Host cannot be empty" / "Username cannot be empty"
**Cause**: Field contains only whitespace or is empty.

**Solution**: Enter actual text, not just spaces.

---

### "Password cannot be empty"
**Cause**: Trying to update SMTP server with empty password.

**Solution**: 
- When editing, either enter a new password or leave password field empty to keep existing password
- When creating new server, password is required

---

### "Daily limit must be a number >= 0" / "Hourly limit must be a number >= 0"
**Cause**: Limit fields contain invalid values.

**Solution**: 
- Enter 0 for unlimited
- Enter a positive number for the limit
- Don't enter negative numbers or text

---

## HTTP 404 Not Found

### "SMTP server not found"
**Cause**: Trying to access/update/delete an SMTP server that doesn't exist.

**Solution**: Refresh the page and try again. The server may have been deleted.

---

## HTTP 500 Internal Server Error

### Database connection errors
**Cause**: Backend cannot connect to MySQL database.

**Solution**:
1. Check if MySQL is running (XAMPP Control Panel)
2. Verify database credentials in `backend/.env`
3. Ensure database `email_sender` exists
4. Check backend console for detailed error

---

### Encryption errors
**Cause**: Password decryption failed, usually due to encryption key mismatch.

**Solution**:
1. Check `ENCRYPTION_KEY` in `backend/.env` is set correctly
2. If you changed the encryption key, you need to re-enter all SMTP passwords
3. Make sure encryption key is exactly 32 characters (or the system will use default)

---

## Network Errors

### "Network Error" or "Failed to fetch"
**Cause**: Frontend cannot reach backend server.

**Solution**:
1. Check if backend is running on port 3001
2. Check browser console for CORS errors
3. Verify `CORS_ORIGIN` in backend `.env` matches frontend URL
4. Check firewall/antivirus isn't blocking connections

---

## Form Validation Tips

### Before Submitting:
- ✅ All required fields (*) are filled
- ✅ Port is a number between 1-65535
- ✅ From Email is a valid email format
- ✅ Limits are numbers >= 0
- ✅ Password is entered (for new servers)

### Common Mistakes:
- ❌ Leaving port as empty or 0
- ❌ Entering email without @ symbol
- ❌ Using spaces only in text fields
- ❌ Negative numbers in limit fields
- ❌ Special characters in port field

---

## Getting More Help

If you see an error not listed here:

1. **Check the browser console** (F12 → Console tab)
   - Look for detailed error messages
   - Check Network tab to see the actual request/response

2. **Check backend console** (terminal where backend is running)
   - Look for server-side error logs
   - Check for database connection issues

3. **Check the error details**:
   - The system now shows specific error messages
   - Look for the exact field or value causing the issue

4. **Try these steps**:
   - Refresh the page
   - Clear browser cache
   - Restart backend server
   - Check all form fields are valid






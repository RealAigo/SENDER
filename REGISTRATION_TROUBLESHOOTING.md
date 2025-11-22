# Registration Troubleshooting Guide

If you're getting "Registration failed" error, follow these steps:

## Step 1: Check Backend Server

Make sure your backend server is running:

```bash
cd backend
npm start
```

You should see: `Server running on port 3001`

If you see errors, check:
- Is MySQL running? (XAMPP Control Panel)
- Are database credentials correct in `backend/.env`?
- Is port 3001 available?

## Step 2: Check Database Connection

Test your database connection:

```bash
node backend/scripts/check-users-table.js
```

This will verify:
- ✅ Database connection works
- ✅ Users table exists
- ✅ Table structure is correct

## Step 3: Check Browser Console

Open your browser's developer console (F12) and check for errors:

1. **Network Errors**:
   - "Cannot connect to server" → Backend not running
   - "CORS error" → Check `CORS_ORIGIN` in backend `.env`

2. **API Errors**:
   - Look for the actual error message in the Network tab
   - Click on the failed request to see the response

## Step 4: Check Backend Logs

Look at your backend terminal for error messages. Common errors:

### "Database table 'users' does not exist"
**Solution**: Run the database migration:
```bash
mysql -u root -p email_sender < database/schema.sql
```

Or if you have an existing database:
```bash
mysql -u root -p email_sender < database/migration_auth.sql
```

### "Cannot connect to database"
**Solution**: 
- Make sure MySQL is running
- Check `DB_HOST`, `DB_USER`, `DB_PASSWORD` in `backend/.env`
- Verify database `email_sender` exists

### "Username or email already exists"
**Solution**: Use a different username or email address

### "ER_ACCESS_DENIED_ERROR"
**Solution**: Check your MySQL username and password in `backend/.env`

## Step 5: Verify Environment Variables

Make sure your `backend/.env` file has these variables:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=email_sender
DB_PORT=3306

JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d

PORT=3001
CORS_ORIGIN=http://localhost:3000
```

## Step 6: Test Registration with cURL

Test registration directly from command line:

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"test123"}'
```

This will show you the exact error message from the backend.

## Common Issues and Solutions

### Issue: "Registration failed" with no details
**Solution**: 
1. Check backend terminal for error logs
2. Check browser console for network errors
3. Verify backend is running on port 3001

### Issue: "Cannot connect to server"
**Solution**: 
1. Make sure backend server is running: `cd backend && npm start`
2. Check if port 3001 is being used by another application
3. Verify `CORS_ORIGIN` matches your frontend URL

### Issue: "Network Error" in browser
**Solution**:
1. Check backend is running
2. Verify API URL in `frontend/src/services/api.js` is correct
3. Check CORS settings in backend

### Issue: Database errors
**Solution**:
1. Ensure MySQL is running (XAMPP Control Panel)
2. Verify database `email_sender` exists
3. Check database credentials in `.env`
4. Run migration script if users table doesn't exist

## Still Having Issues?

1. **Check the exact error message** in:
   - Browser console (F12)
   - Backend terminal
   - Network tab in browser DevTools

2. **Verify all requirements**:
   - Node.js installed
   - MySQL running
   - Dependencies installed (`npm install` in both backend and frontend)
   - Environment variables set

3. **Try a fresh start**:
   ```bash
   # Stop backend (Ctrl+C)
   # Restart MySQL
   # Start backend again
   cd backend
   npm start
   ```

If you're still stuck, check the error messages in the browser console and backend logs for specific details.



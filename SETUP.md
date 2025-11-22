# Quick Setup Guide

## Step-by-Step Installation

### 1. Database Setup (5 minutes)

1. **Start MySQL** (via XAMPP Control Panel or your MySQL service)

2. **Create the database**:
   - Open phpMyAdmin: `http://localhost/phpmyadmin`
   - Or use MySQL command line:
   ```bash
   mysql -u root -p
   ```
   - Then run:
   ```sql
   source database/schema.sql
   ```
   - Or manually import `database/schema.sql` in phpMyAdmin

### 2. Backend Setup (5 minutes)

1. **Navigate to backend folder**:
   ```bash
   cd backend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create `.env` file** (copy from `.env.example` if it exists, or create new):
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=email_sender
   DB_PORT=3306
   PORT=3001
   NODE_ENV=development
   ENCRYPTION_KEY=change-this-to-random-32-chars
   JWT_SECRET=your-secret-key-change-in-production
   JWT_EXPIRES_IN=7d
   CORS_ORIGIN=http://localhost:3000
   ```

4. **Generate encryption keys** (run these commands):
   ```bash
   # Generate ENCRYPTION_KEY (32 characters)
   node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
   
   # Generate JWT_SECRET (64 characters - recommended for production)
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Copy the outputs and paste them as `ENCRYPTION_KEY` and `JWT_SECRET` in `.env`
   
   **Important**: Use strong, random keys in production!

5. **Create uploads directory**:
   ```bash
   mkdir uploads
   ```

6. **Start backend**:
   ```bash
   npm start
   ```
   You should see: `Server running on port 3001`

### 3. Frontend Setup (3 minutes)

1. **Open a new terminal** and navigate to frontend:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start frontend**:
   ```bash
   npm start
   ```
   Browser should open automatically to `http://localhost:3000`

### 4. First Steps

1. **Register your account**:
   - Open `http://localhost:3000` in your browser
   - You'll be redirected to the login page
   - Click "Sign up" to create a new account
   - Fill in username, email, and password (minimum 6 characters)
   - After registration, you'll be automatically logged in

2. **Add your first SMTP server**:
   - Go to "SMTP Servers" in the sidebar
   - Click "+ Add SMTP Server"
   - Fill in your SMTP details (Gmail, Outlook, etc.)
   - Click "Test" to verify connection
   - Click "Create"

3. **Create your first campaign**:
   - Go to "Campaigns" → "Create Campaign"
   - Enter campaign name and subject
   - Write your HTML email
   - Add recipients (upload CSV or manual entry)
   - Start the campaign!

## Common SMTP Settings

### Gmail
- Host: `smtp.gmail.com`
- Port: `587`
- Secure: `Yes` (TLS)
- Username: Your Gmail address
- Password: App Password (not your regular password)
  - Enable 2FA first
  - Generate app password: https://myaccount.google.com/apppasswords

### Outlook/Hotmail
- Host: `smtp-mail.outlook.com`
- Port: `587`
- Secure: `Yes` (TLS)
- Username: Your Outlook email
- Password: Your Outlook password

### Custom SMTP
- Check with your email provider for SMTP settings
- Common ports: 587 (TLS), 465 (SSL), 25 (unencrypted - not recommended)

## Authentication

This application includes secure authentication. Users must:
1. Register an account (first time users)
2. Login with email and password
3. All API endpoints (except auth) require authentication

See `AUTHENTICATION.md` for detailed authentication documentation.

## Troubleshooting

### "Access token required" or authentication errors
- Make sure you're logged in
- Check if `JWT_SECRET` is set in backend `.env`
- Clear browser localStorage and login again: `localStorage.clear()` in browser console
- See `AUTHENTICATION.md` for more details

### "Cannot connect to database"
- Make sure MySQL is running
- Check database credentials in `.env`
- Verify database `email_sender` exists

### "Port 3001 already in use"
- Change `PORT` in backend `.env` to another port (e.g., 3002)
- Update `CORS_ORIGIN` if needed

### "SMTP connection failed"
- Verify SMTP credentials
- Check if you need an app password (Gmail)
- Ensure firewall allows outbound SMTP connections
- Try different port (587 vs 465)

### Frontend shows "Network Error"
- Make sure backend is running on port 3001
- Check browser console for detailed errors
- Verify `CORS_ORIGIN` in backend `.env` matches frontend URL

## Next Steps

- Read the full `README.md` for detailed documentation
- Check the dashboard for statistics
- Monitor campaign progress in real-time
- Review email logs for failed sends


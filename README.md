# Multi-SMTP Email Sending System

A complete web application for sending emails using multiple SMTP servers with intelligent load balancing, real-time progress tracking, and comprehensive campaign management.

## Features

- ✅ **Unlimited SMTP Servers**: Add and manage multiple SMTP servers
- ✅ **Smart Load Balancing**: Automatically distributes emails across SMTP servers based on daily/hourly limits
- ✅ **Campaign Management**: Create, manage, and track email campaigns
- ✅ **HTML Email Support**: Rich HTML email editor with preview
- ✅ **Real-time Progress**: Live updates on email sending progress via WebSockets
- ✅ **CSV Import**: Upload recipient lists via CSV files
- ✅ **Dashboard**: Comprehensive statistics and performance metrics
- ✅ **Secure**: Encrypted SMTP password storage
- ✅ **Usage Tracking**: Daily and hourly usage tracking per SMTP server

## Tech Stack

- **Backend**: Node.js, Express.js, Socket.io
- **Frontend**: React.js, React Router, React Quill
- **Database**: MySQL
- **Email**: Nodemailer
- **Real-time**: Socket.io

## Prerequisites

- Node.js (v14 or higher)
- MySQL (via XAMPP or standalone)
- npm or yarn

## Installation

### 1. Database Setup

1. Start MySQL (via XAMPP or your MySQL server)
2. Open phpMyAdmin or MySQL command line
3. Import the database schema:

```bash
mysql -u root -p < database/schema.sql
```

Or manually execute the SQL file in phpMyAdmin.

### 2. Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```

4. Edit `.env` and configure your database settings:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=email_sender
DB_PORT=3306

PORT=3001
NODE_ENV=development

# Generate a random 32-character string for encryption
ENCRYPTION_KEY=your-32-character-encryption-key-here

CORS_ORIGIN=http://localhost:3000
```

**Important**: Generate a secure encryption key for `ENCRYPTION_KEY`. You can use:
```bash
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

5. Create the `uploads` directory:
```bash
mkdir uploads
```

6. Start the backend server:
```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

The backend will run on `http://localhost:3001`

### 3. Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file (optional, defaults are set):
```env
REACT_APP_API_URL=http://localhost:3001/api
```

4. Start the frontend development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Usage Guide

### 1. Add SMTP Servers

1. Navigate to **SMTP Servers** in the sidebar
2. Click **+ Add SMTP Server**
3. Fill in the SMTP details:
   - **Name**: A friendly name for this server
   - **Host**: SMTP server hostname (e.g., smtp.gmail.com)
   - **Port**: SMTP port (usually 587 for TLS, 465 for SSL)
   - **Secure**: Check if using SSL/TLS
   - **Username**: Your SMTP username
   - **Password**: Your SMTP password (encrypted in database)
   - **From Email**: The sender email address
   - **From Name**: Display name for sender
   - **Daily Limit**: Maximum emails per day (0 = unlimited)
   - **Hourly Limit**: Maximum emails per hour (0 = unlimited)
4. Click **Test** to verify the connection
5. Click **Create** to save

### 2. Create a Campaign

1. Navigate to **Campaigns** → **Create Campaign**
2. Fill in campaign details:
   - **Campaign Name**: A descriptive name
   - **Email Subject**: The email subject line
   - **HTML Content**: Use the rich text editor to create your email
3. Click **Next: Add Recipients**

### 3. Add Recipients

You have two options:

**Option A: Upload CSV File**
- Create a CSV file with an "email" column (or first column contains emails)
- Click **Choose CSV File** and select your file
- The system will automatically parse and import emails

**Option B: Manual Entry**
- Enter email addresses, one per line
- Click **Add Recipients**

### 4. Start Campaign

1. Navigate to your campaign detail page
2. Review the email preview
3. Click **Start Campaign**
4. Monitor real-time progress:
   - Total emails
   - Sent count
   - Failed count
   - Remaining count
   - Current SMTP server being used
   - Current email being sent

### 5. Monitor Dashboard

The dashboard shows:
- SMTP server statistics
- Campaign overview
- Daily email counts
- SMTP performance metrics
- Recent campaign activity

## CSV File Format

Your CSV file should have one of these formats:

```csv
email
user1@example.com
user2@example.com
user3@example.com
```

Or:

```csv
Email
user1@example.com
user2@example.com
```

Or simply:

```csv
user1@example.com
user2@example.com
user3@example.com
```

## API Endpoints

### SMTP Servers
- `GET /api/smtp` - Get all SMTP servers
- `GET /api/smtp/:id` - Get single SMTP server
- `POST /api/smtp` - Create SMTP server
- `PUT /api/smtp/:id` - Update SMTP server
- `DELETE /api/smtp/:id` - Delete SMTP server
- `POST /api/smtp/:id/test` - Test SMTP connection
- `GET /api/smtp/:id/usage` - Get SMTP usage statistics

### Campaigns
- `GET /api/campaigns` - Get all campaigns
- `GET /api/campaigns/:id` - Get single campaign
- `POST /api/campaigns` - Create campaign
- `DELETE /api/campaigns/:id` - Delete campaign
- `POST /api/campaigns/:id/recipients` - Upload recipients CSV
- `POST /api/campaigns/:id/recipients/manual` - Add recipients manually
- `POST /api/campaigns/:id/start` - Start campaign
- `POST /api/campaigns/:id/pause` - Pause campaign

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/smtp-usage` - Get SMTP usage chart data
- `GET /api/dashboard/campaigns` - Get campaign statistics

## Security Features

1. **Password Encryption**: SMTP passwords are encrypted using AES-256-CBC before storage
2. **Input Validation**: All inputs are validated on both client and server
3. **SQL Injection Protection**: Using parameterized queries
4. **CORS Configuration**: Configurable CORS for API security

## How Load Balancing Works

The system intelligently distributes emails across available SMTP servers:

1. Checks all active SMTP servers
2. Verifies each server's remaining daily and hourly capacity
3. Distributes emails in a weighted round-robin fashion
4. Prioritizes servers with more available capacity
5. Automatically skips servers that have reached their limits

## Troubleshooting

### Backend won't start
- Check if MySQL is running
- Verify database credentials in `.env`
- Ensure port 3001 is not in use

### Frontend won't connect
- Verify backend is running on port 3001
- Check CORS settings in backend `.env`
- Check browser console for errors

### Emails not sending
- Test SMTP connection using the "Test" button
- Verify SMTP credentials are correct
- Check if SMTP servers have reached their limits
- Review error messages in campaign detail page

### CSV import fails
- Ensure CSV file has proper format
- Check that emails are in the first column or "email" column
- Verify file is a valid CSV format

## Production Deployment

1. Set `NODE_ENV=production` in backend `.env`
2. Build the frontend:
```bash
cd frontend
npm run build
```
3. Serve the frontend build folder using a web server (nginx, Apache, etc.)
4. Use a process manager like PM2 for the backend:
```bash
npm install -g pm2
pm2 start backend/server.js --name email-sender
```
5. Configure SSL/HTTPS for production
6. Use environment variables for all sensitive data
7. Set up proper database backups

## License

This project is open source and available for use.

## Support

For issues or questions, please check the code comments or create an issue in the repository.


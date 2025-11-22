# Project Structure

```
email-sender/
│
├── backend/                    # Node.js/Express Backend
│   ├── config/
│   │   └── database.js        # MySQL connection pool
│   ├── routes/
│   │   ├── smtp.js            # SMTP server management routes
│   │   ├── campaigns.js       # Campaign management routes
│   │   └── dashboard.js       # Dashboard statistics routes
│   ├── utils/
│   │   ├── encryption.js      # Password encryption/decryption
│   │   ├── emailSender.js     # Email sending logic
│   │   └── campaignDistributor.js  # Load balancing logic
│   ├── uploads/               # CSV uploads directory (created at runtime)
│   ├── server.js              # Main server file with Socket.io
│   ├── package.json           # Backend dependencies
│   └── .env                   # Backend environment variables (create from .env.example)
│
├── frontend/                  # React Frontend
│   ├── public/
│   │   └── index.html         # HTML template
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.js      # Main layout with sidebar
│   │   │   └── Layout.css
│   │   ├── pages/
│   │   │   ├── Dashboard.js   # Dashboard page
│   │   │   ├── Dashboard.css
│   │   │   ├── SMTPManagement.js  # SMTP server management
│   │   │   ├── SMTPManagement.css
│   │   │   ├── Campaigns.js   # Campaigns list
│   │   │   ├── Campaigns.css
│   │   │   ├── CreateCampaign.js  # Create campaign form
│   │   │   ├── CreateCampaign.css
│   │   │   ├── CampaignDetail.js  # Campaign detail with real-time progress
│   │   │   └── CampaignDetail.css
│   │   ├── services/
│   │   │   └── api.js         # API client functions
│   │   ├── App.js             # Main app component with routing
│   │   ├── App.css
│   │   ├── index.js           # React entry point
│   │   └── index.css          # Global styles
│   ├── package.json           # Frontend dependencies
│   └── .env                   # Frontend environment variables (optional)
│
├── database/
│   └── schema.sql             # MySQL database schema
│
├── sample-recipients.csv      # Sample CSV file for testing
├── README.md                  # Main documentation
├── SETUP.md                   # Quick setup guide
├── PROJECT_STRUCTURE.md       # This file
├── package.json               # Root package.json with helper scripts
└── .gitignore                 # Git ignore rules
```

## Key Components

### Backend Architecture

1. **Database Layer** (`config/database.js`)
   - MySQL connection pool
   - Handles all database operations

2. **Routes** (`routes/`)
   - RESTful API endpoints
   - Request validation
   - Error handling

3. **Business Logic** (`utils/`)
   - **encryption.js**: AES-256-CBC encryption for SMTP passwords
   - **emailSender.js**: Nodemailer wrapper with limit checking
   - **campaignDistributor.js**: Intelligent load balancing algorithm

4. **Real-time** (`server.js`)
   - Socket.io server for live progress updates
   - Campaign progress broadcasting

### Frontend Architecture

1. **Pages** (`src/pages/`)
   - Dashboard: Overview and statistics
   - SMTP Management: CRUD for SMTP servers
   - Campaigns: List and detail views
   - Create Campaign: Multi-step form with HTML editor

2. **Components** (`src/components/`)
   - Layout: Sidebar navigation
   - Reusable UI components

3. **Services** (`src/services/`)
   - API client with axios
   - Socket.io client connection

### Database Schema

1. **smtp_servers**: Stores SMTP server configurations
2. **smtp_usage**: Tracks daily/hourly email counts per server
3. **campaigns**: Campaign metadata
4. **campaign_recipients**: Individual recipient records
5. **email_logs**: Detailed email sending logs

## Data Flow

### Campaign Sending Flow

1. User creates campaign → `POST /api/campaigns`
2. User adds recipients → `POST /api/campaigns/:id/recipients`
3. User starts campaign → `POST /api/campaigns/:id/start`
4. Backend calculates distribution → `CampaignDistributor.distributeCampaign()`
5. Emails sent sequentially → `EmailSender.sendEmail()`
6. Progress updates via Socket.io → Frontend receives real-time updates
7. Campaign completes → Status updated in database

### Load Balancing Algorithm

1. Get all active SMTP servers
2. Initialize each server and check current limits
3. Filter servers with available capacity
4. Sort by remaining capacity (descending)
5. Distribute recipients using weighted round-robin
6. Re-check limits if needed during distribution
7. Assign each recipient to best available server

## Security Features

1. **Password Encryption**: SMTP passwords encrypted before storage
2. **Parameterized Queries**: SQL injection prevention
3. **Input Validation**: Both client and server-side
4. **CORS Configuration**: Configurable API access
5. **Environment Variables**: Sensitive data in .env files

## Real-time Updates

- Socket.io connection established on campaign detail page
- Server emits progress events: `campaign:{id}:progress`
- Client subscribes to campaign room
- Updates include: sent count, failed count, current SMTP, current email

## File Uploads

- CSV files uploaded via Multer
- Stored temporarily in `backend/uploads/`
- Parsed using csv-parser
- File deleted after processing
- Supports multiple CSV formats


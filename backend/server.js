const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const smtpRoutes = require('./routes/smtp');
const campaignRoutes = require('./routes/campaigns');
const dashboardRoutes = require('./routes/dashboard');
const authRoutes = require('./routes/auth');

const app = express();
const server = http.createServer(app);

// Socket.IO setup
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.set('io', io);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
//Frontend
const path = require('path');
app.use(express.static(path.join(__dirname, 'build')));

// Serve index.html on all unmatched routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});
// Error handling middleware for JSON parsing
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  next();
});

// Create uploads directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Public Routes
app.use('/api/auth', authRoutes);
app.use('/api/tracking', require('./routes/tracking')); // Email tracking (no auth required)

// Protected Routes (require authentication)
const { authenticateToken } = require('./middleware/auth');
app.use('/api/smtp', authenticateToken, smtpRoutes);
app.use('/api/campaigns', authenticateToken, campaignRoutes);
app.use('/api/dashboard', authenticateToken, dashboardRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('subscribe-campaign', (campaignId) => {
    socket.join(`campaign:${campaignId}`);
    console.log(`Client ${socket.id} subscribed to campaign ${campaignId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start campaign retry processor
const CampaignRetryProcessor = require('./utils/campaignRetryProcessor');
const retryProcessor = new CampaignRetryProcessor(io);
retryProcessor.start(5); // Check every 5 minutes

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Campaign retry processor started (checks every 5 minutes)`);
});


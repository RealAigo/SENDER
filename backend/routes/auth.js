const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const [result] = await pool.execute(
      'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email.toLowerCase(), passwordHash]
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: result.insertId, email: email.toLowerCase() },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: result.insertId,
        username,
        email: email.toLowerCase()
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    // Provide more specific error messages
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ 
        error: 'Database table "users" does not exist. Please run the database migration.',
        details: 'Run: mysql -u root -p email_sender < database/schema.sql'
      });
    }
    
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.message.includes('email')) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      if (error.message.includes('username')) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      return res.status(400).json({ error: 'Username or email already exists' });
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(500).json({ 
        error: 'Cannot connect to database. Please check your database connection.',
        details: error.message
      });
    }
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      return res.status(500).json({ 
        error: 'Database access denied. Please check your database credentials in .env file.'
      });
    }
    
    // Return the actual error message for other cases (helpful for debugging)
    res.status(500).json({ 
      error: 'Registration failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const [users] = await pool.execute(
      'SELECT id, username, email, password_hash, role, is_active FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Update last login
    await pool.execute(
      'UPDATE users SET last_login = NOW() WHERE id = ?',
      [user.id]
    );

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    
    // Provide more specific error messages
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ 
        error: 'Database table "users" does not exist. Please run the database migration.',
        details: 'Run: mysql -u root -p email_sender < database/schema.sql'
      });
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.status(500).json({ 
        error: 'Cannot connect to database. Please check your database connection.',
        details: error.message
      });
    }
    
    res.status(500).json({ 
      error: 'Login failed',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Verify token and get current user
router.get('/verify', authenticateToken, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Verification failed' });
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, username, email, role, created_at, last_login FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: users[0] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

module.exports = router;


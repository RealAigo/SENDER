const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { encrypt, decrypt } = require('../utils/encryption');
const EmailSender = require('../utils/emailSender');

// Get all SMTP servers (filtered by user)
router.get('/', async (req, res) => {
  try {
    // Ensure req.user exists
    if (!req.user || !req.user.id) {
      console.error('SMTP GET /: req.user is missing or invalid:', req.user);
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    console.log(`[SMTP] Fetching servers for user ${req.user.id} (${req.user.username || req.user.email})`);
    
    const [servers] = await pool.execute(
      `SELECT id, name, host, port, secure, username, from_email, from_name, 
              daily_limit, hourly_limit, is_active, created_at, updated_at, user_id
       FROM smtp_servers
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [req.user.id]
    );
    
    console.log(`[SMTP] Found ${servers.length} server(s) for user ${req.user.id}`);
    
    // Also check if there are any servers with NULL or wrong user_id (security check)
    const [allServers] = await pool.execute(
      'SELECT COUNT(*) as count, COUNT(CASE WHEN user_id IS NULL OR user_id = 0 THEN 1 END) as orphaned FROM smtp_servers'
    );
    if (allServers[0].orphaned > 0) {
      console.warn(`[SMTP] WARNING: Found ${allServers[0].orphaned} SMTP server(s) without proper user_id!`);
    }
    
    // Remove user_id from response (internal field)
    const sanitizedServers = servers.map(server => {
      const { user_id, ...rest } = server;
      return rest;
    });
    
    res.json(sanitizedServers);
  } catch (error) {
    console.error('[SMTP] Error fetching servers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single SMTP server (ensure user owns it)
router.get('/:id', async (req, res) => {
  try {
    const [servers] = await pool.execute(
      `SELECT id, name, host, port, secure, username, from_email, from_name, 
              daily_limit, hourly_limit, is_active, created_at, updated_at
       FROM smtp_servers
       WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );
    
    if (servers.length === 0) {
      return res.status(404).json({ error: 'SMTP server not found' });
    }
    
    res.json(servers[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create SMTP server
router.post('/', async (req, res) => {
  try {
    const { name, host, port, secure, username, password, from_email, from_name, daily_limit, hourly_limit } = req.body;

    // Validate required fields with specific messages
    const missingFields = [];
    if (!name) missingFields.push('name');
    if (!host) missingFields.push('host');
    if (!port) missingFields.push('port');
    if (!username) missingFields.push('username');
    if (!password) missingFields.push('password');
    if (!from_email) missingFields.push('from_email');

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        missingFields: missingFields,
        message: `Please fill in: ${missingFields.join(', ')}`
      });
    }

    // Validate port is a number
    const portNum = parseInt(port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
      return res.status(400).json({ 
        error: 'Invalid port number',
        message: 'Port must be a number between 1 and 65535'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(from_email)) {
      return res.status(400).json({ 
        error: 'Invalid email format',
        message: 'Please enter a valid email address for "From Email"'
      });
    }

    const encryptedPassword = encrypt(password);

    const [result] = await pool.execute(
      `INSERT INTO smtp_servers 
       (name, host, port, secure, username, password, from_email, from_name, daily_limit, hourly_limit, user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, host, port, secure !== false, username, encryptedPassword, from_email, from_name || '', daily_limit || 0, hourly_limit || 0, req.user.id]
    );

    res.status(201).json({ id: result.insertId, message: 'SMTP server created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update SMTP server (ensure user owns it)
router.put('/:id', async (req, res) => {
  try {
    // Verify ownership
    const [existing] = await pool.execute(
      'SELECT id FROM smtp_servers WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'SMTP server not found' });
    }
    
    const { name, host, port, secure, username, password, from_email, from_name, daily_limit, hourly_limit, is_active } = req.body;

    // Validate port if provided
    if (port !== undefined) {
      const portNum = parseInt(port);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        return res.status(400).json({ 
          error: 'Invalid port number',
          message: 'Port must be a number between 1 and 65535'
        });
      }
    }

    // Validate email format if provided
    if (from_email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(from_email)) {
        return res.status(400).json({ 
          error: 'Invalid email format',
          message: 'Please enter a valid email address for "From Email"'
        });
      }
    }

    const updateFields = [];
    const values = [];

    if (name !== undefined) { 
      if (!name.trim()) {
        return res.status(400).json({ error: 'Name cannot be empty' });
      }
      updateFields.push('name = ?'); 
      values.push(name); 
    }
    if (host !== undefined) { 
      if (!host.trim()) {
        return res.status(400).json({ error: 'Host cannot be empty' });
      }
      updateFields.push('host = ?'); 
      values.push(host); 
    }
    if (port !== undefined) { updateFields.push('port = ?'); values.push(parseInt(port)); }
    if (secure !== undefined) { updateFields.push('secure = ?'); values.push(secure); }
    if (username !== undefined) { 
      if (!username.trim()) {
        return res.status(400).json({ error: 'Username cannot be empty' });
      }
      updateFields.push('username = ?'); 
      values.push(username); 
    }
    if (password !== undefined) { 
      if (!password.trim()) {
        return res.status(400).json({ error: 'Password cannot be empty' });
      }
      updateFields.push('password = ?'); 
      values.push(encrypt(password)); 
    }
    if (from_email !== undefined) { updateFields.push('from_email = ?'); values.push(from_email); }
    if (from_name !== undefined) { updateFields.push('from_name = ?'); values.push(from_name); }
    if (daily_limit !== undefined) { 
      const dailyLimitNum = parseInt(daily_limit);
      if (isNaN(dailyLimitNum) || dailyLimitNum < 0) {
        return res.status(400).json({ error: 'Daily limit must be a number >= 0' });
      }
      updateFields.push('daily_limit = ?'); 
      values.push(dailyLimitNum); 
    }
    if (hourly_limit !== undefined) { 
      const hourlyLimitNum = parseInt(hourly_limit);
      if (isNaN(hourlyLimitNum) || hourlyLimitNum < 0) {
        return res.status(400).json({ error: 'Hourly limit must be a number >= 0' });
      }
      updateFields.push('hourly_limit = ?'); 
      values.push(hourlyLimitNum); 
    }
    if (is_active !== undefined) { updateFields.push('is_active = ?'); values.push(is_active); }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update', message: 'Please provide at least one field to update' });
    }

    values.push(req.params.id, req.user.id);

    const [result] = await pool.execute(
      `UPDATE smtp_servers SET ${updateFields.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'SMTP server not found' });
    }

    res.json({ message: 'SMTP server updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete SMTP server (ensure user owns it)
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM smtp_servers WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'SMTP server not found' });
    }
    
    res.json({ message: 'SMTP server deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Test SMTP connection (ensure user owns it)
router.post('/:id/test', async (req, res) => {
  try {
    const [servers] = await pool.execute(
      `SELECT * FROM smtp_servers WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );

    if (servers.length === 0) {
      return res.status(404).json({ success: false, error: 'SMTP server not found' });
    }

    const server = servers[0];
    
    // Ensure boolean values are properly converted (MySQL returns 0/1)
    if (typeof server.secure === 'number') {
      server.secure = server.secure === 1;
    } else if (typeof server.secure === 'string') {
      server.secure = server.secure === '1' || server.secure === 'true';
    }
    
    // Ensure port is a number
    if (typeof server.port === 'string') {
      server.port = parseInt(server.port);
    }
    
    // Log server data for debugging (without password)
    console.log(`\n=== Testing SMTP server ${server.id} (${server.name}) ===`);
    console.log('Configuration:', {
      host: server.host,
      port: server.port,
      portType: typeof server.port,
      secure: server.secure,
      secureType: typeof server.secure,
      username: server.username,
      from_email: server.from_email,
      hasPassword: !!server.password,
      passwordLength: server.password ? server.password.length : 0
    });
    
    // Validate required fields with specific messages
    const missingFields = [];
    const fieldDetails = {};
    
    if (!server.host || !server.host.trim()) {
      missingFields.push('host');
      fieldDetails.host = server.host || 'empty';
    }
    if (!server.port || server.port === 0 || isNaN(server.port)) {
      missingFields.push('port');
      fieldDetails.port = server.port || 'empty';
    }
    if (!server.username || !server.username.trim()) {
      missingFields.push('username');
      fieldDetails.username = server.username || 'empty';
    }
    if (!server.password || !server.password.trim()) {
      missingFields.push('password');
      fieldDetails.password = server.password ? 'exists but empty' : 'missing';
    }
    
    if (missingFields.length > 0) {
      console.error(`SMTP ${server.id} validation failed:`, fieldDetails);
      const errorResponse = { 
        success: false, 
        error: `Missing required SMTP configuration fields: ${missingFields.join(', ')}`,
        missingFields: missingFields,
        fieldDetails: fieldDetails,
        message: `Please configure the following fields: ${missingFields.join(', ')}. You can edit the SMTP server to add missing information.`
      };
      console.error('Sending error response:', JSON.stringify(errorResponse, null, 2));
      return res.status(400).json(errorResponse);
    }
    
    // Check if host contains port (common mistake - try to extract it)
    if (server.host.includes(':') && (!server.port || server.port === 0)) {
      const parts = server.host.split(':');
      const possiblePort = parseInt(parts[parts.length - 1]);
      if (!isNaN(possiblePort) && possiblePort > 0 && possiblePort <= 65535) {
        console.warn(`SMTP ${server.id}: Host contains port but port field is empty. Host: ${server.host}, Extracted port: ${possiblePort}`);
        // Update the server object for this test (don't save to DB)
        server.port = possiblePort;
        server.host = parts.slice(0, -1).join(':'); // Remove port from host
      }
    }

    const sender = new EmailSender(server);
    const result = await sender.initialize();

    if (result.success) {
      res.json({ 
        success: true, 
        message: 'SMTP connection successful',
        details: {
          host: server.host,
          port: server.port,
          secure: server.secure ? 'Yes (TLS/SSL)' : 'No'
        }
      });
    } else {
      // Provide detailed error message
      let errorMessage = result.error || 'SMTP connection failed';
      
      // Add helpful suggestions based on error
      if (errorMessage.includes('EAUTH') || errorMessage.includes('authentication')) {
        errorMessage += '. Please check your username and password. For Gmail, you may need to use an App Password instead of your regular password.';
      } else if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('timeout')) {
        errorMessage += '. The SMTP server did not respond. Check if the host and port are correct, and ensure your firewall allows outbound connections.';
      } else if (errorMessage.includes('ECONNREFUSED')) {
        errorMessage += '. Connection refused. Check if the host and port are correct.';
      } else if (errorMessage.includes('Decryption failed')) {
        errorMessage += '. The password encryption key may have changed. Try updating the SMTP server password.';
      } else if (errorMessage.includes('certificate') || errorMessage.includes('SSL')) {
        errorMessage += '. SSL/TLS certificate issue. Try changing the "Secure" setting or check your SMTP server\'s SSL configuration.';
      }

      res.status(400).json({ 
        success: false, 
        error: errorMessage,
        message: errorMessage, // Also include as message for frontend
        code: result.code || 'SMTP_ERROR',
        details: result.details || {},
        suggestions: [
          'Verify SMTP host and port are correct',
          'Check username and password',
          'For Yandex: Make sure you\'re using the correct password (not app password unless 2FA is enabled)',
          'Verify SSL/TLS settings match your SMTP server',
          'Check firewall/network allows outbound SMTP connections',
          'For port 587: Use TLS (Secure = Yes)',
          'For port 465: Use SSL (Secure = Yes)'
        ]
      });
    }
  } catch (error) {
    console.error('SMTP test error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'An unexpected error occurred while testing SMTP connection',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Get SMTP usage statistics (ensure user owns the SMTP server)
router.get('/:id/usage', async (req, res) => {
  try {
    // Verify ownership
    const [servers] = await pool.execute(
      'SELECT id FROM smtp_servers WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    
    if (servers.length === 0) {
      return res.status(404).json({ error: 'SMTP server not found' });
    }
    
    const { startDate, endDate } = req.query;
    
    let query = `
      SELECT date, hour, emails_sent
      FROM smtp_usage
      WHERE smtp_server_id = ?
    `;
    const params = [req.params.id];

    if (startDate) {
      query += ` AND date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      query += ` AND date <= ?`;
      params.push(endDate);
    }

    query += ` ORDER BY date DESC, hour DESC`;

    const [usage] = await pool.execute(query, params);
    
    // Get daily totals
    const [dailyTotals] = await pool.execute(
      `SELECT date, SUM(emails_sent) as total
       FROM smtp_usage
       WHERE smtp_server_id = ? ${startDate ? 'AND date >= ?' : ''} ${endDate ? 'AND date <= ?' : ''}
       GROUP BY date
       ORDER BY date DESC`,
      params
    );

    res.json({ hourly: usage, daily: dailyTotals });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


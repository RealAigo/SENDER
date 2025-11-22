const nodemailer = require('nodemailer');
const { decrypt } = require('./encryption');
const pool = require('../config/database');

class EmailSender {
  constructor(smtpConfig) {
    this.smtpConfig = smtpConfig;
    this.transporter = null;
  }

  async initialize() {
    try {
      const password = decrypt(this.smtpConfig.password);
      
      // Clean host - remove port if included
      let host = this.smtpConfig.host;
      let port = this.smtpConfig.port;
      
      // If host contains port, extract it
      if (host && host.includes(':') && (!port || port === 0)) {
        const parts = host.split(':');
        const possiblePort = parseInt(parts[parts.length - 1]);
        if (!isNaN(possiblePort) && possiblePort > 0 && possiblePort <= 65535) {
          console.log(`Extracting port from host: ${host} -> host: ${parts.slice(0, -1).join(':')}, port: ${possiblePort}`);
          host = parts.slice(0, -1).join(':');
          port = possiblePort;
        }
      }
      
      // Ensure port is a number
      port = parseInt(port);
      if (isNaN(port) || port <= 0 || port > 65535) {
        throw new Error(`Invalid port: ${this.smtpConfig.port}. Port must be a number between 1 and 65535.`);
      }
      
      // Determine secure setting based on port (CRITICAL: port determines protocol)
      // Port 465 = SSL/TLS (secure: true) - Direct SSL connection
      // Port 587 = STARTTLS (secure: false) - Plain connection, then upgrade to TLS
      // Port 25 = Unencrypted (not recommended)
      let secure;
      let requiresTLS = false;
      
      // Override user setting based on port - this is critical for correct protocol
      if (port === 465) {
        secure = true; // Must use SSL for port 465
        requiresTLS = false;
        console.log(`Port 465 detected: Using SSL (secure: true)`);
      } else if (port === 587) {
        secure = false; // Must use STARTTLS for port 587
        requiresTLS = true;
        console.log(`Port 587 detected: Using STARTTLS (secure: false, requireTLS: true)`);
      } else if (port === 25) {
        secure = false;
        requiresTLS = false;
        console.log(`Port 25 detected: Unencrypted connection (not recommended)`);
      } else {
        // For other ports, use user's setting but warn
        secure = this.smtpConfig.secure !== undefined ? this.smtpConfig.secure : false;
        console.log(`Port ${port}: Using user setting (secure: ${secure})`);
      }
      
      console.log(`Connecting to SMTP: ${host}:${port}, secure: ${secure}, requiresTLS: ${requiresTLS}, user: ${this.smtpConfig.username}`);
      
      // Build transport config
      const transportConfig = {
        host: host,
        port: port,
        secure: secure, // This is critical - must match port
        auth: {
          user: this.smtpConfig.username,
          pass: password
        },
        // Timeout settings - increased for slower connections
        connectionTimeout: 30000, // 30 seconds (increased from 15)
        greetingTimeout: 15000, // 15 seconds (increased from 10)
        socketTimeout: 30000, // 30 seconds (increased from 15)
        // Additional connection options
        pool: false, // Don't pool connections for testing
        maxConnections: 1,
        maxMessages: 1
      };
      
      // Add TLS options for STARTTLS (port 587)
      if (port === 587) {
        // Port 587 requires STARTTLS
        transportConfig.requireTLS = true;
        transportConfig.tls = {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2',
          // Additional options for better compatibility
          servername: host // SNI support
        };
      } else if (port === 465) {
        // Port 465 uses direct SSL
        transportConfig.tls = {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2',
          // Additional options for better compatibility
          servername: host // SNI support
        };
        // For port 465, also set socket options
        transportConfig.ignoreTLS = false;
      }
      
      this.transporter = nodemailer.createTransport(transportConfig);

      // Verify connection
      await this.transporter.verify();
      console.log(`SMTP ${this.smtpConfig.id} connection verified successfully`);
      return { success: true };
    } catch (error) {
      console.error(`SMTP ${this.smtpConfig.id} verification failed:`, {
        message: error.message,
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        stack: error.stack
      });
      
      // Provide more detailed error message
      let errorMessage = error.message || 'Unknown error during SMTP connection';
      let errorCode = error.code || 'UNKNOWN';
      
      // Enhance error message based on error type
      if (error.code === 'EAUTH') {
        errorMessage = 'Authentication failed. Please check your username and password.';
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
        errorMessage = `Connection timeout. The SMTP server at ${this.smtpConfig.host}:${this.smtpConfig.port} did not respond.`;
      } else if (error.code === 'ECONNREFUSED') {
        errorMessage = `Connection refused. Check if the host (${this.smtpConfig.host}) and port (${this.smtpConfig.port}) are correct.`;
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = `Host not found: ${this.smtpConfig.host}. Check if the hostname is correct.`;
      } else if (error.responseCode) {
        errorMessage = `SMTP server error (${error.responseCode}): ${error.response || errorMessage}`;
      }
      
      return { 
        success: false, 
        error: errorMessage,
        code: errorCode,
        details: {
          host: this.smtpConfig.host,
          port: this.smtpConfig.port,
          secure: this.smtpConfig.secure,
          username: this.smtpConfig.username,
          responseCode: error.responseCode,
          command: error.command
        }
      };
    }
  }

  async sendEmail(to, subject, html, recipientId = null, campaignId = null) {
    try {
      // Ensure HTML content is properly formatted
      let htmlContent = html;
      
      // If content doesn't have HTML tags, wrap it
      if (!htmlContent.includes('<html') && !htmlContent.includes('<body')) {
        // Check if it's already HTML (has tags)
        if (htmlContent.includes('<') && htmlContent.includes('>')) {
          // Has HTML tags but no html/body wrapper - add wrapper
          htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
${htmlContent}
</body>
</html>`;
        } else {
          // Plain text - convert to HTML
          htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
${htmlContent.replace(/\n/g, '<br>')}
</body>
</html>`;
        }
      }
      
      // Add tracking pixel if recipientId and campaignId are provided
      if (recipientId && campaignId) {
        const baseUrl = process.env.TRACKING_BASE_URL || process.env.CORS_ORIGIN || 'http://localhost:3001';
        const trackingUrl = `${baseUrl}/api/tracking/open/${recipientId}-${campaignId}-${this.generateTrackingHash(recipientId, campaignId)}`;
        const trackingPixel = `<img src="${trackingUrl}" width="1" height="1" style="display:none;" alt="" />`;
        
        console.log(`[EmailSender] Adding tracking pixel for recipient ${recipientId}, campaign ${campaignId}`);
        console.log(`[EmailSender] Tracking URL: ${trackingUrl}`);
        
        // Insert tracking pixel before closing body tag
        if (htmlContent.includes('</body>')) {
          htmlContent = htmlContent.replace('</body>', `${trackingPixel}</body>`);
        } else {
          // If no body tag, append to end
          htmlContent += trackingPixel;
        }
        
        console.log(`[EmailSender] ✅ Tracking pixel added to email`);
      } else {
        console.log(`[EmailSender] ⚠️  No tracking pixel added - recipientId: ${recipientId}, campaignId: ${campaignId}`);
      }
      
      const info = await this.transporter.sendMail({
        from: `"${this.smtpConfig.from_name || 'Email Sender'}" <${this.smtpConfig.from_email}>`,
        to: to,
        subject: subject,
        html: htmlContent,
        text: this.stripHtml(htmlContent) // Also include plain text version
      });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Generate tracking hash for token
  generateTrackingHash(recipientId, campaignId) {
    const crypto = require('crypto');
    const data = `${recipientId}:${campaignId}:${Date.now()}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  // Helper to strip HTML for plain text version
  stripHtml(html) {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }

  async checkLimits() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHour = now.getHours();

    // Check daily limit
    const [dailyUsage] = await pool.execute(
      `SELECT COALESCE(SUM(emails_sent), 0) as total 
       FROM smtp_usage 
       WHERE smtp_server_id = ? AND date = ?`,
      [this.smtpConfig.id, today]
    );

    const dailyUsed = dailyUsage[0].total;
    if (this.smtpConfig.daily_limit > 0 && dailyUsed >= this.smtpConfig.daily_limit) {
      return { available: false, reason: 'Daily limit reached' };
    }

    // Check hourly limit
    const [hourlyUsage] = await pool.execute(
      `SELECT emails_sent 
       FROM smtp_usage 
       WHERE smtp_server_id = ? AND date = ? AND hour = ?`,
      [this.smtpConfig.id, today, currentHour]
    );

    const hourlyUsed = hourlyUsage[0]?.emails_sent || 0;
    if (this.smtpConfig.hourly_limit > 0 && hourlyUsed >= this.smtpConfig.hourly_limit) {
      return { available: false, reason: 'Hourly limit reached' };
    }

    const dailyRemaining = this.smtpConfig.daily_limit > 0 
      ? Math.max(0, this.smtpConfig.daily_limit - dailyUsed)
      : Infinity;
    const hourlyRemaining = this.smtpConfig.hourly_limit > 0 
      ? Math.max(0, this.smtpConfig.hourly_limit - hourlyUsed)
      : Infinity;

    // The actual remaining capacity is the minimum of daily and hourly
    const actualRemaining = Math.min(dailyRemaining, hourlyRemaining);

    return { 
      available: actualRemaining > 0, 
      dailyRemaining: dailyRemaining,
      hourlyRemaining: hourlyRemaining,
      actualRemaining: actualRemaining
    };
  }

  async recordUsage() {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentHour = now.getHours();

    await pool.execute(
      `INSERT INTO smtp_usage (smtp_server_id, date, hour, emails_sent)
       VALUES (?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE emails_sent = emails_sent + 1`,
      [this.smtpConfig.id, today, currentHour]
    );
  }
}

module.exports = EmailSender;


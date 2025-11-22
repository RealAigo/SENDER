const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const crypto = require('crypto');

// Generate tracking token for email
function generateTrackingToken(recipientId, campaignId) {
  const data = `${recipientId}:${campaignId}:${Date.now()}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
}

// Get country from IP address using free IP geolocation API
async function getCountryFromIP(ipAddress) {
  try {
    // Skip localhost and private IPs
    if (!ipAddress || ipAddress === 'unknown' || ipAddress.startsWith('127.') || ipAddress.startsWith('192.168.') || ipAddress.startsWith('10.')) {
      return { country: 'Unknown', countryCode: null };
    }

    // Use ip-api.com (free, no API key needed, 45 requests/minute limit)
    const https = require('https');
    const url = `https://ip-api.com/json/${ipAddress}?fields=status,country,countryCode`;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ country: 'Unknown', countryCode: null });
      }, 2000);

      https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          clearTimeout(timeout);
          try {
            const result = JSON.parse(data);
            if (result.status === 'success') {
              resolve({
                country: result.country || 'Unknown',
                countryCode: result.countryCode || null
              });
            } else {
              resolve({ country: 'Unknown', countryCode: null });
            }
          } catch (error) {
            resolve({ country: 'Unknown', countryCode: null });
          }
        });
      }).on('error', () => {
        clearTimeout(timeout);
        resolve({ country: 'Unknown', countryCode: null });
      });
    });
  } catch (error) {
    return { country: 'Unknown', countryCode: null };
  }
}

// Track email open (public endpoint - no auth required)
router.get('/open/:token', async (req, res) => {
  try {
    const { token } = req.params;
    let ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    
    // Handle X-Forwarded-For header (may contain multiple IPs)
    if (ipAddress.includes(',')) {
      ipAddress = ipAddress.split(',')[0].trim();
    }
    
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    console.log(`[Tracking] Email open detected - Token: ${token}, IP: ${ipAddress}`);
    
    // Get country from IP
    const countryInfo = await getCountryFromIP(ipAddress);
    console.log(`[Tracking] Country detected: ${countryInfo.country} (${countryInfo.countryCode})`);

    // Decode token (format: recipientId-campaignId-hash)
    const parts = token.split('-');
    if (parts.length !== 3) {
      // Invalid token format, return 1x1 transparent pixel anyway
      return sendTrackingPixel(res);
    }

    const recipientId = parseInt(parts[0]);
    const campaignId = parseInt(parts[1]);
    const hash = parts[2];

    if (isNaN(recipientId) || isNaN(campaignId)) {
      return sendTrackingPixel(res);
    }

    // Verify the recipient exists and belongs to the campaign
    const [recipients] = await pool.execute(
      'SELECT id, email, campaign_id FROM campaign_recipients WHERE id = ? AND campaign_id = ?',
      [recipientId, campaignId]
    );

    if (recipients.length === 0) {
      return sendTrackingPixel(res);
    }

    const recipient = recipients[0];

    // Check if already opened (to avoid duplicate tracking)
    const [existing] = await pool.execute(
      'SELECT id FROM email_open_tracking WHERE recipient_id = ? LIMIT 1',
      [recipientId]
    );

    // Record the open
    if (existing.length === 0) {
      // First open - update recipient record
      await pool.execute(
        'UPDATE campaign_recipients SET opened_at = NOW(), opened_count = opened_count + 1 WHERE id = ?',
        [recipientId]
      );

      // Insert into tracking table
      await pool.execute(
        'INSERT INTO email_open_tracking (recipient_id, campaign_id, email, ip_address, user_agent, country, country_code) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [recipientId, campaignId, recipient.email, ipAddress, userAgent, countryInfo.country, countryInfo.countryCode]
      );
      
      console.log(`[Tracking] ✅ First open recorded for recipient ${recipientId} (${recipient.email})`);
    } else {
      // Subsequent opens - just increment count
      await pool.execute(
        'UPDATE campaign_recipients SET opened_count = opened_count + 1 WHERE id = ?',
        [recipientId]
      );

      // Log additional open
      await pool.execute(
        'INSERT INTO email_open_tracking (recipient_id, campaign_id, email, ip_address, user_agent, country, country_code) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [recipientId, campaignId, recipient.email, ipAddress, userAgent, countryInfo.country, countryInfo.countryCode]
      );
      
      console.log(`[Tracking] ✅ Additional open recorded for recipient ${recipientId} (${recipient.email})`);
    }

    // Return 1x1 transparent pixel
    return sendTrackingPixel(res);
  } catch (error) {
    console.error('Tracking error:', error);
    // Still return pixel even on error
    return sendTrackingPixel(res);
  }
});

// Helper function to send 1x1 transparent GIF
function sendTrackingPixel(res) {
  // 1x1 transparent GIF
  const pixel = Buffer.from(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    'base64'
  );
  
  res.set({
    'Content-Type': 'image/gif',
    'Content-Length': pixel.length,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  
  res.send(pixel);
}

module.exports = router;

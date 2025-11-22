const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');
const CampaignDistributor = require('../utils/campaignDistributor');

const upload = multer({ dest: 'uploads/' });

// Helper function to verify campaign ownership
async function verifyCampaignOwnership(campaignId, userId) {
  const [campaigns] = await pool.execute(
    'SELECT id FROM campaigns WHERE id = ? AND user_id = ?',
    [campaignId, userId]
  );
  return campaigns.length > 0;
}

// Get all campaigns (filtered by user)
router.get('/', async (req, res) => {
  try {
    const [campaigns] = await pool.execute(
      `SELECT c.*, 
              COUNT(cr.id) as total_recipients,
              SUM(CASE WHEN cr.status = 'sent' THEN 1 ELSE 0 END) as emails_sent,
              SUM(CASE WHEN cr.status = 'failed' THEN 1 ELSE 0 END) as emails_failed,
              SUM(CASE WHEN cr.opened_at IS NOT NULL THEN 1 ELSE 0 END) as emails_opened
       FROM campaigns c
       LEFT JOIN campaign_recipients cr ON c.id = cr.campaign_id
       WHERE c.user_id = ?
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    
    // Calculate open rates for each campaign
    const campaignsWithStats = await Promise.all(campaigns.map(async (campaign) => {
      const sent = campaign.emails_sent || 0;
      const opened = campaign.emails_opened || 0;
      const openRate = sent > 0 ? ((opened / sent) * 100).toFixed(2) : 0;
      
      return {
        ...campaign,
        openRate: parseFloat(openRate)
      };
    }));
    
    res.json(campaignsWithStats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single campaign (ensure user owns it)
router.get('/:id', async (req, res) => {
  try {
    const [campaigns] = await pool.execute(
      `SELECT * FROM campaigns WHERE id = ? AND user_id = ?`,
      [req.params.id, req.user.id]
    );

    if (campaigns.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const [recipients] = await pool.execute(
      `SELECT cr.id, cr.email, cr.status, cr.smtp_server_id, cr.error_message, cr.sent_at, 
              cr.opened_at, cr.opened_count,
              (SELECT country FROM email_open_tracking WHERE recipient_id = cr.id ORDER BY opened_at ASC LIMIT 1) as country,
              (SELECT country_code FROM email_open_tracking WHERE recipient_id = cr.id ORDER BY opened_at ASC LIMIT 1) as country_code
       FROM campaign_recipients cr
       WHERE cr.campaign_id = ?
       ORDER BY cr.id`,
      [req.params.id]
    );

    // Get open tracking statistics
    const [openStats] = await pool.execute(
      `SELECT 
         COUNT(DISTINCT recipient_id) as unique_opens,
         COUNT(*) as total_opens,
         MIN(opened_at) as first_open,
         MAX(opened_at) as last_open
       FROM email_open_tracking
       WHERE campaign_id = ?`,
      [req.params.id]
    );

    // Calculate open rate
    const totalSent = recipients.filter(r => r.status === 'sent').length;
    const totalOpened = recipients.filter(r => r.opened_at !== null).length;
    const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(2) : 0;

    res.json({ 
      ...campaigns[0], 
      recipients,
      openStats: {
        totalSent,
        totalOpened,
        openRate: parseFloat(openRate),
        uniqueOpens: openStats[0]?.unique_opens || 0,
        totalOpens: openStats[0]?.total_opens || 0,
        firstOpen: openStats[0]?.first_open || null,
        lastOpen: openStats[0]?.last_open || null
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create campaign
router.post('/', async (req, res) => {
  try {
    const { name, subject, html_content } = req.body;

    if (!name || !subject || !html_content) {
      return res.status(400).json({ error: 'Missing required fields: name, subject, html_content' });
    }

    const [result] = await pool.execute(
      `INSERT INTO campaigns (name, subject, html_content, status, user_id)
       VALUES (?, ?, ?, 'pending', ?)`,
      [name, subject, html_content, req.user.id]
    );

    res.status(201).json({ id: result.insertId, message: 'Campaign created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload recipients list (CSV file)
router.post('/:id/recipients', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const campaignId = req.params.id;
    
    // Verify campaign ownership
    if (!(await verifyCampaignOwnership(campaignId, req.user.id))) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'Campaign not found' });
    }
    const emails = [];

    // Parse CSV file
    await new Promise((resolve, reject) => {
      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (row) => {
          // Support both 'email' and 'Email' column names
          const email = row.email || row.Email || row.EMAIL || Object.values(row)[0];
          if (email && email.includes('@')) {
            emails.push(email.trim().toLowerCase());
          }
        })
        .on('end', resolve)
        .on('error', reject);
    });

    // Delete uploaded file
    fs.unlinkSync(req.file.path);

    if (emails.length === 0) {
      return res.status(400).json({ error: 'No valid emails found in file' });
    }

    // Remove duplicates
    const uniqueEmails = [...new Set(emails)];

    // Insert recipients
    const values = uniqueEmails.map(email => [campaignId, email]);
    await pool.query(
      `INSERT INTO campaign_recipients (campaign_id, email) VALUES ?`,
      [values]
    );

    // Update campaign total_recipients
    await pool.execute(
      `UPDATE campaigns SET total_recipients = ? WHERE id = ?`,
      [uniqueEmails.length, campaignId]
    );

    res.json({ 
      message: `${uniqueEmails.length} recipients added successfully`,
      count: uniqueEmails.length
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// Add recipients manually (array of emails)
router.post('/:id/recipients/manual', async (req, res) => {
  try {
    const { emails } = req.body;
    const campaignId = req.params.id;

    // Verify campaign ownership
    if (!(await verifyCampaignOwnership(campaignId, req.user.id))) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: 'Emails array is required' });
    }

    // Validate and clean emails
    const validEmails = emails
      .map(email => email.trim().toLowerCase())
      .filter(email => email.includes('@'));

    if (validEmails.length === 0) {
      return res.status(400).json({ error: 'No valid emails provided' });
    }

    // Remove duplicates
    const uniqueEmails = [...new Set(validEmails)];

    // Insert recipients
    const values = uniqueEmails.map(email => [campaignId, email]);
    await pool.query(
      `INSERT INTO campaign_recipients (campaign_id, email) VALUES ?`,
      [values]
    );

    // Update campaign total_recipients
    await pool.execute(
      `UPDATE campaigns SET total_recipients = ? WHERE id = ?`,
      [uniqueEmails.length, campaignId]
    );

    res.json({ 
      message: `${uniqueEmails.length} recipients added successfully`,
      count: uniqueEmails.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start campaign
router.post('/:id/start', async (req, res) => {
  try {
    const campaignId = req.params.id;
    
    // Verify campaign ownership
    if (!(await verifyCampaignOwnership(campaignId, req.user.id))) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    const io = req.app.get('io');

    // Update campaign status
    await pool.execute(
      `UPDATE campaigns SET status = 'running', started_at = NOW() WHERE id = ? AND user_id = ?`,
      [campaignId, req.user.id]
    );

    // Start sending in background
    startCampaignSending(campaignId, io).catch(err => {
      console.error('Campaign sending error:', err);
    });

    res.json({ message: 'Campaign started' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pause campaign
router.post('/:id/pause', async (req, res) => {
  try {
    const campaignId = req.params.id;
    
    // Verify campaign ownership
    if (!(await verifyCampaignOwnership(campaignId, req.user.id))) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    await pool.execute(
      `UPDATE campaigns SET status = 'paused' WHERE id = ? AND user_id = ?`,
      [campaignId, req.user.id]
    );
    res.json({ message: 'Campaign paused' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete campaign (ensure user owns it)
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.execute(
      'DELETE FROM campaigns WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Campaign sending function
async function startCampaignSending(campaignId, io) {
  const distributor = new CampaignDistributor();
  
  try {
    const { campaign, distribution } = await distributor.distributeCampaign(campaignId);
    const total = distribution.length;
    let sent = 0;
    let failed = 0;

    // Emit initial progress
    io.emit(`campaign:${campaignId}:progress`, {
      total,
      sent,
      failed,
      remaining: total
    });

    // Send emails
    for (const item of distribution) {
      // Check if campaign is paused
      const [campaigns] = await pool.execute(
        `SELECT status FROM campaigns WHERE id = ?`,
        [campaignId]
      );

      if (campaigns[0].status === 'paused') {
        break;
      }

      // Skip if no SMTP server available (capacity exceeded)
      if (item.unavailable || !item.sender || !item.smtpServer) {
        await pool.execute(
          `UPDATE campaign_recipients 
           SET status = 'failed', error_message = ?
           WHERE id = ?`,
          ['No available SMTP servers with remaining capacity', item.recipient.id]
        );
        failed++;
        continue;
      }

      // Re-check limits before sending (respect limits in real-time)
      const limitCheck = await item.sender.checkLimits();
      if (!limitCheck.available) {
        console.log(`SMTP ${item.smtpServer.id} (${item.smtpServer.name}) limit reached. Queueing campaign for retry after limit reset.`);
        
        // Check if this is a daily limit (not hourly)
        const isDailyLimit = limitCheck.reason && limitCheck.reason.includes('daily');
        
        if (isDailyLimit) {
          // Queue campaign for retry after daily limit resets (next day at 00:00)
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          
          // Check if already queued
          const [existingQueue] = await pool.execute(
            'SELECT id FROM campaign_retry_queue WHERE campaign_id = ? AND status = "pending"',
            [campaignId]
          );
          
          if (existingQueue.length === 0) {
            await pool.execute(
              'INSERT INTO campaign_retry_queue (campaign_id, retry_at, status) VALUES (?, ?, "pending")',
              [campaignId, tomorrow]
            );
            console.log(`Campaign ${campaignId} queued for retry at ${tomorrow.toISOString()}`);
          }
          
          // Pause the campaign instead of marking recipients as failed
          await pool.execute(
            `UPDATE campaigns SET status = 'paused' WHERE id = ?`,
            [campaignId]
          );
          
          // Emit notification
          io.emit(`campaign:${campaignId}:paused`, {
            reason: 'Daily limit reached',
            retryAt: tomorrow.toISOString(),
            message: 'Campaign paused due to daily limit. Will automatically resume after limit resets.'
          });
          
          break; // Stop sending for this campaign
        } else {
          // Hourly limit - just skip this recipient
          await pool.execute(
            `UPDATE campaign_recipients 
             SET status = 'failed', smtp_server_id = ?, error_message = ?
             WHERE id = ?`,
            [item.smtpServer.id, `SMTP limit reached: ${limitCheck.reason || 'Hourly limit exceeded'}`, item.recipient.id]
          );
          failed++;
          
          // Emit progress update
          io.emit(`campaign:${campaignId}:progress`, {
            total,
            sent,
            failed,
            remaining: total - sent - failed,
            currentSmtp: `${item.smtpServer.name} (limit reached)`,
            currentEmail: item.recipient.email
          });
          continue;
        }
      }

      const result = await item.sender.sendEmail(
        item.recipient.email,
        campaign.subject,
        campaign.html_content,
        item.recipient.id,
        campaignId
      );

      if (result.success) {
        // Update recipient status
        await pool.execute(
          `UPDATE campaign_recipients 
           SET status = 'sent', smtp_server_id = ?, sent_at = NOW()
           WHERE id = ?`,
          [item.smtpServer.id, item.recipient.id]
        );

        // Record usage
        await item.sender.recordUsage();

        // Log email
        await pool.execute(
          `INSERT INTO email_logs (campaign_id, recipient_id, smtp_server_id, email, status)
           VALUES (?, ?, ?, ?, 'sent')`,
          [campaignId, item.recipient.id, item.smtpServer.id, item.recipient.email]
        );

        sent++;
      } else {
        // Update recipient status
        await pool.execute(
          `UPDATE campaign_recipients 
           SET status = 'failed', smtp_server_id = ?, error_message = ?
           WHERE id = ?`,
          [item.smtpServer.id, result.error, item.recipient.id]
        );

        // Log email
        await pool.execute(
          `INSERT INTO email_logs (campaign_id, recipient_id, smtp_server_id, email, status, error_message)
           VALUES (?, ?, ?, ?, 'failed', ?)`,
          [campaignId, item.recipient.id, item.smtpServer.id, item.recipient.email, result.error]
        );

        failed++;
      }

      // Emit progress update
      io.emit(`campaign:${campaignId}:progress`, {
        total,
        sent,
        failed,
        remaining: total - sent - failed,
        currentSmtp: item.smtpServer.name,
        currentEmail: item.recipient.email
      });
    }

    // Update campaign status
    await pool.execute(
      `UPDATE campaigns 
       SET status = 'completed', emails_sent = ?, emails_failed = ?, completed_at = NOW()
       WHERE id = ?`,
      [sent, failed, campaignId]
    );

    // Emit completion
    io.emit(`campaign:${campaignId}:complete`, {
      total,
      sent,
      failed
    });

  } catch (error) {
    console.error('Campaign sending error:', error);
    await pool.execute(
      `UPDATE campaigns SET status = 'failed' WHERE id = ?`,
      [campaignId]
    );
    io.emit(`campaign:${campaignId}:error`, { error: error.message });
  }
}

module.exports = router;


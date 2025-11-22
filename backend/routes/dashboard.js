const express = require('express');
const router = express.Router();
const pool = require('../config/database');

// Get dashboard statistics (filtered by user)
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Total SMTP servers (user's own)
    const [smtpCount] = await pool.execute(
      `SELECT COUNT(*) as total, SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active
       FROM smtp_servers
       WHERE user_id = ?`,
      [userId]
    );

    // Total campaigns (user's own)
    const [campaignCount] = await pool.execute(
      `SELECT COUNT(*) as total,
              SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
       FROM campaigns
       WHERE user_id = ?`,
      [userId]
    );

    // Total emails sent today (user's SMTP servers)
    const today = new Date().toISOString().split('T')[0];
    const [todayEmails] = await pool.execute(
      `SELECT SUM(u.emails_sent) as total
       FROM smtp_usage u
       JOIN smtp_servers s ON u.smtp_server_id = s.id
       WHERE u.date = ? AND s.user_id = ?`,
      [today, userId]
    );

    // Total emails sent (all time) - user's campaigns
    const [allTimeEmails] = await pool.execute(
      `SELECT COUNT(*) as total
       FROM email_logs el
       JOIN campaigns c ON el.campaign_id = c.id
       WHERE el.status = 'sent' AND c.user_id = ?`,
      [userId]
    );

    // Recent campaigns (user's own)
    const [recentCampaigns] = await pool.execute(
      `SELECT c.*, 
              COUNT(cr.id) as total_recipients,
              SUM(CASE WHEN cr.status = 'sent' THEN 1 ELSE 0 END) as emails_sent,
              SUM(CASE WHEN cr.status = 'failed' THEN 1 ELSE 0 END) as emails_failed
       FROM campaigns c
       LEFT JOIN campaign_recipients cr ON c.id = cr.campaign_id
       WHERE c.user_id = ?
       GROUP BY c.id
       ORDER BY c.created_at DESC
       LIMIT 10`,
      [userId]
    );

    // SMTP performance (top 5 by emails sent today) - user's SMTP servers
    const [smtpPerformance] = await pool.execute(
      `SELECT s.id, s.name, s.host, s.daily_limit, s.hourly_limit,
              COALESCE(SUM(u.emails_sent), 0) as emails_sent_today,
              (SELECT COUNT(*) FROM email_logs el 
               JOIN campaigns c ON el.campaign_id = c.id
               WHERE el.smtp_server_id = s.id AND el.status = 'sent' AND c.user_id = ?) as total_sent
       FROM smtp_servers s
       LEFT JOIN smtp_usage u ON s.id = u.smtp_server_id AND u.date = ?
       WHERE s.user_id = ?
       GROUP BY s.id
       ORDER BY emails_sent_today DESC
       LIMIT 5`,
      [userId, today, userId]
    );

    res.json({
      smtp: smtpCount[0],
      campaigns: campaignCount[0],
      emails: {
        today: todayEmails[0].total || 0,
        allTime: allTimeEmails[0].total || 0
      },
      recentCampaigns,
      smtpPerformance
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get SMTP usage chart data (user's SMTP servers only)
router.get('/smtp-usage', async (req, res) => {
  try {
    const userId = req.user.id;
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const [usage] = await pool.execute(
      `SELECT s.name, u.date, SUM(u.emails_sent) as total
       FROM smtp_usage u
       JOIN smtp_servers s ON u.smtp_server_id = s.id
       WHERE u.date >= ? AND s.user_id = ?
       GROUP BY s.id, u.date
       ORDER BY u.date DESC, s.name`,
      [startDate.toISOString().split('T')[0], userId]
    );

    res.json(usage);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get campaign statistics (user's campaigns only)
router.get('/campaigns', async (req, res) => {
  try {
    const userId = req.user.id;
    const [campaigns] = await pool.execute(
      `SELECT c.*, 
              COUNT(cr.id) as total_recipients,
              SUM(CASE WHEN cr.status = 'sent' THEN 1 ELSE 0 END) as emails_sent,
              SUM(CASE WHEN cr.status = 'failed' THEN 1 ELSE 0 END) as emails_failed,
              SUM(CASE WHEN cr.status = 'pending' THEN 1 ELSE 0 END) as emails_pending
       FROM campaigns c
       LEFT JOIN campaign_recipients cr ON c.id = cr.campaign_id
       WHERE c.user_id = ?
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [userId]
    );

    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


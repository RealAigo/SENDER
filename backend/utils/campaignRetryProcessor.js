const pool = require('../config/database');
const CampaignDistributor = require('./campaignDistributor');

class CampaignRetryProcessor {
  constructor(io) {
    this.io = io;
    this.isProcessing = false;
  }

  // Check for campaigns that need to be retried
  async processRetryQueue() {
    if (this.isProcessing) {
      return; // Already processing
    }

    this.isProcessing = true;

    try {
      const now = new Date();
      
      // Get campaigns ready to retry
      const [queuedCampaigns] = await pool.execute(
        `SELECT crq.id as queue_id, crq.campaign_id, c.user_id, c.status
         FROM campaign_retry_queue crq
         JOIN campaigns c ON crq.campaign_id = c.id
         WHERE crq.status = 'pending' 
         AND crq.retry_at <= ?
         AND c.status IN ('paused', 'running')`,
        [now]
      );

      if (queuedCampaigns.length === 0) {
        this.isProcessing = false;
        return;
      }

      console.log(`[Retry Processor] Found ${queuedCampaigns.length} campaign(s) ready to retry`);

      for (const queued of queuedCampaigns) {
        try {
          // Mark as processing
          await pool.execute(
            'UPDATE campaign_retry_queue SET status = "processing", processed_at = NOW() WHERE id = ?',
            [queued.queue_id]
          );

          // Check if campaign has pending recipients
          const [pendingRecipients] = await pool.execute(
            'SELECT COUNT(*) as count FROM campaign_recipients WHERE campaign_id = ? AND status = "pending"',
            [queued.campaign_id]
          );

          if (pendingRecipients[0].count === 0) {
            // No pending recipients, mark as completed
            await pool.execute(
              'UPDATE campaign_retry_queue SET status = "completed" WHERE id = ?',
              [queued.queue_id]
            );
            await pool.execute(
              'UPDATE campaigns SET status = "completed" WHERE id = ?',
              [queued.campaign_id]
            );
            console.log(`[Retry Processor] Campaign ${queued.campaign_id} has no pending recipients, marking as completed`);
            continue;
          }

          // Resume the campaign
          console.log(`[Retry Processor] Resuming campaign ${queued.campaign_id}`);
          await this.resumeCampaign(queued.campaign_id);

          // Mark retry as completed
          await pool.execute(
            'UPDATE campaign_retry_queue SET status = "completed" WHERE id = ?',
            [queued.queue_id]
          );

        } catch (error) {
          console.error(`[Retry Processor] Error processing campaign ${queued.campaign_id}:`, error);
          await pool.execute(
            'UPDATE campaign_retry_queue SET status = "failed" WHERE id = ?',
            [queued.queue_id]
          );
        }
      }
    } catch (error) {
      console.error('[Retry Processor] Error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Resume a paused campaign
  async resumeCampaign(campaignId) {
    try {
      // Update campaign status
      await pool.execute(
        `UPDATE campaigns SET status = 'running' WHERE id = ?`,
        [campaignId]
      );

      // Start sending in background
      const distributor = new CampaignDistributor();
      const { campaign, distribution } = await distributor.distributeCampaign(campaignId);
      const total = distribution.length;
      let sent = 0;
      let failed = 0;

      // Emit initial progress
      this.io.emit(`campaign:${campaignId}:progress`, {
        total,
        sent,
        failed,
        remaining: total,
        message: 'Campaign resumed after daily limit reset'
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

        // Skip if no SMTP server available
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

        // Re-check limits
        const limitCheck = await item.sender.checkLimits();
        if (!limitCheck.available) {
          const isDailyLimit = limitCheck.reason && limitCheck.reason.includes('daily');
          
          if (isDailyLimit) {
            // Queue for next day again
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            
            await pool.execute(
              'INSERT INTO campaign_retry_queue (campaign_id, retry_at, status) VALUES (?, ?, "pending")',
              [campaignId, tomorrow]
            );
            
            await pool.execute(
              `UPDATE campaigns SET status = 'paused' WHERE id = ?`,
              [campaignId]
            );
            
            this.io.emit(`campaign:${campaignId}:paused`, {
              reason: 'Daily limit reached again',
              retryAt: tomorrow.toISOString()
            });
            
            break;
          }
          
          await pool.execute(
            `UPDATE campaign_recipients 
             SET status = 'failed', smtp_server_id = ?, error_message = ?
             WHERE id = ?`,
            [item.smtpServer.id, `SMTP limit reached: ${limitCheck.reason}`, item.recipient.id]
          );
          failed++;
          continue;
        }

        const result = await item.sender.sendEmail(
          item.recipient.email,
          campaign.subject,
          campaign.html_content,
          item.recipient.id,
          campaignId
        );

        if (result.success) {
          await pool.execute(
            `UPDATE campaign_recipients 
             SET status = 'sent', smtp_server_id = ?, sent_at = NOW()
             WHERE id = ?`,
            [item.smtpServer.id, item.recipient.id]
          );

          await item.sender.recordUsage();

          await pool.execute(
            `INSERT INTO email_logs (campaign_id, recipient_id, smtp_server_id, email, status)
             VALUES (?, ?, ?, ?, 'sent')`,
            [campaignId, item.recipient.id, item.smtpServer.id, item.recipient.email]
          );

          sent++;
        } else {
          await pool.execute(
            `UPDATE campaign_recipients 
             SET status = 'failed', smtp_server_id = ?, error_message = ?
             WHERE id = ?`,
            [item.smtpServer.id, result.error, item.recipient.id]
          );

          await pool.execute(
            `INSERT INTO email_logs (campaign_id, recipient_id, smtp_server_id, email, status, error_message)
             VALUES (?, ?, ?, ?, 'failed', ?)`,
            [campaignId, item.recipient.id, item.smtpServer.id, item.recipient.email, result.error]
          );

          failed++;
        }

        // Emit progress
        this.io.emit(`campaign:${campaignId}:progress`, {
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
      this.io.emit(`campaign:${campaignId}:complete`, {
        total,
        sent,
        failed
      });

    } catch (error) {
      console.error(`[Retry Processor] Error resuming campaign ${campaignId}:`, error);
      await pool.execute(
        `UPDATE campaigns SET status = 'failed' WHERE id = ?`,
        [campaignId]
      );
      this.io.emit(`campaign:${campaignId}:error`, { error: error.message });
    }
  }

  // Start periodic checking
  start(intervalMinutes = 5) {
    console.log(`[Retry Processor] Starting with ${intervalMinutes} minute interval`);
    this.processRetryQueue(); // Run immediately
    setInterval(() => {
      this.processRetryQueue();
    }, intervalMinutes * 60 * 1000);
  }
}

module.exports = CampaignRetryProcessor;


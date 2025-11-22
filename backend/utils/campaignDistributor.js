const pool = require('../config/database');
const EmailSender = require('./emailSender');

class CampaignDistributor {
  async getAvailableSMTPs(userId) {
    const [servers] = await pool.execute(
      `SELECT * FROM smtp_servers WHERE is_active = 1 AND user_id = ?`,
      [userId]
    );
    return servers;
  }

  async calculateDistribution(recipients, smtpServers) {
    const distribution = [];
    const senderInstances = [];

    // Initialize email senders
    for (const server of smtpServers) {
      const sender = new EmailSender(server);
      const initResult = await sender.initialize();
      
      if (initResult.success) {
        senderInstances.push({
          sender,
          server,
          id: server.id,
          name: server.name
        });
      } else {
        console.warn(`SMTP server ${server.id} (${server.name}) initialization failed: ${initResult.error}`);
      }
    }

    if (senderInstances.length === 0) {
      throw new Error('No available SMTP servers');
    }

    // Get initial capacity for each SMTP
    const capacities = [];
    for (const instance of senderInstances) {
      const limitCheck = await instance.sender.checkLimits();
      if (limitCheck.available && limitCheck.actualRemaining > 0) {
        capacities.push({
          ...instance,
          dailyRemaining: limitCheck.dailyRemaining,
          hourlyRemaining: limitCheck.hourlyRemaining,
          totalCapacity: limitCheck.actualRemaining // Use actual remaining (min of daily/hourly)
        });
        console.log(`SMTP ${instance.name}: Daily remaining: ${limitCheck.dailyRemaining}, Hourly remaining: ${limitCheck.hourlyRemaining}, Actual capacity: ${limitCheck.actualRemaining}`);
      } else {
        console.log(`SMTP ${instance.name}: No capacity available (Daily: ${limitCheck.dailyRemaining}, Hourly: ${limitCheck.hourlyRemaining})`);
      }
    }

    if (capacities.length === 0) {
      throw new Error('No available SMTP servers with remaining capacity');
    }

    // Calculate total capacity
    const totalCapacity = capacities.reduce((sum, c) => sum + c.totalCapacity, 0);
    
    if (totalCapacity < recipients.length) {
      console.warn(`Total SMTP capacity (${totalCapacity}) is less than recipients (${recipients.length}). Some emails may not be sent.`);
    }

    // Distribute recipients using weighted round-robin based on capacity
    let currentIndex = 0;
    const assignments = new Array(capacities.length).fill(0); // Track assignments per SMTP
    
    for (let i = 0; i < recipients.length; i++) {
      let assigned = false;
      let attempts = 0;
      const maxAttempts = capacities.length * 2; // Try all servers twice
      
      while (!assigned && attempts < maxAttempts) {
        // Use weighted round-robin: select server based on its capacity proportion
        const serverIndex = currentIndex % capacities.length;
        const capacity = capacities[serverIndex];
        
        // Check if this server still has capacity
        if (capacity.totalCapacity > 0 && capacity.dailyRemaining > 0 && capacity.hourlyRemaining > 0) {
          distribution.push({
            recipient: recipients[i],
            smtpServer: capacity.server,
            sender: capacity.sender,
            smtpIndex: serverIndex
          });
          
          // Decrement capacity
          capacity.totalCapacity--;
          capacity.dailyRemaining--;
          capacity.hourlyRemaining--;
          assignments[serverIndex]++;
          assigned = true;
        }
        
        currentIndex++;
        attempts++;
        
        // If we've tried all servers and none are available, re-check limits
        if (attempts === capacities.length && !assigned) {
          for (let j = 0; j < capacities.length; j++) {
            const limitCheck = await capacities[j].sender.checkLimits();
            if (limitCheck.available && limitCheck.actualRemaining > 0) {
              capacities[j].dailyRemaining = limitCheck.dailyRemaining;
              capacities[j].hourlyRemaining = limitCheck.hourlyRemaining;
              capacities[j].totalCapacity = limitCheck.actualRemaining;
            } else {
              capacities[j].totalCapacity = 0;
            }
          }
        }
      }

      if (!assigned) {
        console.warn(`Could not assign recipient ${i + 1} (${recipients[i].email}). All SMTP servers at capacity.`);
        // Still add to distribution but mark as unavailable
        distribution.push({
          recipient: recipients[i],
          smtpServer: null,
          sender: null,
          unavailable: true
        });
      }
    }

    // Log distribution summary
    console.log('\n=== Distribution Summary ===');
    capacities.forEach((cap, idx) => {
      console.log(`${cap.name}: ${assignments[idx]} emails assigned (${cap.server.daily_limit || 'unlimited'} daily, ${cap.server.hourly_limit || 'unlimited'} hourly)`);
    });
    console.log(`Total recipients: ${recipients.length}, Assigned: ${distribution.filter(d => !d.unavailable).length}\n`);

    return distribution;
  }

  async distributeCampaign(campaignId) {
    // Get campaign details
    const [campaigns] = await pool.execute(
      `SELECT * FROM campaigns WHERE id = ?`,
      [campaignId]
    );

    if (campaigns.length === 0) {
      throw new Error('Campaign not found');
    }

    const campaign = campaigns[0];
    
    // Ensure campaign has user_id
    if (!campaign.user_id) {
      throw new Error('Campaign does not have an owner');
    }

    // Get recipients
    const [recipients] = await pool.execute(
      `SELECT id, email FROM campaign_recipients 
       WHERE campaign_id = ? AND status = 'pending'
       ORDER BY id`,
      [campaignId]
    );

    if (recipients.length === 0) {
      throw new Error('No recipients found for this campaign');
    }

    // Get available SMTP servers (only user's own SMTP servers)
    const smtpServers = await this.getAvailableSMTPs(campaign.user_id);
    
    if (smtpServers.length === 0) {
      throw new Error('No active SMTP servers available. Please add at least one SMTP server.');
    }

    // Calculate distribution
    const distribution = await this.calculateDistribution(recipients, smtpServers);

    return {
      campaign,
      distribution
    };
  }
}

module.exports = CampaignDistributor;


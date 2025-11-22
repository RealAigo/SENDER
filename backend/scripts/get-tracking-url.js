const pool = require('../config/database');
const crypto = require('crypto');

// Generate tracking hash (same as in emailSender.js)
function generateTrackingHash(recipientId, campaignId) {
  const secret = process.env.JWT_SECRET || 'default-secret';
  return crypto.createHash('sha256')
    .update(`${recipientId}:${campaignId}:${secret}`)
    .digest('hex')
    .substring(0, 16);
}

async function getTrackingUrl() {
  try {
    console.log('🔍 Finding Tracking URLs from Recent Campaigns...\n');

    // Get recent campaigns with recipients
    const [campaigns] = await pool.execute(
      `SELECT c.id, c.name, cr.id as recipient_id, cr.email, cr.status
       FROM campaigns c
       JOIN campaign_recipients cr ON c.id = cr.campaign_id
       WHERE cr.status = 'sent'
       ORDER BY c.created_at DESC, cr.id ASC
       LIMIT 5`
    );

    if (campaigns.length === 0) {
      console.log('❌ No sent recipients found in recent campaigns.');
      console.log('   Send a campaign first, then run this script again.\n');
      return;
    }

    const baseUrl = process.env.TRACKING_BASE_URL || process.env.CORS_ORIGIN || 'http://localhost:3001';
    
    console.log(`📧 Found ${campaigns.length} sent recipients:\n`);
    console.log(`🌐 Base URL: ${baseUrl}\n`);
    
    if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
      console.log('⚠️  WARNING: Using localhost URL!');
      console.log('   Email clients cannot access this. Use ngrok or deploy to a server.\n');
    }

    campaigns.forEach((item, index) => {
      const trackingHash = generateTrackingHash(item.recipient_id, item.id);
      const trackingToken = `${item.recipient_id}-${item.id}-${trackingHash}`;
      const trackingUrl = `${baseUrl}/api/tracking/open/${trackingToken}`;
      
      console.log(`${index + 1}. Campaign: ${item.name} (ID: ${item.id})`);
      console.log(`   Recipient: ${item.email} (ID: ${item.recipient_id})`);
      console.log(`   Tracking URL: ${trackingUrl}`);
      console.log(`   Test: Open this URL in your browser to simulate an email open\n`);
    });

    console.log('💡 To test tracking:');
    console.log('   1. Copy one of the tracking URLs above');
    console.log('   2. Open it in your browser');
    console.log('   3. Check backend logs - should show tracking event');
    console.log('   4. Run: node backend/scripts/check-tracking-status.js');
    console.log('   5. Refresh campaign detail page - should show as opened\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

getTrackingUrl();



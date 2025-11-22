const pool = require('../config/database');

async function testTracking() {
  try {
    console.log('Testing email tracking setup...\n');
    
    // Check if email_open_tracking table exists
    const [tables] = await pool.execute("SHOW TABLES LIKE 'email_open_tracking'");
    if (tables.length === 0) {
      console.error('❌ email_open_tracking table does not exist!');
      console.error('Run: mysql -u root -p email_sender < database/migration_email_tracking_simple.sql');
      process.exit(1);
    }
    console.log('✅ email_open_tracking table exists');
    
    // Check if country columns exist
    const [columns] = await pool.execute("SHOW COLUMNS FROM email_open_tracking LIKE 'country'");
    if (columns.length === 0) {
      console.error('❌ country column does not exist!');
      console.error('Run: mysql -u root -p email_sender < database/migration_add_country_to_tracking_simple.sql');
      process.exit(1);
    }
    console.log('✅ country columns exist');
    
    // Check campaign_recipients for opened_at column
    const [recipientColumns] = await pool.execute("SHOW COLUMNS FROM campaign_recipients LIKE 'opened_at'");
    if (recipientColumns.length === 0) {
      console.error('❌ opened_at column does not exist in campaign_recipients!');
      console.error('Run: mysql -u root -p email_sender < database/migration_email_tracking_simple.sql');
      process.exit(1);
    }
    console.log('✅ opened_at column exists in campaign_recipients');
    
    // Check recent campaigns
    const [campaigns] = await pool.execute(
      'SELECT id, name, status FROM campaigns ORDER BY created_at DESC LIMIT 5'
    );
    
    if (campaigns.length > 0) {
      console.log(`\n📧 Found ${campaigns.length} recent campaign(s):`);
      campaigns.forEach(campaign => {
        console.log(`  - Campaign #${campaign.id}: ${campaign.name} (${campaign.status})`);
      });
      
      // Check recipients for the most recent campaign
      const [recipients] = await pool.execute(
        'SELECT id, email, status, opened_at, opened_count FROM campaign_recipients WHERE campaign_id = ? LIMIT 5',
        [campaigns[0].id]
      );
      
      if (recipients.length > 0) {
        console.log(`\n📬 Recipients for campaign #${campaigns[0].id}:`);
        recipients.forEach(recipient => {
          const opened = recipient.opened_at ? `✅ Opened (${recipient.opened_count}x)` : '❌ Not opened';
          console.log(`  - ${recipient.email}: ${recipient.status} - ${opened}`);
        });
      }
    }
    
    // Check tracking logs
    const [trackingLogs] = await pool.execute(
      'SELECT COUNT(*) as count FROM email_open_tracking'
    );
    console.log(`\n📊 Total tracking events: ${trackingLogs[0].count}`);
    
    if (trackingLogs[0].count > 0) {
      const [recentLogs] = await pool.execute(
        'SELECT recipient_id, email, country, country_code, opened_at FROM email_open_tracking ORDER BY opened_at DESC LIMIT 5'
      );
      console.log('\n📈 Recent opens:');
      recentLogs.forEach(log => {
        console.log(`  - ${log.email}: ${log.country || 'Unknown'} at ${log.opened_at}`);
      });
    }
    
    console.log('\n✅ Tracking setup looks good!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

testTracking();


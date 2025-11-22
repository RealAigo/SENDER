const pool = require('../config/database');

async function checkTrackingStatus() {
  try {
    console.log('🔍 Checking Email Tracking Status...\n');

    // 1. Check if email_open_tracking table exists
    console.log('1. Checking database tables...');
    try {
      const [tables] = await pool.execute(
        "SHOW TABLES LIKE 'email_open_tracking'"
      );
      if (tables.length === 0) {
        console.log('❌ email_open_tracking table does not exist!');
        console.log('   Run: mysql -u root -p email_sender < database/migration_email_tracking_simple.sql');
        return;
      }
      console.log('✅ email_open_tracking table exists');

      // Check columns
      const [columns] = await pool.execute('DESCRIBE email_open_tracking');
      const columnNames = columns.map(c => c.Field);
      const requiredColumns = ['recipient_id', 'campaign_id', 'email', 'ip_address', 'user_agent', 'country', 'country_code'];
      const missingColumns = requiredColumns.filter(col => !columnNames.includes(col));
      if (missingColumns.length > 0) {
        console.log(`❌ Missing columns: ${missingColumns.join(', ')}`);
        console.log('   Run: mysql -u root -p email_sender < database/migration_add_country_to_tracking_simple.sql');
        return;
      }
      console.log('✅ All required columns exist');
    } catch (error) {
      console.error('❌ Error checking tables:', error.message);
      return;
    }

    // 2. Check campaign_recipients table
    console.log('\n2. Checking campaign_recipients table...');
    try {
      const [columns] = await pool.execute('DESCRIBE campaign_recipients');
      const columnNames = columns.map(c => c.Field);
      if (!columnNames.includes('opened_at')) {
        console.log('❌ opened_at column missing from campaign_recipients');
        return;
      }
      if (!columnNames.includes('opened_count')) {
        console.log('❌ opened_count column missing from campaign_recipients');
        return;
      }
      console.log('✅ campaign_recipients has tracking columns');
    } catch (error) {
      console.error('❌ Error checking campaign_recipients:', error.message);
      return;
    }

    // 3. Check recent campaigns
    console.log('\n3. Checking recent campaigns...');
    try {
      const [campaigns] = await pool.execute(
        'SELECT id, name, status, created_at FROM campaigns ORDER BY created_at DESC LIMIT 5'
      );
      if (campaigns.length === 0) {
        console.log('⚠️  No campaigns found');
      } else {
        console.log(`✅ Found ${campaigns.length} recent campaigns:`);
        campaigns.forEach(c => {
          console.log(`   - Campaign ${c.id}: ${c.name} (${c.status}) - ${c.created_at}`);
        });
      }
    } catch (error) {
      console.error('❌ Error checking campaigns:', error.message);
    }

    // 4. Check recipients with opens
    console.log('\n4. Checking recipients with opens...');
    try {
      const [recipients] = await pool.execute(
        `SELECT cr.id, cr.email, cr.campaign_id, c.name as campaign_name, 
         cr.opened_at, cr.opened_count,
         eot.country, eot.country_code, eot.ip_address
         FROM campaign_recipients cr
         LEFT JOIN campaigns c ON cr.campaign_id = c.id
         LEFT JOIN email_open_tracking eot ON cr.id = eot.recipient_id
         WHERE cr.opened_at IS NOT NULL
         ORDER BY cr.opened_at DESC
         LIMIT 10`
      );
      
      if (recipients.length === 0) {
        console.log('⚠️  No recipients with opens found');
        console.log('   This could mean:');
        console.log('   - No emails have been opened yet');
        console.log('   - Tracking pixel is not being loaded');
        console.log('   - TRACKING_BASE_URL is set to localhost (not accessible from email clients)');
      } else {
        console.log(`✅ Found ${recipients.length} recipients with opens:`);
        recipients.forEach(r => {
          console.log(`   - ${r.email} (Campaign: ${r.campaign_name})`);
          console.log(`     Opened: ${r.opened_at} (${r.opened_count} times)`);
          if (r.country) {
            console.log(`     Country: ${r.country} (${r.country_code})`);
          }
          if (r.ip_address) {
            console.log(`     IP: ${r.ip_address}`);
          }
        });
      }
    } catch (error) {
      console.error('❌ Error checking recipients:', error.message);
    }

    // 5. Check total tracking events
    console.log('\n5. Checking tracking events...');
    try {
      const [count] = await pool.execute('SELECT COUNT(*) as total FROM email_open_tracking');
      console.log(`✅ Total tracking events: ${count[0].total}`);
      
      if (count[0].total > 0) {
        const [recent] = await pool.execute(
          'SELECT * FROM email_open_tracking ORDER BY opened_at DESC LIMIT 5'
        );
        console.log('\n   Recent tracking events:');
        recent.forEach(e => {
          console.log(`   - ${e.email} opened at ${e.opened_at}`);
          console.log(`     IP: ${e.ip_address}, Country: ${e.country || 'Unknown'}`);
        });
      }
    } catch (error) {
      console.error('❌ Error checking tracking events:', error.message);
    }

    // 6. Check environment variables
    console.log('\n6. Checking environment configuration...');
    const trackingBaseUrl = process.env.TRACKING_BASE_URL || process.env.CORS_ORIGIN || 'http://localhost:3001';
    console.log(`   TRACKING_BASE_URL: ${trackingBaseUrl}`);
    
    if (trackingBaseUrl.includes('localhost') || trackingBaseUrl.includes('127.0.0.1')) {
      console.log('   ⚠️  WARNING: Using localhost URL!');
      console.log('   Email clients cannot access localhost URLs.');
      console.log('   Solutions:');
      console.log('   1. Use ngrok: ngrok http 3001');
      console.log('   2. Deploy backend to a server');
      console.log('   3. Set TRACKING_BASE_URL to your public URL');
    } else {
      console.log('   ✅ Using public URL (good for email tracking)');
    }

    console.log('\n✅ Diagnostic complete!\n');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkTrackingStatus();



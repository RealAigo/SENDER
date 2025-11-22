const pool = require('../config/database');

async function checkSMTPOwnership() {
  try {
    console.log('Checking SMTP server ownership...\n');
    
    // Get all SMTP servers with user info
    const [servers] = await pool.execute(`
      SELECT s.id, s.name, s.user_id, u.username, u.email
      FROM smtp_servers s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.id
    `);
    
    if (servers.length === 0) {
      console.log('No SMTP servers found in database.');
      return;
    }
    
    console.log(`Found ${servers.length} SMTP server(s):\n`);
    
    servers.forEach(server => {
      console.log(`SMTP #${server.id}: "${server.name}"`);
      if (server.user_id) {
        if (server.username) {
          console.log(`  Owner: User #${server.user_id} (${server.username} - ${server.email})`);
        } else {
          console.log(`  Owner: User #${server.user_id} (USER NOT FOUND - may have been deleted)`);
        }
      } else {
        console.log(`  Owner: NULL (NO OWNER ASSIGNED!)`);
      }
      console.log('');
    });
    
    // Check for servers without user_id
    const [orphaned] = await pool.execute(
      'SELECT COUNT(*) as count FROM smtp_servers WHERE user_id IS NULL OR user_id = 0'
    );
    
    if (orphaned[0].count > 0) {
      console.log(`⚠️  WARNING: ${orphaned[0].count} SMTP server(s) without an owner!`);
      console.log('These servers may be visible to all users or cause errors.\n');
    }
    
    // Check users
    const [users] = await pool.execute('SELECT id, username, email FROM users ORDER BY id');
    console.log(`\nFound ${users.length} user(s):`);
    for (const user of users) {
      const [userServers] = await pool.execute(
        'SELECT COUNT(*) as count FROM smtp_servers WHERE user_id = ?',
        [user.id]
      );
      console.log(`  User #${user.id}: ${user.username} (${user.email}) - ${userServers[0].count} SMTP server(s)`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

checkSMTPOwnership();


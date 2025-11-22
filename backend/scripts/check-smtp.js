/**
 * Diagnostic script to check SMTP server configuration
 * Run with: node scripts/check-smtp.js <smtp_id>
 */

require('dotenv').config();
const pool = require('../config/database');
const { decrypt } = require('../utils/encryption');

async function checkSMTP(id) {
  try {
    const [servers] = await pool.execute(
      `SELECT * FROM smtp_servers WHERE id = ?`,
      [id]
    );

    if (servers.length === 0) {
      console.error(`SMTP server with ID ${id} not found`);
      process.exit(1);
    }

    const server = servers[0];
    
    console.log('\n=== SMTP Server Configuration ===');
    console.log(`ID: ${server.id}`);
    console.log(`Name: ${server.name}`);
    console.log(`Host: ${server.host || 'MISSING'}`);
    console.log(`Port: ${server.port || 'MISSING'}`);
    console.log(`Secure: ${server.secure ? 'Yes' : 'No'}`);
    console.log(`Username: ${server.username || 'MISSING'}`);
    console.log(`Password: ${server.password ? 'EXISTS (encrypted)' : 'MISSING'}`);
    console.log(`From Email: ${server.from_email || 'MISSING'}`);
    console.log(`From Name: ${server.from_name || 'Not set'}`);
    console.log(`Daily Limit: ${server.daily_limit || 0}`);
    console.log(`Hourly Limit: ${server.hourly_limit || 0}`);
    console.log(`Active: ${server.is_active ? 'Yes' : 'No'}`);
    
    console.log('\n=== Validation ===');
    const issues = [];
    
    if (!server.host || !server.host.trim()) {
      issues.push('❌ Host is missing or empty');
    }
    if (!server.port || server.port === 0 || isNaN(server.port)) {
      issues.push('❌ Port is missing, zero, or invalid');
    } else if (server.port < 1 || server.port > 65535) {
      issues.push(`❌ Port ${server.port} is out of valid range (1-65535)`);
    }
    if (!server.username || !server.username.trim()) {
      issues.push('❌ Username is missing or empty');
    }
    if (!server.password || !server.password.trim()) {
      issues.push('❌ Password is missing or empty');
    } else {
      // Try to decrypt password
      try {
        const decrypted = decrypt(server.password);
        console.log(`✅ Password can be decrypted (length: ${decrypted.length})`);
      } catch (error) {
        issues.push(`❌ Password decryption failed: ${error.message}`);
      }
    }
    if (!server.from_email || !server.from_email.trim()) {
      issues.push('❌ From Email is missing or empty');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(server.from_email)) {
        issues.push(`❌ From Email "${server.from_email}" is not a valid email format`);
      }
    }
    
    // Check if host contains port
    if (server.host && server.host.includes(':')) {
      const parts = server.host.split(':');
      const possiblePort = parseInt(parts[parts.length - 1]);
      if (!isNaN(possiblePort) && possiblePort > 0 && possiblePort <= 65535) {
        issues.push(`⚠️  Host contains port (${possiblePort}). Port field is ${server.port || 'empty'}. Consider separating them.`);
      }
    }
    
    if (issues.length === 0) {
      console.log('✅ All required fields are present and valid');
    } else {
      console.log('\nIssues found:');
      issues.forEach(issue => console.log(`  ${issue}`));
    }
    
    console.log('\n=== Recommendations ===');
    if (!server.port || server.port === 0) {
      console.log('  • Set port to 587 (TLS) or 465 (SSL) for most SMTP servers');
    }
    if (server.host && server.host.includes(':')) {
      console.log('  • Remove port from host field. Use separate port field instead.');
      console.log('  • Example: Host should be "smtp.yandex.com", Port should be "465"');
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

const smtpId = process.argv[2];
if (!smtpId) {
  console.error('Usage: node scripts/check-smtp.js <smtp_id>');
  process.exit(1);
}

checkSMTP(smtpId);






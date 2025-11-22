const pool = require('../config/database');

async function checkUsersTable() {
  try {
    console.log('Checking if users table exists...');
    
    // Check if users table exists
    const [tables] = await pool.execute("SHOW TABLES LIKE 'users'");
    
    if (tables.length === 0) {
      console.error('\n❌ ERROR: users table does not exist!');
      console.error('\nPlease run the database migration:');
      console.error('mysql -u root -p email_sender < ../database/schema.sql');
      console.error('\nOr if you have an existing database:');
      console.error('mysql -u root -p email_sender < ../database/migration_auth.sql');
      process.exit(1);
    }
    
    console.log('✅ users table exists');
    
    // Check table structure
    const [columns] = await pool.execute('DESCRIBE users');
    console.log('\nUsers table structure:');
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database error:', error.message);
    
    if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('\nDatabase "email_sender" does not exist.');
      console.error('Please create it first or check your .env file.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('\nCannot connect to MySQL database.');
      console.error('Please make sure MySQL is running.');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('\nDatabase access denied.');
      console.error('Please check your database credentials in .env file.');
    }
    
    process.exit(1);
  }
}

checkUsersTable();



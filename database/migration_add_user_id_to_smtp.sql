-- Migration: Add user_id column to smtp_servers table
-- Run this to add user ownership to SMTP servers
-- Make sure to backup your database first!

USE email_sender;

-- Check if column already exists
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'smtp_servers' 
AND COLUMN_NAME = 'user_id';

-- Add user_id column if it doesn't exist
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE smtp_servers ADD COLUMN user_id INT NOT NULL DEFAULT 1 AFTER is_active',
    'SELECT "Column user_id already exists in smtp_servers table" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- IMPORTANT: Assign existing SMTP servers to a user
-- First, check if you have any users
SET @user_count = (SELECT COUNT(*) FROM users);

-- If you have users, assign all existing SMTP servers to the first user
-- Otherwise, you'll need to create a user first
SET @first_user_id = (SELECT id FROM users ORDER BY id LIMIT 1);

SET @sql = IF(@user_count > 0 AND @col_exists = 0,
    CONCAT('UPDATE smtp_servers SET user_id = ', @first_user_id, ' WHERE user_id = 1 OR user_id IS NULL'),
    'SELECT "No users found or column already existed. Please create a user first or assign manually." AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key constraint (if column was just added)
SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists 
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'smtp_servers' 
AND CONSTRAINT_NAME LIKE '%user_id%';

SET @sql = IF(@fk_exists = 0 AND @col_exists = 0,
    'ALTER TABLE smtp_servers ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, ADD INDEX idx_user (user_id)',
    'SELECT "Foreign key already exists or column was not added" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Show results
SELECT 
    'Migration completed' AS status,
    (SELECT COUNT(*) FROM smtp_servers) AS total_smtp_servers,
    (SELECT COUNT(DISTINCT user_id) FROM smtp_servers) AS unique_owners,
    (SELECT COUNT(*) FROM smtp_servers WHERE user_id IS NULL OR user_id = 0) AS orphaned_servers;

-- Show SMTP servers with their owners
SELECT 
    s.id,
    s.name,
    s.user_id,
    u.username as owner_username,
    u.email as owner_email
FROM smtp_servers s
LEFT JOIN users u ON s.user_id = u.id
ORDER BY s.id;


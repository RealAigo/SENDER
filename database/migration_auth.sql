-- Migration script to add authentication and user ownership support
-- Run this if you already have an existing database
-- Make sure to backup your database before running this migration

USE email_sender;

-- Create Users Table for Authentication (if not exists)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add user_id column to campaigns table (skip if already exists)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'campaigns' 
AND COLUMN_NAME = 'user_id';

SET @sql = IF(@col_exists = 0, 
    'ALTER TABLE campaigns ADD COLUMN user_id INT NULL',
    'SELECT "Column user_id already exists in campaigns table" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add foreign key to campaigns (if user_id was just added)
SET @fk_exists = 0;
SELECT COUNT(*) INTO @fk_exists 
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'campaigns' 
AND CONSTRAINT_NAME = 'campaigns_ibfk_1';

SET @sql = IF(@fk_exists = 0 AND @col_exists = 0,
    'ALTER TABLE campaigns ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL, ADD INDEX idx_user (user_id)',
    'SELECT "Foreign key already exists or column was not added" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add user_id column to smtp_servers table (skip if already exists)
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'smtp_servers' 
AND COLUMN_NAME = 'user_id';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE smtp_servers ADD COLUMN user_id INT NOT NULL DEFAULT 1 AFTER is_active',
    'SELECT "Column user_id already exists in smtp_servers table" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- IMPORTANT: For existing SMTP servers, assign them to a default user
-- Replace 1 with the ID of an admin user after creating one
-- Or delete existing SMTP servers and recreate them after registering
UPDATE smtp_servers SET user_id = 1 WHERE user_id IS NULL OR user_id = 0;

-- Add foreign key to smtp_servers (if user_id was just added)
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

-- Note: After running this migration:
-- 1. Create an admin user account through the registration page
-- 2. Update existing SMTP servers' user_id to match the admin user ID if needed:
--    UPDATE smtp_servers SET user_id = <admin_user_id> WHERE user_id = 1;
-- 3. For existing campaigns, you may want to assign them to users:
--    UPDATE campaigns SET user_id = <user_id> WHERE user_id IS NULL;


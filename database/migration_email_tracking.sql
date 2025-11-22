-- Migration: Add email open tracking and campaign retry queue
-- Run this to add email tracking and automatic retry features

USE email_sender;

-- Add opened tracking columns to campaign_recipients
SET @col_exists = 0;
SELECT COUNT(*) INTO @col_exists 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'campaign_recipients' 
AND COLUMN_NAME = 'opened_at';

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE campaign_recipients ADD COLUMN opened_at TIMESTAMP NULL AFTER sent_at, ADD COLUMN opened_count INT DEFAULT 0 AFTER opened_at, ADD INDEX idx_opened (opened_at)',
    'SELECT "Columns already exist in campaign_recipients table" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create email_open_tracking table
CREATE TABLE IF NOT EXISTS email_open_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient_id INT NOT NULL,
    campaign_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    FOREIGN KEY (recipient_id) REFERENCES campaign_recipients(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    INDEX idx_recipient (recipient_id),
    INDEX idx_campaign (campaign_id),
    INDEX idx_opened_at (opened_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create campaign_retry_queue table
CREATE TABLE IF NOT EXISTS campaign_retry_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    retry_at TIMESTAMP NOT NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    INDEX idx_retry_at (retry_at),
    INDEX idx_status (status),
    INDEX idx_campaign (campaign_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SELECT 'Migration completed successfully' AS status;


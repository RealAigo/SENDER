-- Simple Migration: Add email open tracking and campaign retry queue
-- This version doesn't use INFORMATION_SCHEMA (for users without access)
-- Run this if you get access denied errors with the other migration

USE email_sender;

-- Add opened tracking columns to campaign_recipients
-- If columns already exist, you'll get an error - that's okay, just continue
ALTER TABLE campaign_recipients 
ADD COLUMN opened_at TIMESTAMP NULL AFTER sent_at;

ALTER TABLE campaign_recipients 
ADD COLUMN opened_count INT DEFAULT 0 AFTER opened_at;

ALTER TABLE campaign_recipients 
ADD INDEX idx_opened (opened_at);

-- Create email_open_tracking table (if not exists)
-- If table exists, you'll get an error - that's okay
CREATE TABLE email_open_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient_id INT NOT NULL,
    campaign_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    country VARCHAR(100) NULL,
    country_code VARCHAR(2) NULL,
    FOREIGN KEY (recipient_id) REFERENCES campaign_recipients(id) ON DELETE CASCADE,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    INDEX idx_recipient (recipient_id),
    INDEX idx_campaign (campaign_id),
    INDEX idx_opened_at (opened_at),
    INDEX idx_country (country)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create campaign_retry_queue table (if not exists)
-- If table exists, you'll get an error - that's okay
CREATE TABLE campaign_retry_queue (
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

SELECT 'Migration completed! If you saw any "already exists" errors, that means those items were already created - that is fine.' AS status;


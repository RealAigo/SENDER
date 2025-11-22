-- Manual Migration: Add email open tracking (Step by Step)
-- Use this if you prefer to run commands one at a time
-- Copy and paste each section into phpMyAdmin SQL tab

USE email_sender;

-- ============================================
-- STEP 1: Add opened_at column
-- ============================================
-- Run this first. If you get "Duplicate column name", skip to STEP 2
ALTER TABLE campaign_recipients 
ADD COLUMN opened_at TIMESTAMP NULL AFTER sent_at;

-- ============================================
-- STEP 2: Add opened_count column
-- ============================================
-- Run this second. If you get "Duplicate column name", skip to STEP 3
ALTER TABLE campaign_recipients 
ADD COLUMN opened_count INT DEFAULT 0 AFTER opened_at;

-- ============================================
-- STEP 3: Add index for opened_at
-- ============================================
-- Run this third. If you get "Duplicate key name", skip to STEP 4
ALTER TABLE campaign_recipients 
ADD INDEX idx_opened (opened_at);

-- ============================================
-- STEP 4: Create email_open_tracking table
-- ============================================
-- Run this fourth. If you get "Table already exists", skip to STEP 5
CREATE TABLE email_open_tracking (
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

-- ============================================
-- STEP 5: Create campaign_retry_queue table
-- ============================================
-- Run this fifth. If you get "Table already exists", you're done!
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

-- ============================================
-- DONE! Verify the changes:
-- ============================================
-- Run this to check if everything was created:
DESCRIBE campaign_recipients;
SHOW TABLES LIKE 'email_open_tracking';
SHOW TABLES LIKE 'campaign_retry_queue';


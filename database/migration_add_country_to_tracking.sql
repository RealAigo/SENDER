-- Migration: Add country columns to email_open_tracking table
-- Run this if you already have email_open_tracking table without country columns

USE email_sender;

-- Add country columns to email_open_tracking
-- If columns already exist, you'll get an error - that's okay, just continue
ALTER TABLE email_open_tracking 
ADD COLUMN country VARCHAR(100) NULL AFTER user_agent;

ALTER TABLE email_open_tracking 
ADD COLUMN country_code VARCHAR(2) NULL AFTER country;

ALTER TABLE email_open_tracking 
ADD INDEX idx_country (country);

SELECT 'Migration completed! If you saw "Duplicate column name" errors, that means columns already exist - that is fine.' AS status;


-- Simple Migration: Add country columns to email_open_tracking table
-- Run this if you already have email_open_tracking table without country columns
-- If columns already exist, you'll get errors - that's fine, just ignore them

USE email_sender;

-- Add country column
ALTER TABLE email_open_tracking 
ADD COLUMN country VARCHAR(100) NULL AFTER user_agent;

-- Add country_code column
ALTER TABLE email_open_tracking 
ADD COLUMN country_code VARCHAR(2) NULL AFTER country;

-- Add index for country
ALTER TABLE email_open_tracking 
ADD INDEX idx_country (country);

SELECT 'Migration completed! If you saw "Duplicate column name" errors, columns already exist - that is fine.' AS status;


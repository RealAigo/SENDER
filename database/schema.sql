-- Email Sender System Database Schema
-- MySQL Database

CREATE DATABASE IF NOT EXISTS email_sender CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE email_sender;

-- Users Table for Authentication
CREATE TABLE users (
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

-- SMTP Servers Table
CREATE TABLE smtp_servers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INT NOT NULL,
    secure BOOLEAN DEFAULT TRUE,
    username VARCHAR(255) NOT NULL,
    password TEXT NOT NULL, -- Encrypted
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    daily_limit INT DEFAULT 0,
    hourly_limit INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_active (is_active),
    INDEX idx_created (created_at),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- SMTP Usage Tracking Table
CREATE TABLE smtp_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    smtp_server_id INT NOT NULL,
    date DATE NOT NULL,
    hour INT NOT NULL, -- 0-23
    emails_sent INT DEFAULT 0,
    FOREIGN KEY (smtp_server_id) REFERENCES smtp_servers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_smtp_date_hour (smtp_server_id, date, hour),
    INDEX idx_date (date),
    INDEX idx_smtp_date (smtp_server_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Campaigns Table
CREATE TABLE campaigns (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    html_content TEXT NOT NULL,
    status ENUM('pending', 'running', 'completed', 'failed', 'paused') DEFAULT 'pending',
    total_recipients INT DEFAULT 0,
    emails_sent INT DEFAULT 0,
    emails_failed INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_by INT NULL,
    user_id INT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_created (created_at),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Campaign Recipients Table
CREATE TABLE campaign_recipients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    status ENUM('pending', 'sent', 'failed') DEFAULT 'pending',
    smtp_server_id INT NULL,
    error_message TEXT NULL,
    sent_at TIMESTAMP NULL,
    opened_at TIMESTAMP NULL,
    opened_count INT DEFAULT 0,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (smtp_server_id) REFERENCES smtp_servers(id) ON DELETE SET NULL,
    INDEX idx_campaign_status (campaign_id, status),
    INDEX idx_email (email),
    INDEX idx_opened (opened_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Email Logs Table
CREATE TABLE email_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    campaign_id INT NOT NULL,
    recipient_id INT NOT NULL,
    smtp_server_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    status ENUM('sent', 'failed') NOT NULL,
    error_message TEXT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES campaign_recipients(id) ON DELETE CASCADE,
    FOREIGN KEY (smtp_server_id) REFERENCES smtp_servers(id) ON DELETE CASCADE,
    INDEX idx_campaign (campaign_id),
    INDEX idx_smtp (smtp_server_id),
    INDEX idx_sent_at (sent_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Email Open Tracking Table
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

-- Campaign Retry Queue Table (for automatic retry after daily limit reset)
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


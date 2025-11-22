# Fix: Access Denied Error for INFORMATION_SCHEMA

If you're getting this error:
```
#1044 - Accès refusé pour l'utilisateur: 'root'@'localhost'. Base 'information_schema'
```

This means your MySQL user doesn't have permission to access the `INFORMATION_SCHEMA` database. The original migration script uses it to check if columns/tables exist.

## Solution: Use the Simple Migration

I've created a simpler migration script that doesn't use `INFORMATION_SCHEMA`.

### Option 1: Simple Migration Script (Recommended)

Run this instead:

```bash
mysql -u root -p email_sender < database/migration_email_tracking_simple.sql
```

Or in phpMyAdmin:
1. Go to SQL tab
2. Copy and paste contents of `database/migration_email_tracking_simple.sql`
3. Click "Go"

**Note**: If you see "Duplicate column name" or "Table already exists" errors, that's fine! It just means those items were already created. You can ignore those errors.

### Option 2: Manual Step-by-Step (Safest)

Use `database/migration_email_tracking_manual.sql` which has each command separated:

1. Open phpMyAdmin
2. Select `email_sender` database
3. Go to SQL tab
4. Copy and paste **one section at a time** from `migration_email_tracking_manual.sql`
5. Run each section separately
6. If you get "already exists" error, skip to the next section

### Option 3: Using phpMyAdmin GUI

#### Add Columns to campaign_recipients:

1. Click on `campaign_recipients` table
2. Click "Structure" tab
3. Click "Add" (at bottom)
4. Add first column:
   - **Name**: `opened_at`
   - **Type**: `TIMESTAMP`
   - **Null**: Checked
   - **Position**: After `sent_at`
5. Click "Save"
6. Click "Add" again
7. Add second column:
   - **Name**: `opened_count`
   - **Type**: `INT`
   - **Default**: `0`
   - **Position**: After `opened_at`
8. Click "Save"

#### Create email_open_tracking Table:

1. Go back to database view
2. Click "SQL" tab
3. Run this:

```sql
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
```

#### Create campaign_retry_queue Table:

1. Still in SQL tab, run this:

```sql
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
```

## Verify Migration

After running the migration, verify everything was created:

```sql
-- Check columns were added
DESCRIBE campaign_recipients;
-- Should see: opened_at and opened_count

-- Check tables were created
SHOW TABLES LIKE 'email_open_tracking';
SHOW TABLES LIKE 'campaign_retry_queue';
```

## What Each Part Does

1. **opened_at** - Timestamp when email was first opened
2. **opened_count** - Number of times email was opened
3. **email_open_tracking** - Detailed log of all opens (IP, user agent, etc.)
4. **campaign_retry_queue** - Queue for campaigns waiting to retry after daily limit

## After Migration

1. **Restart your backend server**
2. **Test email tracking** - Send a campaign and open the email
3. **Test auto-retry** - Set low daily limit and start a campaign

## Still Having Issues?

If you still get errors:

1. **Check your MySQL user permissions**:
   ```sql
   SHOW GRANTS FOR 'root'@'localhost';
   ```

2. **Try with a different user** that has full permissions

3. **Run commands one at a time** using the manual migration file

4. **Check if tables/columns already exist**:
   ```sql
   DESCRIBE campaign_recipients;
   SHOW TABLES;
   ```

If items already exist, you can skip creating them - the application will work fine!


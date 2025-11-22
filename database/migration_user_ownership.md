# User Ownership Migration Guide

This guide explains how to migrate your existing database to support user ownership of data.

## What Changes

After this migration:
- **SMTP servers** belong to specific users
- **Campaigns** belong to specific users  
- Users can only see and manage their own data
- Dashboard statistics show only user's own data

## Migration Steps

### Step 1: Backup Your Database

**IMPORTANT**: Always backup your database before running migrations!

```bash
mysqldump -u root -p email_sender > email_sender_backup.sql
```

### Step 2: Run the Migration

```bash
mysql -u root -p email_sender < database/migration_auth.sql
```

Or in MySQL console:
```sql
USE email_sender;
SOURCE database/migration_auth.sql;
```

### Step 3: Handle Existing Data

#### Option A: Assign to Admin User (Recommended for existing installations)

1. **Create an admin user account** through the registration page
2. **Note the user ID** (or check in database):
   ```sql
   SELECT id, username, email FROM users WHERE role = 'admin' OR id = 1;
   ```

3. **Assign existing SMTP servers to admin user**:
   ```sql
   UPDATE smtp_servers SET user_id = <admin_user_id> WHERE user_id = 1;
   ```

4. **Assign existing campaigns to admin user** (if any):
   ```sql
   UPDATE campaigns SET user_id = <admin_user_id> WHERE user_id IS NULL;
   ```

#### Option B: Start Fresh (For new installations)

- Existing SMTP servers will be assigned to user_id = 1 (default)
- If no user exists with id = 1, you may need to delete and recreate SMTP servers
- This is the cleanest approach for new installations

### Step 4: Verify Migration

Run this query to verify everything is set up correctly:

```sql
-- Check users table
SELECT COUNT(*) as user_count FROM users;

-- Check SMTP servers have user_id
SELECT COUNT(*) as total, 
       COUNT(user_id) as with_user_id,
       COUNT(*) - COUNT(user_id) as missing_user_id
FROM smtp_servers;

-- Check campaigns have user_id
SELECT COUNT(*) as total,
       COUNT(user_id) as with_user_id,
       COUNT(*) - COUNT(user_id) as missing_user_id
FROM campaigns;
```

All counts should match (no missing user_id values).

## Troubleshooting

### "Column user_id already exists"

The migration checks if columns exist before adding them. If you get this message, the column already exists - that's fine, just continue.

### "Foreign key constraint fails"

This means you're trying to assign a user_id that doesn't exist in the users table. Make sure:
1. You've created at least one user account
2. You're using a valid user ID

### Existing SMTP servers don't appear

After migration, existing SMTP servers may be assigned to user_id = 1. If you don't have a user with id = 1:
1. Create a user account
2. Note the user ID
3. Update SMTP servers: `UPDATE smtp_servers SET user_id = <your_user_id> WHERE user_id = 1;`

### "Cannot add foreign key constraint"

Make sure the users table exists and has at least one user. The foreign key requires a valid user to exist.

## After Migration

1. **Restart your backend server** to ensure changes take effect
2. **Login with your user account**
3. **Verify** you can see your SMTP servers and campaigns
4. **Create new SMTP servers/campaigns** to test that they're properly associated with your user

## Multiple Users

If you have multiple users:
- Each user will only see their own SMTP servers
- Each user will only see their own campaigns
- Each user will only see their own dashboard statistics
- Users cannot access each other's data

## Rollback (If Needed)

If you need to rollback:

```sql
-- Remove foreign keys
ALTER TABLE smtp_servers DROP FOREIGN KEY smtp_servers_ibfk_1;
ALTER TABLE campaigns DROP FOREIGN KEY campaigns_ibfk_1;

-- Remove columns (optional - data will be lost)
ALTER TABLE smtp_servers DROP COLUMN user_id;
ALTER TABLE campaigns DROP COLUMN user_id;
```

**Note**: This will remove all user ownership. Use with caution!



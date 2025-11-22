# Quick Fix: Add user_id to smtp_servers Table

The `smtp_servers` table is missing the `user_id` column. Here's how to fix it:

## Quick Solution

### Option 1: Run the Migration Script (Recommended)

1. **Backup your database first!**
   ```bash
   mysqldump -u root -p email_sender > email_sender_backup.sql
   ```

2. **Run the migration script:**
   ```bash
   mysql -u root -p email_sender < database/migration_add_user_id_to_smtp.sql
   ```

   Or in MySQL/phpMyAdmin:
   ```sql
   USE email_sender;
   SOURCE database/migration_add_user_id_to_smtp.sql;
   ```

### Option 2: Manual SQL (If migration script doesn't work)

Run these SQL commands in order:

```sql
USE email_sender;

-- Step 1: Add the user_id column
ALTER TABLE smtp_servers 
ADD COLUMN user_id INT NOT NULL DEFAULT 1 AFTER is_active;

-- Step 2: Check if you have users
SELECT id, username, email FROM users;

-- Step 3: Assign existing SMTP servers to the first user
-- Replace 1 with your actual user ID if different
UPDATE smtp_servers SET user_id = 1 WHERE user_id IS NULL OR user_id = 0;

-- Step 4: Add foreign key constraint
ALTER TABLE smtp_servers 
ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Step 5: Add index for better performance
ALTER TABLE smtp_servers 
ADD INDEX idx_user (user_id);
```

### Option 3: Using phpMyAdmin

1. Open phpMyAdmin: `http://localhost/phpmyadmin`
2. Select `email_sender` database
3. Click on `smtp_servers` table
4. Click "Structure" tab
5. Click "Add" (at the bottom)
6. Add new column:
   - **Name**: `user_id`
   - **Type**: `INT`
   - **Default**: `1`
   - **Position**: After `is_active`
7. Click "Save"
8. Go to "SQL" tab and run:
   ```sql
   UPDATE smtp_servers SET user_id = 1;
   ALTER TABLE smtp_servers ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
   ALTER TABLE smtp_servers ADD INDEX idx_user (user_id);
   ```

## After Running Migration

1. **Restart your backend server** (important!)
2. **Verify the column exists:**
   ```sql
   DESCRIBE smtp_servers;
   ```
   You should see `user_id` in the column list.

3. **Check SMTP server ownership:**
   ```sql
   SELECT 
       s.id,
       s.name,
       s.user_id,
       u.username as owner
   FROM smtp_servers s
   LEFT JOIN users u ON s.user_id = u.id;
   ```

4. **Assign SMTP servers to specific users** (if needed):
   ```sql
   -- List your users
   SELECT id, username, email FROM users;
   
   -- Assign SMTP servers to specific users
   UPDATE smtp_servers SET user_id = 2 WHERE id = 1;  -- Assign SMTP #1 to user #2
   UPDATE smtp_servers SET user_id = 3 WHERE id = 2;  -- Assign SMTP #2 to user #3
   ```

## Troubleshooting

### Error: "Table 'email_sender.smtp_servers' doesn't exist"
- Make sure you're using the correct database name
- Check: `SHOW DATABASES;` and `USE email_sender;`

### Error: "Column 'user_id' already exists"
- The column already exists, skip the ALTER TABLE command
- Just verify it's set correctly: `SELECT user_id FROM smtp_servers LIMIT 1;`

### Error: "Cannot add foreign key constraint"
- Make sure the `users` table exists and has data
- Check: `SELECT * FROM users;`
- If no users exist, create one first through registration

### All SMTP servers have user_id = 1
- This is normal after migration
- They're all assigned to user #1
- You can reassign them to different users using UPDATE statements

## Verify It's Working

After adding the column:

1. **Login as User A** - should see SMTP servers with `user_id = A's user ID`
2. **Login as User B** - should see SMTP servers with `user_id = B's user ID`
3. **Check backend logs** - should show:
   ```
   [SMTP] Fetching servers for user X (username)
   [SMTP] Found N server(s) for user X
   ```

If users still see all servers, check that:
- The backend server was restarted
- The `user_id` column exists: `DESCRIBE smtp_servers;`
- SMTP servers have different `user_id` values
- Authentication is working (check backend logs)


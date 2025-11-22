# Fix SMTP Account Visibility Issue

If SMTP accounts are showing for all users instead of being isolated, this guide will help you fix it.

## Problem

All users can see the same SMTP servers instead of only seeing their own.

## Root Cause

This happens when:
1. All SMTP servers have the same `user_id` (usually `1`)
2. SMTP servers have `user_id = NULL` or `user_id = 0`
3. The database migration wasn't run properly

## Solution

### Step 1: Check Current State

Run this SQL query to see the current ownership:

```sql
USE email_sender;

-- See all SMTP servers with their owners
SELECT 
    s.id,
    s.name,
    s.user_id,
    u.username as owner_username,
    u.email as owner_email
FROM smtp_servers s
LEFT JOIN users u ON s.user_id = u.id
ORDER BY s.id;
```

### Step 2: Identify the Issue

**Scenario A**: All SMTP servers have `user_id = 1`
- All servers belong to user #1
- Only user #1 should see them
- Other users should see 0 servers
- **If other users see them**, the authentication might not be working correctly

**Scenario B**: SMTP servers have `user_id = NULL` or `user_id = 0`
- These servers have no owner
- The query `WHERE user_id = ?` won't match them
- **These should not appear for any user**

**Scenario C**: SMTP servers have different `user_id` values
- This is correct! Each server belongs to a different user
- Users should only see servers with their `user_id`

### Step 3: Fix the Issue

#### Fix 1: Assign SMTP Servers to Specific Users

If you want each user to have their own SMTP servers:

```sql
-- List your users first
SELECT id, username, email FROM users;

-- Assign SMTP servers to specific users
-- Example: Assign SMTP #1 to user #2
UPDATE smtp_servers SET user_id = 2 WHERE id = 1;

-- Example: Assign SMTP #2 to user #3
UPDATE smtp_servers SET user_id = 3 WHERE id = 2;

-- Verify the changes
SELECT 
    s.id,
    s.name,
    s.user_id,
    u.username as owner
FROM smtp_servers s
LEFT JOIN users u ON s.user_id = u.id;
```

#### Fix 2: Assign All to First Admin User

If you want all existing SMTP servers to belong to the first admin user:

```sql
-- Find the first admin user (or first user)
SET @admin_user_id = (SELECT id FROM users WHERE role = 'admin' LIMIT 1);
-- Or use the first user if no admin exists
SET @admin_user_id = (SELECT id FROM users ORDER BY id LIMIT 1);

-- Assign all orphaned SMTP servers to this user
UPDATE smtp_servers 
SET user_id = @admin_user_id 
WHERE user_id IS NULL OR user_id = 0;

-- Verify
SELECT 
    s.id,
    s.name,
    s.user_id,
    u.username as owner
FROM smtp_servers s
LEFT JOIN users u ON s.user_id = u.id;
```

#### Fix 3: Delete Orphaned Servers

If you want to remove SMTP servers without proper ownership:

```sql
-- Check what will be deleted
SELECT * FROM smtp_servers WHERE user_id IS NULL OR user_id = 0;

-- Delete orphaned servers (USE WITH CAUTION!)
DELETE FROM smtp_servers WHERE user_id IS NULL OR user_id = 0;
```

### Step 4: Verify the Fix

After making changes:

1. **Restart your backend server**
2. **Login as different users**
3. **Check SMTP Management page** - each user should only see their own servers
4. **Check backend logs** - you should see:
   ```
   [SMTP] Fetching servers for user X (username)
   [SMTP] Found N server(s) for user X
   ```

### Step 5: Check Authentication

If users are still seeing each other's servers, check:

1. **Backend logs** - Check if `req.user.id` is correct for each request
2. **Database queries** - The query should be: `WHERE user_id = ?` with the correct user ID
3. **Authentication token** - Make sure each user has their own valid token

You can add this to the backend logs to debug:

```javascript
// In backend/routes/smtp.js, GET / route
console.log(`User ${req.user.id} requesting SMTP servers`);
console.log(`Query: WHERE user_id = ${req.user.id}`);
```

## Prevention

To prevent this in the future:

1. **Always run migrations** when updating the database schema
2. **Set user_id when creating SMTP servers** - this is already handled in the code
3. **Use foreign keys** - they prevent orphaned records (already in place)

## Testing

Test with multiple users:

1. **Create User A** - register account
2. **Login as User A** - add SMTP server #1
3. **Create User B** - register account  
4. **Login as User B** - should see 0 SMTP servers
5. **Add SMTP server #2 as User B** - should only see server #2
6. **Login as User A again** - should only see server #1

If this test fails, the issue is with data ownership, not authentication.



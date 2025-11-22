-- Fix SMTP server ownership
-- This script helps identify and fix SMTP servers that may be visible to all users

USE email_sender;

-- Check current state
SELECT 
    'Current SMTP Server Ownership' as info,
    COUNT(*) as total_servers,
    COUNT(DISTINCT user_id) as unique_users,
    SUM(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END) as null_user_id,
    SUM(CASE WHEN user_id = 0 THEN 1 ELSE 0 END) as zero_user_id
FROM smtp_servers;

-- Show all SMTP servers with their owners
SELECT 
    s.id,
    s.name,
    s.user_id,
    u.username as owner_username,
    u.email as owner_email
FROM smtp_servers s
LEFT JOIN users u ON s.user_id = u.id
ORDER BY s.id;

-- If you see all SMTP servers with the same user_id (e.g., all with user_id = 1),
-- they will all be visible to that user. To fix this:

-- Option 1: Assign SMTP servers to specific users (replace user_id values)
-- Example: Assign SMTP #1 to user #2, SMTP #2 to user #3, etc.
-- UPDATE smtp_servers SET user_id = 2 WHERE id = 1;
-- UPDATE smtp_servers SET user_id = 3 WHERE id = 2;

-- Option 2: Delete SMTP servers without proper ownership
-- DELETE FROM smtp_servers WHERE user_id IS NULL OR user_id = 0;

-- Option 3: Assign all SMTP servers to the first admin user
-- SET @admin_user_id = (SELECT id FROM users WHERE role = 'admin' LIMIT 1);
-- UPDATE smtp_servers SET user_id = @admin_user_id WHERE user_id IS NULL OR user_id = 0;



-- Check current users and their roles
SELECT id, email, role, user_type FROM users LIMIT 20;

-- Check what roles currently exist
SELECT DISTINCT role FROM users WHERE role IS NOT NULL;
SELECT DISTINCT user_type FROM users WHERE user_type IS NOT NULL;


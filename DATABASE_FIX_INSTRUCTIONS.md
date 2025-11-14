# Database Migration Instructions

## Problem
The application has conflicting migrations that create a `users` table with a `password_hash` column, but the application now uses Supabase Auth which doesn't need this column.

## Solution
You need to run the new migration `20251102130000_fix_users_table_for_supabase_auth.sql` in your Supabase database.

## Steps to Fix

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the entire contents of the file `supabase/migrations/20251102130000_fix_users_table_for_supabase_auth.sql`
6. Paste it into the SQL Editor
7. Click **Run** (or press Cmd+Enter / Ctrl+Enter)
8. Wait for the query to complete

### Option 2: Using Supabase CLI

1. Install Supabase CLI if you haven't already:
   ```bash
   brew install supabase/tap/supabase
   ```

2. Link your project:
   ```bash
   cd fms
   supabase link --project-ref your-project-ref
   ```

3. Push the migration:
   ```bash
   supabase db push
   ```

### Verify the Fix

After running the migration, verify that the `users` table has the correct columns:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
```

You should see:
- `id` (uuid)
- `email` (text)
- **NO `password_hash` column**
- `full_name` (text) 
- `role` (text)
- `phone`, `department`, `emp_code` (text)
- `tenant_id` (uuid)
- `is_active` (boolean)
- `created_at`, `updated_at` (timestamptz)

If you still see `password_hash` in the list, the migration didn't run properly.

## What the Migration Does

1. **Removes `password_hash`** - Supabase Auth handles passwords internally
2. **Adds missing columns** - `full_name`, `emp_code`, `is_active`
3. **Migrates `user_type` to `role`** - Standardizes on `role` column name
4. **Updates RLS policies** - Fixes policies to work with Supabase Auth
5. **Updates constraints** - Adds support for `tenant_admin` role

## After Running the Migration

1. Restart your development server if it's running
2. Try the registration/signup again
3. The error should be resolved

## Need Help?

If you encounter any issues:
1. Check the Supabase SQL Editor for error messages
2. Make sure you have admin permissions on your Supabase project
3. Verify your `.env` file has the correct Supabase credentials

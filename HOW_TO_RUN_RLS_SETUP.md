# How to Run Executor Profiles RLS Setup

## Quick Answer
**Run this file:** `EXECUTOR_PROFILES_RLS_SETUP_COMPLETE.sql`

## Where to Run It
1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Paste the contents of `EXECUTOR_PROFILES_RLS_SETUP_COMPLETE.sql`
4. Click "Run" or press Cmd/Ctrl + Enter

## Step-by-Step (If you want to debug)
If you prefer to run step by step:
1. Use `EXECUTOR_PROFILES_RLS_SETUP_STEP_BY_STEP.sql`
2. Execute each section separately
3. Check for errors after each step

## File Descriptions

### EXECUTOR_PROFILES_RLS_SETUP_COMPLETE.sql
- ✅ Complete script ready to run
- ✅ Includes all fixes for the NEW keyword issue
- ✅ **RECOMMENDED** - Run this one

### EXECUTOR_PROFILES_RLS_SETUP_STEP_BY_STEP.sql
- 📝 Step-by-step guide with explanations
- 📝 Use if you want to understand each step
- 📝 Use if you're debugging issues

### supabase/migrations/20251102160000_link_executor_profiles_table.sql
- 🔧 For Supabase CLI migration system
- 🔧 Use if running `supabase db push` or similar commands

## After Running

Verify the setup worked:
```sql
-- Check if policies were created
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'executor_profiles';

-- Check if functions exist
SELECT proname 
FROM pg_proc 
WHERE proname LIKE '%executor_profile%';
```


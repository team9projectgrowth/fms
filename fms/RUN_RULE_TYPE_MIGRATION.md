# Run Rule Type Migration

## Quick Steps to Add Rule Type Field

1. **Open Supabase SQL Editor:**
   - Go to: https://app.supabase.com
   - Select your project
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

2. **Copy the Migration:**
   - Open this file: `supabase/migrations/20251106000000_add_rule_type_and_fix_action_enum.sql`
   - Select all (Cmd+A / Ctrl+A) and copy

3. **Paste and Run:**
   - Paste into the SQL Editor
   - Click **Run** (or press Cmd+Enter / Ctrl+Enter)
   - Wait for success message ✅

4. **Verify it worked:**
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'rules' 
   AND column_name = 'rule_type';
   ```
   You should see the `rule_type` column with data type `USER-DEFINED` (enum).

## What This Migration Does:

1. ✅ Fixes `automation_action_type` enum to include all action types
2. ✅ Creates `rule_type_enum` with values: `priority`, `sla`, `allocation`
3. ✅ Adds `rule_type` column to `rules` table with default value `'allocation'`
4. ✅ Creates index on `rule_type` for better performance

## After Migration:

- Refresh your application
- The "Allocation Rules" screen should now work
- You can create rules with different types (Priority, SLA, Allocation)


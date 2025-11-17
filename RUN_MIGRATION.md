# How to Run the Migration

Since the Supabase CLI isn't installed, you need to run the migration manually through the Supabase Dashboard.

## Quick Steps:

1. **Open your browser** and go to: https://mxrjygxhjeubisjrfmfr.supabase.co

2. **Sign in** to your Supabase account

3. **Navigate to SQL Editor:**
   - Click "SQL Editor" in the left sidebar

4. **Run the migration:**
   - Click "New Query"
   - Copy the ENTIRE contents of this file: `supabase/migrations/20251102130000_fix_users_table_for_supabase_auth.sql`
   - Paste it into the SQL Editor
   - Click "Run" (or press Cmd+Enter / Ctrl+Enter)
   - Wait for success ✅

5. **Verify it worked:**
   - You should see "Success" message
   - Run this query to verify:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'users' 
   ORDER BY ordinal_position;
   ```
   - You should NOT see `password_hash`
   - You should see: `id`, `email`, `full_name`, `role`, `is_active`, etc.

That's it! The migration is done. You can now go back to the Quick Start guide and continue with creating your first admin.

---
**Alternative:** If you want to install the Supabase CLI for future migrations:

On macOS with brew installed:
```bash
brew install supabase/tap/supabase
```

Or via npm (requires sudo):
```bash
sudo npm install -g supabase
```

Then link your project:
```bash
cd fms
supabase link --project-ref mxrjygxhjeubisjrfmfr
```

Then run:
```bash
supabase db push
```


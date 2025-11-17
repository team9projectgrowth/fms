# 🚀 START HERE - Setup Instructions

## ⚠️ IMPORTANT: Run This First!

Your application is ready, but you need to **run the database migration** before anything will work.

### Quick Steps:

1. **Open this link:** https://mxrjygxhjeubisjrfmfr.supabase.co/app/project/_/sql/new

2. **Copy the entire migration file:**
   - Open: `supabase/migrations/20251102130000_fix_users_table_for_supabase_auth.sql`
   - Select all (Cmd+A / Ctrl+A) and copy

3. **Paste into Supabase SQL Editor**

4. **Click "Run"** (or Cmd+Enter / Ctrl+Enter)

5. **Done! ✅**

---

## Next: Create Your First Admin

After the migration runs successfully:

**Option A:** Use the setup page:
- Go to: `/setup-admin` in your app
- Fill in: name, email, password
- Click "Create Admin Account"

**Option B:** Manual setup in Supabase:
1. Go to: https://app.supabase.com → Authentication → Users
2. Click "Add User" → "Create new user"
3. Email: `admin@example.com`
4. Password: `admin123`
5. ✅ Auto Confirm (CHECK THIS!)
6. Copy the User UID
7. Go to SQL Editor and run:

```sql
INSERT INTO users (id, email, full_name, role, is_active, tenant_id)
VALUES (
  'PASTE_USER_UID_HERE',
  'admin@example.com',
  'Super Administrator',
  'admin',
  true,
  NULL
);
```

---

## Then: Login & Test

1. Go to: `/dashboard/login`
2. Email: `admin@example.com`
3. Password: `admin123`
4. You should see the Super Admin Dashboard! 🎉

---

## Need Help?

- Migration details: See `MIGRATE_NOW.txt`
- Full guide: See `QUICK_START.md`
- Troubleshooting: See `TROUBLESHOOTING_FETCH_ERROR.md`


# Quick Start Guide

## Understanding the Admin Roles

This system has **TWO types of admins**:

1. **Super Admin** (`admin` role)
   - Manages all tenants in the system
   - Approves/denies tenant registrations
   - Has global access to all data
   - Can create tenants manually

2. **Tenant Admin** (`tenant_admin` role)  
   - Manages users within ONE specific tenant
   - Configures settings for their tenant only
   - Cannot see or modify other tenants' data
   - Created automatically when a tenant registers

## Step 1: Run the Database Migration

**CRITICAL:** You MUST run this migration before the app will work!

1. Go to https://app.supabase.com
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy the ENTIRE contents of this file: `supabase/migrations/20251102130000_fix_users_table_for_supabase_auth.sql`
6. Paste into the SQL Editor
7. Click **Run** (or press Cmd+Enter / Ctrl+Enter)
8. Wait for success message ✅

## Step 2: Create Your Super Admin

After the migration, create your first Super Admin. **Choose one method:**

### Method A: Using the Setup Page (Easier)

1. Go to `/setup-admin` in your app
2. Fill in the form:
   - Name: Super Administrator
   - Email: admin@example.com
   - Password: admin123
3. Click **Create Admin Account**
4. You should see success message ✅

**Note:** This uses `authService.signUp()` which will only work after the migration has been run. If you get errors, use Method B instead.

### Method B: Manual Setup in Supabase Dashboard

1. Go to **Authentication** → **Users**
2. Click **Add User** → **Create new user**
3. Fill in:
   - **Email:** admin@example.com
   - **Password:** admin123
   - **Auto Confirm:** ✓ (CHECK THIS!)
4. Click **Create user**

5. **IMPORTANT:** Add the user to the `users` table:
   - Click on the newly created user
   - Copy the **User UID**
   - Go to **SQL Editor**
   - Run this query (replace USER_ID with the actual UID):

```sql
INSERT INTO users (id, email, full_name, role, is_active, tenant_id)
VALUES (
  'USER_ID_HERE',
  'admin@example.com',
  'Super Administrator',
  'admin',
  true,
  NULL
);
```

### Test Login

After either method, you can login at `/dashboard/login` with:
- Email: `admin@example.com`
- Password: `admin123`
- You'll see the **Super Admin Dashboard** with tenant management

## Step 3: Create a Tenant (and Tenant Admin)

To test tenant functionality:

1. Go to `/tenant-register` in your app
2. Fill in the tenant registration form:
   - Company/organization details
   - Admin email and password (this becomes a tenant_admin)
   - Subscription details
3. Submit the form
4. This creates:
   - A new tenant record
   - A tenant_admin user for that tenant
5. The tenant_admin can login at `/dashboard/login` with their credentials

## Step 4: Test Both Admin Types

### Super Admin Login:
- **URL:** `/dashboard/login`
- **Email:** admin@example.com
- **Password:** admin123
- **Sees:** Tenant management, global settings, all tenants

### Tenant Admin Login:
- **URL:** `/dashboard/login`  
- **Email:** [tenant admin email from registration]
- **Password:** [tenant admin password from registration]
- **Sees:** Only their tenant's users, tickets, and settings

## Troubleshooting

### "password_hash" error
➡️ The migration wasn't run. Go back to Step 1.

### "User profile not found"
➡️ The admin user exists in Supabase Auth but not in the `users` table. Run the INSERT query from Step 2.

### "Failed to fetch"
➡️ Check your `.env` file has correct Supabase credentials

### Can't find SQL Editor
➡️ Make sure you're logged into Supabase and have access to the project

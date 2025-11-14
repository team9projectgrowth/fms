# Supabase Authentication Setup

The application has been migrated from a custom authentication system to use **Supabase Auth** (the built-in authentication system).

## What Changed

### Before (Custom Auth)
- Used a custom `users` table with `password_hash` column
- Used a custom `verify_user_password` RPC function
- Stored sessions in localStorage manually

### After (Supabase Auth)
- Uses Supabase's built-in `auth.users` table
- Uses `supabase.auth.signInWithPassword()` for authentication
- Automatic session management and token refresh
- User metadata stores role and name information

## Setting Up Test Users

You need to create test users in the Supabase Auth system. You can do this in two ways:

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://burswuldmrgsptgmrzls.supabase.co
2. Navigate to **Authentication** → **Users**
3. Click **Add User** → **Create new user**

Create two users:

**Admin User:**
- Email: `admin@example.com`
- Password: `admin123`
- Auto Confirm: ✓ (checked)
- Click **Create user**
- After creation, click on the user and add **User Metadata**:
  ```json
  {
    "role": "admin",
    "name": "System Administrator"
  }
  ```

**Executor User:**
- Email: `executor@example.com`
- Password: `executor123`
- Auto Confirm: ✓ (checked)
- Click **Create user**
- After creation, click on the user and add **User Metadata**:
  ```json
  {
    "role": "executor",
    "name": "John Executor"
  }
  ```

### Option 2: Using SQL (Alternative)

Run this SQL in your Supabase SQL Editor:

```sql
-- Note: You need the service_role key for this to work
-- This creates users with proper metadata
-- Replace with actual user creation via Supabase Admin API
```

## Sign-In Pages

Both sign-in pages now use Supabase Auth:

1. **LoginPage** (`/login`) - Main customer-facing login page
2. **DashboardLoginPage** (`/dashboard/login`) - Admin/Executor dashboard login

Both pages authenticate using:
- Email and password authentication
- Role validation (only admin and executor roles can sign in)
- Automatic session persistence

## Testing Authentication

After creating the users, you can test authentication:

1. Navigate to the login page
2. Use one of the test accounts:
   - **Admin:** admin@example.com / admin123
   - **Executor:** executor@example.com / executor123
3. The system will:
   - Verify credentials via Supabase Auth
   - Check the user's role from metadata
   - Only allow admin and executor roles to sign in
   - Automatically manage the session

## Authentication Flow

```
User enters credentials
    ↓
supabase.auth.signInWithPassword()
    ↓
Supabase validates password
    ↓
Returns user with metadata (role, name)
    ↓
App validates role (admin or executor only)
    ↓
Session automatically persisted
    ↓
User authenticated
```

## Important Notes

1. **Role Validation:** Only users with role `admin` or `executor` can sign in to the application
2. **Session Management:** Supabase automatically handles session persistence and token refresh
3. **Security:** Passwords are securely hashed by Supabase using bcrypt
4. **Metadata:** User information (role, name) is stored in `user_metadata` field

## Migration Cleanup

The old custom authentication system files can be removed:
- Old `users` table with `password_hash` (if you want to keep user data, migrate it)
- `verify_user_password` RPC function
- Custom localStorage session management

## Troubleshooting

**Error: "Invalid user role"**
- Make sure user_metadata contains the `role` field set to either "admin" or "executor"

**Error: "Invalid email or password"**
- Check that email confirmation is enabled (Auto Confirm checked)
- Verify the password is correct
- Check that the user exists in Authentication → Users

**Session not persisting:**
- Check browser localStorage is enabled
- Verify Supabase client configuration in `src/lib/supabase.ts`

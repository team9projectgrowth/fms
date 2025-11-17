# Troubleshooting "Failed to fetch" Error

## Common Causes and Solutions

### 1. Database Migration Not Applied
**Most likely cause!** The migration `20251102130000_fix_users_table_for_supabase_auth.sql` needs to be run.

**Solution:**
- Go to Supabase Dashboard → SQL Editor
- Copy and paste the entire migration file
- Run it
- Refresh your browser

### 2. Missing or Invalid Supabase Credentials
Check your `.env` file in the `fms` directory.

**Required variables:**
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

**How to get them:**
1. Go to https://app.supabase.com
2. Select your project
3. Go to Settings → API
4. Copy:
   - Project URL → `VITE_SUPABASE_URL`
   - Anon/Public Key → `VITE_SUPABASE_ANON_KEY`

**After updating .env:**
- Restart your dev server (`npm run dev`)

### 3. CORS Issues (Less Likely)
If Supabase is set up correctly, CORS should work by default.

**Check:**
- Is your Supabase project active?
- Are there any domain restrictions in Supabase settings?

### 4. Network/Connectivity Issues
**Check:**
- Is your internet connection working?
- Can you access https://app.supabase.com?
- Are there any proxy/firewall settings blocking connections?

### 5. Browser Console Errors
Open your browser's Developer Tools (F12) and check:
- Console tab for error messages
- Network tab to see failed requests
  - What's the status code? (404, 500, etc.)
  - What's the exact error message?
  - Which request is failing?

### 6. Supabase Project Status
**Check:**
- Is your Supabase project paused? (Free tier limits)
- Is your project healthy? (Dashboard → Project Settings)
- Are there any billing issues?

## Quick Diagnosis Steps

1. **Check browser console** (F12 → Console tab)
   - Look for specific error messages
   - Copy any red error messages

2. **Check network tab** (F12 → Network tab)
   - Refresh the page
   - Look for failed requests (red)
   - Click on failed request to see details

3. **Check terminal logs**
   - Look at your dev server terminal
   - Any errors there?

4. **Check Supabase Dashboard**
   - Go to Authentication → Users
   - Try creating a test user
   - Check if database is accessible

5. **Verify migration ran**
   - Go to SQL Editor in Supabase
   - Run: `SELECT column_name FROM information_schema.columns WHERE table_name = 'users';`
   - Should NOT see `password_hash`
   - Should see: `id`, `email`, `full_name`, `role`, `is_active`, etc.

## Need More Help?

If none of these work, provide:
1. The exact error message from browser console
2. Network request details (status code, response)
3. Any terminal errors
4. Confirmation that migration has been run

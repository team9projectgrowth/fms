FMS

## Reset Tenant Admin Password

- Deploy the Supabase Edge Function after pulling the latest changes:
  - `supabase functions deploy reset-tenant-admin-password`
- Ensure the following environment variables are configured for the function runtime:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- When testing locally with the Supabase CLI, expose a valid service role key so the function can call the Admin API for password updates:
  - `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...`
- Super admins must authenticate through the web app; the frontend invokes the function with the current session token and will only succeed when the caller has the `admin` role with no tenant association.

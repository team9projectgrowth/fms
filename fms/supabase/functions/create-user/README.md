# Create User Edge Function

This Edge Function securely creates users using the Supabase service role key.

## Setup

1. Deploy the function to Supabase:
```bash
supabase functions deploy create-user
```

2. The function requires these environment variables (set in Supabase Dashboard):
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Your service role key (from Settings → API)

## Usage

Call from your frontend with an authenticated user (admin or tenant_admin):

```typescript
const { data, error } = await supabase.functions.invoke('create-user', {
  body: {
    email: 'user@example.com',
    password: 'password123',
    user_type: 'executor',
    name: 'John Doe',
    phone: '1234567890',
    department: 'IT',
    employee_id: 'EMP001',
    active: true,
    tenant_id: 'uuid-here' // Optional for super admin, auto-set for tenant admin
  },
  headers: {
    Authorization: `Bearer ${session.access_token}`
  }
});
```


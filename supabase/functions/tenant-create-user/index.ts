import { serve } from 'https://deno.land/std@0.223.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';
import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4';

interface CreateUserRequest {
  email: string;
  password: string;
  user_type: 'admin' | 'executor' | 'complainant' | 'tenant_admin';
  name: string;
  phone?: string;
  department?: string;
  employee_id?: string;
  designation_id?: string;
  telegram_chat_id?: string;
  telegram_user_id?: string;
  active?: boolean;
  tenant_id?: string | null;
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[tenant-create-user] Missing Supabase env vars');
      return jsonResponse({ error: 'Server configuration incomplete' }, 500);
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Missing or invalid authorization header' }, 401);
    }

    const jwt = authHeader.replace('Bearer ', '');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(jwt);
    if (authError || !authData?.user) {
      console.error('[tenant-create-user] Unable to validate token', authError);
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = (await req.json()) as CreateUserRequest | null;
    if (!body) {
      return jsonResponse({ error: 'Invalid JSON payload' }, 400);
    }

    const validationError = validatePayload(body);
    if (validationError) {
      return jsonResponse({ error: validationError }, 400);
    }

    const { data: adminProfile, error: adminFetchError } = await supabaseAdmin
      .from('users')
      .select('id, role, tenant_id')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (adminFetchError || !adminProfile) {
      console.error('[tenant-create-user] Failed to load admin profile', adminFetchError);
      return jsonResponse({ error: 'Unable to load requesting user profile' }, 403);
    }

    const tenantId = await resolveTenantId({
      supabase: supabaseAdmin,
      adminProfile,
      requestedTenantId: body.tenant_id ?? null,
      userType: body.user_type,
    });

    if (tenantId.error) {
      return jsonResponse({ error: tenantId.error }, tenantId.status ?? 400);
    }

    const resolvedTenantId = tenantId.value;

    const duplicateError = await checkDuplicates({
      supabase: supabaseAdmin,
      email: body.email,
      tenantId: resolvedTenantId,
    });

    if (duplicateError) {
      return jsonResponse({ error: duplicateError }, 409);
    }

    const { data: authUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      user_metadata: {
        name: body.name,
        role: body.user_type,
      },
    });

    if (createAuthError || !authUser?.user) {
      const message =
        createAuthError?.message?.includes('already registered')
          ? 'This email is already registered in Supabase Auth. Use a different email or contact support.'
          : createAuthError?.message || 'Failed to create auth user.';
      console.error('[tenant-create-user] Error creating auth user', createAuthError);
      return jsonResponse({ error: message }, 400);
    }

    const empCode =
      body.employee_id && body.employee_id.trim() !== '' ? body.employee_id.trim() : null;

    const { data: insertedUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.user.id,
        email: body.email,
        full_name: body.name,
        role: body.user_type,
        phone: body.phone || null,
        department: body.department || null,
        emp_code: empCode,
        designation_id:
          body.designation_id && body.designation_id.trim() !== ''
            ? body.designation_id
            : null,
        tenant_id: resolvedTenantId,
        is_active: needsBotOnboarding(body.user_type) ? false : body.active !== false,
        telegram_chat_id:
          body.telegram_chat_id && body.telegram_chat_id.trim() !== ''
            ? parseFloat(body.telegram_chat_id) || null
            : null,
        telegram_user_id:
          body.telegram_user_id && body.telegram_user_id.trim() !== ''
            ? body.telegram_user_id
            : null,
        bot_onboarding_status: needsBotOnboarding(body.user_type) ? 'pending' : 'not_required',
        bot_onboarding_started_at: null,
        bot_onboarding_error: null,
        bot_onboarding_retry_count: 0,
        bot_correlation_id: null,
        bot_deep_link: null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[tenant-create-user] Failed to insert user record', insertError);
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      const friendly = mapInsertError(insertError);
      return jsonResponse({ error: friendly }, 400);
    }

    return jsonResponse(
      {
        status: 'success',
        user: insertedUser,
      },
      201,
    );
  } catch (error) {
    console.error('[tenant-create-user] Unexpected error', error);
    return jsonResponse(
      {
        error: 'Unexpected server error',
        message: error instanceof Error ? error.message : String(error),
      },
      500,
    );
  }
});

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function validatePayload(body: CreateUserRequest): string | null {
  if (!body.email || typeof body.email !== 'string') return 'Email is required';
  if (!body.password || typeof body.password !== 'string' || body.password.length < 6) {
    return 'Password must be at least 6 characters';
  }
  if (!body.name || typeof body.name !== 'string') return 'Full name is required';
  if (!body.user_type) return 'user_type is required';
  return null;
}

async function resolveTenantId(options: {
  supabase: SupabaseClient;
  adminProfile: { id: string; role: string; tenant_id: string | null };
  requestedTenantId: string | null;
  userType: CreateUserRequest['user_type'];
}): Promise<{ value: string | null; error?: string; status?: number }> {
  const { adminProfile, requestedTenantId, userType } = options;

  if (adminProfile.role === 'tenant_admin') {
    if (!adminProfile.tenant_id) {
      return { value: null, error: 'Tenant admin does not have a tenant assigned', status: 403 };
    }
    return { value: adminProfile.tenant_id };
  }

  if (adminProfile.role === 'admin') {
    if (requestedTenantId) {
      return { value: requestedTenantId };
    }
    if (userType === 'admin') {
      return { value: null };
    }
    return {
      value: null,
      error: 'Tenant ID is required for this user type. Please select a tenant.',
      status: 400,
    };
  }

  return { value: null, error: 'Only admins or tenant admins can create users', status: 403 };
}

async function checkDuplicates(options: {
  supabase: SupabaseClient;
  email: string;
  tenantId: string | null;
}): Promise<string | null> {
  const { supabase, email, tenantId } = options;

  if (tenantId) {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('[tenant-create-user] Duplicate check failed', error);
      return 'Failed to verify existing users. Please try again.';
    }

    if (data) {
      return 'A user with this email already exists in this tenant.';
    }
  }

  const { data: crossTenantUser, error: crossError } = await supabase
    .from('users')
    .select('id, tenant_id')
    .eq('email', email)
    .maybeSingle();

  if (crossError && crossError.code !== 'PGRST116') {
    console.error('[tenant-create-user] Cross-tenant duplicate check failed', crossError);
    return 'Failed to verify existing users. Please try again.';
  }

  if (crossTenantUser && crossTenantUser.tenant_id !== tenantId) {
    return 'This email is already registered with a different tenant.';
  }

  return null;
}

function mapInsertError(error: { code?: string; message?: string }): string {
  if (error.code === '23505') {
    if (error.message?.includes('users_tenant_id_emp_code_key')) {
      return 'An employee code already exists for this tenant. Use a unique employee code or leave it empty.';
    }
    if (error.message?.includes('users_tenant_id_email_key')) {
      return 'A user with this email already exists in this tenant.';
    }
    return 'A user with this information already exists. Please check email and employee code.';
  }
  return error.message || 'Failed to insert user record.';
}

function needsBotOnboarding(userType: CreateUserRequest['user_type']) {
  return userType === 'executor' || userType === 'complainant';
}


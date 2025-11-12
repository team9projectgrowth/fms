import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.4';

interface ResetTenantAdminPasswordRequest {
  tenantId: string;
  tenantAdminId: string;
  newPassword: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }

    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    const accessToken = authHeader?.replace('Bearer ', '').trim();

    if (!accessToken) {
      return unauthorized('Missing Authorization header.');
    }

    const body = (await req.json()) as ResetTenantAdminPasswordRequest | null;

    if (!body || !body.tenantId || !body.tenantAdminId || !body.newPassword) {
      return badRequest('tenantId, tenantAdminId, and newPassword are required.');
    }

    if (body.newPassword.length < 8) {
      return badRequest('Password must be at least 8 characters.');
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const {
      data: { user: requestUser },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !requestUser) {
      console.error('[reset-tenant-admin-password] Failed to validate requesting user', authError);
      return unauthorized('Invalid or expired session.');
    }

    const { data: requesterProfile, error: requesterProfileError } = await supabase
      .from('users')
      .select('role, tenant_id')
      .eq('id', requestUser.id)
      .maybeSingle();

    if (requesterProfileError) {
      console.error('[reset-tenant-admin-password] Failed to fetch requester profile', requesterProfileError);
      return serverError('Failed to verify requester permissions.');
    }

    if (!requesterProfile || requesterProfile.role !== 'admin' || requesterProfile.tenant_id !== null) {
      console.warn('[reset-tenant-admin-password] Permission denied for user', {
        requesterId: requestUser.id,
        role: requesterProfile?.role,
        tenantId: requesterProfile?.tenant_id,
      });
      return forbidden('Only super admin users can reset tenant admin passwords.');
    }

    const { data: tenantAdminProfile, error: tenantAdminError } = await supabase
      .from('users')
      .select('id, role, tenant_id, email, is_active')
      .eq('id', body.tenantAdminId)
      .maybeSingle();

    if (tenantAdminError) {
      console.error('[reset-tenant-admin-password] Failed to fetch tenant admin', tenantAdminError);
      return serverError('Failed to locate tenant admin user.');
    }

    if (
      !tenantAdminProfile ||
      tenantAdminProfile.role !== 'tenant_admin' ||
      tenantAdminProfile.tenant_id !== body.tenantId
    ) {
      console.warn('[reset-tenant-admin-password] Invalid tenant admin target', {
        tenantAdminId: body.tenantAdminId,
        tenantId: body.tenantId,
        profile: tenantAdminProfile,
      });
      return badRequest('Tenant admin account not found for the specified tenant.');
    }

    if (!tenantAdminProfile.is_active) {
      console.warn('[reset-tenant-admin-password] Target tenant admin inactive', {
        tenantAdminId: body.tenantAdminId,
      });
      return badRequest('Tenant admin account is inactive.');
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(body.tenantAdminId, {
      password: body.newPassword,
    });

    if (updateError) {
      console.error('[reset-tenant-admin-password] Failed to update password', updateError);
      return serverError('Failed to reset tenant admin password.');
    }

    console.info('[reset-tenant-admin-password] Password reset successful', {
      tenantAdminId: body.tenantAdminId,
      tenantId: body.tenantId,
      requesterId: requestUser.id,
    });

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('[reset-tenant-admin-password] Unexpected error', error);
    return serverError(error instanceof Error ? error.message : 'Internal server error');
  }
});

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  });
}

function badRequest(message: string) {
  return jsonResponse({ success: false, error: message }, 400);
}

function unauthorized(message: string) {
  return jsonResponse({ success: false, error: message }, 401);
}

function forbidden(message: string) {
  return jsonResponse({ success: false, error: message }, 403);
}

function serverError(message: string) {
  return jsonResponse({ success: false, error: message }, 500);
}



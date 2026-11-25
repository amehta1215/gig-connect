import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { processJob } from '../_shared/storageCleanup.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const token = authHeader.replace('Bearer ', '');

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!
    );
    const { data, error } = await anonClient.auth.getClaims(token);
    if (error || !data?.claims?.sub) {
      return json({ error: 'Unauthorized' }, 401);
    }
    const userId = data.claims.sub as string;

    // Verify the emailed code here so the browser session never changes mid-flow.
    const body = await req.json().catch(() => ({}));
    const code = typeof body?.code === 'string' ? body.code.trim() : '';
    const email = typeof data.claims.email === 'string' ? data.claims.email : '';
    if (!code || !email) return json({ error: 'invalid_code' }, 400);
    const verifier = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
    const { data: otp, error: otpError } = await verifier.auth.verifyOtp({ email, token: code, type: 'email' });
    if (otpError || otp?.user?.id !== userId) return json({ error: 'invalid_code' }, 400);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Snapshot names onto shared records, record the deleted account and queue
    // photo cleanup. Messages and bookings no longer cascade off the profile.
    const { error: prepError } = await admin.rpc('prepare_account_deletion', { _uid: userId });
    if (prepError) {
      console.error('prepare_account_deletion failed', prepError);
      return json({ error: 'Failed to delete account' }, 500);
    }
    const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('deleteUser failed', deleteError);
      return json({ error: 'Failed to delete account' }, 500);
    }

    // Delete photos now; failures stay queued and are retried hourly.
    const { data: jobs } = await admin.from('storage_deletion_jobs').select('*').eq('status', 'pending').limit(20);
    for (const job of jobs ?? []) await processJob(admin, job);

    return json({ success: true });
  } catch (e) {
    console.error('delete-account error', e);
    return json({ error: 'Unexpected error' }, 500);
  }
});
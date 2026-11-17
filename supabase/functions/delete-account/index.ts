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
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { processJob } from '../_shared/storageCleanup.ts';

// Retries pending photo deletions and runs daily retention cleanup.
// Takes no input and is idempotent, so it is safe for the scheduled task to call with the public key.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, key);

  const { data: jobs } = await admin.from('storage_deletion_jobs').select('*').eq('status', 'pending').limit(50);
  let ok = 0;
  for (const job of jobs ?? []) if (await processJob(admin, job)) ok++;

  const { data: paths, error } = await admin.rpc('run_retention_cleanup');
  if (error) console.error('retention cleanup failed', error);
  const files = ((paths as any[]) ?? []).map((a) => { const u = String(a?.url ?? ''); const i = u.indexOf('/message-attachments/'); return i >= 0 ? decodeURIComponent(u.slice(i + 21).split('?')[0]) : null; }).filter(Boolean) as string[];
  for (let i = 0; i < files.length; i += 100) {
    const { error: rmErr } = await admin.storage.from('message-attachments').remove(files.slice(i, i + 100));
    if (rmErr) console.error('attachment purge failed', rmErr);
  }
  return json({ processed: jobs?.length ?? 0, succeeded: ok, attachmentsPurged: files.length });
});

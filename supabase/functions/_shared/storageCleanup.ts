// deno-lint-ignore-file no-explicit-any
export async function removeUserFolders(admin: any, userId: string, buckets: string[]) {
  for (const bucket of buckets) {
    const paths: string[] = [];
    const walk = async (prefix: string) => {
      let offset = 0;
      while (true) {
        const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: 1000, offset });
        if (error) throw new Error(`${bucket} list: ${error.message}`);
        if (!data?.length) break;
        for (const item of data) {
          const full = `${prefix}/${item.name}`;
          if (item.id === null) await walk(full); else paths.push(full);
        }
        if (data.length < 1000) break;
        offset += 1000;
      }
    };
    await walk(userId);
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await admin.storage.from(bucket).remove(paths.slice(i, i + 100));
      if (error) throw new Error(`${bucket} remove: ${error.message}`);
    }
  }
}

export async function processJob(admin: any, job: any) {
  try {
    await removeUserFolders(admin, job.user_id, job.buckets);
    const extra = (job.extra_paths ?? []) as { bucket: string; path: string }[];
    for (const e of extra) {
      const { error } = await admin.storage.from(e.bucket).remove([e.path]);
      if (error) throw new Error(`${e.bucket} remove: ${error.message}`);
    }
    await admin.from('storage_deletion_jobs').update({ status: 'done', attempts: job.attempts + 1, last_error: null, updated_at: new Date().toISOString() }).eq('id', job.id);
    return true;
  } catch (e) {
    const attempts = job.attempts + 1;
    await admin.from('storage_deletion_jobs').update({
      status: attempts >= 10 ? 'failed' : 'pending', attempts, last_error: String((e as Error).message ?? e), updated_at: new Date().toISOString(),
    }).eq('id', job.id);
    console.error('storage job failed', job.id, e);
    return false;
  }
}

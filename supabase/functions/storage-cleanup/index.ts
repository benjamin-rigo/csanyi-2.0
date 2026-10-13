// Gazdátlan fájlok törlése a tárhelyről (döntésnapló). Naponta a pg_cron hívja (storage-cleanup feladat).
// A kérés a Vaultban tárolt titkot küldi (x-cleanup-secret), a függvény az adatbázissal ellenőrizteti;
// belépési token nincs, ezért verify_jwt nélkül van telepítve. Hogy mi törölhető, a cleanup_orphans() dönti el.

import { createClient } from 'npm:@supabase/supabase-js@2';

const CHUNK = 100;
const reply = (body: unknown, status = 200) => Response.json(body, { status });

Deno.serve(async (req) => {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return reply({ error: 'no_config' }, 500);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const secret = req.headers.get('x-cleanup-secret') ?? '';
  const { data: authorized } = await admin.rpc('storage_cleanup_authorized', { secret });
  if (authorized !== true) return reply({ error: 'unauthorized' }, 401);

  const { data, error } = await admin.rpc('cleanup_orphans');
  if (error) return reply({ error: error.message }, 500);

  const byBucket = new Map<string, string[]>();
  for (const { bucket, name } of data as { bucket: string; name: string }[]) byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), name]);
  let removed = 0;
  const failed: string[] = [];
  for (const [bucket, names] of byBucket) {
    for (let i = 0; i < names.length; i += CHUNK) {
      const chunk = names.slice(i, i + CHUNK);
      const { data: done, error: removeError } = await admin.storage.from(bucket).remove(chunk);
      if (removeError) failed.push(...chunk.map((n) => `${bucket}/${n}`));
      else removed += done.length;
    }
  }
  return reply({ removed, failed });
});

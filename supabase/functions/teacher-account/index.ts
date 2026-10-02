// Pedagógus fiókműveletek, amelyekhez a rendszergazdai (service_role) kulcs kell; a kulcs a Supabase-ben marad.
// - invite: kolléga meghívása e-mailben (bármelyik pedagógus, naponta legfeljebb DAILY_LIMIT; naplózva)
// - delete: a saját fiók törlése a képeivel és hangjaival együtt
// Csak bejelentkezett pedagógus hívhatja: a kérés belépési tokenjét a Supabase ellenőrzi.

import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const DAILY_LIMIT = 10;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return reply({ error: 'no_config' }, 500);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const token = req.headers.get('Authorization')?.replace(/^Bearer /, '');
  const { data: auth } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  const user = auth.user;
  if (!user) return reply({ error: 'unauthorized' }, 401);

  const { action, email, redirectTo } = await req.json().catch(() => ({}));

  if (action === 'invite') {
    const address = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!EMAIL.test(address)) return reply({ error: 'invalid_email' }, 400);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from('invitations')
      .select('id', { count: 'exact', head: true })
      .eq('inviter_id', user.id)
      .gte('created_at', since);
    if ((count ?? 0) >= DAILY_LIMIT) return reply({ error: 'limit', limit: DAILY_LIMIT }, 429);

    const { data: profile } = await admin.from('profiles').select('name').eq('id', user.id).single();
    const { error } = await admin.auth.admin.inviteUserByEmail(address, {
      data: { invited_by_name: profile?.name || user.email },
      redirectTo: typeof redirectTo === 'string' ? redirectTo : undefined,
    });
    if (error) {
      const exists = error.code === 'email_exists' || /already been registered/i.test(error.message);
      return reply({ error: exists ? 'email_exists' : 'send_failed', reason: error.message }, exists ? 409 : 502);
    }
    await admin.from('invitations').insert({ inviter_id: user.id, email: address });
    return reply({ ok: true });
  }

  if (action === 'delete') {
    // A tárhelyen a pedagógus fájljai a saját mappájában vannak (<user id>/...).
    for (const bucket of ['images', 'sounds']) {
      const { data: files } = await admin.storage.from(bucket).list(user.id, { limit: 1000 });
      if (files?.length) await admin.storage.from(bucket).remove(files.map((f) => `${user.id}/${f.name}`));
    }
    // A profil, a projektek, a hangmezők és a hangok a felhasználóval együtt törlődnek (on delete cascade).
    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) return reply({ error: 'delete_failed', reason: error.message }, 502);
    return reply({ ok: true });
  }

  return reply({ error: 'unknown_action' }, 400);
});

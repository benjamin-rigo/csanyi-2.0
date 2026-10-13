-- A gazdátlan fájlok napi takarításának időzítése (20261013150000): minden nap 3:00-kor (UTC)
-- a pg_cron a pg_net-tel meghívja a storage-cleanup Edge Functiont.
-- A hívás titka itt, az adatbázisban keletkezik (Vault), és sehol máshol nem szerepel.
-- Új Supabase projektben a project_url titkot az új projekt címére kell írni (docs/atadas.md).

create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret('https://uoxnxdedsxnipirhcqin.supabase.co', 'project_url', 'A Supabase projekt címe az időzített hívásokhoz');
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'storage_cleanup_secret', 'A storage-cleanup függvény hívásának titka');

create function storage_cleanup_authorized(secret text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'storage_cleanup_secret' and decrypted_secret = secret);
$$;
revoke execute on function storage_cleanup_authorized(text) from public, anon, authenticated;
grant execute on function storage_cleanup_authorized(text) to service_role;

select cron.schedule('storage-cleanup', '0 3 * * *', $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/storage-cleanup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cleanup-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'storage_cleanup_secret')
    ),
    body := '{}'::jsonb
  );
$job$);

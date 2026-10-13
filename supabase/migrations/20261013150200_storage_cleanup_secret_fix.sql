-- A paraméter neve (secret) ütközött a vault.decrypted_secrets azonos nevű oszlopával, így a helyes kulcs sem egyezett.
-- A paraméterre a sorszámával hivatkozunk.

create or replace function storage_cleanup_authorized(secret text) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'storage_cleanup_secret' and decrypted_secret = $1);
$$;

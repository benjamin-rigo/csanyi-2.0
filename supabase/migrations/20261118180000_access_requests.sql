-- Hozzáférés kérése (döntésnapló, 2026-11-18): a belépés oldaláról bárki kérhet hozzáférést (név, e-mail, iskola,
-- üzenet). Írni csak a request_access() függvényen át lehet, olvasni és kezelni csak adminnak. A kezelt kérés
-- (meghívás vagy elutasítás) törlődik, így nem tárolunk feleslegesen személyes adatot.

create table access_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  email text not null check (char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  school text not null check (char_length(school) between 1 and 200),
  message text check (char_length(message) <= 1000),
  created_at timestamptz not null default now()
);
-- Címenként egy nyitott kérés.
create unique index access_requests_email_key on access_requests (email);
create index access_requests_created_at_idx on access_requests (created_at);
alter table access_requests enable row level security;
revoke all on access_requests from anon, authenticated;

-- Nyilvános: a válasz nem árulja el, volt-e már kérés vagy fiók ezzel a címmel. Óránként összesen legfeljebb 20
-- új kérés (elárasztás ellen; a felület ilyenkor kéri, hogy próbálja később).
create function request_access(p_name text, p_email text, p_school text, p_message text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from access_requests where created_at > now() - interval '1 hour') >= 20 then
    raise exception 'túl sok kérés' using errcode = '54000';
  end if;
  insert into access_requests (name, email, school, message)
  values (btrim(p_name), lower(btrim(p_email)), btrim(p_school), nullif(btrim(coalesce(p_message, '')), ''))
  on conflict (email) do nothing;
end $$;
revoke execute on function request_access(text, text, text, text) from public;
grant execute on function request_access(text, text, text, text) to anon, authenticated;

-- Admin: a nyitott kérések, a legrégebbi elöl. hasAccount: ezzel a címmel már van fiók (meghívni nem kell).
create function admin_access_requests() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'csak adminnak' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id,
      'name', r.name,
      'email', r.email,
      'school', r.school,
      'message', r.message,
      'createdAt', r.created_at,
      'hasAccount', exists (select 1 from auth.users u where lower(u.email) = r.email)
    ) order by r.created_at)
    from access_requests r
  ), '[]'::jsonb);
end $$;
revoke execute on function admin_access_requests() from public, anon;
grant execute on function admin_access_requests() to authenticated;

-- Admin: a kérés lezárása (a meghívó a teacher-account függvényen át megy ki, utána ez törli a kérést).
create function admin_resolve_access_request(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'csak adminnak' using errcode = '42501'; end if;
  delete from access_requests where id = p_id;
end $$;
revoke execute on function admin_resolve_access_request(uuid) from public, anon;
grant execute on function admin_resolve_access_request(uuid) to authenticated;

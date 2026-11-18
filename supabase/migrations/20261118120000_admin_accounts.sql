-- Admin: Fiókok (döntésnapló, 2026-11-18): az admin látja az összes pedagógust, törölheti a fiókját (kötelező
-- indokkal), és visszavonhatja a függő meghívót. Saját magát és más admint nem törölheti. A privát projekteket
-- nem látja, csak a darabszámukat. A törölt fiók projektjei, hangmezői és hangjai a fiókkal együtt törlődnek
-- (on delete cascade); a tárhelyen maradó fájlokat a napi takarítás (cleanup_orphans) 7 nap után törli.

-- Ki, mikor, kinek a fiókját törölte, és miért. Csak a Supabase felületén olvasható (nincs olvasási szabály).
create table admin_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references auth.users on delete set null,
  action text not null check (action in ('delete', 'revoke')),
  target_email text not null,
  reason text,
  created_at timestamptz not null default now()
);
alter table admin_log enable row level security;
revoke all on admin_log from anon, authenticated;

create function admin_accounts() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'csak adminnak' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(a) order by a."createdAt" desc)
    from (
      select
        u.id,
        coalesce(p.name, '') as name,
        u.email,
        u.created_at as "createdAt",
        u.last_sign_in_at as "lastSignInAt",
        u.last_sign_in_at is null as pending,
        exists (select 1 from admins ad where ad.user_id = u.id) as "isAdmin",
        (select count(*) from projects pr where pr.owner_id = u.id and not pr.is_practice) as "projectCount",
        (select coalesce(nullif(ip.name, ''), iu.email)
           from invitations i
           join auth.users iu on iu.id = i.inviter_id
           left join profiles ip on ip.id = i.inviter_id
          where i.invited_user_id = u.id
          order by i.created_at desc
          limit 1) as "invitedBy"
      from auth.users u
      left join profiles p on p.id = u.id
    ) a
  ), '[]'::jsonb);
end $$;
revoke execute on function admin_accounts() from public, anon;
grant execute on function admin_accounts() to authenticated;

-- Fiók törlése. Függő meghívónál (a meghívott még nem lépett be) ez a visszavonás, indok nélkül is.
create function admin_delete_account(p_user uuid, p_reason text) returns void language plpgsql security definer set search_path = public as $$
declare
  v_email text;
  v_pending boolean;
begin
  if not is_admin() then raise exception 'csak adminnak' using errcode = '42501'; end if;
  if p_user = (select auth.uid()) then raise exception 'a saját fiók nem törölhető itt' using errcode = '42501'; end if;
  if exists (select 1 from admins where user_id = p_user) then raise exception 'admin fiók nem törölhető' using errcode = '42501'; end if;
  select email, last_sign_in_at is null into v_email, v_pending from auth.users where id = p_user;
  if v_email is null then raise exception 'nincs ilyen fiók' using errcode = 'P0002'; end if;
  if not v_pending and btrim(coalesce(p_reason, '')) = '' then
    raise exception 'az indok kötelező' using errcode = '22023';
  end if;

  insert into admin_log (admin_id, action, target_email, reason)
  values ((select auth.uid()), case when v_pending then 'revoke' else 'delete' end, v_email, nullif(btrim(p_reason), ''));
  update invitations set revoked_at = now() where invited_user_id = p_user and revoked_at is null;
  delete from auth.users where id = p_user;
end $$;
revoke execute on function admin_delete_account(uuid, text) from public, anon;
grant execute on function admin_delete_account(uuid, text) to authenticated;

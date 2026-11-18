-- A meghívó visszavonásának végleges változata. Az előző migráció három változatban készült, és élesben az egyik
-- korábbi futott le (az első még e-mail cím alapján törölt). Ez a fájl bármelyik után lefuttatható, és ugyanazt
-- az állapotot hozza létre; friss telepítésnél nem változtat semmin.

alter table invitations add column if not exists revoked_at timestamptz;
alter table invitations add column if not exists invited_user_id uuid references auth.users on delete set null;
create index if not exists invitations_invited_user_id_idx on invitations (invited_user_id);

-- A korábbi meghívók párosítása: a fiók meghívásának ideje (invited_at) a sorral egy időben van.
update invitations i set invited_user_id = u.id
from auth.users u
where i.invited_user_id is null
  and lower(u.email) = lower(i.email)
  and u.invited_at between i.created_at - interval '1 minute' and i.created_at + interval '1 minute';

create or replace function auth_user_id_by_email(p_email text) returns uuid language sql stable security definer set search_path = public as $$
  select id from auth.users where lower(email) = lower(p_email) limit 1;
$$;
revoke execute on function auth_user_id_by_email(text) from public, anon, authenticated;
grant execute on function auth_user_id_by_email(text) to service_role;

create or replace function my_invitations() returns table (id uuid, email text, created_at timestamptz, accepted boolean)
language sql stable security definer set search_path = public as $$
  select i.id, i.email, i.created_at, i.accepted
  from (
    select distinct on (lower(inv.email)) inv.id, inv.email, inv.created_at, u.last_sign_in_at is not null as accepted
    from invitations inv
    join auth.users u on u.id = inv.invited_user_id
    where inv.inviter_id = (select auth.uid()) and inv.revoked_at is null
    order by lower(inv.email), inv.created_at desc
  ) i
  order by i.created_at desc;
$$;
revoke execute on function my_invitations() from public, anon;
grant execute on function my_invitations() to authenticated;

create or replace function revoke_invitation(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
begin
  select invited_user_id into v_user from invitations
  where id = p_id and inviter_id = (select auth.uid()) and revoked_at is null and invited_user_id is not null;
  if v_user is null then
    raise exception 'nincs ilyen meghívó' using errcode = 'P0002';
  end if;
  if exists (select 1 from invitations where invited_user_id = v_user and inviter_id <> (select auth.uid())) then
    raise exception 'nincs ilyen meghívó' using errcode = 'P0002';
  end if;
  if exists (select 1 from auth.users where id = v_user and last_sign_in_at is not null) then
    raise exception 'a meghívót már elfogadták' using errcode = '42501';
  end if;
  update invitations set revoked_at = now()
  where inviter_id = (select auth.uid()) and invited_user_id = v_user and revoked_at is null;
  delete from auth.users where id = v_user and last_sign_in_at is null;
end $$;
revoke execute on function revoke_invitation(uuid) from public, anon;
grant execute on function revoke_invitation(uuid) to authenticated;

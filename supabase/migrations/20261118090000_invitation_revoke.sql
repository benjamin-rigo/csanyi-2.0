-- Meghívó visszavonása (döntésnapló, Profil): a meghívottak listája mutatja, elfogadták-e a meghívót
-- (a meghívott már belépett a linkkel). A függő meghívót a meghívó visszavonhatja: a meghívó által létrehozott,
-- még be nem lépett fiók törlődik, így a levélben kapott link érvénytelen. A sor megmarad (revoked_at),
-- mert a napi keretbe beleszámít.

-- A meghívó azt a fiókot kezelheti, amelyet a meghívása hozott létre (a teacher-account függvény tölti ki);
-- e-mail cím alapján soha nem törlünk, mert ugyanazzal a címmel később más fiók is létrejöhet.
alter table invitations
  add column revoked_at timestamptz,
  add column invited_user_id uuid references auth.users on delete set null;

create index on invitations (invited_user_id);

-- A korábbi meghívók párosítása: a fiók meghívásának ideje (invited_at) a sorral egy időben van.
update invitations i set invited_user_id = u.id
from auth.users u
where lower(u.email) = lower(i.email)
  and u.invited_at between i.created_at - interval '1 minute' and i.created_at + interval '1 minute';

-- A saját, vissza nem vont meghívások címenként a legutóbbi, állapottal. Az auth.users-t csak így látja a böngésző.
create function my_invitations() returns table (id uuid, email text, created_at timestamptz, accepted boolean)
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

create function revoke_invitation(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
begin
  select invited_user_id into v_user from invitations
  where id = p_id and inviter_id = (select auth.uid()) and revoked_at is null and invited_user_id is not null;
  if v_user is null then
    raise exception 'nincs ilyen meghívó' using errcode = 'P0002';
  end if;
  if exists (select 1 from auth.users where id = v_user and last_sign_in_at is not null) then
    raise exception 'a meghívót már elfogadták' using errcode = '42501';
  end if;
  -- Előbb a jelölés: a fiók törlésekor az invited_user_id kiürül (on delete set null).
  update invitations set revoked_at = now()
  where inviter_id = (select auth.uid()) and invited_user_id = v_user and revoked_at is null;
  -- A profil a felhasználóval együtt törlődik (on delete cascade).
  delete from auth.users where id = v_user and last_sign_in_at is null;
end $$;
revoke execute on function revoke_invitation(uuid) from public, anon;
grant execute on function revoke_invitation(uuid) to authenticated;

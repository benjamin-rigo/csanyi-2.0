-- Meghívó visszavonása (döntésnapló, Profil): a meghívottak listája mutatja, elfogadták-e a meghívót
-- (a meghívott már belépett a linkkel). A függő meghívót a meghívó visszavonhatja: a még be nem lépett fiók
-- törlődik, így a levélben kapott link érvénytelen. A sor megmarad (revoked_at), mert a napi keretbe beleszámít.

alter table invitations add column revoked_at timestamptz;

-- A saját, vissza nem vont meghívások címenként a legutóbbi, állapottal. Az auth.users-t csak így látja a böngésző.
create function my_invitations() returns table (id uuid, email text, created_at timestamptz, accepted boolean)
language sql stable security definer set search_path = public as $$
  select i.id, i.email, i.created_at,
    exists (select 1 from auth.users u where lower(u.email) = lower(i.email) and u.last_sign_in_at is not null)
  from (
    select distinct on (lower(email)) id, email, created_at
    from invitations
    where inviter_id = (select auth.uid()) and revoked_at is null
    order by lower(email), created_at desc
  ) i
  order by i.created_at desc;
$$;
revoke execute on function my_invitations() from public, anon;
grant execute on function my_invitations() to authenticated;

create function revoke_invitation(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
declare
  v_email text;
begin
  select email into v_email from invitations
  where id = p_id and inviter_id = (select auth.uid()) and revoked_at is null;
  if v_email is null then
    raise exception 'nincs ilyen meghívó' using errcode = 'P0002';
  end if;
  if exists (select 1 from auth.users where lower(email) = lower(v_email) and last_sign_in_at is not null) then
    raise exception 'a meghívót már elfogadták' using errcode = '42501';
  end if;
  -- A profil a felhasználóval együtt törlődik (on delete cascade).
  delete from auth.users where lower(email) = lower(v_email) and last_sign_in_at is null;
  update invitations set revoked_at = now()
  where inviter_id = (select auth.uid()) and lower(email) = lower(v_email) and revoked_at is null;
end $$;
revoke execute on function revoke_invitation(uuid) from public, anon;
grant execute on function revoke_invitation(uuid) to authenticated;

-- Levett kép végleges törlése (döntésnapló, 2026-11-18): az admin a galériáról levett projektet kötelező indokkal
-- törölheti. Csak levett kép törölhető (galériában lévő és privát nem). A hangmezők a projekttel együtt törlődnek
-- (on delete cascade), a tárhelyen maradó képet és hangokat a napi takarítás 7 nap után törli. A törlést az
-- admin_log naplózza: ki, kinek a projektjét, melyiket, mikor és miért.

alter table admin_log drop constraint admin_log_action_check;
alter table admin_log add constraint admin_log_action_check check (action in ('delete', 'revoke', 'delete_project'));
alter table admin_log add column target_project text;

create function admin_delete_project(p_id uuid, p_reason text) returns void language plpgsql security definer set search_path = public as $$
declare
  v_title text;
  v_email text;
begin
  if not is_admin() then raise exception 'csak adminnak' using errcode = '42501'; end if;
  if btrim(coalesce(p_reason, '')) = '' then raise exception 'az indok kötelező' using errcode = '22023'; end if;
  select p.title, u.email into v_title, v_email
    from projects p left join auth.users u on u.id = p.owner_id
   where p.id = p_id and p.moderation_note is not null and p.visibility <> 'gallery';
  if not found then raise exception 'csak levett kép törölhető' using errcode = 'P0002'; end if;

  insert into admin_log (admin_id, action, target_email, target_project, reason)
  values ((select auth.uid()), 'delete_project', coalesce(v_email, '-'), coalesce(nullif(v_title, ''), p_id::text), btrim(p_reason));
  delete from projects where id = p_id;
end $$;
revoke execute on function admin_delete_project(uuid, text) from public, anon;
grant execute on function admin_delete_project(uuid, text) to authenticated;

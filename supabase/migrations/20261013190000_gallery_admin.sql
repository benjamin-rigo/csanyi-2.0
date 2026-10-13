-- Galéria kezelése (döntésnapló, 2026-10-13): az admin látja a galéria képeit, leveheti őket rövid okkal
-- (a projekt "Linkkel elérhető" lesz), visszateheti, és javíthatja a kategóriáikat.
-- Az adminlistát csak a Supabase felületén lehet szerkeszteni (Table Editor → admins); írási szabály nincs.

create table admins (
  user_id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
alter table admins enable row level security;
create policy "admin: saját sor olvasása" on admins for select to authenticated using (user_id = (select auth.uid()));
revoke insert, update, delete on admins from anon, authenticated;

create function is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;
revoke execute on function is_admin() from public, anon;
grant execute on function is_admin() to authenticated;

-- A levétel oka; a pedagógus a Megosztás fülön látja. Galériába tételkor törlődik.
alter table projects add column moderation_note text, add column moderated_at timestamptz;

create function clear_moderation_note() returns trigger language plpgsql set search_path = public as $$
begin
  if new.visibility = 'gallery' then
    new.moderation_note := null;
    new.moderated_at := null;
  end if;
  return new;
end $$;
create trigger projects_clear_moderation before update of visibility on projects
  for each row execute function clear_moderation_note();
revoke execute on function clear_moderation_note() from public, anon, authenticated;

-- A galéria és a levett képek az adminnak, a pedagógus nevével és e-mail címével.
create function admin_gallery() returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'csak adminnak' using errcode = '42501'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id,
      'title', p.title,
      'author', p.author,
      'imagePath', p.image_path,
      'visibility', p.visibility,
      'moderationNote', p.moderation_note,
      'moderatedAt', p.moderated_at,
      'updatedAt', p.updated_at,
      'ownerName', pr.name,
      'ownerEmail', u.email,
      'fieldCount', (select count(*) from fields f where f.project_id = p.id),
      'categories', coalesce((select jsonb_agg(pc.category_id) from project_categories pc where pc.project_id = p.id), '[]')
    ) order by p.updated_at desc)
    from projects p
    left join profiles pr on pr.id = p.owner_id
    left join auth.users u on u.id = p.owner_id
    where p.visibility = 'gallery' or p.moderation_note is not null
  ), '[]');
end $$;

create function admin_remove_from_gallery(p_id uuid, reason text) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'csak adminnak' using errcode = '42501'; end if;
  update projects set visibility = 'link', moderation_note = coalesce(nullif(btrim(reason), ''), '-'), moderated_at = now()
  where id = p_id and visibility = 'gallery';
end $$;

-- Visszatétel: a galéria feltételeit a check_gallery_ready() trigger ugyanúgy ellenőrzi.
create function admin_restore_to_gallery(p_id uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'csak adminnak' using errcode = '42501'; end if;
  update projects set visibility = 'gallery' where id = p_id and moderation_note is not null;
end $$;

create function admin_set_categories(p_id uuid, ids text[]) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'csak adminnak' using errcode = '42501'; end if;
  delete from project_categories where project_id = p_id;
  insert into project_categories (project_id, category_id) select p_id, unnest(ids);
end $$;

revoke execute on function admin_gallery() from public, anon;
revoke execute on function admin_remove_from_gallery(uuid, text) from public, anon;
revoke execute on function admin_restore_to_gallery(uuid) from public, anon;
revoke execute on function admin_set_categories(uuid, text[]) from public, anon;
grant execute on function admin_gallery() to authenticated;
grant execute on function admin_remove_from_gallery(uuid, text) to authenticated;
grant execute on function admin_restore_to_gallery(uuid) to authenticated;
grant execute on function admin_set_categories(uuid, text[]) to authenticated;

-- Hangrétegek (döntésnapló, 2026-11-18): a háttérhanghoz és minden hangmezőhöz több hang adható, amelyek
-- egyszerre szólnak, mindegyik saját hangerővel. Egy réteg: {"sound": <sounds.id>, "volume": 0–1}, a lista
-- sorrendje a rétegek sorrendje. A meglévő egy-egy hang az első réteg lesz.
-- A régi oszlopok (fields.sound_id, fields.volume, projects.background_sound_id, projects.background_volume)
-- átmenetileg megmaradnak, hogy a migráció és az új felület élesítése között a régi felület ne törjön el;
-- egy későbbi migráció törli őket. A gyerek oldal adata ezért a régi kulcsokat is adja (az első réteget).

alter table fields add column sound_layers jsonb not null default '[]' check (jsonb_typeof(sound_layers) = 'array');
alter table projects add column background_layers jsonb not null default '[]' check (jsonb_typeof(background_layers) = 'array');

update fields set sound_layers = jsonb_build_array(jsonb_build_object('sound', sound_id, 'volume', volume))
where sound_id is not null;
update projects set background_layers = jsonb_build_array(jsonb_build_object('sound', background_sound_id, 'volume', background_volume))
where background_sound_id is not null;

-- Rétegek a gyerek oldal formájában: [{src, volume}], a hiányzó hang kimarad.
create function layers_json(layers jsonb) returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('src', s.path, 'volume', (l.value->>'volume')::real) order by l.ordinality), '[]')
  from jsonb_array_elements(layers) with ordinality l
  join sounds s on s.id = (l.value->>'sound')::uuid;
$$;
revoke execute on function layers_json(jsonb) from public, anon, authenticated;

create or replace function project_json(p projects) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'author', p.author,
    'shortDescription', p.short_description,
    'categories', coalesce((select jsonb_agg(category_id) from project_categories where project_id = p.id), '[]'),
    'image', jsonb_build_object('src', p.image_path, 'width', p.image_width, 'height', p.image_height),
    'backgrounds', layers_json(p.background_layers),
    'background', layers_json(p.background_layers)->0,
    'fields', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id, 'name', f.name, 'description', f.description,
        'sounds', layers_json(f.sound_layers),
        'sound', coalesce(layers_json(f.sound_layers)->0, jsonb_build_object('src', null, 'volume', 1)),
        'descriptionSound', (select jsonb_build_object('src', d.path, 'volume', 1) from sounds d where d.id = f.description_sound_id),
        'polygons', case when f.shape->>'type' = 'multipolygon' then f.shape->'polygons' else jsonb_build_array(f.shape->'points') end,
        'softness', f.edge_softness
      ) order by f.sort)
      from fields f
      where f.project_id = p.id
    ), '[]')
  );
$$;
revoke execute on function project_json(projects) from public, anon, authenticated;

-- A galériához legalább egy háttérhang és hangmezőnként legalább egy hang kell (a kliens projectMissing() is).
create or replace function project_missing(p_id uuid) returns text[] language sql stable security definer set search_path = public as $$
  select array_remove(array[
    case when p.image_path is null then 'image' end,
    case when btrim(p.title) = '' then 'title' end,
    case when btrim(p.short_description) = '' then 'shortDescription' end,
    case when jsonb_array_length(p.background_layers) = 0 then 'background' end,
    case when not exists (select 1 from fields f where f.project_id = p.id) then 'fields' end
  ] || coalesce((
    select array_agg(x order by f.sort, x)
    from fields f,
    lateral unnest(array[
      case when btrim(f.name) = '' then 'field:' || f.id || ':name' end,
      case when btrim(f.description) = '' then 'field:' || f.id || ':description' end,
      case when jsonb_array_length(f.sound_layers) = 0 then 'field:' || f.id || ':sound' end,
      case when f.description_sound_id is null then 'field:' || f.id || ':descriptionSound' end
    ]) x
    where f.project_id = p.id and x is not null
  ), '{}'), null)
  from projects p where p.id = p_id;
$$;

-- Tárhely-takarítás: a rétegekben használt hang sem gazdátlan (CLAUDE.md: új hivatkozásnál bővíteni kell).
create or replace function cleanup_orphans(grace interval default interval '7 days')
returns table (bucket text, name text) language plpgsql security definer set search_path = public as $$
begin
  create temp table current_orphans on commit drop as
  with used_sounds as (
    select s.path from sounds s
    where exists (select 1 from fields f where f.sound_id = s.id or f.description_sound_id = s.id
                    or f.sound_layers @> jsonb_build_array(jsonb_build_object('sound', s.id)))
       or exists (select 1 from projects p where p.background_sound_id = s.id
                    or p.background_layers @> jsonb_build_array(jsonb_build_object('sound', s.id)))
  )
  select o.bucket_id as bucket, o.name from storage.objects o
  where (o.bucket_id = 'images' and not exists (
          select 1 from projects p where right(p.image_path, length(o.name) + 8) = '/images/' || o.name))
     or (o.bucket_id = 'sounds' and not exists (
          select 1 from used_sounds u where right(u.path, length(o.name) + 8) = '/sounds/' || o.name));

  delete from storage_orphans so
  where not exists (select 1 from current_orphans c where c.bucket = so.bucket and c.name = so.name);
  insert into storage_orphans (bucket, name) select c.bucket, c.name from current_orphans c on conflict do nothing;

  create temp table due on commit drop as
  select so.bucket, so.name from storage_orphans so where so.seen_at < now() - grace;
  delete from sounds s
  where s.owner_id is not null
    and exists (select 1 from due d where d.bucket = 'sounds' and right(s.path, length(d.name) + 8) = '/sounds/' || d.name)
    and not exists (select 1 from fields f where f.sound_id = s.id or f.description_sound_id = s.id
                      or f.sound_layers @> jsonb_build_array(jsonb_build_object('sound', s.id)))
    and not exists (select 1 from projects p where p.background_sound_id = s.id
                      or p.background_layers @> jsonb_build_array(jsonb_build_object('sound', s.id)));
  delete from storage_orphans so using due d where so.bucket = d.bucket and so.name = d.name;
  return query select d.bucket, d.name from due d;
end $$;

-- Lágy szél (döntésnapló): a hangmező szélétől befelé fokozatosan erősödik a hang.
-- 0 = éles határ, 1 = a legszélesebb átmenet (a kép rövidebb oldalának beállított hányada, config.json).

alter table fields add column edge_softness real not null default 0.3 check (edge_softness between 0 and 1);

create or replace function project_json(p projects) returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', p.id,
    'title', p.title,
    'author', p.author,
    'shortDescription', p.short_description,
    'categories', coalesce((select jsonb_agg(category_id) from project_categories where project_id = p.id), '[]'),
    'image', jsonb_build_object('src', p.image_path, 'width', p.image_width, 'height', p.image_height),
    'background', (select jsonb_build_object('src', s.path, 'volume', p.background_volume) from sounds s where s.id = p.background_sound_id),
    'fields', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', f.id, 'name', f.name, 'description', f.description,
        'sound', jsonb_build_object('src', s.path, 'volume', f.volume),
        'descriptionSound', (select jsonb_build_object('src', d.path, 'volume', 1) from sounds d where d.id = f.description_sound_id),
        'polygons', case when f.shape->>'type' = 'multipolygon' then f.shape->'polygons' else jsonb_build_array(f.shape->'points') end,
        'softness', f.edge_softness
      ) order by f.sort)
      from fields f left join sounds s on s.id = f.sound_id
      where f.project_id = p.id
    ), '[]')
  );
$$;
revoke execute on function project_json(projects) from public, anon, authenticated;

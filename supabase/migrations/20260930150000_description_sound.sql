-- Leíró hang a hangmezőkhöz: kikapcsolt felolvasónál ez szól érintésre (döntésnapló).
-- A pedagógus feltölti vagy felveszi; a kezdő adatokhoz géppel felolvasott próbafelvétel tartozik.

alter table fields add column description_sound_id uuid references sounds on delete set null;

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
        'points', f.shape->'points'
      ) order by f.sort)
      from fields f left join sounds s on s.id = f.sound_id
      where f.project_id = p.id
    ), '[]')
  );
$$;
revoke execute on function project_json(projects) from public, anon, authenticated;

with s as (insert into sounds (owner_id, title, path, source, license) values (null, 'leírás: Macska', 'sounds/leiras/a-macskanak-negy-a-laba-macska.m4a', 'upload', 'helykitöltő (gépi felolvasás)') returning id)
update fields set description_sound_id = (select id from s) where project_id = 'ac087770-0f15-46d8-88db-3581c14ea5b6' and name = 'Macska';
with s as (insert into sounds (owner_id, title, path, source, license) values (null, 'leírás: Madarak', 'sounds/leiras/a-macskanak-negy-a-laba-madarak.m4a', 'upload', 'helykitöltő (gépi felolvasás)') returning id)
update fields set description_sound_id = (select id from s) where project_id = 'ac087770-0f15-46d8-88db-3581c14ea5b6' and name = 'Madarak';
with s as (insert into sounds (owner_id, title, path, source, license) values (null, 'leírás: Ház', 'sounds/leiras/a-macskanak-negy-a-laba-haz.m4a', 'upload', 'helykitöltő (gépi felolvasás)') returning id)
update fields set description_sound_id = (select id from s) where project_id = 'ac087770-0f15-46d8-88db-3581c14ea5b6' and name = 'Ház';
with s as (insert into sounds (owner_id, title, path, source, license) values (null, 'leírás: Virágok', 'sounds/leiras/a-macskanak-negy-a-laba-viragok.m4a', 'upload', 'helykitöltő (gépi felolvasás)') returning id)
update fields set description_sound_id = (select id from s) where project_id = 'ac087770-0f15-46d8-88db-3581c14ea5b6' and name = 'Virágok';
with s as (insert into sounds (owner_id, title, path, source, license) values (null, 'leírás: Hullámok', 'sounds/leiras/tengerpart-hullamok.m4a', 'upload', 'helykitöltő (gépi felolvasás)') returning id)
update fields set description_sound_id = (select id from s) where project_id = '797b3b36-4310-45db-8ed9-fae3e60dce84' and name = 'Hullámok';
with s as (insert into sounds (owner_id, title, path, source, license) values (null, 'leírás: Sirályok', 'sounds/leiras/tengerpart-siralyok.m4a', 'upload', 'helykitöltő (gépi felolvasás)') returning id)
update fields set description_sound_id = (select id from s) where project_id = '797b3b36-4310-45db-8ed9-fae3e60dce84' and name = 'Sirályok';
with s as (insert into sounds (owner_id, title, path, source, license) values (null, 'leírás: Fenyők', 'sounds/leiras/erdo-reggel-fenyok.m4a', 'upload', 'helykitöltő (gépi felolvasás)') returning id)
update fields set description_sound_id = (select id from s) where project_id = '4b8471c5-2562-4c2d-83a5-f9cb690207a2' and name = 'Fenyők';
with s as (insert into sounds (owner_id, title, path, source, license) values (null, 'leírás: Patak', 'sounds/leiras/erdo-reggel-patak.m4a', 'upload', 'helykitöltő (gépi felolvasás)') returning id)
update fields set description_sound_id = (select id from s) where project_id = '4b8471c5-2562-4c2d-83a5-f9cb690207a2' and name = 'Patak';
with s as (insert into sounds (owner_id, title, path, source, license) values (null, 'leírás: Madár', 'sounds/leiras/erdo-reggel-madar.m4a', 'upload', 'helykitöltő (gépi felolvasás)') returning id)
update fields set description_sound_id = (select id from s) where project_id = '4b8471c5-2562-4c2d-83a5-f9cb690207a2' and name = 'Madár';

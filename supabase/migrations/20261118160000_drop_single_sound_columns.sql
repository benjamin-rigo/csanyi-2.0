-- A régi, egyhangos oszlopok törlése: a hangrétegek (20261118140000_sound_layers) óta a felület nem használja őket.
-- A gyerek oldal adata (project_json) a régi „background” és „sound” kulcsot továbbra is a rétegekből adja.

-- A takarítás eddig a régi oszlopokra is figyelt; ezek nélkül újra kell írni.
create or replace function cleanup_orphans(grace interval default interval '7 days')
returns table (bucket text, name text) language plpgsql security definer set search_path = public as $$
begin
  create temp table current_orphans on commit drop as
  with used_sounds as (
    select s.path from sounds s
    where exists (select 1 from fields f where f.description_sound_id = s.id
                    or f.sound_layers @> jsonb_build_array(jsonb_build_object('sound', s.id)))
       or exists (select 1 from projects p where p.background_layers @> jsonb_build_array(jsonb_build_object('sound', s.id)))
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
    and not exists (select 1 from fields f where f.description_sound_id = s.id
                      or f.sound_layers @> jsonb_build_array(jsonb_build_object('sound', s.id)))
    and not exists (select 1 from projects p where p.background_layers @> jsonb_build_array(jsonb_build_object('sound', s.id)));
  delete from storage_orphans so using due d where so.bucket = d.bucket and so.name = d.name;
  return query select d.bucket, d.name from due d;
end $$;

alter table fields drop column sound_id, drop column volume;
alter table projects drop column background_sound_id, drop column background_volume;

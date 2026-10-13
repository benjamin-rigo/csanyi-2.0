-- A galériába kerüléshez minden hangmezőnek leíró hang is kell (döntésnapló, 2026-10-13): érintős eszközön a
-- felolvasó kikapcsolását javasoljuk, és felolvasó nélkül a leírást csak a felvett leíró hang mondja el.
-- A linkes megosztáshoz nem kell. A kliens projectMissing() függvénye ugyanezt ellenőrzi.

create or replace function project_missing(p_id uuid) returns text[] language sql stable security definer set search_path = public as $$
  select array_remove(array[
    case when p.image_path is null then 'image' end,
    case when btrim(p.title) = '' then 'title' end,
    case when btrim(p.short_description) = '' then 'shortDescription' end,
    case when p.background_sound_id is null then 'background' end,
    case when not exists (select 1 from fields f where f.project_id = p.id) then 'fields' end
  ] || coalesce((
    select array_agg(x order by f.sort, x)
    from fields f,
    lateral unnest(array[
      case when btrim(f.name) = '' then 'field:' || f.id || ':name' end,
      case when btrim(f.description) = '' then 'field:' || f.id || ':description' end,
      case when f.sound_id is null then 'field:' || f.id || ':sound' end,
      case when f.description_sound_id is null then 'field:' || f.id || ':descriptionSound' end
    ]) x
    where f.project_id = p.id and x is not null
  ), '{}'), null)
  from projects p where p.id = p_id;
$$;

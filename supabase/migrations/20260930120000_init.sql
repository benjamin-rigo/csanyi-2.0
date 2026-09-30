-- Hangösvény: alap séma. Futtatás: Supabase → SQL Editor → beillesztés → Run.

create type visibility as enum ('private', 'link', 'gallery');
create type sound_source as enum ('upload', 'library');

-- Kategóriák (galéria szűrők, egyben a Projekt fül témái)
create table categories (
  id text primary key,
  label text not null,
  icon text,
  sort int not null default 0
);

-- Pedagógusok
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null default '',
  terms_accepted_at timestamptz,
  onboarding_step int not null default 0,
  created_at timestamptz not null default now()
);

-- Hangok: saját feltöltés vagy könyvtárból (Freesound CC0). owner_id null: közös hang.
-- path: teljes URL (tárhely) vagy az oldalhoz relatív út (kezdő adatok).
create table sounds (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles on delete cascade,
  title text not null,
  path text not null,
  source sound_source not null default 'upload',
  license text,
  attribution text,
  duration_ms int,
  created_at timestamptz not null default now()
);

-- Projektek. owner_id null: közös minta vagy kezdő adat.
create table projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles on delete cascade,
  title text not null default '',
  author text not null default '',
  short_description text not null default '',
  intro text not null default '',
  image_path text,
  image_width int,
  image_height int,
  background_sound_id uuid references sounds on delete set null,
  background_volume real not null default 0.4,
  visibility visibility not null default 'private',
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table project_categories (
  project_id uuid references projects on delete cascade,
  category_id text references categories on delete cascade,
  primary key (project_id, category_id)
);

-- Hangmezők. shape: {"type":"polygon","points":[[x,y],...]} a kép saját pixelkoordinátáiban.
create table fields (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects on delete cascade,
  sort int not null default 0,
  name text not null default '',
  description text not null default '',
  shape jsonb not null default '{"type":"polygon","points":[]}',
  sound_id uuid references sounds on delete set null,
  volume real not null default 1
);

create index on projects (owner_id);
create index on projects (visibility);
create index on fields (project_id);

-- updated_at karbantartása
create function touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;
create trigger projects_touch before update on projects for each row execute function touch_updated_at();

-- Új felhasználóhoz profil (a meghívó után a Fiók beállítása tölti ki a nevet)
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, name) values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- Mi hiányzik a galériába kerüléshez (döntésnapló: Megosztás). Üres tömb: kiteheti.
create function project_missing(p_id uuid) returns text[] language sql stable security definer set search_path = public as $$
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
      case when f.sound_id is null then 'field:' || f.id || ':sound' end
    ]) x
    where f.project_id = p.id and x is not null
  ), '{}'), null)
  from projects p where p.id = p_id;
$$;

create function check_gallery_ready() returns trigger language plpgsql as $$
begin
  if new.visibility = 'gallery' and cardinality(project_missing(new.id)) > 0 then
    raise exception 'A galériába még nem kerülhet ki: %', project_missing(new.id);
  end if;
  return new;
end $$;
create trigger projects_gallery_ready after insert or update of visibility on projects
  for each row execute function check_gallery_ready();

-- Egy projekt a gyerek oldal formájában (ugyanaz, mint a régi gallery.json egy eleme)
create function project_json(p projects) returns jsonb language sql stable security definer set search_path = public as $$
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
        'points', f.shape->'points'
      ) order by f.sort)
      from fields f left join sounds s on s.id = f.sound_id
      where f.project_id = p.id
    ), '[]')
  );
$$;

-- Nyilvános galéria: csak a teljes, galériába tett projektek
create function gallery() returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'categories', (select coalesce(jsonb_agg(jsonb_build_object('id', id, 'label', label, 'icon', icon) order by sort), '[]') from categories),
    'projects', coalesce((
      select jsonb_agg(project_json(p) order by p.created_at)
      from projects p
      where p.visibility = 'gallery' and cardinality(project_missing(p.id)) = 0
    ), '[]')
  );
$$;

-- Linkkel megosztott projekt: csak azonosítóval kérhető le, listázni nem lehet
create function shared_project(p_id uuid) returns jsonb language sql stable security definer set search_path = public as $$
  select project_json(p) from projects p
  where p.id = p_id and (p.visibility <> 'private' or p.owner_id = auth.uid());
$$;

-- A Supabase alapból mindenkinek futtatási jogot ad; a belső függvényeket elzárjuk.
revoke execute on function project_json(projects) from public, anon, authenticated;
revoke execute on function project_missing(uuid) from public, anon;
revoke execute on function handle_new_user() from public, anon, authenticated;
grant execute on function gallery() to anon, authenticated;
grant execute on function shared_project(uuid) to anon, authenticated;
grant execute on function project_missing(uuid) to authenticated;

-- Jogosultságok (RLS)
alter table categories enable row level security;
alter table profiles enable row level security;
alter table sounds enable row level security;
alter table projects enable row level security;
alter table project_categories enable row level security;
alter table fields enable row level security;

create policy "kategóriák: olvasás" on categories for select using (true);

create policy "profil: saját olvasás" on profiles for select using (id = auth.uid());
create policy "profil: saját módosítás" on profiles for update using (id = auth.uid());

create policy "hang: saját és közös olvasás" on sounds for select to authenticated using (owner_id = auth.uid() or owner_id is null);
create policy "hang: saját írás" on sounds for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "projekt: saját és minta olvasás" on projects for select to authenticated using (owner_id = auth.uid() or is_sample);
create policy "projekt: saját írás" on projects for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "projekt kategória: olvasás" on project_categories for select to authenticated
  using (exists (select 1 from projects p where p.id = project_id and (p.owner_id = auth.uid() or p.is_sample)));
create policy "projekt kategória: írás" on project_categories for all to authenticated
  using (exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()));

create policy "hangmező: olvasás" on fields for select to authenticated
  using (exists (select 1 from projects p where p.id = project_id and (p.owner_id = auth.uid() or p.is_sample)));
create policy "hangmező: írás" on fields for all to authenticated
  using (exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from projects p where p.id = project_id and p.owner_id = auth.uid()));

-- Tárhely: nyilvánosan olvasható, feltölteni csak a saját mappába (<user id>/...) lehet
insert into storage.buckets (id, name, public) values ('images', 'images', true), ('sounds', 'sounds', true);

create policy "tárhely: saját feltöltés" on storage.objects for insert to authenticated
  with check (bucket_id in ('images', 'sounds') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "tárhely: saját módosítás" on storage.objects for update to authenticated
  using (bucket_id in ('images', 'sounds') and (storage.foldername(name))[1] = auth.uid()::text);
create policy "tárhely: saját törlés" on storage.objects for delete to authenticated
  using (bucket_id in ('images', 'sounds') and (storage.foldername(name))[1] = auth.uid()::text);

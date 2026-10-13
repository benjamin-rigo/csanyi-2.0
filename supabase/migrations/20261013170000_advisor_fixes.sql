-- A Supabase ellenőrzőjének javaslatai (2026-10-13). A szabályok jelentése nem változik:
-- - auth.uid() helyett (select auth.uid()): lekérdezésenként egyszer számolódik, nem soronként;
-- - a "for all" írási szabályok szétbontva beszúrásra, módosításra, törlésre, így olvasáskor csak az olvasási szabály fut;
-- - indexek az idegen kulcsokon;
-- - a check_gallery_ready() trigger-függvény és a storage_orphans tábla kívülről nem érhető el.

drop policy "profil: saját olvasás" on profiles;
drop policy "profil: saját módosítás" on profiles;
create policy "profil: saját olvasás" on profiles for select to authenticated using (id = (select auth.uid()));
create policy "profil: saját módosítás" on profiles for update to authenticated using (id = (select auth.uid()));

drop policy "hang: saját és közös olvasás" on sounds;
drop policy "hang: saját írás" on sounds;
create policy "hang: saját és közös olvasás" on sounds for select to authenticated using (owner_id = (select auth.uid()) or owner_id is null);
create policy "hang: saját beszúrás" on sounds for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "hang: saját módosítás" on sounds for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "hang: saját törlés" on sounds for delete to authenticated using (owner_id = (select auth.uid()));

drop policy "projekt: saját és minta olvasás" on projects;
drop policy "projekt: saját írás" on projects;
create policy "projekt: saját és minta olvasás" on projects for select to authenticated using (owner_id = (select auth.uid()) or is_sample);
create policy "projekt: saját beszúrás" on projects for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "projekt: saját módosítás" on projects for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "projekt: saját törlés" on projects for delete to authenticated using (owner_id = (select auth.uid()));

drop policy "projekt kategória: olvasás" on project_categories;
drop policy "projekt kategória: írás" on project_categories;
create policy "projekt kategória: olvasás" on project_categories for select to authenticated
  using (exists (select 1 from projects p where p.id = project_id and (p.owner_id = (select auth.uid()) or p.is_sample)));
create policy "projekt kategória: saját beszúrás" on project_categories for insert to authenticated
  with check (exists (select 1 from projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy "projekt kategória: saját törlés" on project_categories for delete to authenticated
  using (exists (select 1 from projects p where p.id = project_id and p.owner_id = (select auth.uid())));

drop policy "hangmező: olvasás" on fields;
drop policy "hangmező: írás" on fields;
create policy "hangmező: olvasás" on fields for select to authenticated
  using (exists (select 1 from projects p where p.id = project_id and (p.owner_id = (select auth.uid()) or p.is_sample)));
create policy "hangmező: saját beszúrás" on fields for insert to authenticated
  with check (exists (select 1 from projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy "hangmező: saját módosítás" on fields for update to authenticated
  using (exists (select 1 from projects p where p.id = project_id and p.owner_id = (select auth.uid())))
  with check (exists (select 1 from projects p where p.id = project_id and p.owner_id = (select auth.uid())));
create policy "hangmező: saját törlés" on fields for delete to authenticated
  using (exists (select 1 from projects p where p.id = project_id and p.owner_id = (select auth.uid())));

drop policy "meghívás: saját olvasás" on invitations;
create policy "meghívás: saját olvasás" on invitations for select to authenticated using (inviter_id = (select auth.uid()));

create index on fields (sound_id);
create index on fields (description_sound_id);
create index on profiles (practice_project_id);
create index on project_categories (category_id);
create index on projects (background_sound_id);
create index on sounds (owner_id);

revoke execute on function check_gallery_ready() from public, anon, authenticated;
revoke all on storage_orphans from anon, authenticated;

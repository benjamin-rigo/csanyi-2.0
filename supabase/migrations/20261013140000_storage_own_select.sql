-- A tárhelyen a saját mappa fájljai listázhatók: a Supabase a törlés előtt kiolvassa a fájlt,
-- olvasási jog nélkül a saját fájl törlése csendben nem történik meg. A fájlok amúgy is nyilvánosak.

create policy "tárhely: saját olvasás" on storage.objects for select to authenticated
  using (bucket_id in ('images', 'sounds') and (storage.foldername(name))[1] = auth.uid()::text);

-- Supabase biztonsági ellenőrző (advisors) javaslatai:
-- - project_missing(): belső függvény (galéria, galéria-feltétel ellenőrzése); a felület nem hívja,
--   ezért a bejelentkezett felhasználók se hívhassák közvetlenül (más projektjéről árulna el adatot).
-- - a triggerfüggvények keresési útvonala rögzítve.

revoke execute on function project_missing(uuid) from authenticated;
alter function touch_updated_at() set search_path = public;
alter function check_gallery_ready() set search_path = public;

-- A pg_net az extensions sémába (a Supabase ellenőrzőjének javaslata); áthelyezni nem lehet, csak újratelepíteni.
-- Az időzített takarítás a net.http_post-ot hívja, a net séma megmarad.

drop extension if exists pg_net;
create extension pg_net with schema extensions;

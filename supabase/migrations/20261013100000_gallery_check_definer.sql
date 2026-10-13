-- A galéria-ellenőrző trigger a beszúró jogaival futott, és a project_missing() hívási jogának
-- elvétele (20261013090000) óta minden projekt létrehozása elakadt. A saját jogán fut.

alter function check_gallery_ready() security definer;

-- Több kategória (döntésnapló, 2026-10-13): a lista egyelőre rögzített, a pedagógus ezek közül választ.

insert into categories (id, label, icon, sort) values
  ('city', 'Városi képek', 'city', 4),
  ('stories', 'Mesés képek', 'story', 5),
  ('seasons', 'Évszakok és ünnepek', 'season', 6),
  ('drawings', 'Gyerekrajzok', 'brush', 7)
on conflict (id) do nothing;

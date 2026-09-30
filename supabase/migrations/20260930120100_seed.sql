-- Kezdő adatok: a korábbi public/data/gallery.json tartalma. A képek és hangok egyelőre az oldalról jönnek (relatív út).

insert into categories (id, label, icon, sort) values
  ('all', 'Összes kép', null, 0),
  ('famous', 'Híres képek', 'image', 1),
  ('animals', 'Állatos képek', 'paw', 2),
  ('landscapes', 'Tájképek', 'leaf', 3);

insert into sounds (id, owner_id, title, path, source, license) values
  ('d211cee2-262d-4406-80dd-17c6b7b8d0a4', null, 'esti tuckok', 'sounds/esti-tuckok.mp3', 'library', 'helykitöltő'),
  ('264d66cc-282d-4be4-84a5-5da9bc1ca31b', null, 'dorombolas', 'sounds/dorombolas.mp3', 'library', 'helykitöltő'),
  ('ab384440-6808-4cfb-8f40-1f5d5d010862', null, 'csicserges', 'sounds/csicserges.mp3', 'library', 'helykitöltő'),
  ('42e40fd4-04c6-4fea-8cf5-121350bd6741', null, 'nyikorgo ajto', 'sounds/nyikorgo-ajto.mp3', 'library', 'helykitöltő'),
  ('d1621dea-5eff-45ef-89a7-bf5b9e90b2d5', null, 'mehzummoges', 'sounds/mehzummoges.mp3', 'library', 'helykitöltő'),
  ('b12c0402-8f2b-4010-8d1c-55c2fff62f08', null, 'tenger', 'sounds/tenger.mp3', 'library', 'helykitöltő'),
  ('9d3aa78d-cc4b-40c6-83a4-7deeefbe8013', null, 'hullam', 'sounds/hullam.mp3', 'library', 'helykitöltő'),
  ('8e3788b3-af30-453d-8c3a-b3c04bf0b190', null, 'siraly', 'sounds/siraly.mp3', 'library', 'helykitöltő'),
  ('62dda3aa-ed38-4788-80f4-b589e5c77cfb', null, 'erdo', 'sounds/erdo.mp3', 'library', 'helykitöltő'),
  ('b5ba0368-5a69-4da6-8b90-c84d63f95857', null, 'szel a fak kozt', 'sounds/szel-a-fak-kozt.mp3', 'library', 'helykitöltő'),
  ('86437b9d-3260-4db5-8631-f5f20eeb2554', null, 'patak', 'sounds/patak.mp3', 'library', 'helykitöltő');

insert into projects (id, owner_id, title, author, short_description, image_path, image_width, image_height, background_sound_id, background_volume, is_sample) values ('ac087770-0f15-46d8-88db-3581c14ea5b6', null, 'A macskának négy a lába', 'Reich Károly', 'Egy macska áll a háztetőn, alatta két madár, lent virágos kert.', 'media/macska-reich.jpg', 445, 638, 'd211cee2-262d-4406-80dd-17c6b7b8d0a4', 0.4, true);
insert into project_categories (project_id, category_id) values ('ac087770-0f15-46d8-88db-3581c14ea5b6', 'famous'), ('ac087770-0f15-46d8-88db-3581c14ea5b6', 'animals');
insert into fields (project_id, sort, name, description, shape, sound_id, volume) values
  ('ac087770-0f15-46d8-88db-3581c14ea5b6', 0, 'Macska', 'Egy nagy cica áll a tetőn, akkora, mint a ház. Kedvesen néz rád, és dorombol.', '{"type":"polygon","points":[[88,100],[110,70],[148,35],[160,68],[178,68],[195,55],[205,100],[215,135],[335,140],[335,40],[350,25],[368,45],[372,200],[360,262],[290,262],[290,205],[215,205],[200,262],[135,262],[165,195],[150,165],[115,160],[88,130]]}', '264d66cc-282d-4be4-84a5-5da9bc1ca31b', 1),
  ('ac087770-0f15-46d8-88db-3581c14ea5b6', 1, 'Madarak', 'Két pöttyös madár ül a piros tetőn, csőrük összeér, és vidáman csiripelnek.', '{"type":"polygon","points":[[143,296],[240,272],[305,268],[330,305],[386,318],[386,348],[320,350],[312,376],[198,376],[190,330],[143,332]]}', 'ab384440-6808-4cfb-8f40-1f5d5d010862', 0.9),
  ('ac087770-0f15-46d8-88db-3581c14ea5b6', 2, 'Ház', 'Kék ház piros tetővel és zöld ajtóval. Az ajtó nyikorogva kinyílik.', '{"type":"polygon","points":[[82,470],[82,388],[65,380],[110,262],[155,380],[350,388],[350,470]]}', '42e40fd4-04c6-4fea-8cf5-121350bd6741', 0.9),
  ('ac087770-0f15-46d8-88db-3581c14ea5b6', 3, 'Virágok', 'Tarka virágos kert a ház előtt. A virágok között méhek zümmögnek.', '{"type":"polygon","points":[[45,590],[45,475],[160,470],[350,470],[355,395],[400,395],[405,590]]}', 'd1621dea-5eff-45ef-89a7-bf5b9e90b2d5', 0.8);
update projects set visibility = 'gallery' where id = 'ac087770-0f15-46d8-88db-3581c14ea5b6';

insert into projects (id, owner_id, title, author, short_description, image_path, image_width, image_height, background_sound_id, background_volume, is_sample) values ('797b3b36-4310-45db-8ed9-fae3e60dce84', null, 'Tengerpart', 'Kiss Anna', 'Homokos part, hullámok, a távolban egy vitorlás.', 'media/tengerpart.svg', 800, 600, 'b12c0402-8f2b-4010-8d1c-55c2fff62f08', 0.4, false);
insert into project_categories (project_id, category_id) values ('797b3b36-4310-45db-8ed9-fae3e60dce84', 'landscapes');
insert into fields (project_id, sort, name, description, shape, sound_id, volume) values
  ('797b3b36-4310-45db-8ed9-fae3e60dce84', 0, 'Hullámok', 'Kék hullámok gördülnek a part felé, és halkan morajlanak.', '{"type":"polygon","points":[[0,340],[800,340],[800,464],[0,464]]}', '9d3aa78d-cc4b-40c6-83a4-7deeefbe8013', 0.9),
  ('797b3b36-4310-45db-8ed9-fae3e60dce84', 1, 'Sirályok', 'Két sirály repül az ég alján, és vijjogva hívják egymást.', '{"type":"polygon","points":[[480,120],[620,120],[620,220],[480,220]]}', '8e3788b3-af30-453d-8c3a-b3c04bf0b190', 0.8);
update projects set visibility = 'gallery' where id = '797b3b36-4310-45db-8ed9-fae3e60dce84';

insert into projects (id, owner_id, title, author, short_description, image_path, image_width, image_height, background_sound_id, background_volume, is_sample) values ('4b8471c5-2562-4c2d-83a5-f9cb690207a2', null, 'Erdő reggel', 'Nagy Péter', 'Fenyőerdő madarakkal, a fák között patak csobog.', 'media/erdo-reggel.svg', 800, 600, '62dda3aa-ed38-4788-80f4-b589e5c77cfb', 0.4, false);
insert into project_categories (project_id, category_id) values ('4b8471c5-2562-4c2d-83a5-f9cb690207a2', 'landscapes'), ('4b8471c5-2562-4c2d-83a5-f9cb690207a2', 'animals');
insert into fields (project_id, sort, name, description, shape, sound_id, volume) values
  ('4b8471c5-2562-4c2d-83a5-f9cb690207a2', 0, 'Fenyők', 'Három magas fenyőfa áll egymás mellett. A szél zúgva fúj az ágaik között.', '{"type":"polygon","points":[[80,460],[180,240],[240,380],[380,180],[520,420],[600,260],[720,460]]}', 'b5ba0368-5a69-4da6-8b90-c84d63f95857', 0.9),
  ('4b8471c5-2562-4c2d-83a5-f9cb690207a2', 1, 'Patak', 'Kanyargós kis patak folyik a fű között, és csobog.', '{"type":"polygon","points":[[0,500],[800,500],[800,570],[0,570]]}', '86437b9d-3260-4db5-8631-f5f20eeb2554', 0.9),
  ('4b8471c5-2562-4c2d-83a5-f9cb690207a2', 2, 'Madár', 'Egy piros kismadár ül a fa tetején, és reggeli dalt énekel.', '{"type":"polygon","points":[[610,140],[690,140],[690,200],[610,200]]}', 'ab384440-6808-4cfb-8f40-1f5d5d010862', 0.9);
update projects set visibility = 'gallery' where id = '4b8471c5-2562-4c2d-83a5-f9cb690207a2';

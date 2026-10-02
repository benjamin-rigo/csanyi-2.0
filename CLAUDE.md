# Hangösvény (csányi 2.0)

Webes alkalmazás, amelyben pedagógusok képekhez **hangmezőket** (a kép hangos területei) és hangokat társítanak, vak, gyengénlátó és látó gyerekek pedig érintéssel (táblagép) vagy egérrel és billentyűzettel (asztali gép) felfedezik a képet. Van egy nyilvános galéria.

## Mielőtt bármit csinálsz

1. Olvasd el a `docs/dontesnaplo.md`-t. Ez a jóváhagyott döntések listája, minden megvalósítást ezzel kell összevetni. Ha a terv és a napló eltér, a napló az érvényes.
2. A képernyők tervei: `docs/design/README.md` (PNG + HTML képernyőnként).
3. Ha valami nincs eldöntve vagy ellentmond a naplónak, kérdezz, ne találj ki saját megoldást.

## Munkaszabályok

- **Egy téma egyszerre.** Képernyőnként vagy funkciónként haladunk, és mindegyik végén átnézés jön.
- **Ha a kérdés az, hogy „hogyan javítsuk X-et”, az megbeszélést jelent**, nem engedélyt az azonnali megvalósításra. Előbb 2–3 lehetőség, ajánlással, rövid indoklással.
- **Rövid válaszok**, magyarul. Kerüld a gondolatjeleket (—) és a tipikus AI-fordulatokat.
- **Hálózati parancsoknál mondd el, mit csinálsz és miért** (telepítés, push, deploy, API-hívás).
- **Csak ingyenes megoldások.** Fizetős API, havidíjas szolgáltatás nem.
- A `docs/dontesnaplo.md`-t csak jóváhagyott döntéssel frissítsd, ne minden feladat után.

## Stack

- React 19, Vite, TypeScript, react-router 7.
- **HeroUI v3** (`@heroui/react`, `@heroui/styles`, React Aria alapon) és Tailwind 4. Ahol van HeroUI komponens, azt használd, alapértelmezett kinézettel; saját komponens csak ha nincs.
- Backend: **Supabase** (ingyenes csomag, Frankfurt). A böngésző a publikus kulccsal közvetlenül hívja (`.env`, `src/lib/supabase.ts`); a hozzáférést az RLS szabályok védik. A `service_role` kulcs soha nem kerül a repóba.
- Séma: `supabase/migrations/` (időbélyeges fájlnév). Új változás mindig új migrációs fájl, a régit nem írjuk át. Futtatás előtt PGlite-tal helyben kipróbálható. A gyerek oldal a `gallery()` és `shared_project(id)` függvényekből olvas, a `src/lib/data.ts` felülete ugyanaz maradt.
- Deploy: egyelőre **GitHub Pages** (`.github/workflows/deploy.yml`), Vercel most nem. Az alapcímet (`/<repó neve>/`) a workflow adja át `BASE_PATH`-ként; ezért minden fájlra `assetUrl()`-lel (`src/lib/data.ts`) hivatkozz, az adatfájlokban az utak relatívak, a router `basename`-et kap. Közvetlen útvonalakhoz a build `dist/404.html`-t is készít.

## Semmi nincs beégetve

- **Szövegek:** `src/content/hu.json`, a `t('kulcs', {változó})` függvénnyel (`src/lib/i18n.ts`).
- **Adatok:** Supabase. **Beállítások:** `public/data/config.json` (hangerők, időzítések, linkek, jelszó minimális hossza). A `/`-rel kezdődő link az alkalmazáson belüli (a router kezeli).
- **Kinézet:** a HeroUI alap témája; `src/styles/tokens.css` csak a néhány eltérést és az elrendezés tokenjeit tartalmazza. A saját CSS-ben nem lehet nyers px vagy szín, csak token.

## Vizuális szabályok (részletesen a naplóban)

- **HeroUI v3 alapértelmezett megjelenés mindenhol.** Ahol van HeroUI komponens, azt használd, és ne írd felül a kinézetét (szín, méret, lekerekítés, árnyék, állapotok). Gombnak látszó linkhez: `ButtonLink` (`buttonVariants`), szöveges linkhez HeroUI `Link`; a router a react-aria `RouterProvider`-en át kezeli őket.
- A témából csak akadálymentességi okból tér el bármi (`src/styles/tokens.css`, mérve): a HeroUI kékje sötétebben (`--accent`, fehér felirat rajta 5,99:1, rámutatáskor 4,91:1), sötétebb `--muted` és `--danger`. Új eltérés csak így, mérve. Másodlagos gomb: `variant="secondary"` (szürke), `outline` nem.
- Saját CSS (`src/index.css`) csak elrendezés (térköz, rács, oldalszerkezet) és a HeroUI-ban nem létező elemek: képnézet, rajzterület, feltöltő mező, hangmező-színek. A saját színek a HeroUI változóiból jönnek (`--hs-*`).
- Térköz csak a skálából: 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 (`--space-*`).
- Ami átmenetileg nem használható, az letiltva látszik a helyén (HeroUI `isDisabled`, mellette rövid ok), nem tűnik el.
- Betű: egyelőre Inter, saját tárhelyről (`@fontsource-variable/inter`, nem Google Fonts); a végleges párosítás nyitott.

## Akadálymentesség

- Cél: **WCAG 2.2 AA**. Minden képernyő után futtass axe-core ellenőrzést (pl. Playwrighttal), és nézd meg billentyűzettel is.
- A gyerek oldal felolvasós viselkedése (üdvözlés, indító hangjel, hangmezők, emlékeztető, kilépés) pontosan a naplóban van leírva, attól ne térj el. A hangmezők SVG `polygon role="img"` elemek, a fókusz indítja a hangot; az üres rész nem fókuszálható és néma.
- A hang Web Audio API-val szól (`src/lib/audio.ts`). A feloldás a galéria kártyájára koppintáskor történik, mert felolvasóval a képnézetben már nincs koppintás.

## Szerkezet

```
src/
  pages/Gallery.tsx      galéria (1)
  pages/Viewer.tsx       képnézet (2–4)
  pages/teacher/         pedagógus oldal: Login (6), ForgotPassword (6b), NewPassword (6c), AccountSetup (7), MyProjects (8), Editor (11, 11b, 11c, 13), Profile (14)
  components/            SiteHeader (Logo, ButtonLink, SiteFooter), AuthLayout, AuthFields, TeacherLayout, NewProjectModal (10), Icon
  components/editor/     DrawingCanvas (ecset, radír), SoundsPanel (Hangok fül), ProjectPanel (Projekt fül), SharePanel (Megosztás fül), SoundPicker (12), LibraryTab, SoundCard, VoiceRecorder (leíró hang)
  lib/                   data, supabase, teacher, editor (betöltés, automatikus mentés, hangfeltöltés), contour (maszk ↔ sokszög), geometry, i18n, audio, device
  content/hu.json        felületi szövegek
  styles/tokens.css      design tokenek
public/data/config.json      beállítások
public/media, sounds         a kezdő projektek képei és hangjai (az adatbázis relatív úttal hivatkozik rájuk)
supabase/migrations/         adatbázis séma és kezdő adatok
supabase/functions/          Edge Functions: freesound (hangkönyvtár), teacher-account (meghívás, fiók törlése)
supabase/templates/          magyar levélsablonok (meghívó, új jelszó), a Supabase felületére kell bemásolni
docs/dontesnaplo.md      döntésnapló (fő példány)
docs/design/             a képernyők tervei
```

## Állapot (2026-09-30 este)

- Kész: gyerek oldal (galéria + képnézet) Supabase-ből; belépés (6, 6b, 6c, 7); Projektjeim (8), Új projekt (10); Szerkesztő Hangok füle (11, 11b): ecset, radír, nagyítás, visszavonás (Cmd/Ctrl+Z), lefúrós panel rögzített fülsorral, a cím maga a szerkeszthető név; hangválasztó (12): Freesound CC0 automatikus fordítással és továbbtöltéssel, saját feltöltés; leíró hang felvétele; lágy szél. Build rendben, axe 0 hiba (a react-aria saját bejelentő elemén kívül).
- Élő teszt: https://benjamin-rigo.github.io/csanyi-2.0/ (minden main pushra frissül). Élesben lefutott mind az öt migráció, a `freesound` függvény telepítve, a `FREESOUND_API_KEY` titok beállítva (ellenőrizve: „macska” → cat, 7530 találat).
- Új migrációt a Supabase SQL Editorban kell lefuttatni (a GitHub-integráció nem teszi meg); előtte PGlite-tal helyben kipróbálható. Új függvényváltozatot a Supabase felületén kell újratelepíteni (Edge Functions → freesound → Code → Deploy).
- A hangmező alakja `multipolygon` (több rész, lyukak, páros-páratlan kitöltés); a régi `polygon` is érvényes.
- Lágy szél: `fields.edge_softness`; a képnézet `edgeGain` szerint több hangmezőt szólaltat egyszerre (`SceneAudio.setFields`).
- Freesound: `supabase/functions/freesound` (Edge Function, titok: `FREESOUND_API_KEY`); csak CC0, a keresőszót MyMemory fordítja angolra, a kiválasztott hang a saját tárhelyre másolódik.
- Kísérlet folyamatban: töltelék az üres részen (`?mod=kitoltes`, `kitoltes2`, `kitoltes3`); iPaden a „kép” szó eltűnt-e még nem derült ki a szerep-változatokkal.
- Meghívás: a Profilból bármelyik pedagógus (teacher-account függvény, napi 10), vagy Supabase → Authentication → Users → Invite user. **Levélküldés (SMTP) még nincs beállítva**: a beépített küldő csak a projekt tagjainak kézbesít; ez élesítés előtt kell (napló, nyitott témák).
- A `@heroui/styles` most minden komponens stílusát betölti; később csak a használtakat importáljuk. A JS csomag 500 kB fölött van (figyelmeztetés); a pedagógus oldal külön betöltésével csökkenthető.

## Következő lépések

1. A `freesound` függvény csak bejelentkezett pedagógust enged: kész és telepítve (2026-10-01), élesben ellenőrizve (token nélkül és nyilvános kulccsal 401).
2. Projekt fül (11c) és Megosztás (13): kész (2026-10-01). A galériába kerülés feltételeit a kliens (`projectMissing`) és az adatbázis (`project_missing()`) is ellenőrzi; a kettőt együtt kell módosítani.
3. Profil (14) kész (2026-10-02). Következő: Első lépések (9a, 9b), az Új projekt zárolásával.
4. Tesztelni iPaden: lágy szél felolvasó nélkül, leíró hang (gépen felvett m4a lejátszása), töltelék szerep-változatai felolvasóval.
5. Később: Pontok rajzeszköz (WCAG 2.5.7), csippentéses nagyítás érintőképernyőn, visszavonás a festésen túl (törlés, hangcsere, szöveg), SMTP a levelekhez.
- A nyitott témák listája a napló végén.

## Parancsok

```
npm install
npm run dev      # fejlesztői szerver
npm run build    # típusellenőrzés + build
npm run lint
```

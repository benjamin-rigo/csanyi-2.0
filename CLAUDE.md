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
- **HeroUI v3** (`@heroui/react`, `@heroui/styles`, React Aria alapon) és Tailwind 4. Ahol van HeroUI komponens, azt használd, saját komponens csak ha nincs.
- Backend: **Supabase** (ingyenes csomag), még nincs bekötve. A gyerek oldal most a `public/data/*.json` fájlokból olvas; a `src/lib/data.ts` felülete maradjon ugyanaz, amikor Supabase-re váltunk.
- Deploy: Vercel (`vercel.json` kezeli a kliensoldali útvonalakat).

## Semmi nincs beégetve

- **Szövegek:** `src/content/hu.json`, a `t('kulcs', {változó})` függvénnyel (`src/lib/i18n.ts`).
- **Adatok és beállítások:** `public/data/gallery.json`, `public/data/config.json` (hangerők, időzítések, linkek).
- **Kinézet:** `src/styles/tokens.css`. Minden szín, térköz, méret és lekerekítés innen jön, és a HeroUI változói is ide vannak kötve. A komponensek CSS-ében nem lehet nyers px vagy szín, csak token.

## Vizuális szabályok (részletesen a naplóban)

- Térköz csak a skálából: 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 (`--space-*`). 7, 10, 14 és hasonló értékek sehol.
- Lekerekítés: minden kattintható elem és címke pill; minden tartalmat foglaló elem (kártya, mező, listasor, kép, ablak) 12 px.
- Flat, nincs árnyék. Fehér alapon fekete.
- Gombok: a fő gomb tömör fekete, nézetenként egy. A másodlagos háttér nélküli, 2 px fekete kerettel (HeroUI `outline` + felülírás az `index.css`-ben). A ghost gomb keret nélküli. Magasság 36 / 44 / 52 / 60, vízszintes margó 16 / 20 / 24 / 32.
- Fókusz: a HeroUI beépített fókuszgyűrűje (`--focus`). Nem HeroUI elemen ugyanezt a gyűrűt rajzold ugyanezekből a változókból.
- Ami átmenetileg nem használható, az letiltva látszik a helyén (50% átlátszóság, `aria-disabled`, mellette rövid ok), nem tűnik el.
- Betű: egyelőre Inter; a végleges párosítás nyitott.

## Akadálymentesség

- Cél: **WCAG 2.2 AA**. Minden képernyő után futtass axe-core ellenőrzést (pl. Playwrighttal), és nézd meg billentyűzettel is.
- A gyerek oldal felolvasós viselkedése (üdvözlés, indító hangjel, hangmezők, emlékeztető, kilépés) pontosan a naplóban van leírva, attól ne térj el. A hangmezők SVG `polygon role="img"` elemek, a fókusz indítja a hangot; az üres rész nem fókuszálható és néma.
- A hang Web Audio API-val szól (`src/lib/audio.ts`). A feloldás a galéria kártyájára koppintáskor történik, mert felolvasóval a képnézetben már nincs koppintás.

## Szerkezet

```
src/
  pages/Gallery.tsx      galéria (1)
  pages/Viewer.tsx       képnézet (2–4)
  components/            SiteHeader, SiteFooter, Icon
  lib/                   data, i18n, audio, device
  content/hu.json        felületi szövegek
  styles/tokens.css      design tokenek
public/data, media, sounds   ideiglenes adatok, képek, hangok
docs/dontesnaplo.md      döntésnapló (fő példány)
docs/design/             a képernyők tervei
```

## Állapot

- Kész: gyerek oldal (galéria + képnézet), adatfájlból. Build rendben, axe 0 hiba.
- Következő: GitHub + Vercel, tablet teszt felolvasóval (iPad VoiceOver, Android TalkBack), utána a pedagógus oldal (6–14) Supabase-szel.
- A `@heroui/styles` most minden komponens stílusát betölti; később csak a használtakat importáljuk.
- A nyitott témák listája a napló végén.

## Parancsok

```
npm install
npm run dev      # fejlesztői szerver
npm run build    # típusellenőrzés + build
npm run lint
```

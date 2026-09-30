# Tervek (design)

A képernyők a claude.ai-on készült Design vázból vannak exportálva. Minden képernyő kétféleképpen van meg:

- `<Név>.png`: így kell kinéznie.
- `html/<Név>.html`: ugyanez HTML-ben. Innen olvasd ki a pontos értékeket (térköz, méret, szín, szöveg). A váz nem HeroUI-val készült, csak a kinézetet mutatja; a megvalósítás HeroUI v3 komponensekkel és a `src/styles/tokens.css` tokenjeivel történik.

Ha a terv és a `docs/dontesnaplo.md` eltér, a döntésnapló az érvényes.

| Képernyő | Fájl | Méret | Állapot |
|---|---|---|---|
| 1 · Galéria | `Main.png` · `html/Main.html` | 1180×860 | kész (src/pages) |
| 2 · Kép megnyitva | `KepMegnyitas.png` · `html/KepMegnyitas.html` | 1180×820 | kész (src/pages) |
| 3 · Felfedezés | `Kep.png` · `html/Kep.html` | 1180×820 | kész (src/pages) |
| 4 · Asztali gép, billentyűzettel | `KepAsztali.png` · `html/KepAsztali.html` | 1440×900 | kész (src/pages) |
| 6 · Belépés | `Belepes.png` · `html/Belepes.html` | 1440×900 | még nincs |
| 7 · Fiók beállítása (meghívó után) | `Fiok.png` · `html/Fiok.html` | 1440×900 | még nincs |
| 8 · Projektjeim | `Projektjeim.png` · `html/Projektjeim.html` | 1440×900 | még nincs |
| 9a · Első lépések: minta a szerkesztőben | `OnboardingMinta.png` · `html/OnboardingMinta.html` | 1440×900 | még nincs |
| 9b · Első lépések: most te | `Onboarding.png` · `html/Onboarding.html` | 1440×900 | még nincs |
| 10 · Új projekt | `UjProjekt.png` · `html/UjProjekt.html` | 1440×900 | még nincs |
| 11 · Szerkesztő | `Szerkeszto.png` · `html/Szerkeszto.html` | 1440×900 | még nincs |
| 11b · Szerkesztő, háttérhang kijelölve | `SzerkesztoHatter.png` · `html/SzerkesztoHatter.html` | 1440×900 | még nincs |
| 12 · Hang kiválasztása | `Hangvalaszto.png` · `html/Hangvalaszto.html` | 1440×900 | még nincs |
| 13 · Megosztás | `Megosztas.png` · `html/Megosztas.html` | 1440×900 | még nincs |
| 14 · Profil | `Profil.png` · `html/Profil.html` | 1440×900 | még nincs |
| 6b · Elfelejtett jelszó (link elküldve) | `ElfelejtettJelszo.png` · `html/ElfelejtettJelszo.html` | 1440×900 | még nincs |
| 6c · Új jelszó (a levélben kapott linkről) | `UjJelszo.png` · `html/UjJelszo.html` | 1440×900 | még nincs |
| 11c · Szerkesztő, Projekt fül | `SzerkesztoProjekt.png` · `html/SzerkesztoProjekt.html` | 1440×1220 | még nincs |

## Megjegyzések a vázról

**Gyerek oldal (1–4):** táblagép és asztali gép. A felolvasós viselkedés részletei a döntésnapló „Gyerek oldal” szakaszában. Egy eltérés: a vázon lévő jegyzet szerint kategóriaváltáskor a fókusz a listára ugrik, ez visszavont döntés; a fókusz a kategórián marad, a felolvasó csak bemondja: „[Kategória], N kép”.

**Pedagógus oldal (6–14):** asztali gép. Bal oldalsáv + fehér tartalomfelület; a szerkesztő teljes munkaterület, szélhez tapadó panelekkel.

**Első lépések (9a–9b):** 1) a pedagógus megnéz egy kész mintát a szerkesztőben (csak megtekintés, eszköztár letiltva a helyén); 2) „Most te”: ugyanazon a képen újraalkot 1 hangmezőt és a háttérhangot, lépésenként. Kötelező; a „Később folytatom” a Projektjeim oldalra visz, az Új projekt addig nem aktív.

**Helykitöltő kép:** Reich Károly, „A macskának négy a lába”. Jogvédett: élesítés előtt engedély kell, vagy csere.

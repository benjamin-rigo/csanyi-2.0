# csányi 2.0 · Döntésnapló

Csak a Benjámin által jóváhagyott döntések. Minden javaslat és minden megvalósítás előtt ezzel kell összevetni. Ez a fő példány; új döntés csak Benjámin jóváhagyásával kerülhet bele.

## Alapok
- Cél: pedagógusok képekhez hangmezőket és hangokat társítanak; vak és gyengénlátó (és látó) gyerekek felfedezik a képet.
- Terminológia: a kép hangos területe a felületen „hangmező” (nem „zóna”). A gyerekek ezt a szót nem hallják.
- Eszközök: táblagép (érintés) és asztali gép (egér, billentyűzet) egyenrangú.
- Csak web, natív burok nincs.
- Stack: Supabase; HeroUI v3 mindkét oldalon, fehér alapon fekete.
- Supabase ingyenes csomag: időnkénti ping, hogy ne álljon le (később).
- Csak ingyenes megoldások (fizetős API, havidíj nem).
- Kód helye: új mappa a gép Code mappájában (csanyi-2.0, GitHub: benjamin-rigo/csanyi-2.0), innen egyelőre GitHub Pagesre a teszthez (Vercel most nem). Semmi nincs a kódba égetve: szövegek, adatok és tokenek külön fájlban.

## Vizuális rendszer (tokenek)
- **2026-10-01: Megjelenés a HeroUI v3 alapértelmezett témája és komponensei, mindenhol** (gyerek és pedagógus oldal). Eltérés csak a WCAG 2.2 AA miatt: a HeroUI kékje ugyanabban az árnyalatban sötétebb (fehér felirat rajta 5,99:1 a 3,68 helyett, rámutatáskor is 4,91:1; ez a fókuszgyűrű is), sötétebb halvány szöveg (`--muted`) és piros (`--danger`). Másodlagos gomb: a HeroUI szürke `secondary` változata (keretes `outline` nem). Az alap betűméret a HeroUI 16 px-e. A logó jele fekete marad (márkajel, nem HeroUI-elem). A saját elemek is HeroUI komponensek (Card, ListBox, Chip, Avatar, Breadcrumbs, Toolbar, EmptyState, Alert), így a rámutatás, lenyomás és fókusz mindenhol egységes. Saját CSS csak az elrendezéshez és a HeroUI-ban nem létező elemekhez (képnézet, rajzterület, feltöltő mező). Az alábbi részletek közül a térközskála és a letiltott elemek szabálya marad érvényes; a gombok, mezők, címkék, lekerekítés és árnyék szabályait a HeroUI alap váltotta.
- Szellős oldalak, hangsúlyos gombok, szigorú konzisztencia. Semmi nincs beégetve: minden érték tokenből jön.
- Lekerekítés két szabállyal: minden kattintható elem és címke kerek (pill): gombok, címkék, fülek, szűrők, navigáció, eszköztár. Minden tartalmat foglaló elem 12 px: kártyák, mezők, listasorok, képek, ablakok.
- Flat: nincs árnyék. Elválasztás jó kontrasztú kitöltéssel (szürke háttér, fehér felületek); mezők halványszürke kitöltéssel; listában kijelölés háttérszínnel. Vonal szerkezeti elválasztóként (panelek, lábléc).
- Gombok: fő gomb tömör fekete; másodlagos gomb háttér nélkül, 2 px fekete kerettel; szöveges (ghost) gomb keret nélkül. Méret: 36 / 44 / 52 / 60 px, vízszintes margó 16 / 20 / 24 / 32.
- Billentyűzetes fókusz: egyelőre a HeroUI beépített fókuszjelzése, egy tokenben, hogy egy helyen cserélhető legyen. Élőben, a prototípuson nézzük meg újra. Nem tetszett: fekete gyűrű, kék gyűrű, kéttónusú gyűrű, sárga-fekete (GOV.UK), inverz kitöltés, aláhúzás.
- Affordancia szöveg helyett (pedagógus felület): hozzáadás vagy feltöltés helye szaggatott keretes mező „+” jellel; megnyitható listasor a végén nyíllal.
- Címkék (tagek) és szűrők kitöltöttek; szürke háttéren fehérek, hogy ne olvadjanak bele. Címke: magasság 24, oldalmargó 12 (pill).
- Mezők 44 px, belső margó --field-pad-x = space-4 (16). Mezőcímke és segítő szöveg behúzása --label-inset = space-2 (8). Csúszkánál nincs behúzás.
- Letiltott elem: ugyanaz a stílus 50% átlátszósággal, aria-disabled, mellette rövid ok. Gombot nem tiltunk le csak azért, mert hiányzik valami: a gomb megmutatja, mi hiányzik.
- Keresés: egyelőre sehol (galéria, Projektjeim); sok tartalomnál visszajöhet, visszafogottan.
- „Több betöltése” gomb csak egy bizonyos darabszám fölött jelenik meg.
- Térköz: csak a konvencionális skála, tokenként (--space-*): 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64. Más érték (7, 10, 14 stb.) sehol. Kártya belső margó 16, mezők között 24, címke és mező 8, rácsok 24, szakaszok között 48–64. Oldalmargó: gyerek oldal 64, pedagógus tartalom 48.
- Hangsúly: egy nézetben egy fő (fekete) gomb. Aktív eszköz és kiválasztott címke a pedagógus oldalon: 2 px fekete keret, nem fekete kitöltés.
- Stabil elrendezés: ami átmenetileg nem használható, azt letiltjuk (halványítva, aria-disabled), nem rejtjük el; minden a megszokott helyén marad.
- Pedagógus oldal: bal oldalsáv + fehér tartalomfelület. Szerkesztő: teljes munkaterület, szélhez tapadó panelek. Vissza/morzsamenü mindenhol a cím fölött, balra (belépési oldalakon is).
- Mentés: automatikus; a szerkesztő fejlécében jobbra, a gombok mellett „Automatikusan mentve” (felhő ikon). A mintában nincs.
- Betű: nincs eldöntve, parkolva; addig Inter. Szempont: teljes magyar ékezetkészlet (ő, ű), gyengénlátó-barát szövegtörzs, mégis legyen stílusa. Nem tetszett: Fraunces, Young Serif, Literata + Atkinson Hyperlegible Next / Lexend. Lustria + Lato tetszik, de mindkettőből hiányzik az ő/ű (Lustria kiegészíthető, Lato 2.0 saját tárhelyről).

## Pedagógus oldal
- Regisztráció egyelőre meghívásos. Bármelyik pedagógus meghívhat kollégát a Profilból (2026-10-02): naponta legfeljebb 10 meghívó, naplózva, ki kit hívott meg; a meghívó levélben szerepel a meghívó neve. A fiók törlése a projekteket, képeket és hangokat is törli.
- Belépés: e-mail és jelszó (megjelenítés gomb, „Elfelejtetted a jelszavad?”, „Maradjak bejelentkezve”). Meghívó után fiók beállítása: e-mail (a meghívóból), név, jelszó, ÁSZF. Elfelejtett jelszó: link e-mailben, a válasz nem árulja el, létezik-e a fiók; új jelszó egy mezővel.
- Social login: egyelőre nincs. Előbb megkérdezzük az intézményt, milyen fiókot használnak (Vakok Iskolája: Gmail/Outlook, Teams/Classroom is). Ha Google: ingyenes (Supabase free), kb. fél nap beállítás; a meghívott e-mailnek egyeznie kell.
- Onboarding: kötelező. 1) Kész minta megnyitása a szerkesztőben (csak megtekintés): háttérhang, hangmezők, nevek, leírások, hangok. 2) „Most te”: ugyanazon a képen újraalkot 1 hangmezőt és a háttérhangot, lépésenként; a minta bármikor megnyitható. „Később folytatom” a Projektjeim oldalra visz; az Új projekt addig nem aktív.
- Mintakép (helykitöltő): Reich Károly, „A macskának négy a lába”. Hangmezők: Macska, Ház (gyakorló hangmező), Madarak, Virágok; háttérhang: esti tücskök. Jogvédett, élesítés előtt engedély kell vagy csere.
- Minta nézet: eszköztár a helyén, letiltva; fejlécben a Megosztás helyén „Csak megtekintés” címke. A „Most te jössz” normál fő gomb az aktuális lépésben.
- Megosztás: Privát / Linkkel elérhető / Galériában. A link a publikus kép nézetre visz, ugyanarra, ami a galériából nyílik. A link bármikor működik, hiányzó adat mellett is.
- Galériába (nyilvánosba) csak akkor kerülhet, ha minden kötelező megvan: kép, cím, kép rövid leírása, háttérhang, legalább egy hangmező, minden hangmezőnek neve, leírása és hangja. Addig a „Galériában is” opció letiltva látszik, alatta a hiányzó tételek listája, mindegyik odavisz, ahol pótolni lehet. A Megosztás gomb mindig kattintható.
- Hangmező mezői: Név (a hangmezők listájában és a feliratban látszik, 1–2 szó); Leírás (ezt mondja el a felolvasó érintéskor; egy-két rövid mondat, a legfontosabb szóval kezdve). A hangmező helyét a képen a pedagógus írja bele a leírásba (pl. „Fent, a tetőn…”), a szerkesztő segítő szövege erre emlékeztet; automatikus hely-előtag nincs.
- Hangkönyvtár: Freesound, csak CC0 hangok. A keresés egy Supabase függvényen át megy (a kulcs titokként a Supabase-ben, a böngésző nem látja). A kiválasztott hangot a saját tárhelyünkre másoljuk, a Freesound azonosítóval és a szerzővel. A keresés a hangmező nevével indul. A keresőszót a függvény automatikusan angolra fordítja (MyMemory, ingyenes, kulcs nélkül), mert a hangok címkéi angolok; ha a fordítással nincs találat, az eredetivel keres. A felület kiírja, mire keresett.
- Szerkesztő panel fülei: Projekt / Hangok / Megosztás. A Hangok fül tetején a Háttérhang (kötelező) rögzített sorként, alatta a hangmezők. Üresen: „+ Háttérhang hozzáadása” mező, alatta: „Minden képhez kell háttérhang: végig szól, így a gyerek mindig hall valamit.”
- Projekt fül (11c): Cím; Kép (előnézet + Csere); Rövid leírás (a galéria kártyáján látszik és a felolvasó is felolvassa); Alkotó (nem kötelező; a galéria kártyáján és a felolvasónál: „[Alkotó] alkotása”, üresen nem jelenik meg); Téma; legalul külön blokkban Projekt törlése. A Bevezető mező kimarad (2026-10-01).
- Téma = a galéria kategóriái (2026-10-01): a pedagógus ezek közül választ, többet is; új kategóriát nem hoz létre, a listát az adatbázisban bővítjük, moderálva.
- Előnézet gomb: a kép nézetet nyitja meg.
- Hangmező rajzolása: Ecset és Radír (a terv szerint), mentéskor körvonallá (sokszöggé) alakítva, így a kép nézet nem változik. A húzás nélküli „Pontok” eszköz (WCAG 2.5.7) a következő körben.
- Leíró hang a szerkesztőben: a hangmező panelén a Leírás alatt; Felvétel (mikrofonnal, a böngészőben) vagy Feltöltés, visszajátszás, törlés.
- Új projekt: az Első lépések befejezéséig letiltva látszik („Az első lépések után elérhető”); 2026-10-02 óta be van kapcsolva.

## Gyerek oldal
- Gyerek flow: galéria → kép nézet. Nincs külön leírás oldal (látó gyerekeknek sem).
- Nincs külön bevezetés, bemutató vagy gyakorló kép. A gyerek csinálva tanul.
- Galéria: a fejléc egyben bevezető: „Üdvözöllek a Hangösvény galériájában! Ezen az oldalon képek hangjait fedezheted fel. Válassz egy kategóriát, hogy milyen képet szeretnél felfedezni.” Utána kategóriák (Összes kép, Híres képek, Állatos képek, Tájképek; ikonnal), a sor jobb szélén a képek száma. Kategória választásakor a fókusz a kategórián marad, a felolvasó csak bemondja: „[Kategória], N kép” (WCAG 3.2.2).
- Galéria kártya: a teljes kép levágás nélkül, alatta cím, rövid leírás, kisebben alkotó és hangmezők száma. Az egész kártya egy link a kép nézetre, más művelet nincs rajta (nincs előhallgatás). Felolvasóval: „[Cím], link”, szünet, „[Alkotó] alkotása. [Rövid leírás]”. Nincs „Legutóbb megnyitott”, nincs keresés.
- Táblagépen felolvasóval húzással lép elemről elemre, asztali gépen Tabbal.
- A kép felfedezése teljes képernyőn történik; a hangkép és a belemerülés a lényeg.
- A simogatás minden esetben megmarad. Weben a VoiceOver érintéskezelése nem írható felül (a hangmezőkre ugrik, az üres részen saját hangot ad), ezért érintős eszközön az üdvözlés azt javasolja, hogy a felfedezés idejére kapcsolja ki a felolvasót. Kikapcsolt felolvasónál a hangmező felvett leíró hangja szól.
- Megnyitáskor a gyerek saját felolvasója egyszer ezt mondja: „Szuper, megnyitottad [Cím] című képet! [Érintős eszközön: A legjobb élményhez kapcsold ki a felolvasót, amíg felfedezed a képet.] Tartsd az ujjad a képen, és keresd meg a hangokat. Kilépni [eszköztől függő mozdulat] tudsz.” (iPad: két ujjal Z; Android: vissza mozdulat; gép: Esc). Nincs átugrás gomb: ha a gyerek hozzáér a képernyőhöz, a felolvasó magától elhallgat. Látó gyereknek ugyanez rövid feliratként, ami az első érintéskor eltűnik.
- A háttérhang nem magától indul: a gyerek első érintésére (vagy első billentyűjére) szól az indító hangjel („pitty, pitty, pitty”), és lassan beúszik a háttérhang. Így gomb nélkül is teljesül a WCAG 1.4.2, és az üdvözlés csendben hangzik el. A hangjel nem beszéd, ez rendben van a „nincs saját app hang” szabállyal.
- Háttérhang: kötelező. Végig szól, hangmező megszólalásakor kicsit lehalkul, kilépéskor elhalkul. Nincs szünet- vagy némító gomb.
- Csak a hangmezők aktívak. Az üres rész nem aktív elem: nem fókuszálható, a felolvasó nem mond rá semmit; ott csak a háttérhang szól. Tesztelni kell, hogy a képet tartalmazó elem ne kapjon fókuszt és címkét simogatáskor.
- Leíró hang: a pedagógus minden hangmezőhöz feltölthet vagy felvehet egy hangos leírást. Érintésre vagy egérrel szól (felolvasóval ilyenkor az érintés nem jut el az oldalig, így nem beszélnek egymásra); végigszól akkor is, ha az ujj lecsúszik a hangmezőről, másik hangmezőn elhallgat. Saját gépi beszéd nincs.
- Lágy szél (felolvasó nélkül): hangmezőnként „Él lágysága” (0–100%, alapból 30%). A hang a hangmező szélétől befelé fokozatosan erősödik; teljes lágyságnál a sáv a kép rövidebb oldalának 8%-a. Az egymást fedő hangmezők egyszerre, a saját erősségükön szólnak, a háttérhang a legerősebb szerint halkul. Felirat és leíró hang 50% erősségtől. Felolvasóval és billentyűzettel a fókuszált hangmező teljes erővel szól. (Később: festett erősség, lágy ecset, ha a pedagógusoknak kell.)
- Hangmező érintésre a felolvasó rögtön a teljes leírást mondja (pl. „Egy nagy cica áll a tetőn, akkora, mint a ház. Kedvesen néz rád, és dorombol.”), a hangmező hangja közben alatta szól. Nincs név- vagy szerepelőtag. Látó gyereknek felirat: név + leírás.
- Emlékeztető: ha kb. 15 mp-ig nem talál hangmezőt, a felolvasó: „Keresd meg az ujjaddal a hangokat.” Legfeljebb kétszer, az első megtalált hangmező után soha. Felolvasó nélkül ugyanez feliratként.
- Kilépés: a megszokott vissza mozdulat (VoiceOver kétujjas Z, Android vissza, Escape), mert a kép megnyitása valódi oldalváltás; plusz „Vissza” gomb az oldal első elemeként, a galériába visz.

## Visszavont döntések
- Bevezető mező a Projekt fülön: kiesett, mert nincs helye (a leírás oldal kiesett), és a gyerek csinálva tanul.
- Külön témalista (Természet, Állatok, Város, Közlekedés, Zene): lecserélve a galéria kategóriáira.
- Fekete kiemelőszín a HeroUI témában (2026-10-01 délelőtt): lecserélve a HeroUI kékre, mert feketével a kiválasztott elemek (eszközválasztó, csúszka) szürke a szürkén hatottak.
- Saját vizuális rendszer (pill gombok, háttér nélküli 2 px fekete keretes másodlagos gomb, flat árnyék nélkül, 12 px lekerekítés, 36/44/52/60 gombmagasság, kitöltött mezők, szaggatott „+” hozzáadó mezők, aktív eszköz fekete kerettel): lecserélve a HeroUI alapra, mert a sok felülírás szétesett, és eltüntette a rámutatás és lenyomás jelzését.
- „Zóna” elnevezés: lecserélve „hangmező”-re („hangos mező” ütközött volna a beviteli mezőkkel).
- „Mind” kategória: átnevezve „Összes kép”-re.
- Előhallgatás gomb a galéria kártyáin: kiesett.
- Rövid leírás csak a felolvasónak: most a kártyán is látszik.
- Megosztás (link is) csak teljes adatokkal: lecserélve, csak a galériába kerüléshez kell minden.
- „Háttérhang szünet” gomb a kép nézetben: nem kell; helyette a háttérhang az első érintésre indul.
- Kategóriaváltáskor a fókusz a listára ugrik: lecserélve, a fókusz a kategórián marad.
- Felolvasós kérdés és a felolvasó kikapcsoltatása: kiesett, mert a felolvasó bekapcsolva marad. Részben felülírva: az üdvözlés javasolja a kikapcsolást a felfedezés idejére (kérdés nincs).
- „A felolvasó bekapcsolva marad, nem kérjük a kikapcsolását”: felülírva, lásd fent.
- Közvetlen érintés (`role="application"`): iPadOS-en (Safari, Chrome) nem működik, a VoiceOver nem engedi át az érintést a weboldalnak.
- Saját hangos útmutató átugrással, saját menü és gesztusok: kiesett, a felolvasó saját működése váltja ki.
- Gyerek bevezetés (lépésenkénti bemutató, gyakorló kép, tanári tipp): nem kell.
- Külön leírás oldal (Intro): kiesett, a rövid leírás a galéria kártyáján van.
- „Az útmutató nem szól a kilépésről”: felülírva, a megnyitó üzenet megmondja az eszköznek megfelelő kilépő mozdulatot.
- „[Név], zóna” + késleltetett leírás: lecserélve rögtön a teljes leírásra.
- „Dupla koppintással átugorhatod”: kiesett, mert felolvasóval a dupla koppintás a kiválasztás.
- „Üres” bemondás az üres részen és „Kép, N zóna” képcímke: kiesett, csak a hangmezők aktívak.
- Nem kötelező háttérhang: lecserélve kötelezőre.
- Skálán kívüli térközök (7, 10, 14, 28, 80 px), számolt fél-behúzás: lecserélve a skála tokenjeire.
- 8 px-es szögletes gombok és címkék: visszaállítva kerekre.
- Keretes kártyák és mezők: lecserélve kitöltésre. Árnyékok: lecserélve flatre.
- Szürke kitöltésű másodlagos gombok és szürke aktív eszköz: inaktívnak hatott. Előbb fehér kitöltés szürke kerettel, végül háttér nélküli, 2 px fekete keret.
- Galéria: nagy hero cím, levágott képek, nagy „Belehallgatás” gomb, kereső, „Legutóbb megnyitott” sor, „Több kép betöltése”: mind kikerült.
- Onboarding 8 lépéses gyakorló projekt minta nélkül: lecserélve a „minta, aztán most te” menetre.
- Minta nézetben elrejtett eszköztár és banner a helyén: lecserélve letiltott eszköztárra.
- Jelszó nélküli belépés (e-mailes link): lecserélve e-mail + jelszóra.
- Mintakép jelöltek: Bruegel (vadászat, sötét), Chagall (jogvédett 2055-ig) kiesett.

## Állapot
- A váz 18 képernyővel a fenti tokenekkel (a leírás oldal kikerült).
- WCAG 2.2 AA ellenőrzés lefutott (axe-core 4.13 + kézi). Automatikusan 0 valódi hiba. Elfogadva: háttérhang első érintésre, fókusz a kategórián marad. Most nem kell: kiválasztott állapot fekete kerete, mezők alsó vonala. Fejlesztési feladat: keskeny képernyőn egy oszlop (1.4.10).
- Építés: a gyerek oldal (galéria + kép nézet) frontendje kész, backend nélkül, adatfájlból (Code/csanyi-2.0). React + Vite + HeroUI v3 + Tailwind 4. Build rendben, axe 0 hiba (galéria, kép nézet), keskeny képernyőn egy oszlop. Következő: GitHub Pages deploy, majd táblagépes teszt.

## Nyitott témák (sorrendben)
- Levélküldés (SMTP): a Supabase beépített küldője csak a projekt tagjainak és óránként 2–3 levelet küld, ezért a kollégák meghívója és az elfelejtett jelszó levele élesben nem érkezik meg. Kell egy ingyenes SMTP (pl. Gmail alkalmazásjelszóval vagy Brevo; saját domainnel megbízhatóbb). Addig az e-mail cím módosítása is letiltva.
0. Töltelék kísérlet (`?mod=kitoltes`): néma elem az üres részen, hogy a VoiceOver ne ugorjon a hangmezőkre. Kilépés kikapcsolt felolvasónál (a kétujjas Z csak VoiceOverrel működik). Kötelező-e a leíró hang a galériához.
1. A felolvasós simogatás tesztje táblagépen (iPad, Android): kétujjas Z kilépés, az üres rész valóban néma marad-e, a teljes leírás és a hangmező hangja együtt jól hallható-e, az emlékeztető nem zavaró-e.
2. WCAG a pedagógus oldalon: „Pontok” rajzolóeszköz húzás nélkül (2.5.7); a kiválasztott állapot és a mezőhatárok kontrasztja (1.4.11).
3. Billentyűzetes fókusz: élőben újranézni a prototípuson.
4. Címkézés (tagek) és kategóriák: a Téma már a galéria kategóriáiból választ; hogyan bővüljön a lista skálázhatóan, mégis moderáltan, még nyitott.
6. Jogok: a Reich-kép engedélye (HUNGART vagy örökösök; szóba jöhet az Szjt. oktatási és fogyatékos személyek javára szóló kivétele, jogi ellenőrzés kell).
7. Jogok: a pedagógusok által feltöltött képek és hangok legyenek jogtiszták (feltöltéskor nyilatkozat, ÁSZF, a hangkönyvtár csak CC0).
8. Később: „Kijelölés kattintással” eszköz a szerkesztőben (SlimSAM a böngészőben, Transformers.js, ingyenes, a modell csak első használatkor töltődik le). Egyelőre parkolva.
9. Galéria: sok képnél átállás kategóriánkénti sorokra (B irány).
10. Betűk: párosítás kiválasztása és akadálymentességi vizsgálat gyengénlátóknak (betűformák megkülönböztethetősége, x-magasság, minimum méret, súly, sorköz, ékezetek).

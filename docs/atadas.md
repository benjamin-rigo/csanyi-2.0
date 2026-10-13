# Átadás

A Hangösvény a Csányi Alapítványé lesz. Ez a lista mutatja, mely fiókok, kulcsok és beállítások vannak most a fejlesztőnél, és mit kell átállítani az alapítvány saját fiókjaira. Fejlesztés közben folyamatosan bővül; minden új külső szolgáltatás ide is bekerül.

Jelölés: **most** = jelenlegi állapot, **átadáskor** = teendő.

## 1. Kód és közzététel

- **GitHub repó:** most `benjamin-rigo/csanyi-2.0`. Átadáskor: átruházás az alapítvány GitHub szervezetére (Settings → Transfer ownership), vagy ők forkolják.
- **Weboldal:** most GitHub Pages, `https://benjamin-rigo.github.io/csanyi-2.0/`, minden `main` pushra frissül (`.github/workflows/deploy.yml`). Átadáskor a repó átruházásával a cím is megváltozik.
- **Domain:** most nincs. Átadáskor saját domain (pl. az alapítványé) beállítása a GitHub Pages-en (Settings → Pages → Custom domain), és a `BASE_PATH` módosítása a workflow-ban (domainen `/`).

## 2. Supabase (adatbázis, belépés, tárhely, függvények)

- **Projekt:** most `uoxnxdedsxnipirhcqin` (Frankfurt, ingyenes csomag), a fejlesztő szervezetében. Átadáskor: a projekt átvihető másik szervezetbe (Project Settings → General → Transfer project), vagy az alapítvány tagként bekerül a mostaniba, és tulajdonossá válik.
- **Kulcsok:** a projekt címe és publikus kulcsa a repóban lévő `.env`-ben van (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`; nyilvános, a böngésző használja). A `service_role` kulcs csak a Supabase-ben van, a repóban soha. Új projektnél a `.env`-et kell átírni.
- **Titkok az Edge Functions-ben** (Edge Functions → Secrets):
  - `FREESOUND_API_KEY`: a hangkönyvtárhoz (lásd 4.).
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`: ezeket a Supabase magától adja.
- **Függvények:** `freesound`, `teacher-account` (`supabase/functions/`). Új projektnél újra kell telepíteni őket.
- **Adatbázis séma:** `supabase/migrations/`, időrendben lefuttatva egy új projektben is felépíti az egészet.
- **Auth beállítások:** Site URL és Redirect URLs a weboldal címére (domainváltáskor frissíteni). Levélsablonok: `supabase/templates/` (Authentication → Emails → Templates).
- **MCP kapcsolat (fejlesztői eszköz):** `.mcp.json` a projekt azonosítójával; új projektnél átírni vagy törölni.

## 3. Levélküldés (SMTP)

- **Most:** nincs beállítva. A Supabase beépített küldője csak a projekt tagjainak kézbesít, óránként néhány levelet, ezért a meghívók és az elfelejtett jelszó levelei másnak nem érkeznek meg.
- **Átadáskor (az átvevő dönti el):** saját SMTP a Supabase-ben (Authentication → Emails → SMTP Settings). Ingyenes lehetőségek: Gmail alkalmazásjelszóval (napi kb. 500, domain nélkül), Brevo (napi 300) vagy Resend (napi 100, domain kell); saját domainnel megbízhatóbb a kézbesítés. Utána: a magyar levélsablonok bemásolása (`supabase/templates/`, Authentication → Emails → Templates), az óránkénti levélkorlát emelése (Authentication → Rate Limits), és az e-mail cím módosításának engedélyezése a Profilban.

## 4. Külső szolgáltatások

- **Freesound** (CC0 hangkönyvtár): most a fejlesztő Freesound fiókjának API kulcsa. Átadáskor: az alapítvány saját fiókot és kulcsot kér (freesound.org/apiv2/apply), és átírja a `FREESOUND_API_KEY` titkot.
- **MyMemory** (keresőszó fordítása angolra): fiók és kulcs nélkül működik.

## 5. Tartalom és jogok

- **Mintakép:** Reich Károly, „A macskának négy a lába”. Jogvédett, átadás vagy nyilvános indulás előtt engedély kell, vagy csere (döntésnapló, nyitott témák). Cseréje: új mintaprojekt, és `public/data/config.json` → `onboarding.sampleProjectId`.
- **Kezdő projektek** képei és hangjai: `public/media`, `public/sounds`.

## 6. Beállítások

- `public/data/config.json`: hangerők, időzítések, linkek (pl. ÁSZF), jelszó minimális hossza, a mintaprojekt azonosítója.
- Felületi szövegek: `src/content/hu.json`.

## 7. Pedagógus fiókok

- Az első pedagógust a Supabase felületén kell meghívni (Authentication → Users → Invite user), utána bárki meghívhat kollégát a Profilból (napi 10).

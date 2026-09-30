# Hangösvény (csányi 2.0) – gyerek oldal

Galéria és képnézet. React 19 + Vite + HeroUI v3 + Tailwind 4. Backend még nincs: minden adat JSON fájlokból jön.

## Futtatás

```
npm install
npm run dev
```

## Hol mi van

- `public/data/gallery.json` – kategóriák és képek (hangmezők pontjai a kép saját pixelkoordinátáiban)
- `public/data/config.json` – kapcsolat, linkek, a képnézet hang- és időzítési beállításai
- `src/content/hu.json` – minden felületi szöveg
- `src/styles/tokens.css` – színek, térközök, méretek; a HeroUI változói is ide vannak kötve
- `public/sounds`, `public/media` – ideiglenes hangok és képek

## Deploy

GitHub Pages, a `.github/workflows/deploy.yml` workflow-val: minden `main` pushra buildel és kitesz. A repó nevét alapcímként adja át (`BASE_PATH`), a build a `404.html`-be is bemásolja az appot, így a `/kep/...` címek frissítéskor is működnek. Egyszeri beállítás: a repó Settings → Pages → Source: **GitHub Actions**. Ingyenes fiókkal a Pages csak nyilvános repóval működik.

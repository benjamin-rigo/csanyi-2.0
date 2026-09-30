// Freesound keresés a hangválasztónak (12). A kulcs titokként a Supabase-ben van (FREESOUND_API_KEY),
// a böngésző nem látja. Csak bejelentkezett pedagógus hívhatja (a Supabase ellenőrzi a belépést).
// Csak CC0 (Creative Commons 0) hangokat adunk vissza (döntésnapló).
// A Freesound címkéi szinte mind angolok, ezért a keresőszót előbb angolra fordítjuk (MyMemory, ingyenes, kulcs nélkül).

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PAGE_SIZE = 15;

type Result = { id: number; name: string; duration: number; username: string; previews: Record<string, string> };

// A függvény egy példánya több kérést is kiszolgál: ugyanazt a szót nem fordítjuk újra.
const translations = new Map<string, string>();

async function toEnglish(text: string): Promise<string> {
  const key = text.toLowerCase();
  const cached = translations.get(key);
  if (cached) return cached;
  try {
    const url = new URL('https://api.mymemory.translated.net/get');
    url.searchParams.set('q', text);
    url.searchParams.set('langpair', 'hu|en');
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    const translated = String(data?.responseData?.translatedText ?? '').trim();
    // Hibánál (pl. elfogyott a napi keret) a MyMemory is 200-at ad, a hibát a responseStatus jelzi: ilyenkor az eredetivel keresünk.
    const result = res.ok && Number(data?.responseStatus) === 200 && translated ? translated : text;
    translations.set(key, result);
    return result;
  } catch {
    return text;
  }
}

async function search(query: string, page: number, key: string) {
  const url = new URL('https://freesound.org/apiv2/search/text/');
  url.searchParams.set('query', query);
  url.searchParams.set('filter', 'license:"Creative Commons 0"');
  url.searchParams.set('fields', 'id,name,duration,previews,username');
  url.searchParams.set('page_size', String(PAGE_SIZE));
  url.searchParams.set('page', String(page));
  url.searchParams.set('token', key);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`freesound ${res.status}`);
  return (await res.json()) as { count: number; next: string | null; results: Result[] };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const key = Deno.env.get('FREESOUND_API_KEY');
  if (!key) return Response.json({ error: 'missing_key' }, { status: 500, headers: cors });

  const { query, page = 1 } = await req.json().catch(() => ({}));
  if (typeof query !== 'string' || !query.trim()) return Response.json({ count: 0, results: [], next: false }, { headers: cors });

  const original = query.trim().slice(0, 100);
  const pageNo = Math.max(1, Math.min(50, Number(page) || 1));
  let used = original;
  let data;
  try {
    const english = await toEnglish(original);
    if (english.toLowerCase() !== original.toLowerCase()) {
      data = await search(english, pageNo, key);
      used = english;
    }
    // Ha a szó eleve angol volt, vagy a fordítással nincs találat, az eredetivel keresünk.
    if (!data || (data.count === 0 && pageNo === 1)) {
      data = await search(original, pageNo, key);
      used = original;
    }
  } catch {
    return Response.json({ error: 'freesound' }, { status: 502, headers: cors });
  }
  return Response.json(
    {
      count: data.count,
      next: Boolean(data.next),
      searchedFor: used,
      results: data.results.map((r) => ({
        id: r.id,
        name: r.name,
        durationMs: Math.round(r.duration * 1000),
        username: r.username,
        preview: r.previews['preview-hq-mp3'],
      })),
    },
    { headers: cors },
  );
});

// Freesound keresés a hangválasztónak (12). A kulcs titokként a Supabase-ben van (FREESOUND_API_KEY),
// a böngésző nem látja. Csak bejelentkezett pedagógus hívhatja (a Supabase ellenőrzi a belépést).
// Csak CC0 (Creative Commons 0) hangokat adunk vissza (döntésnapló).

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const PAGE_SIZE = 15;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const key = Deno.env.get('FREESOUND_API_KEY');
  if (!key) return Response.json({ error: 'missing_key' }, { status: 500, headers: cors });

  const { query, page = 1 } = await req.json().catch(() => ({}));
  if (typeof query !== 'string' || !query.trim()) return Response.json({ count: 0, results: [], next: false }, { headers: cors });

  const url = new URL('https://freesound.org/apiv2/search/text/');
  url.searchParams.set('query', query.trim().slice(0, 100));
  url.searchParams.set('filter', 'license:"Creative Commons 0"');
  url.searchParams.set('fields', 'id,name,duration,previews,username');
  url.searchParams.set('page_size', String(PAGE_SIZE));
  url.searchParams.set('page', String(Math.max(1, Math.min(50, Number(page) || 1))));
  url.searchParams.set('token', key);

  const res = await fetch(url);
  if (!res.ok) return Response.json({ error: 'freesound', status: res.status }, { status: 502, headers: cors });
  const data = await res.json();
  return Response.json(
    {
      count: data.count,
      next: Boolean(data.next),
      results: data.results.map((r: { id: number; name: string; duration: number; username: string; previews: Record<string, string> }) => ({
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

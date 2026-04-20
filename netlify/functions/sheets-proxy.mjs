export default async (req) => {
  const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTV0IUJNvYzi8Pl5Li-CldUt9WzT3rhzUl09SdtHLnKF047FUgLuNhG-coku6YaXE4i1kh3l_PHFP9F/pub?gid=1621047425&single=true&output=csv';

  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`Google returned ${resp.status}`);
    const csv = await resp.text();

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Cache-Control': 'public, max-age=120',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

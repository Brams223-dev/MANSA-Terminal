export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q, category, pageSize } = req.query;
  const key = process.env.NEWS_API_KEY || '9f292efc16a5436c8d05a4dc692fe773';

  try {
    const query = q || 'forex OR trading OR "gold" OR "bitcoin" OR "S&P 500" OR "Federal Reserve" OR "BCE"';
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=fr&sortBy=publishedAt&pageSize=${pageSize||10}&apiKey=${key}`;

    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

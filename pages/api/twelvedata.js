export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { symbol, interval, outputsize, type } = req.query;
  const key = process.env.TWELVE_DATA_KEY || 'cc40ac364971462daf811687c97c4e5d';

  try {
    let url = '';
    if (type === 'price') {
      url = `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${key}`;
    } else if (type === 'quote') {
      url = `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${key}`;
    } else if (type === 'time_series') {
      url = `https://api.twelvedata.com/time_series?symbol=${symbol}&interval=${interval||'1h'}&outputsize=${outputsize||30}&apikey=${key}`;
    } else if (type === 'forex_pairs') {
      url = `https://api.twelvedata.com/forex_pairs?apikey=${key}`;
    } else {
      // Default: batch price for multiple symbols
      url = `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${key}`;
    }

    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

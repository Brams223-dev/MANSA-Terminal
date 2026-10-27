// /pages/api/yahoo.js — Proxy Yahoo Finance (évite CORS + allorigins.win)
// Déployé sur Vercel, appelé depuis terminal.html

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const { symbols, fields } = req.query;
  if (!symbols) return res.status(400).json({ error: 'symbols required' });
  
  const defaultFields = 'regularMarketPrice,regularMarketChangePercent,regularMarketChange,regularMarketVolume,marketCap,trailingAnnualDividendYield,shortName,longName,currency';
  const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=${fields || defaultFields}&formatted=false&lang=fr&region=FR`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) throw new Error(`Yahoo HTTP ${response.status}`);
    const data = await response.json();
    
    // Cache 30s côté CDN Vercel
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.status(200).json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
}

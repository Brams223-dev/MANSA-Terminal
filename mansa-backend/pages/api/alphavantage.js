export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { function: fn, symbol, from_symbol, to_symbol, interval, outputsize } = req.query;
  const key = process.env.ALPHA_VANTAGE_KEY || '74XWAYG15W146E4D';

  try {
    let params = new URLSearchParams({ apikey: key });

    if (fn === 'CURRENCY_EXCHANGE_RATE') {
      params.append('function', 'CURRENCY_EXCHANGE_RATE');
      params.append('from_currency', from_symbol || 'EUR');
      params.append('to_currency', to_symbol || 'USD');
    } else if (fn === 'FX_INTRADAY') {
      params.append('function', 'FX_INTRADAY');
      params.append('from_symbol', from_symbol || 'EUR');
      params.append('to_symbol', to_symbol || 'USD');
      params.append('interval', interval || '60min');
      params.append('outputsize', outputsize || 'compact');
    } else if (fn === 'GLOBAL_QUOTE') {
      params.append('function', 'GLOBAL_QUOTE');
      params.append('symbol', symbol || 'SPY');
    } else if (fn === 'OVERVIEW') {
      params.append('function', 'OVERVIEW');
      params.append('symbol', symbol || 'SPY');
    } else if (fn === 'REAL_GDP') {
      params.append('function', 'REAL_GDP');
      params.append('interval', 'quarterly');
    } else if (fn === 'INFLATION') {
      params.append('function', 'INFLATION');
    } else if (fn === 'FEDERAL_FUNDS_RATE') {
      params.append('function', 'FEDERAL_FUNDS_RATE');
      params.append('interval', 'monthly');
    } else {
      params.append('function', fn || 'GLOBAL_QUOTE');
      if (symbol) params.append('symbol', symbol);
    }

    const url = `https://www.alphavantage.co/query?${params.toString()}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await r.json();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

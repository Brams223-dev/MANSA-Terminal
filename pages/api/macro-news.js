// /pages/api/macro-news.js
// Flux d'actualités macroéconomiques filtrées et classifiées
// Source: NewsAPI (clé existante)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1200');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { category, currency, pageSize = 20 } = req.query;
  const newsKey = process.env.NEWS_API_KEY || '9f292efc16a5436c8d05a4dc692fe773';

  // Requêtes optimisées par catégorie
  const queries = {
    'central-banks': '"Federal Reserve" OR "BCE" OR "ECB" OR "Bank of England" OR "Bank of Japan" OR "SNB" OR "RBA" OR "banque centrale" OR "taux directeur" OR "monetary policy"',
    'inflation': 'inflation OR "CPI" OR "consumer prices" OR "prix à la consommation" OR "core inflation"',
    'employment': '"non-farm payrolls" OR "NFP" OR "unemployment" OR "chômage" OR "emploi" OR "ADP" OR "jobless claims"',
    'growth': '"GDP" OR "PIB" OR "croissance économique" OR "economic growth" OR "recession" OR "PMI" OR "manufacturing"',
    'geopolitics': 'geopolitique OR sanctions OR "trade war" OR "guerre commerciale" OR "OPEC" OR "pétrole brut"',
    'rates': '"interest rates" OR "taux d\'intérêt" OR "rate hike" OR "rate cut" OR "FOMC" OR "MPC" OR "hawkish" OR "dovish"',
    'default': '"Federal Reserve" OR "BCE" OR "inflation" OR "NFP" OR "FOMC" OR "taux" OR "forex" OR "dollar" OR "euro"'
  };

  const currencyQueries = {
    USD: '"US dollar" OR "Federal Reserve" OR "Fed" OR "FOMC" OR "NFP" OR "US economy"',
    EUR: '"euro" OR "BCE" OR "ECB" OR "eurozone" OR "zone euro" OR "Lagarde"',
    GBP: '"pound sterling" OR "Bank of England" OR "BoE" OR "Bailey" OR "UK economy" OR "livre sterling"',
    JPY: '"yen" OR "Bank of Japan" OR "BoJ" OR "Ueda" OR "Japan economy" OR "BOJ"',
    CHF: '"franc suisse" OR "SNB" OR "Swiss National Bank" OR "Switzerland"',
    AUD: '"Australian dollar" OR "RBA" OR "Reserve Bank Australia" OR "Bullock"',
    CAD: '"Canadian dollar" OR "Bank of Canada" OR "BoC" OR "loonie"',
    NZD: '"New Zealand dollar" OR "RBNZ" OR "Reserve Bank New Zealand"'
  };

  const query = currency && currencyQueries[currency]
    ? currencyQueries[currency]
    : (queries[category] || queries.default);

  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=publishedAt&pageSize=${Math.min(parseInt(pageSize)||20, 50)}&apiKey=${newsKey}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const data = await r.json();

    if (!r.ok || data.status === 'error') {
      throw new Error(data.message || `NewsAPI error ${r.status}`);
    }

    const articles = (data.articles || [])
      .filter(a => a.title && a.title !== '[Removed]' && a.url)
      .map(a => enrichArticle(a));

    return res.status(200).json({
      status: 'ok',
      count: articles.length,
      articles,
      query: category || currency || 'default',
      source: 'newsapi'
    });

  } catch(e) {
    return res.status(200).json({
      status: 'error',
      count: 0,
      articles: [],
      error: e.message,
      source: 'newsapi'
    });
  }
}

function enrichArticle(article) {
  const title = (article.title || '').toLowerCase();
  const desc = (article.description || '').toLowerCase();
  const content = title + ' ' + desc;

  // Classifier l'importance
  let importance = 'moderate';
  if (
    content.includes('fomc') || content.includes('federal reserve') ||
    content.includes('nfp') || content.includes('non-farm') ||
    content.includes('cpi') || content.includes('inflation data') ||
    content.includes('rate decision') || content.includes('interest rate') ||
    content.includes('ecb') || content.includes('bank of england') ||
    content.includes('emergency') || content.includes('crisis') ||
    content.includes('recession')
  ) {
    importance = 'high';
  } else if (
    content.includes('pmi') || content.includes('gdp') ||
    content.includes('unemployment') || content.includes('retail sales') ||
    content.includes('trade balance') || content.includes('central bank')
  ) {
    importance = 'medium';
  } else if (
    content.includes('forecast') || content.includes('analyst') ||
    content.includes('expectation')
  ) {
    importance = 'low';
  }

  // Classifier la catégorie
  let category = 'general';
  if (content.includes('fomc') || content.includes('federal reserve') || content.includes('bce') || content.includes('ecb') || content.includes('central bank') || content.includes('rate decision')) {
    category = 'central-banks';
  } else if (content.includes('inflation') || content.includes('cpi') || content.includes('price')) {
    category = 'inflation';
  } else if (content.includes('nfp') || content.includes('employment') || content.includes('unemployment') || content.includes('jobless') || content.includes('payroll')) {
    category = 'employment';
  } else if (content.includes('gdp') || content.includes('growth') || content.includes('recession') || content.includes('pmi')) {
    category = 'growth';
  } else if (content.includes('geopolit') || content.includes('sanction') || content.includes('war') || content.includes('opec') || content.includes('oil')) {
    category = 'geopolitics';
  } else if (content.includes('interest rate') || content.includes('rate hike') || content.includes('rate cut') || content.includes('hawkish') || content.includes('dovish')) {
    category = 'rates';
  } else if (content.includes('debt') || content.includes('deficit') || content.includes('budget')) {
    category = 'debt';
  } else if (content.includes('trade') || content.includes('export') || content.includes('import') || content.includes('tariff')) {
    category = 'trade';
  }

  // Devises concernées
  const currencies = [];
  if (content.includes('dollar') || content.includes('usd') || content.includes('fed') || content.includes('us economy') || content.includes('america')) currencies.push('USD');
  if (content.includes('euro') || content.includes('eur') || content.includes('ecb') || content.includes('eurozone')) currencies.push('EUR');
  if (content.includes('pound') || content.includes('gbp') || content.includes('sterling') || content.includes('bank of england')) currencies.push('GBP');
  if (content.includes('yen') || content.includes('jpy') || content.includes('japan') || content.includes('boj')) currencies.push('JPY');
  if (content.includes('franc') || content.includes('chf') || content.includes('swiss') || content.includes('snb')) currencies.push('CHF');
  if (content.includes('aussie') || content.includes('aud') || content.includes('australia') || content.includes('rba')) currencies.push('AUD');
  if (content.includes('loonie') || content.includes('cad') || content.includes('canada') || content.includes('bank of canada')) currencies.push('CAD');
  if (content.includes('kiwi') || content.includes('nzd') || content.includes('new zealand')) currencies.push('NZD');
  if (currencies.length === 0) currencies.push('USD');

  return {
    id: Buffer.from(article.url || Math.random().toString()).toString('base64').slice(0, 12),
    title: article.title,
    summary: article.description || '',
    content: article.content || '',
    publishedAt: article.publishedAt,
    source: {
      name: article.source?.name || 'Unknown',
      url: article.url
    },
    urlToImage: article.urlToImage || null,
    currencies,
    category,
    importance,
    url: article.url
  };
}

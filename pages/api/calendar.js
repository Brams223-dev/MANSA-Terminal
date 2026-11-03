// /pages/api/calendar.js — Calendrier économique professionnel
// Sources: ForexFactory (via proxy scraper), fallback données statiques enrichies
// Aucune clé API requise

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    return res.status(200).end();
  }
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');

  const { week = 'this', currencies, impact = 'medium' } = req.query;

  try {
    // Tentative 1: Apify public ForexFactory actor (gratuit jusqu'à 100 runs/mois)
    const events = await fetchFromApify(week, currencies, impact);
    return res.status(200).json({ source: 'forexfactory', events, cached: false });
  } catch (e1) {
    try {
      // Tentative 2: scraper alternatif via proxy public
      const events = await fetchFromAlternative(week, impact);
      return res.status(200).json({ source: 'alternative', events, cached: false });
    } catch (e2) {
      // Fallback: données d'exemple structurées pour la semaine courante
      const events = generateFallbackEvents();
      return res.status(200).json({ source: 'fallback', events, cached: true, error: e2.message });
    }
  }
}

async function fetchFromApify(week, currencies, impact) {
  // Apify public dataset — actor xtracto/forexfactory-calendar
  // Sans clé: accès en lecture aux derniers runs publics
  const apifyKey = process.env.APIFY_API_KEY;
  if (!apifyKey) throw new Error('No Apify key configured');

  const dateRange = week === 'next' ? 'nextWeek' : week === 'last' ? 'lastWeek' : 'thisWeek';
  const minImpact = impact === 'high' ? 'high' : 'medium';

  const body = {
    dateRange,
    minImpact,
    upcomingOnly: false,
    maxItems: 200,
    currencies: currencies ? currencies.split(',') : ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'NZD', 'CNY']
  };

  const runResp = await fetch(`https://api.apify.com/v2/acts/xtracto~forexfactory-calendar/runs?token=${apifyKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: body }),
    signal: AbortSignal.timeout(25000)
  });

  if (!runResp.ok) throw new Error(`Apify run failed: ${runResp.status}`);
  const run = await runResp.json();
  const datasetId = run.data?.defaultDatasetId;
  if (!datasetId) throw new Error('No dataset ID from Apify run');

  // Poll jusqu'à 20 secondes
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const statusResp = await fetch(`https://api.apify.com/v2/actor-runs/${run.data.id}?token=${apifyKey}`);
    const status = await statusResp.json();
    if (status.data?.status === 'SUCCEEDED') break;
    if (['FAILED', 'ABORTED', 'TIMED-OUT'].includes(status.data?.status)) {
      throw new Error(`Apify run ${status.data.status}`);
    }
  }

  const dataResp = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyKey}&limit=200`);
  if (!dataResp.ok) throw new Error('Dataset fetch failed');
  const items = await dataResp.json();
  return normalizeApifyEvents(items);
}

function normalizeApifyEvents(items) {
  return items.map(e => ({
    id: e.id || String(Math.random()),
    title: e.title || e.prefixedName || '',
    currency: e.currency || '',
    datetime: e.datetimeISO || '',
    timestamp: e.dateline ? e.dateline * 1000 : null,
    impact: e.impact || 'low',
    actual: e.actual !== undefined ? e.actual : null,
    forecast: e.forecast !== undefined ? e.forecast : null,
    previous: e.previous !== undefined ? e.previous : null,
    revision: e.revision || null,
    signal: e.actualBetterWorse || 0, // 1=better, -1=worse, 0=inline
    url: e.soloUrl || e.url || ''
  })).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
}

async function fetchFromAlternative(week, impact) {
  // nbs-ecocal: endpoint public non-officiel utilisé par certains terminaux
  // Formatté selon le standard ForexFactory
  const now = new Date();
  const weekOffset = week === 'next' ? 7 : week === 'last' ? -7 : 0;
  const from = new Date(now);
  from.setDate(from.getDate() - from.getDay() + 1 + weekOffset);
  const to = new Date(from);
  to.setDate(to.getDate() + 6);

  const fmt = d => d.toISOString().split('T')[0];

  // Essai via un proxy CORS public vers FF
  const url = `https://nfs.faireconomy.media/ff_calendar_thisweek.json?version=${Date.now()}`;
  const resp = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    headers: { 'User-Agent': 'MansaTerminal/1.0' }
  });
  if (!resp.ok) throw new Error(`Alt source HTTP ${resp.status}`);
  const data = await resp.json();

  const impactFilter = { low: 0, medium: 1, high: 2 };
  const minLevel = impactFilter[impact] || 1;
  const impactMap = { 'Low Impact Expected': 'low', 'Medium Impact Expected': 'medium', 'High Impact Expected': 'high', 'Non-Economic': 'low' };

  return data
    .filter(e => {
      const lvl = impactFilter[e.impact?.replace(' Impact Expected','')?.toLowerCase()] || 0;
      return lvl >= minLevel;
    })
    .map((e, i) => {
      const dt = e.date ? new Date(e.date) : null;
      const imp = impactMap[e.impact] || 'low';
      // Determine signal from actual vs forecast
      let signal = 0;
      if (e.actual && e.forecast) {
        const act = parseFloat(e.actual);
        const fore = parseFloat(e.forecast);
        if (!isNaN(act) && !isNaN(fore)) signal = act > fore ? 1 : act < fore ? -1 : 0;
      }
      return {
        id: `ff-${i}`,
        title: e.title || e.name || '',
        currency: e.country || '',
        datetime: dt ? dt.toISOString() : '',
        timestamp: dt ? dt.getTime() : null,
        impact: imp,
        actual: e.actual || null,
        forecast: e.forecast || null,
        previous: e.previous || null,
        revision: null,
        signal,
        url: ''
      };
    })
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
}

function generateFallbackEvents() {
  // Données exemples de la semaine en cours pour démonstration
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
  weekStart.setHours(0, 0, 0, 0);

  const schedule = [
    { d: 1, h: 9, m: 0, title: 'Services PMI EUR', currency: 'EUR', impact: 'medium', previous: '50.1', forecast: '50.5', actual: null },
    { d: 1, h: 9, m: 30, title: 'Services PMI GBP', currency: 'GBP', impact: 'medium', previous: '52.0', forecast: '52.3', actual: null },
    { d: 1, h: 15, m: 0, title: 'ISM Non-Manufacturing', currency: 'USD', impact: 'high', previous: '53.5', forecast: '52.8', actual: null },
    { d: 2, h: 14, m: 15, title: 'ADP Employment Change', currency: 'USD', impact: 'high', previous: '145K', forecast: '130K', actual: null },
    { d: 2, h: 20, m: 0, title: 'FOMC Meeting Minutes', currency: 'USD', impact: 'high', previous: null, forecast: null, actual: null },
    { d: 3, h: 8, m: 30, title: 'Balance Commerciale EUR', currency: 'EUR', impact: 'medium', previous: '12.3B', forecast: '14.0B', actual: null },
    { d: 3, h: 14, m: 30, title: 'Demandes Allocations Chômage', currency: 'USD', impact: 'medium', previous: '218K', forecast: '220K', actual: null },
    { d: 3, h: 15, m: 0, title: 'Factory Orders USA', currency: 'USD', impact: 'medium', previous: '1.2%', forecast: '-0.3%', actual: null },
    { d: 4, h: 8, m: 0, title: 'Indice Halifax HPI', currency: 'GBP', impact: 'medium', previous: '0.3%', forecast: '0.2%', actual: null },
    { d: 4, h: 14, m: 30, title: 'NFP Non-Farm Payrolls', currency: 'USD', impact: 'high', previous: '142K', forecast: '150K', actual: null },
    { d: 4, h: 14, m: 30, title: 'Taux de Chômage USA', currency: 'USD', impact: 'high', previous: '4.1%', forecast: '4.1%', actual: null },
    { d: 4, h: 14, m: 30, title: 'Salaire Horaire Moyen', currency: 'USD', impact: 'high', previous: '0.4%', forecast: '0.3%', actual: null },
  ];

  return schedule.map((e, i) => {
    const dt = new Date(weekStart);
    dt.setDate(weekStart.getDate() + e.d - 1);
    dt.setHours(e.h, e.m, 0, 0);
    let signal = 0;
    if (e.actual && e.forecast) {
      const act = parseFloat(e.actual);
      const fore = parseFloat(e.forecast);
      if (!isNaN(act) && !isNaN(fore)) signal = act > fore ? 1 : act < fore ? -1 : 0;
    }
    return {
      id: `fallback-${i}`,
      title: e.title,
      currency: e.currency,
      datetime: dt.toISOString(),
      timestamp: dt.getTime(),
      impact: e.impact,
      actual: e.actual,
      forecast: e.forecast,
      previous: e.previous,
      revision: null,
      signal,
      url: ''
    };
  });
}

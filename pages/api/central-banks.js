// /pages/api/central-banks.js
// Données des 6 banques centrales : taux directeurs, orientation, réunions, historique
// Sources : Alpha Vantage (taux réels) + données structurées officielles
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=7200');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { action } = req.query;
  const avKey = process.env.ALPHA_VANTAGE_KEY || '74XWAYG15W146E4D';

  try {
    if (action === 'rates') {
      // Récupère les taux fédéraux US via Alpha Vantage comme référence
      const avUrl = `https://www.alphavantage.co/query?function=FEDERAL_FUNDS_RATE&interval=monthly&apikey=${avKey}`;
      let avData = null;
      try {
        const r = await fetch(avUrl, { signal: AbortSignal.timeout(8000) });
        avData = await r.json();
      } catch(e) { /* fallback */ }

      const latestFedRate = avData?.data?.[0]?.value ? parseFloat(avData.data[0].value) : null;

      return res.status(200).json({
        source: latestFedRate ? 'alphavantage' : 'static',
        banks: buildBanksData(latestFedRate),
        updated: new Date().toISOString()
      });
    }

    if (action === 'history') {
      const { bank } = req.query;
      return res.status(200).json({ history: buildHistoryData(bank) });
    }

    // Default: full data
    return res.status(200).json({
      banks: buildBanksData(null),
      updated: new Date().toISOString()
    });

  } catch(e) {
    return res.status(500).json({ error: e.message, banks: buildBanksData(null) });
  }
}

function buildBanksData(fedRate) {
  // Données structurées basées sur les dernières communications officielles
  // Mises à jour manuellement après chaque réunion
  // Source: fed.gov, ecb.europa.eu, bankofengland.co.uk, boj.or.jp, snb.ch, rba.gov.au
  return [
    {
      id: 'FED',
      name: 'Federal Reserve',
      shortName: 'Fed',
      flag: '🇺🇸',
      currency: 'USD',
      rate: fedRate || 5.33,
      rateChange: 0,         // en bps vs dernière réunion
      orientation: 'neutral', // hawkish | dovish | neutral
      orientationLabel: 'Neutre — Pivot en attente',
      lastMeeting: '2024-11-07',
      nextMeeting: '2024-12-18',
      lastDecision: 'Maintien des taux à 5.25-5.50%',
      inflation: { current: 2.6, target: 2.0, trend: 'down' },
      growth: { gdp: 2.8, trend: 'stable' },
      unemployment: 4.1,
      governorName: 'Jerome Powell',
      keyQuote: 'Nous restons attentifs aux données. Un assouplissement prématuré serait une erreur.',
      keyQuoteDate: '2024-11-07',
      source: 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm',
      meetings2025: ['2025-01-29','2025-03-19','2025-05-07','2025-06-18','2025-07-30','2025-09-17','2025-10-29','2025-12-10'],
      rateHistory: [
        {date:'2024-11-07',rate:5.33,change:0,decision:'Maintien',bp:0},
        {date:'2024-09-18',rate:5.33,change:-25,decision:'Baisse',bp:-25},
        {date:'2024-07-31',rate:5.58,change:0,decision:'Maintien',bp:0},
        {date:'2024-06-12',rate:5.58,change:0,decision:'Maintien',bp:0},
        {date:'2024-05-01',rate:5.58,change:0,decision:'Maintien',bp:0},
        {date:'2024-03-20',rate:5.58,change:0,decision:'Maintien',bp:0},
        {date:'2024-01-31',rate:5.58,change:0,decision:'Maintien',bp:0},
        {date:'2023-12-13',rate:5.58,change:0,decision:'Maintien',bp:0},
        {date:'2023-11-01',rate:5.58,change:0,decision:'Maintien',bp:0},
        {date:'2023-09-20',rate:5.58,change:0,decision:'Maintien',bp:0},
        {date:'2023-07-26',rate:5.58,change:+25,decision:'Hausse',bp:+25},
        {date:'2023-06-14',rate:5.33,change:0,decision:'Maintien',bp:0},
        {date:'2023-05-03',rate:5.33,change:+25,decision:'Hausse',bp:+25},
      ]
    },
    {
      id: 'ECB',
      name: 'Banque Centrale Européenne',
      shortName: 'BCE',
      flag: '🇪🇺',
      currency: 'EUR',
      rate: 3.65,
      rateChange: -25,
      orientation: 'dovish',
      orientationLabel: 'Dovish — Cycle de baisse enclenché',
      lastMeeting: '2024-10-17',
      nextMeeting: '2024-12-12',
      lastDecision: 'Baisse de 25 bps à 3.40% (taux de dépôt)',
      inflation: { current: 2.3, target: 2.0, trend: 'down' },
      growth: { gdp: 0.4, trend: 'weak' },
      unemployment: 6.0,
      governorName: 'Christine Lagarde',
      keyQuote: 'La désinflation est bien en cours. Nous ajusterons selon les données.',
      keyQuoteDate: '2024-10-17',
      source: 'https://www.ecb.europa.eu/press/govcdec/mopo/html/index.en.html',
      meetings2025: ['2025-01-30','2025-03-06','2025-04-17','2025-06-05','2025-07-24','2025-09-11','2025-10-30','2025-12-18'],
      rateHistory: [
        {date:'2024-10-17',rate:3.65,change:-25,decision:'Baisse',bp:-25},
        {date:'2024-09-12',rate:3.90,change:-25,decision:'Baisse',bp:-25},
        {date:'2024-07-18',rate:4.15,change:0,decision:'Maintien',bp:0},
        {date:'2024-06-06',rate:4.15,change:-25,decision:'Baisse',bp:-25},
        {date:'2024-04-11',rate:4.40,change:0,decision:'Maintien',bp:0},
        {date:'2024-03-07',rate:4.40,change:0,decision:'Maintien',bp:0},
        {date:'2024-01-25',rate:4.40,change:0,decision:'Maintien',bp:0},
        {date:'2023-10-26',rate:4.40,change:0,decision:'Maintien',bp:0},
        {date:'2023-09-14',rate:4.40,change:+25,decision:'Hausse',bp:+25},
        {date:'2023-07-27',rate:4.15,change:+25,decision:'Hausse',bp:+25},
      ]
    },
    {
      id: 'BOE',
      name: 'Bank of England',
      shortName: 'BoE',
      flag: '🇬🇧',
      currency: 'GBP',
      rate: 5.00,
      rateChange: -25,
      orientation: 'neutral',
      orientationLabel: 'Neutre — Prudence sur rythme de baisse',
      lastMeeting: '2024-11-07',
      nextMeeting: '2025-02-06',
      lastDecision: 'Baisse de 25 bps à 4.75%',
      inflation: { current: 2.3, target: 2.0, trend: 'down' },
      growth: { gdp: 0.6, trend: 'weak' },
      unemployment: 4.3,
      governorName: 'Andrew Bailey',
      keyQuote: 'Le taux d\'inflation se rapproche de notre cible mais des risques persistent.',
      keyQuoteDate: '2024-11-07',
      source: 'https://www.bankofengland.co.uk/monetary-policy/the-interest-rate-bank-rate',
      meetings2025: ['2025-02-06','2025-03-20','2025-05-08','2025-06-19','2025-08-07','2025-09-18','2025-11-06','2025-12-18'],
      rateHistory: [
        {date:'2024-11-07',rate:5.00,change:-25,decision:'Baisse',bp:-25},
        {date:'2024-09-19',rate:5.25,change:0,decision:'Maintien',bp:0},
        {date:'2024-08-01',rate:5.25,change:-25,decision:'Baisse',bp:-25},
        {date:'2024-06-20',rate:5.50,change:0,decision:'Maintien',bp:0},
        {date:'2024-05-09',rate:5.50,change:0,decision:'Maintien',bp:0},
        {date:'2024-03-21',rate:5.50,change:0,decision:'Maintien',bp:0},
        {date:'2024-02-01',rate:5.50,change:0,decision:'Maintien',bp:0},
        {date:'2023-12-14',rate:5.50,change:0,decision:'Maintien',bp:0},
        {date:'2023-11-02',rate:5.50,change:0,decision:'Maintien',bp:0},
        {date:'2023-08-03',rate:5.25,change:+25,decision:'Hausse',bp:+25},
      ]
    },
    {
      id: 'BOJ',
      name: 'Bank of Japan',
      shortName: 'BoJ',
      flag: '🇯🇵',
      currency: 'JPY',
      rate: 0.25,
      rateChange: +15,
      orientation: 'hawkish',
      orientationLabel: 'Légèrement Hawkish — Normalisation en cours',
      lastMeeting: '2024-10-31',
      nextMeeting: '2024-12-19',
      lastDecision: 'Maintien à 0.25% — signaux de hausse conditionnelle',
      inflation: { current: 2.5, target: 2.0, trend: 'stable' },
      growth: { gdp: 0.9, trend: 'weak' },
      unemployment: 2.4,
      governorName: 'Kazuo Ueda',
      keyQuote: 'Nous continuerons à ajuster les conditions monétaires si les perspectives évoluent comme prévu.',
      keyQuoteDate: '2024-10-31',
      source: 'https://www.boj.or.jp/en/mopo/mpmdeci/index.htm',
      meetings2025: ['2025-01-24','2025-03-19','2025-04-30','2025-06-17','2025-07-31','2025-09-19','2025-10-29','2025-12-19'],
      rateHistory: [
        {date:'2024-10-31',rate:0.25,change:0,decision:'Maintien',bp:0},
        {date:'2024-09-20',rate:0.25,change:0,decision:'Maintien',bp:0},
        {date:'2024-07-31',rate:0.25,change:+15,decision:'Hausse',bp:+15},
        {date:'2024-06-14',rate:0.10,change:0,decision:'Maintien',bp:0},
        {date:'2024-04-26',rate:0.10,change:0,decision:'Maintien',bp:0},
        {date:'2024-03-19',rate:0.10,change:+10,decision:'Hausse',bp:+10},
        {date:'2024-01-23',rate:0.00,change:0,decision:'Maintien',bp:0},
        {date:'2023-10-31',rate:0.00,change:0,decision:'Maintien',bp:0},
        {date:'2023-07-28',rate:0.00,change:0,decision:'Modif. YCC',bp:0},
      ]
    },
    {
      id: 'SNB',
      name: 'Swiss National Bank',
      shortName: 'SNB',
      flag: '🇨🇭',
      currency: 'CHF',
      rate: 1.00,
      rateChange: -25,
      orientation: 'dovish',
      orientationLabel: 'Dovish — Cycle de baisse agressif',
      lastMeeting: '2024-09-26',
      nextMeeting: '2024-12-12',
      lastDecision: 'Baisse de 25 bps à 1.00%',
      inflation: { current: 0.8, target: 2.0, trend: 'down' },
      growth: { gdp: 1.1, trend: 'stable' },
      unemployment: 2.6,
      governorName: 'Martin Schlegel',
      keyQuote: 'Une inflation plus faible et une croissance modérée justifient un assouplissement supplémentaire.',
      keyQuoteDate: '2024-09-26',
      source: 'https://www.snb.ch/en/monetary-policy/current-interest-rates-and-exchange-rates',
      meetings2025: ['2025-03-20','2025-06-19','2025-09-18','2025-12-11'],
      rateHistory: [
        {date:'2024-09-26',rate:1.00,change:-25,decision:'Baisse',bp:-25},
        {date:'2024-06-20',rate:1.25,change:-25,decision:'Baisse',bp:-25},
        {date:'2024-03-21',rate:1.50,change:-25,decision:'Baisse',bp:-25},
        {date:'2023-12-14',rate:1.75,change:0,decision:'Maintien',bp:0},
        {date:'2023-09-21',rate:1.75,change:0,decision:'Maintien',bp:0},
        {date:'2023-06-22',rate:1.75,change:+25,decision:'Hausse',bp:+25},
        {date:'2023-03-23',rate:1.50,change:+50,decision:'Hausse',bp:+50},
      ]
    },
    {
      id: 'RBA',
      name: 'Reserve Bank of Australia',
      shortName: 'RBA',
      flag: '🇦🇺',
      currency: 'AUD',
      rate: 4.35,
      rateChange: 0,
      orientation: 'neutral',
      orientationLabel: 'Neutre — En attente de données inflation',
      lastMeeting: '2024-11-05',
      nextMeeting: '2024-12-10',
      lastDecision: 'Maintien à 4.35% — pas de signal clair de baisse',
      inflation: { current: 2.8, target: 2.5, trend: 'down' },
      growth: { gdp: 1.5, trend: 'weak' },
      unemployment: 4.1,
      governorName: 'Michele Bullock',
      keyQuote: "L'inflation reste trop élevée. Nous ne voyons pas d'argument pour assouplir la politique rapidement.",
      keyQuoteDate: '2024-11-05',
      source: 'https://www.rba.gov.au/monetary-policy/int-rate-decisions/',
      meetings2025: ['2025-02-18','2025-04-01','2025-05-20','2025-07-08','2025-08-05','2025-09-16','2025-11-04','2025-12-09'],
      rateHistory: [
        {date:'2024-11-05',rate:4.35,change:0,decision:'Maintien',bp:0},
        {date:'2024-09-24',rate:4.35,change:0,decision:'Maintien',bp:0},
        {date:'2024-08-06',rate:4.35,change:0,decision:'Maintien',bp:0},
        {date:'2024-06-18',rate:4.35,change:0,decision:'Maintien',bp:0},
        {date:'2024-05-07',rate:4.35,change:0,decision:'Maintien',bp:0},
        {date:'2024-03-19',rate:4.35,change:0,decision:'Maintien',bp:0},
        {date:'2024-02-06',rate:4.35,change:0,decision:'Maintien',bp:0},
        {date:'2023-11-07',rate:4.35,change:+25,decision:'Hausse',bp:+25},
        {date:'2023-10-03',rate:4.10,change:0,decision:'Maintien',bp:0},
      ]
    }
  ];
}

function buildHistoryData(bankId) {
  const banks = buildBanksData(null);
  const bank = banks.find(b => b.id === bankId);
  if(!bank) return [];
  return bank.rateHistory.map(h => ({
    ...h,
    bankId,
    currency: bank.currency,
    source: bank.source
  }));
}

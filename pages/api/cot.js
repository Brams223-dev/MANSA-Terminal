// pages/api/cot.js — Commitments of Traders (CFTC Legacy Futures Only)
// Source : Socrata API — publicreporting.cftc.gov/resource/6dca-aqww.json
// Gratuit, sans clé API, données publiées chaque vendredi
// Devises suivies : EUR, GBP, JPY, CHF, CAD, AUD, NZD

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=600')

  try {
    const data = await fetchCOT()
    return res.status(200).json({ ok: true, data, updated: new Date().toISOString() })
  } catch (err) {
    console.error('[COT]', err.message)
    return res.status(500).json({ error: err.message })
  }
}

// Mapping CFTC market_and_exchange_names → nos codes devise
const FOREX_MAP = {
  'EURO FX - CHICAGO MERCANTILE EXCHANGE':            'EUR',
  'BRITISH POUND STERLING - CHICAGO MERCANTILE EXCHANGE': 'GBP',
  'JAPANESE YEN - CHICAGO MERCANTILE EXCHANGE':       'JPY',
  'SWISS FRANC - CHICAGO MERCANTILE EXCHANGE':        'CHF',
  'CANADIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE':    'CAD',
  'AUSTRALIAN DOLLAR - CHICAGO MERCANTILE EXCHANGE':  'AUD',
  'NEW ZEALAND DOLLAR - CHICAGO MERCANTILE EXCHANGE': 'NZD',
}

async function fetchCOT() {
  // Dernières 8 semaines pour chaque contrat forex
  const markets = Object.keys(FOREX_MAP).map(m => `"${m}"`).join(',')
  const url =
    `https://publicreporting.cftc.gov/resource/6dca-aqww.json` +
    `?$where=market_and_exchange_names IN(${markets})` +
    `&$order=report_date_as_yyyy_mm_dd DESC` +
    `&$limit=56` // 7 devises × 8 semaines

  const resp = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(15000)
  })

  if (!resp.ok) throw new Error(`CFTC HTTP ${resp.status}`)

  const rows = await resp.json()
  if (!Array.isArray(rows) || rows.length === 0) throw new Error('Aucune donnée CFTC')

  // Grouper par devise, conserver les 8 dernières semaines triées par date DESC
  const grouped = {}

  for (const r of rows) {
    const code = FOREX_MAP[r.market_and_exchange_names]
    if (!code) continue
    if (!grouped[code]) grouped[code] = []
    if (grouped[code].length < 8) grouped[code].push(r)
  }

  // Construire le résultat final
  const result = {}

  for (const [code, weeks] of Object.entries(grouped)) {
    if (weeks.length === 0) continue

    const latest = weeks[0]
    const prev   = weeks[1] || latest

    // Positions commerciales (hedgers) et non-commerciales (spéculatifs)
    const ncLong   = parseInt(latest.noncomm_positions_long_all  || 0)
    const ncShort  = parseInt(latest.noncomm_positions_short_all || 0)
    const ncNet    = ncLong - ncShort

    const prevLong  = parseInt(prev.noncomm_positions_long_all  || 0)
    const prevShort = parseInt(prev.noncomm_positions_short_all || 0)
    const prevNet   = prevLong - prevShort

    const netChange = ncNet - prevNet

    // Calcul du sentiment : ratio Long / (Long + Short)
    const total     = ncLong + ncShort
    const bullPct   = total > 0 ? Math.round((ncLong / total) * 100) : 50

    // Historique sur 8 semaines pour mini-graphe
    const history = weeks.map(w => {
      const l = parseInt(w.noncomm_positions_long_all  || 0)
      const s = parseInt(w.noncomm_positions_short_all || 0)
      return {
        date:   w.report_date_as_yyyy_mm_dd,
        net:    l - s,
        long:   l,
        short:  s
      }
    }).reverse() // du plus ancien au plus récent

    result[code] = {
      currency:   code,
      date:       latest.report_date_as_yyyy_mm_dd,
      ncLong,
      ncShort,
      ncNet,
      netChange,
      bullPct,
      sentiment:  bullPct >= 60 ? 'BULL' : bullPct <= 40 ? 'BEAR' : 'NEUTRE',
      history
    }
  }

  return result
}

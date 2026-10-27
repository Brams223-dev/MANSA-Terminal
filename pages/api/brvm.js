// pages/api/brvm.js — Scraper BRVM.org + cache Supabase
// Appelé par le cron Vercel toutes les heures (vercel.json)
// Aussi accessible publiquement en GET pour récupérer les cours en cache

import { supabaseAdmin } from '../../lib/supabase'

// GET /api/brvm → retourne les cours depuis Supabase (cache)
// GET /api/brvm?refresh=1 → scrape BRVM.org puis retourne (secret requis)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60')

  // Cron ou refresh forcé — nécessite le secret Vercel Cron
  const isCron = req.headers['authorization'] === `Bearer ${process.env.CRON_SECRET}`
  const isRefresh = req.query.refresh === '1' && isCron

  if (req.method === 'GET' && !isRefresh) {
    // Retourner le cache Supabase
    const { data, error } = await supabaseAdmin
      .from('brvm_prices')
      .select('*')
      .order('ticker')

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ data, cached: true, count: data.length })
  }

  // Scraper BRVM.org (cron ou refresh)
  try {
    const scraped = await scrapeBRVM()
    if (!scraped.length) throw new Error('Aucune donnée scrappée')

    // Upsert dans Supabase
    const { error } = await supabaseAdmin
      .from('brvm_prices')
      .upsert(scraped, { onConflict: 'ticker' })

    if (error) throw error

    return res.status(200).json({
      ok: true,
      updated: scraped.length,
      timestamp: new Date().toISOString()
    })
  } catch (err) {
    console.error('[BRVM scraper]', err.message)
    return res.status(500).json({ error: err.message })
  }
}

async function scrapeBRVM() {
  // BRVM open-data endpoint
  const url = 'https://www.brvm.org/fr/market/open-data/get-ticker-listing'

  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; MansaTerminal/1.0)',
      'Accept': 'application/json, text/plain, */*',
      'Referer': 'https://www.brvm.org/fr/market/cours',
    },
    signal: AbortSignal.timeout(15000)
  })

  if (!resp.ok) throw new Error(`BRVM API HTTP ${resp.status}`)

  const raw = await resp.json()

  // Normaliser selon la structure de l'API BRVM
  // L'API retourne un tableau d'objets avec des champs variables
  const rows = Array.isArray(raw) ? raw : (raw.data || raw.tickers || [])

  return rows.map(r => ({
    ticker:      (r.ticker || r.code || r.symbol || '').trim().toUpperCase(),
    nom:         r.name || r.libelle || r.company || '',
    prix:        parseFloat(r.last || r.cours || r.close || r.price || 0),
    variation:   parseFloat(r.change || r.variation || r.pct || 0),
    volume:      parseInt(r.volume || r.vol || 0, 10),
    plus_haut:   parseFloat(r.high || r.pluHaut || 0),
    plus_bas:    parseFloat(r.low || r.plusBas || 0),
    capitalisation: parseFloat(r.capitalisation || r.marketCap || 0),
    updated_at:  new Date().toISOString(),
  })).filter(r => r.ticker.length > 0 && r.prix > 0)
}

// pages/api/forex-strength.js — Force relative des devises
// Calcul à partir des taux de change en temps réel (exchangerate-api.com)
// Gratuit, sans clé pour les appels de base (endpoint open)
// Devises : USD, EUR, GBP, JPY, CHF, CAD, AUD, NZD

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=120') // 15 min cache

  try {
    const strength = await calcStrength()
    return res.status(200).json({ ok: true, strength, updated: new Date().toISOString() })
  } catch (err) {
    console.error('[ForexStrength]', err.message)
    return res.status(500).json({ error: err.message })
  }
}

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD']

// Paires utilisées pour calculer la force de chaque devise
// Format : [base, quote] — on utilise le taux tel quel ou son inverse
const PAIRS = [
  ['EUR','USD'], ['GBP','USD'], ['USD','JPY'],
  ['USD','CHF'], ['USD','CAD'], ['AUD','USD'],
  ['NZD','USD'], ['EUR','GBP'], ['EUR','JPY'],
  ['GBP','JPY'], ['EUR','CHF'], ['GBP','CHF'],
  ['AUD','JPY'], ['CAD','JPY'], ['NZD','JPY'],
  ['AUD','NZD'], ['AUD','CAD'], ['EUR','AUD'],
]

async function calcStrength() {
  // On fetch les taux depuis USD (base commune)
  // exchangerate-api.com endpoint public
  const url = 'https://open.er-api.com/v6/latest/USD'

  const resp = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal: AbortSignal.timeout(10000)
  })

  if (!resp.ok) throw new Error(`ExchangeRate API HTTP ${resp.status}`)

  const json = await resp.json()
  if (json.result !== 'success') throw new Error('ExchangeRate API error')

  const rates = json.rates // { EUR: 0.92, GBP: 0.79, ... }

  // Score de force : moyenne des performances de chaque devise
  // sur toutes ses paires
  const scores = {}
  CURRENCIES.forEach(c => { scores[c] = 0 })

  // Pour chaque paire, calculer le % de variation théorique
  // On compare juste les cross calculés depuis les taux actuels
  // Méthode : pour chaque devise, on compare son taux vs les 7 autres
  // Plus le taux croisé est favorable, plus la devise est forte

  for (const ccy of CURRENCIES) {
    let total = 0
    let count = 0

    for (const other of CURRENCIES) {
      if (other === ccy) continue

      // Taux CCY/OTHER calculé depuis les taux vs USD
      let rate
      if (ccy === 'USD') {
        rate = rates[other]         // USD/OTHER
      } else if (other === 'USD') {
        rate = 1 / rates[ccy]       // CCY/USD
      } else {
        rate = (1 / rates[ccy]) * rates[other] // CCY → USD → OTHER
      }

      // Normalisation simple : log du taux pour équilibrer JPY etc.
      total += Math.log(rate)
      count++
    }

    scores[ccy] = count > 0 ? total / count : 0
  }

  // Normaliser en score 0–100
  const vals = Object.values(scores)
  const min  = Math.min(...vals)
  const max  = Math.max(...vals)
  const range = max - min || 1

  const result = {}
  for (const ccy of CURRENCIES) {
    const normalized = Math.round(((scores[ccy] - min) / range) * 100)
    result[ccy] = {
      currency: ccy,
      score:    normalized,
      label:    normalized >= 65 ? 'FORT' : normalized <= 35 ? 'FAIBLE' : 'NEUTRE',
      raw:      scores[ccy]
    }
  }

  // Trier du plus fort au plus faible
  const sorted = Object.values(result).sort((a, b) => b.score - a.score)

  return sorted
}

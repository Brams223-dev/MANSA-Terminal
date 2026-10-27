// pages/api/watchlist.js — CRUD watchlist utilisateur
// GET    /api/watchlist          → liste les tickers en watchlist
// POST   /api/watchlist          → { ticker } — ajoute
// DELETE /api/watchlist?t=SNTS   → supprime

import { supabaseUser } from '../../lib/supabase'

export default async function handler(req, res) {
  const jwt = extractJWT(req)
  if (!jwt) return res.status(401).json({ error: 'Non authentifié' })

  const db = supabaseUser(jwt)

  // Récupérer l'utilisateur depuis le token
  const { data: { user }, error: authErr } = await db.auth.getUser()
  if (authErr || !user) return res.status(401).json({ error: 'Token invalide' })

  if (req.method === 'GET') {
    const { data, error } = await db
      .from('watchlist')
      .select('ticker, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ data: data.map(r => r.ticker) })
  }

  if (req.method === 'POST') {
    const { ticker } = req.body || {}
    if (!ticker) return res.status(400).json({ error: 'ticker requis' })

    const { error } = await db
      .from('watchlist')
      .upsert({ user_id: user.id, ticker: ticker.toUpperCase() }, { onConflict: 'user_id,ticker' })

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  if (req.method === 'DELETE') {
    const ticker = req.query.t
    if (!ticker) return res.status(400).json({ error: 'ticker requis (?t=)' })

    const { error } = await db
      .from('watchlist')
      .delete()
      .eq('user_id', user.id)
      .eq('ticker', ticker.toUpperCase())

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.status(405).json({ error: 'Méthode non supportée' })
}

function extractJWT(req) {
  const auth = req.headers.authorization || ''
  if (auth.startsWith('Bearer ')) return auth.slice(7)
  return null
}

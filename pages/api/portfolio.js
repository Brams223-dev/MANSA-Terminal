// pages/api/portfolio.js — CRUD positions portfolio
// GET    /api/portfolio               → liste les positions
// POST   /api/portfolio               → { ticker, qty, prix_achat } — ajoute/met à jour
// DELETE /api/portfolio?id=<uuid>     → supprime une position

import { supabaseUser } from '../../lib/supabase'

export default async function handler(req, res) {
  const jwt = extractJWT(req)
  if (!jwt) return res.status(401).json({ error: 'Non authentifié' })

  const db = supabaseUser(jwt)
  const { data: { user }, error: authErr } = await db.auth.getUser()
  if (authErr || !user) return res.status(401).json({ error: 'Token invalide' })

  if (req.method === 'GET') {
    // Jointure avec brvm_prices pour avoir le cours actuel
    const { data, error } = await db
      .from('portfolio')
      .select(`
        id, ticker, qty, prix_achat, created_at,
        brvm_prices ( prix, variation, nom )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })

    // Calculer P&L
    const positions = data.map(p => {
      const coursActuel = p.brvm_prices?.prix || p.prix_achat
      const valeur = coursActuel * p.qty
      const cout = p.prix_achat * p.qty
      const pnl = valeur - cout
      const pnlPct = cout > 0 ? (pnl / cout) * 100 : 0
      return {
        id: p.id,
        ticker: p.ticker,
        nom: p.brvm_prices?.nom || p.ticker,
        qty: p.qty,
        prix_achat: p.prix_achat,
        cours_actuel: coursActuel,
        variation: p.brvm_prices?.variation || 0,
        valeur: Math.round(valeur),
        pnl: Math.round(pnl),
        pnl_pct: Math.round(pnlPct * 100) / 100,
        created_at: p.created_at,
      }
    })

    const total_valeur = positions.reduce((s, p) => s + p.valeur, 0)
    const total_cout = positions.reduce((s, p) => s + p.prix_achat * p.qty, 0)
    const total_pnl = total_valeur - total_cout
    const total_pnl_pct = total_cout > 0 ? (total_pnl / total_cout) * 100 : 0

    return res.status(200).json({
      positions,
      summary: {
        total_valeur: Math.round(total_valeur),
        total_pnl: Math.round(total_pnl),
        total_pnl_pct: Math.round(total_pnl_pct * 100) / 100,
        nb_positions: positions.length,
      }
    })
  }

  if (req.method === 'POST') {
    const { ticker, qty, prix_achat } = req.body || {}
    if (!ticker || !qty || !prix_achat) {
      return res.status(400).json({ error: 'ticker, qty et prix_achat requis' })
    }

    const { data, error } = await db
      .from('portfolio')
      .insert({
        user_id: user.id,
        ticker: ticker.toUpperCase(),
        qty: parseInt(qty, 10),
        prix_achat: parseFloat(prix_achat),
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json({ ok: true, id: data.id })
  }

  if (req.method === 'DELETE') {
    const id = req.query.id
    if (!id) return res.status(400).json({ error: 'id requis' })

    const { error } = await db
      .from('portfolio')
      .delete()
      .eq('user_id', user.id)
      .eq('id', id)

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

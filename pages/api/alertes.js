// pages/api/alertes.js — CRUD alertes de prix + vérification
// GET    /api/alertes               → liste les alertes
// POST   /api/alertes               → { ticker, prix, sens } — crée
// DELETE /api/alertes?id=<uuid>     → supprime
// POST   /api/alertes/check         → vérifie et déclenche les alertes (cron)

import { supabaseUser, supabaseAdmin } from '../../lib/supabase'

export default async function handler(req, res) {
  // Route spéciale check (cron Vercel)
  if (req.url?.includes('/check')) {
    return handleCheck(req, res)
  }

  const jwt = extractJWT(req)
  if (!jwt) return res.status(401).json({ error: 'Non authentifié' })

  const db = supabaseUser(jwt)
  const { data: { user }, error: authErr } = await db.auth.getUser()
  if (authErr || !user) return res.status(401).json({ error: 'Token invalide' })

  if (req.method === 'GET') {
    const { data, error } = await db
      .from('alertes')
      .select(`
        id, ticker, prix, sens, actif, declenchee_at, created_at,
        brvm_prices ( prix )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })

    const alertes = data.map(a => ({
      id: a.id,
      ticker: a.ticker,
      prix_cible: a.prix,
      sens: a.sens,
      actif: a.actif,
      cours_actuel: a.brvm_prices?.prix || null,
      distance_pct: a.brvm_prices?.prix
        ? Math.round(((a.prix - a.brvm_prices.prix) / a.brvm_prices.prix) * 10000) / 100
        : null,
      declenchee_at: a.declenchee_at,
      created_at: a.created_at,
    }))

    return res.status(200).json({ alertes })
  }

  if (req.method === 'POST') {
    const { ticker, prix, sens } = req.body || {}
    if (!ticker || !prix || !['>', '<'].includes(sens)) {
      return res.status(400).json({ error: 'ticker, prix et sens (> ou <) requis' })
    }

    const { data, error } = await db
      .from('alertes')
      .insert({
        user_id: user.id,
        ticker: ticker.toUpperCase(),
        prix: parseFloat(prix),
        sens,
        actif: true,
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
      .from('alertes')
      .delete()
      .eq('user_id', user.id)
      .eq('id', id)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ ok: true })
  }

  res.status(405).json({ error: 'Méthode non supportée' })
}

// Cron : vérifie toutes les alertes actives contre les cours en cache
async function handleCheck(req, res) {
  const isCron = req.headers['authorization'] === `Bearer ${process.env.CRON_SECRET}`
  if (!isCron) return res.status(401).json({ error: 'Non autorisé' })

  // Récupérer toutes les alertes actives avec les cours actuels
  const { data: alertes, error } = await supabaseAdmin
    .from('alertes')
    .select(`
      id, user_id, ticker, prix, sens,
      brvm_prices ( prix )
    `)
    .eq('actif', true)

  if (error) return res.status(500).json({ error: error.message })

  const triggered = []

  for (const alerte of alertes) {
    const coursActuel = alerte.brvm_prices?.prix
    if (!coursActuel) continue

    const declenche =
      (alerte.sens === '>' && coursActuel >= alerte.prix) ||
      (alerte.sens === '<' && coursActuel <= alerte.prix)

    if (declenche) {
      // Marquer comme déclenchée
      await supabaseAdmin
        .from('alertes')
        .update({ actif: false, declenchee_at: new Date().toISOString() })
        .eq('id', alerte.id)

      triggered.push({
        id: alerte.id,
        ticker: alerte.ticker,
        prix_cible: alerte.prix,
        cours_actuel: coursActuel,
        sens: alerte.sens,
      })
    }
  }

  return res.status(200).json({
    checked: alertes.length,
    triggered: triggered.length,
    details: triggered,
  })
}

function extractJWT(req) {
  const auth = req.headers.authorization || ''
  if (auth.startsWith('Bearer ')) return auth.slice(7)
  return null
}

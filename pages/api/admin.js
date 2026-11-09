// pages/api/admin.js
// API admin centrale — protégée par ADMIN_SECRET
// Actions : stats, members, delete_user

import { getSupabaseAdmin } from '../../lib/supabase'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret')
  if (req.method === 'OPTIONS') return res.status(200).end()

  // Auth admin
  const adminSecret = req.headers['x-admin-secret']
  if (adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ ok: false, error: 'Non autorisé' })
  }

  const { action } = req.query
  const sb = getSupabaseAdmin()

  // ── STATS : compteurs globaux
  if (action === 'stats' && req.method === 'GET') {
    try {
      const { data: users } = await sb.auth.admin.listUsers({ perPage: 1000 })
      const { data: codes } = await sb.from('invite_codes').select('active, uses_count')
      const { data: uses } = await sb.from('invite_uses').select('used_at')

      const totalUsers = users?.users?.length || 0
      const activeCodes = codes?.filter(c => c.active).length || 0
      const totalUses = uses?.length || 0

      // Inscriptions 7 derniers jours
      const since7d = new Date(Date.now() - 7 * 86400000).toISOString()
      const recent = users?.users?.filter(u => u.created_at > since7d).length || 0

      return res.status(200).json({
        ok: true,
        stats: { totalUsers, activeCodes, totalUses, recent7d: recent }
      })
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message })
    }
  }

  // ── MEMBERS : liste des utilisateurs Supabase Auth
  if (action === 'members' && req.method === 'GET') {
    try {
      const { data, error } = await sb.auth.admin.listUsers({ perPage: 1000 })
      if (error) return res.status(500).json({ ok: false, error: error.message })

      const members = (data?.users || []).map(u => ({
        id: u.id,
        email: u.email,
        username: u.user_metadata?.username || u.email?.split('@')[0] || '—',
        invite_code: u.user_metadata?.invite_code || null,
        created_at: u.created_at,
        last_sign_in: u.last_sign_in_at,
        confirmed: !!u.email_confirmed_at,
      })).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      return res.status(200).json({ ok: true, members })
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message })
    }
  }

  // ── DELETE_USER : supprimer un compte
  if (action === 'delete_user' && req.method === 'DELETE') {
    const { user_id } = req.body || req.query
    if (!user_id) return res.status(400).json({ ok: false, error: 'user_id requis' })
    try {
      const { error } = await sb.auth.admin.deleteUser(user_id)
      if (error) return res.status(500).json({ ok: false, error: error.message })
      return res.status(200).json({ ok: true })
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message })
    }
  }

  return res.status(404).json({ ok: false, error: 'Action inconnue' })
}

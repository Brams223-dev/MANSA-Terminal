// pages/api/invite.js
// Gestion complète des codes d'invitation Mansa Terminal
// Actions : verify, use, generate, list, revoke

import { getSupabaseAdmin } from '../../lib/supabase'

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { action } = req.query
  const sb = getSupabaseAdmin()

  // ── VERIFY : vérifier qu'un code existe et est valide (GET /api/invite?action=verify&code=XXX)
  if (action === 'verify' && req.method === 'GET') {
    const { code } = req.query
    if (!code) return res.status(400).json({ ok: false, error: 'Code manquant' })

    const { data, error } = await sb
      .from('invite_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()

    if (error || !data) return res.status(404).json({ ok: false, error: 'Code invalide ou expiré' })
    if (!data.active) return res.status(403).json({ ok: false, error: 'Code désactivé' })
    if (data.max_uses && data.uses_count >= data.max_uses) {
      return res.status(403).json({ ok: false, error: 'Code épuisé (limite atteinte)' })
    }
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return res.status(403).json({ ok: false, error: 'Code expiré' })
    }

    return res.status(200).json({ ok: true, code: data.code, label: data.label })
  }

  // ── REGISTER : créer un compte avec un code d'invitation (POST /api/invite?action=register)
  if (action === 'register' && req.method === 'POST') {
    const { code, email, password, username } = req.body
    if (!code || !email || !password) {
      return res.status(400).json({ ok: false, error: 'code, email et password requis' })
    }

    // 1. Vérifier le code
    const { data: inv, error: invErr } = await sb
      .from('invite_codes')
      .select('*')
      .eq('code', code.toUpperCase())
      .single()

    if (invErr || !inv) return res.status(404).json({ ok: false, error: 'Code invalide' })
    if (!inv.active) return res.status(403).json({ ok: false, error: 'Code désactivé' })
    if (inv.max_uses && inv.uses_count >= inv.max_uses) {
      return res.status(403).json({ ok: false, error: 'Code épuisé' })
    }
    if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
      return res.status(403).json({ ok: false, error: 'Code expiré' })
    }

    // 2. Créer le compte Supabase Auth
    const { data: authData, error: authErr } = await sb.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // pas besoin de confirmation email
      user_metadata: { username: username || email.split('@')[0], invite_code: code.toUpperCase() }
    })

    if (authErr) {
      const msg = authErr.message.includes('already registered')
        ? 'Cette adresse email est déjà utilisée'
        : authErr.message
      return res.status(400).json({ ok: false, error: msg })
    }

    // 3. Incrémenter le compteur d'utilisation du code
    await sb
      .from('invite_codes')
      .update({ uses_count: (inv.uses_count || 0) + 1, last_used_at: new Date().toISOString() })
      .eq('code', code.toUpperCase())

    // 4. Enregistrer l'utilisation dans le journal
    await sb.from('invite_uses').insert({
      invite_code: code.toUpperCase(),
      user_id: authData.user.id,
      user_email: email,
      used_at: new Date().toISOString()
    })

    return res.status(200).json({ ok: true, userId: authData.user.id, message: 'Compte créé avec succès' })
  }

  // ── GENERATE : créer de nouveaux codes (POST /api/invite?action=generate) — admin seulement
  if (action === 'generate' && req.method === 'POST') {
    const adminSecret = req.headers['x-admin-secret']
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ ok: false, error: 'Non autorisé' })
    }

    const { count = 1, label = '', max_uses = null, expires_days = null } = req.body
    const codes = []

    for (let i = 0; i < Math.min(count, 50); i++) {
      const code = generateCode()
      const expiresAt = expires_days
        ? new Date(Date.now() + expires_days * 86400000).toISOString()
        : null

      codes.push({
        code,
        label: label || `Invitation ${new Date().toLocaleDateString('fr-FR')}`,
        active: true,
        max_uses,
        uses_count: 0,
        expires_at: expiresAt,
        created_at: new Date().toISOString()
      })
    }

    const { data, error } = await sb.from('invite_codes').insert(codes).select()
    if (error) return res.status(500).json({ ok: false, error: error.message })

    return res.status(200).json({ ok: true, codes: data.map(c => c.code), data })
  }

  // ── LIST : lister tous les codes (GET /api/invite?action=list) — admin seulement
  if (action === 'list' && req.method === 'GET') {
    const adminSecret = req.headers['x-admin-secret']
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ ok: false, error: 'Non autorisé' })
    }

    const { data, error } = await sb
      .from('invite_codes')
      .select('*, invite_uses(user_email, used_at)')
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ ok: false, error: error.message })
    return res.status(200).json({ ok: true, codes: data })
  }

  // ── REVOKE : désactiver un code (POST /api/invite?action=revoke) — admin seulement
  if (action === 'revoke' && req.method === 'POST') {
    const adminSecret = req.headers['x-admin-secret']
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ ok: false, error: 'Non autorisé' })
    }

    const { code } = req.body
    const { error } = await sb
      .from('invite_codes')
      .update({ active: false })
      .eq('code', code.toUpperCase())

    if (error) return res.status(500).json({ ok: false, error: error.message })
    return res.status(200).json({ ok: true })
  }

  return res.status(404).json({ ok: false, error: 'Action inconnue' })
}

function generateCode() {
  // Format: MANSA-XXXX-XXXX (lisible, 8 caractères alphanumériques)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sans 0/O/1/I pour éviter confusions
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `MANSA-${seg()}-${seg()}`
}

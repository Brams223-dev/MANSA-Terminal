// pages/admin/invites.js
// Panel admin Ghost — génération et gestion des codes d'invitation
// Accès protégé par ADMIN_SECRET

import { useState, useEffect } from 'react'
import Head from 'next/head'

export default function AdminInvites() {
  const [secret, setSecret] = useState('')
  const [authed, setAuthed] = useState(false)
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(false)
  const [genCount, setGenCount] = useState(1)
  const [genLabel, setGenLabel] = useState('')
  const [genMaxUses, setGenMaxUses] = useState('')
  const [genExpiry, setGenExpiry] = useState('')
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('ok')
  const [copied, setCopied] = useState('')

  async function login(e) {
    e.preventDefault()
    setLoading(true)
    const r = await fetch('/api/invite?action=list', { headers: { 'x-admin-secret': secret } })
    const d = await r.json()
    setLoading(false)
    if (d.ok) { setAuthed(true); setCodes(d.codes || []) }
    else showMsg('Secret incorrect', 'err')
  }

  async function loadCodes() {
    const r = await fetch('/api/invite?action=list', { headers: { 'x-admin-secret': secret } })
    const d = await r.json()
    if (d.ok) setCodes(d.codes || [])
  }

  async function generate() {
    setLoading(true)
    const r = await fetch('/api/invite?action=generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
      body: JSON.stringify({
        count: parseInt(genCount) || 1,
        label: genLabel || undefined,
        max_uses: genMaxUses ? parseInt(genMaxUses) : null,
        expires_days: genExpiry ? parseInt(genExpiry) : null,
      })
    })
    const d = await r.json()
    setLoading(false)
    if (d.ok) {
      showMsg(`${d.codes.length} code(s) créé(s) : ${d.codes.join(', ')}`, 'ok')
      await loadCodes()
    } else showMsg(d.error, 'err')
  }

  async function revoke(code) {
    if (!confirm(`Désactiver le code ${code} ?`)) return
    const r = await fetch('/api/invite?action=revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-secret': secret },
      body: JSON.stringify({ code })
    })
    const d = await r.json()
    if (d.ok) { showMsg('Code désactivé', 'ok'); await loadCodes() }
    else showMsg(d.error, 'err')
  }

  function copyLink(code) {
    const link = `${window.location.origin}/invite/${code}`
    navigator.clipboard.writeText(link)
    setCopied(code)
    setTimeout(() => setCopied(''), 2000)
  }

  function showMsg(text, type) {
    setMsg(text); setMsgType(type)
    setTimeout(() => setMsg(''), 5000)
  }

  const s = {
    page: { minHeight: '100vh', background: '#06060f', fontFamily: "'Space Mono', monospace", color: '#fff', padding: '24px' },
    h1: { fontFamily: "'Syne', sans-serif", fontSize: '20px', fontWeight: '900', color: '#c8a03c', marginBottom: '4px' },
    card: { background: '#0b0b18', border: '1px solid rgba(255,255,255,.08)', borderRadius: '12px', padding: '20px', marginBottom: '16px' },
    label: { fontSize: '9px', fontWeight: '700', color: 'rgba(255,255,255,.4)', letterSpacing: '.1em', textTransform: 'uppercase', display: 'block', marginBottom: '5px' },
    input: { background: '#0f0f1e', border: '1px solid rgba(255,255,255,.1)', borderRadius: '7px', padding: '9px 12px', color: '#fff', fontFamily: "'Space Mono', monospace", fontSize: '10px', outline: 'none', boxSizing: 'border-box' },
    btn: (color='gold') => ({
      background: color==='gold'?'linear-gradient(135deg,#c8a03c,#e8c060)':color==='red'?'rgba(224,82,82,.15)':'rgba(68,136,255,.15)',
      border: color==='gold'?'none':color==='red'?'1px solid rgba(224,82,82,.4)':'1px solid rgba(68,136,255,.4)',
      borderRadius: '6px', padding: '8px 16px',
      color: color==='gold'?'#06060f':color==='red'?'#e05252':'#4488ff',
      fontFamily: "'Space Mono', monospace", fontSize: '10px', fontWeight: '700',
      cursor: 'pointer', letterSpacing: '.06em',
    }),
    badge: (active) => ({
      display: 'inline-block', padding: '2px 8px', borderRadius: '12px',
      fontSize: '8px', fontWeight: '700',
      background: active?'rgba(0,200,120,.15)':'rgba(224,82,82,.12)',
      color: active?'#00c878':'#e05252',
      border: active?'1px solid rgba(0,200,120,.3)':'1px solid rgba(224,82,82,.3)',
    }),
  }

  if (!authed) return (
    <>
      <Head>
        <title>Admin · Mansa Terminal</title>
        <meta name="robots" content="noindex" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;900&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ ...s.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ ...s.card, maxWidth: '340px', width: '100%' }}>
          <div style={{ ...s.h1, textAlign: 'center', marginBottom: '20px' }}>🔐 Admin Access</div>
          <form onSubmit={login}>
            <label style={s.label}>Clé secrète admin</label>
            <input style={{ ...s.input, width: '100%', marginBottom: '14px' }} type="password" value={secret} onChange={e => setSecret(e.target.value)} placeholder="ADMIN_SECRET" required />
            <button style={{ ...s.btn('gold'), width: '100%', padding: '11px' }} type="submit" disabled={loading}>
              {loading ? '...' : 'CONNEXION'}
            </button>
          </form>
        </div>
      </div>
    </>
  )

  const active = codes.filter(c => c.active)
  const inactive = codes.filter(c => !c.active)

  return (
    <>
      <Head>
        <title>Admin Invitations · Mansa</title>
        <meta name="robots" content="noindex" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;900&display=swap" rel="stylesheet" />
      </Head>
      <div style={s.page}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={s.h1}>🎯 Gestion des invitations</div>
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,.3)' }}>Mansa Terminal · Panel Admin</div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ background: 'rgba(0,200,120,.1)', border: '1px solid rgba(0,200,120,.2)', borderRadius: '8px', padding: '8px 14px', fontSize: '10px', color: '#00c878' }}>✅ {active.length} actifs</div>
              <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: '8px', padding: '8px 14px', fontSize: '10px', color: 'rgba(255,255,255,.4)' }}>Total: {codes.length}</div>
            </div>
          </div>

          {msg && (
            <div style={{ background: msgType==='ok'?'rgba(0,200,120,.1)':'rgba(224,82,82,.1)', border: `1px solid ${msgType==='ok'?'rgba(0,200,120,.3)':'rgba(224,82,82,.3)'}`, borderRadius: '8px', padding: '10px 16px', marginBottom: '16px', fontSize: '10px', color: msgType==='ok'?'#00c878':'#e05252' }}>
              {msgType==='ok'?'✅':'❌'} {msg}
            </div>
          )}

          {/* Génération */}
          <div style={s.card}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#c8a03c', marginBottom: '14px' }}>➕ Générer des codes d'invitation</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={s.label}>Nombre de codes</label>
                <input style={{ ...s.input, width: '100%' }} type="number" min="1" max="20" value={genCount} onChange={e => setGenCount(e.target.value)} />
              </div>
              <div>
                <label style={s.label}>Label (optionnel)</label>
                <input style={{ ...s.input, width: '100%' }} type="text" placeholder="Ex: Élèves nov. 2026" value={genLabel} onChange={e => setGenLabel(e.target.value)} />
              </div>
              <div>
                <label style={s.label}>Max utilisations</label>
                <input style={{ ...s.input, width: '100%' }} type="number" min="1" placeholder="Illimité" value={genMaxUses} onChange={e => setGenMaxUses(e.target.value)} />
              </div>
              <div>
                <label style={s.label}>Expire dans (jours)</label>
                <input style={{ ...s.input, width: '100%' }} type="number" min="1" placeholder="Jamais" value={genExpiry} onChange={e => setGenExpiry(e.target.value)} />
              </div>
            </div>
            <button style={s.btn('gold')} onClick={generate} disabled={loading}>
              {loading ? '⌛...' : `🔑 Générer ${genCount} code(s)`}
            </button>
          </div>

          {/* Liste codes actifs */}
          <div style={s.card}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#00c878', marginBottom: '14px' }}>✅ Codes actifs ({active.length})</div>
            {active.length === 0 && <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.3)', textAlign: 'center', padding: '20px' }}>Aucun code actif</div>}
            {active.map(c => (
              <div key={c.code} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px', borderBottom: '1px solid rgba(255,255,255,.04)', flexWrap: 'wrap' }}>
                <code style={{ color: '#c8a03c', fontSize: '11px', fontWeight: '700', flex: '1', minWidth: '180px' }}>{c.code}</code>
                <div style={{ fontSize: '9px', color: 'rgba(255,255,255,.4)', flex: '1' }}>
                  {c.label && <span style={{ color: 'rgba(255,255,255,.6)', marginRight: '8px' }}>{c.label}</span>}
                  <span>{c.uses_count || 0}{c.max_uses ? `/${c.max_uses}` : ''} use(s)</span>
                  {c.expires_at && <span style={{ marginLeft: '8px', color: new Date(c.expires_at) < new Date() ? '#e05252' : 'rgba(255,255,255,.3)' }}>· exp. {new Date(c.expires_at).toLocaleDateString('fr-FR')}</span>}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button style={s.btn('blue')} onClick={() => copyLink(c.code)}>
                    {copied === c.code ? '✅ Copié !' : '🔗 Lien'}
                  </button>
                  <button style={s.btn('red')} onClick={() => revoke(c.code)}>✕ Révoquer</button>
                </div>
              </div>
            ))}
          </div>

          {/* Codes inactifs */}
          {inactive.length > 0 && (
            <div style={s.card}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,.3)', marginBottom: '14px' }}>⛔ Codes désactivés ({inactive.length})</div>
              {inactive.map(c => (
                <div key={c.code} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderBottom: '1px solid rgba(255,255,255,.03)', opacity: '.5' }}>
                  <code style={{ color: 'rgba(255,255,255,.4)', fontSize: '11px', flex: '1' }}>{c.code}</code>
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,.3)' }}>{c.uses_count || 0} use(s) · {c.label || ''}</div>
                </div>
              ))}
            </div>
          )}

          {/* Utilisations récentes */}
          <div style={s.card}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#4488ff', marginBottom: '14px' }}>👥 Membres inscrits</div>
            {codes.flatMap(c => (c.invite_uses || []).map(u => ({ ...u, code: c.code }))).length === 0
              ? <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.3)', textAlign: 'center', padding: '16px' }}>Aucune inscription pour l'instant</div>
              : codes.flatMap(c => (c.invite_uses || []).map(u => ({ ...u, code: c.code })))
                  .sort((a,b) => new Date(b.used_at) - new Date(a.used_at))
                  .map((u, i) => (
                    <div key={i} style={{ display: 'flex', gap: '10px', padding: '8px', borderBottom: '1px solid rgba(255,255,255,.04)', fontSize: '9px' }}>
                      <span style={{ color: '#4488ff' }}>👤 {u.user_email}</span>
                      <span style={{ color: 'rgba(255,255,255,.4)' }}>via {u.code}</span>
                      <span style={{ color: 'rgba(255,255,255,.3)', marginLeft: 'auto' }}>{new Date(u.used_at).toLocaleString('fr-FR')}</span>
                    </div>
                  ))
            }
          </div>
        </div>
      </div>
    </>
  )
}

// pages/admin/index.js
// Dashboard admin central — Mansa Terminal

import { useState, useEffect, useCallback } from 'react'
import Head from 'next/head'
import Link from 'next/link'

const S = {
  page: { minHeight:'100vh', background:'#06060f', fontFamily:"'Space Mono',monospace", color:'#d8d8ee', padding:'0' },
  topbar: { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 24px', background:'#0b0b18', borderBottom:'1px solid rgba(200,160,60,.15)', position:'sticky', top:0, zIndex:100 },
  logo: { fontFamily:"'Syne',sans-serif", fontSize:'18px', fontWeight:'900', background:'linear-gradient(135deg,#c8a03c,#e8c060)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', letterSpacing:'.2em' },
  badge: (c='gold') => ({
    display:'inline-flex', alignItems:'center', gap:'5px', padding:'4px 10px', borderRadius:'20px', fontSize:'8px', fontWeight:'700', letterSpacing:'.08em',
    background: c==='gold'?'rgba(200,160,60,.12)':c==='green'?'rgba(0,200,120,.12)':c==='red'?'rgba(224,82,82,.12)':'rgba(68,136,255,.12)',
    border: `1px solid ${c==='gold'?'rgba(200,160,60,.3)':c==='green'?'rgba(0,200,120,.3)':c==='red'?'rgba(224,82,82,.3)':'rgba(68,136,255,.3)'}`,
    color: c==='gold'?'#c8a03c':c==='green'?'#00c878':c==='red'?'#e05252':'#4488ff',
  }),
  card: { background:'#0b0b18', border:'1px solid rgba(255,255,255,.07)', borderRadius:'12px', padding:'20px', marginBottom:'16px' },
  statCard: { background:'#0f0f1e', border:'1px solid rgba(255,255,255,.06)', borderRadius:'10px', padding:'16px 20px', flex:'1', minWidth:'140px' },
  input: { background:'#0f0f1e', border:'1px solid rgba(255,255,255,.1)', borderRadius:'7px', padding:'9px 12px', color:'#fff', fontFamily:"'Space Mono',monospace", fontSize:'10px', outline:'none', boxSizing:'border-box' },
  btn: (c='gold') => ({
    background: c==='gold'?'linear-gradient(135deg,#c8a03c,#e8c060)':c==='red'?'rgba(224,82,82,.15)':c==='blue'?'rgba(68,136,255,.15)':'rgba(255,255,255,.07)',
    border: c==='gold'?'none':c==='red'?'1px solid rgba(224,82,82,.4)':c==='blue'?'1px solid rgba(68,136,255,.4)':'1px solid rgba(255,255,255,.1)',
    borderRadius:'7px', padding:'8px 16px',
    color: c==='gold'?'#06060f':c==='red'?'#e05252':c==='blue'?'#4488ff':'rgba(255,255,255,.7)',
    fontFamily:"'Space Mono',monospace", fontSize:'10px', fontWeight:'700', cursor:'pointer', letterSpacing:'.06em',
  }),
  label: { fontSize:'9px', fontWeight:'700', color:'rgba(255,255,255,.4)', letterSpacing:'.1em', textTransform:'uppercase', display:'block', marginBottom:'5px' },
  sectionTitle: { fontSize:'11px', fontWeight:'700', letterSpacing:'.06em', marginBottom:'16px', display:'flex', alignItems:'center', gap:'8px' },
  tab: (active) => ({
    padding:'9px 16px', fontSize:'10px', fontWeight:'700', cursor:'pointer', letterSpacing:'.06em',
    color: active?'#c8a03c':'rgba(255,255,255,.35)',
    borderBottom: active?'2px solid #c8a03c':'2px solid transparent',
    transition:'all .2s', background:'none', border:'none', fontFamily:"'Space Mono',monospace",
  }),
}

export default function AdminDashboard() {
  const [secret, setSecret] = useState('')
  const [authed, setAuthed] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('ok')
  const [search, setSearch] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  const hdr = useCallback(() => ({ 'x-admin-secret': secret }), [secret])

  function showMsg(text, type='ok') {
    setMsg(text); setMsgType(type)
    setTimeout(() => setMsg(''), 4000)
  }

  async function login(e) {
    e.preventDefault()
    setLoading(true)
    const r = await fetch('/api/admin?action=stats', { headers: hdr() })
    const d = await r.json()
    setLoading(false)
    if (d.ok) { setAuthed(true); setStats(d.stats); loadMembers() }
    else showMsg('Secret incorrect', 'err')
  }

  async function loadStats() {
    const r = await fetch('/api/admin?action=stats', { headers: hdr() })
    const d = await r.json()
    if (d.ok) setStats(d.stats)
  }

  async function loadMembers() {
    setLoading(true)
    const r = await fetch('/api/admin?action=members', { headers: hdr() })
    const d = await r.json()
    setLoading(false)
    if (d.ok) setMembers(d.members || [])
    else showMsg(d.error, 'err')
  }

  async function deleteUser(id, email) {
    if (confirmDelete !== id) { setConfirmDelete(id); return }
    setConfirmDelete(null)
    const r = await fetch('/api/admin?action=delete_user', {
      method: 'DELETE',
      headers: { ...hdr(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: id })
    })
    const d = await r.json()
    if (d.ok) { showMsg(`${email} supprimé`, 'ok'); loadMembers(); loadStats() }
    else showMsg(d.error, 'err')
  }

  useEffect(() => {
    if (authed && activeTab === 'members') loadMembers()
    if (authed && activeTab === 'dashboard') loadStats()
  }, [activeTab, authed])

  const filtered = members.filter(m =>
    m.email?.toLowerCase().includes(search.toLowerCase()) ||
    m.username?.toLowerCase().includes(search.toLowerCase()) ||
    (m.invite_code || '').toLowerCase().includes(search.toLowerCase())
  )

  // ── LOGIN ──
  if (!authed) return (
    <>
      <Head>
        <title>Admin · Mansa Terminal</title>
        <meta name="robots" content="noindex" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;900&display=swap" rel="stylesheet" />
      </Head>
      <div style={{ ...S.page, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ ...S.card, maxWidth:'360px', width:'100%', boxShadow:'0 0 60px rgba(200,160,60,.06)' }}>
          <div style={{ textAlign:'center', marginBottom:'28px' }}>
            <div style={S.logo}>MANSA</div>
            <div style={{ fontSize:'9px', color:'rgba(200,160,60,.4)', letterSpacing:'.2em', marginTop:'4px' }}>ADMIN DASHBOARD</div>
          </div>
          {msg && <div style={{ background:'rgba(224,82,82,.1)', border:'1px solid rgba(224,82,82,.3)', borderRadius:'8px', padding:'10px', marginBottom:'14px', fontSize:'10px', color:'#e05252' }}>❌ {msg}</div>}
          <form onSubmit={login}>
            <label style={S.label}>Clé secrète admin</label>
            <input style={{ ...S.input, width:'100%', marginBottom:'14px' }} type="password" value={secret} onChange={e => setSecret(e.target.value)} placeholder="ADMIN_SECRET" required />
            <button style={{ ...S.btn('gold'), width:'100%', padding:'11px' }} type="submit" disabled={loading}>
              {loading ? '...' : '🔐 ACCÉDER AU DASHBOARD'}
            </button>
          </form>
        </div>
      </div>
    </>
  )

  // ── DASHBOARD ──
  return (
    <>
      <Head>
        <title>Admin · Mansa Terminal</title>
        <meta name="robots" content="noindex" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;900&display=swap" rel="stylesheet" />
      </Head>
      <div style={S.page}>

        {/* Topbar */}
        <div style={S.topbar}>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={S.logo}>MANSA</div>
            <div style={{ fontSize:'9px', color:'rgba(200,160,60,.4)', letterSpacing:'.15em' }}>ADMIN</div>
          </div>
          <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
            <a href="/terminal.html" target="_blank" style={{ ...S.btn('blue'), textDecoration:'none', fontSize:'9px' }}>🖥️ Terminal</a>
            <div style={{ fontSize:'9px', color:'rgba(255,255,255,.25)' }}>Ghost · Admin</div>
          </div>
        </div>

        {/* Message flash */}
        {msg && (
          <div style={{ margin:'12px 24px 0', background:msgType==='ok'?'rgba(0,200,120,.1)':'rgba(224,82,82,.1)', border:`1px solid ${msgType==='ok'?'rgba(0,200,120,.3)':'rgba(224,82,82,.3)'}`, borderRadius:'8px', padding:'10px 16px', fontSize:'10px', color:msgType==='ok'?'#00c878':'#e05252' }}>
            {msgType==='ok'?'✅':'❌'} {msg}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,.07)', padding:'0 24px', marginTop:'8px', background:'#0b0b18' }}>
          {[
            {id:'dashboard', label:'📊 Dashboard'},
            {id:'members', label:'👥 Membres'},
            {id:'invites', label:'🎟️ Invitations'},
          ].map(t => (
            <button key={t.id} style={S.tab(activeTab===t.id)} onClick={() => setActiveTab(t.id)}>{t.label}</button>
          ))}
        </div>

        <div style={{ padding:'24px', maxWidth:'1100px', margin:'0 auto' }}>

          {/* ── DASHBOARD TAB ── */}
          {activeTab === 'dashboard' && (
            <>
              <div style={{ ...S.sectionTitle, color:'#c8a03c' }}>📊 Vue d'ensemble</div>

              {/* Stats cards */}
              <div style={{ display:'flex', gap:'12px', flexWrap:'wrap', marginBottom:'24px' }}>
                {[
                  { label:'Membres total', value:stats?.totalUsers ?? '—', icon:'👥', color:'blue' },
                  { label:'Inscrits (7j)', value:stats?.recent7d ?? '—', icon:'🆕', color:'green' },
                  { label:'Codes actifs', value:stats?.activeCodes ?? '—', icon:'🎟️', color:'gold' },
                  { label:'Invitations utilisées', value:stats?.totalUses ?? '—', icon:'✅', color:'green' },
                ].map((s, i) => (
                  <div key={i} style={S.statCard}>
                    <div style={{ fontSize:'18px', marginBottom:'6px' }}>{s.icon}</div>
                    <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'24px', fontWeight:'900', color:s.color==='gold'?'#c8a03c':s.color==='green'?'#00c878':'#4488ff', marginBottom:'4px' }}>{s.value}</div>
                    <div style={{ fontSize:'9px', color:'rgba(255,255,255,.35)', letterSpacing:'.08em', textTransform:'uppercase' }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Liens rapides */}
              <div style={S.card}>
                <div style={{ ...S.sectionTitle, color:'rgba(255,255,255,.6)' }}>🔗 Accès rapides</div>
                <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
                  <button style={S.btn('gold')} onClick={() => setActiveTab('members')}>👥 Gérer les membres</button>
                  <button style={S.btn('blue')} onClick={() => setActiveTab('invites')}>🎟️ Codes d'invitation</button>
                  <a href="/terminal.html" target="_blank" style={{ ...S.btn(), textDecoration:'none' }}>🖥️ Ouvrir le terminal</a>
                  <button style={S.btn()} onClick={() => { loadStats(); showMsg('Stats actualisées', 'ok') }}>🔄 Actualiser</button>
                </div>
              </div>

              {/* Info système */}
              <div style={S.card}>
                <div style={{ ...S.sectionTitle, color:'rgba(255,255,255,.6)' }}>⚙️ Système</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'10px', fontSize:'10px' }}>
                  {[
                    { label:'Terminal', value:'mansa-backend.vercel.app/terminal.html', ok:true },
                    { label:'Panel invitations', value:'/admin/invites', ok:true },
                    { label:'API invite', value:'/api/invite', ok:true },
                    { label:'API admin', value:'/api/admin', ok:true },
                    { label:'Supabase', value:'dzekclzjfwzlwjqcbplh.supabase.co', ok:true },
                    { label:'Anthropic IA', value:'Ajouter ANTHROPIC_API_KEY sur Vercel', ok:false },
                  ].map((item, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:'8px', padding:'8px', background:'rgba(255,255,255,.02)', borderRadius:'6px' }}>
                      <span style={{ color:item.ok?'#00c878':'#e05252', flexShrink:0 }}>{item.ok?'✅':'⚠️'}</span>
                      <div>
                        <div style={{ fontSize:'8px', color:'rgba(255,255,255,.35)', letterSpacing:'.06em', textTransform:'uppercase', marginBottom:'2px' }}>{item.label}</div>
                        <div style={{ color:item.ok?'rgba(255,255,255,.7)':'#e05252', fontSize:'9px', wordBreak:'break-all' }}>{item.value}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── MEMBERS TAB ── */}
          {activeTab === 'members' && (
            <>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px', flexWrap:'wrap', gap:'10px' }}>
                <div style={{ ...S.sectionTitle, color:'#4488ff', margin:0 }}>👥 Membres ({filtered.length})</div>
                <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                  <input
                    style={{ ...S.input, width:'200px' }}
                    placeholder="Rechercher..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                  <button style={S.btn()} onClick={loadMembers}>🔄</button>
                </div>
              </div>

              {loading && <div style={{ textAlign:'center', padding:'30px', color:'rgba(255,255,255,.3)', fontSize:'10px' }}>Chargement...</div>}

              {!loading && filtered.length === 0 && (
                <div style={{ textAlign:'center', padding:'40px', color:'rgba(255,255,255,.25)', fontSize:'10px' }}>Aucun membre</div>
              )}

              {!loading && filtered.map(m => (
                <div key={m.id} style={{ ...S.card, padding:'14px 18px', marginBottom:'8px', display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap' }}>
                  <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'linear-gradient(135deg,rgba(68,136,255,.2),rgba(68,136,255,.08))', border:'1px solid rgba(68,136,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', flexShrink:0 }}>
                    {(m.username||'?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex:'1', minWidth:'160px' }}>
                    <div style={{ fontSize:'11px', fontWeight:'700', color:'#d8d8ee' }}>{m.username}</div>
                    <div style={{ fontSize:'9px', color:'rgba(255,255,255,.4)', marginTop:'2px' }}>{m.email}</div>
                  </div>
                  <div style={{ fontSize:'9px', color:'rgba(255,255,255,.3)', minWidth:'100px' }}>
                    <div>Inscrit {new Date(m.created_at).toLocaleDateString('fr-FR')}</div>
                    {m.last_sign_in && <div style={{ marginTop:'2px' }}>Connexion {new Date(m.last_sign_in).toLocaleDateString('fr-FR')}</div>}
                  </div>
                  {m.invite_code && (
                    <div style={{ fontSize:'8px', background:'rgba(200,160,60,.08)', border:'1px solid rgba(200,160,60,.2)', borderRadius:'5px', padding:'3px 8px', color:'rgba(200,160,60,.7)', letterSpacing:'.1em' }}>
                      {m.invite_code}
                    </div>
                  )}
                  <span style={S.badge(m.confirmed?'green':'red')}>{m.confirmed?'✓ Confirmé':'⚠ Non confirmé'}</span>
                  <button
                    style={S.btn('red')}
                    onClick={() => deleteUser(m.id, m.email)}
                  >
                    {confirmDelete === m.id ? '⚠️ Confirmer ?' : '✕ Supprimer'}
                  </button>
                </div>
              ))}
            </>
          )}

          {/* ── INVITES TAB ── */}
          {activeTab === 'invites' && (
            <div style={{ textAlign:'center', paddingTop:'40px' }}>
              <div style={{ fontSize:'32px', marginBottom:'16px' }}>🎟️</div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:'18px', fontWeight:'900', color:'#c8a03c', marginBottom:'8px' }}>Gestion des invitations</div>
              <div style={{ fontSize:'10px', color:'rgba(255,255,255,.35)', marginBottom:'24px' }}>Générer, copier et révoquer les codes d'invitation</div>
              <a
                href="/admin/invites"
                style={{ ...S.btn('gold'), textDecoration:'none', display:'inline-block', padding:'12px 28px', fontSize:'11px' }}
              >
                🔑 Ouvrir le gestionnaire d'invitations
              </a>
              <div style={{ fontSize:'9px', color:'rgba(255,255,255,.2)', marginTop:'16px' }}>/admin/invites</div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}

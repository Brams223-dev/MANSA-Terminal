// pages/invite/[code].js
// Page d'inscription sur invitation — URL: /invite/MANSA-XXXX-XXXX

import { useState, useEffect } from 'react'
import Head from 'next/head'

export default function InvitePage({ code, valid, error: initialError, label }) {
  const [step, setStep] = useState(valid ? 'form' : 'invalid')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(initialError || '')
  const [showPass, setShowPass] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password !== confirm) return setError('Les mots de passe ne correspondent pas')
    if (password.length < 8) return setError('Mot de passe trop court (8 caractères minimum)')
    if (!email.includes('@')) return setError('Email invalide')

    setLoading(true)
    try {
      const r = await fetch('/api/invite?action=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, email, password, username })
      })
      const d = await r.json()
      if (!d.ok) throw new Error(d.error)
      setStep('success')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const styles = {
    page: {
      minHeight: '100vh',
      background: '#06060f',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Space Mono', monospace",
      padding: '20px',
    },
    card: {
      background: '#0b0b18',
      border: '1px solid rgba(200,160,60,.25)',
      borderRadius: '16px',
      padding: '40px',
      maxWidth: '420px',
      width: '100%',
      boxShadow: '0 0 60px rgba(200,160,60,.06), 0 20px 60px rgba(0,0,0,.5)',
    },
    logo: {
      textAlign: 'center',
      marginBottom: '32px',
    },
    logoText: {
      fontFamily: "'Syne', sans-serif",
      fontSize: '24px',
      fontWeight: '900',
      background: 'linear-gradient(135deg, #c8a03c, #e8c060)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      letterSpacing: '.15em',
    },
    logoSub: {
      fontSize: '9px',
      color: 'rgba(200,160,60,.5)',
      letterSpacing: '.2em',
      marginTop: '4px',
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      background: 'rgba(0,200,120,.1)',
      border: '1px solid rgba(0,200,120,.3)',
      borderRadius: '20px',
      padding: '5px 14px',
      fontSize: '9px',
      color: '#00c878',
      marginBottom: '20px',
      fontWeight: '700',
      letterSpacing: '.08em',
    },
    title: {
      fontSize: '18px',
      fontWeight: '800',
      color: '#fff',
      marginBottom: '8px',
      fontFamily: "'Syne', sans-serif",
    },
    sub: {
      fontSize: '10px',
      color: 'rgba(255,255,255,.4)',
      marginBottom: '28px',
      lineHeight: '1.5',
    },
    label: {
      display: 'block',
      fontSize: '9px',
      fontWeight: '700',
      color: 'rgba(255,255,255,.5)',
      marginBottom: '6px',
      letterSpacing: '.08em',
      textTransform: 'uppercase',
    },
    input: {
      width: '100%',
      background: '#0f0f1e',
      border: '1px solid rgba(255,255,255,.1)',
      borderRadius: '8px',
      padding: '11px 14px',
      color: '#fff',
      fontSize: '11px',
      fontFamily: "'Space Mono', monospace",
      outline: 'none',
      boxSizing: 'border-box',
      marginBottom: '14px',
      transition: 'border-color .2s',
    },
    btn: {
      width: '100%',
      background: 'linear-gradient(135deg, #c8a03c, #e8c060)',
      border: 'none',
      borderRadius: '8px',
      padding: '13px',
      color: '#06060f',
      fontSize: '11px',
      fontWeight: '900',
      fontFamily: "'Space Mono', monospace",
      cursor: 'pointer',
      letterSpacing: '.08em',
      marginTop: '4px',
    },
    error: {
      background: 'rgba(224,82,82,.1)',
      border: '1px solid rgba(224,82,82,.3)',
      borderRadius: '8px',
      padding: '10px 14px',
      color: '#e05252',
      fontSize: '10px',
      marginBottom: '16px',
    },
    divider: {
      borderTop: '1px solid rgba(255,255,255,.06)',
      margin: '24px 0',
    },
    codeBox: {
      background: '#0f0f1e',
      border: '1px solid rgba(200,160,60,.2)',
      borderRadius: '8px',
      padding: '10px 14px',
      fontSize: '12px',
      color: 'rgba(200,160,60,.8)',
      letterSpacing: '.15em',
      textAlign: 'center',
      marginBottom: '20px',
      fontWeight: '700',
    },
  }

  return (
    <>
      <Head>
        <title>Rejoindre Mansa Terminal</title>
        <meta name="robots" content="noindex, nofollow" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;800;900&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}>
            <div style={styles.logoText}>MANSA</div>
            <div style={styles.logoSub}>TERMINAL</div>
          </div>

          {/* ── Code invalide ── */}
          {step === 'invalid' && (
            <>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔒</div>
                <div style={styles.title}>Lien invalide</div>
                <div style={styles.sub}>
                  Ce lien d'invitation n'est pas valide, a expiré, ou a déjà été utilisé.
                  <br /><br />
                  Contacte la personne qui t'a partagé ce lien.
                </div>
              </div>
            </>
          )}

          {/* ── Formulaire ── */}
          {step === 'form' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div style={styles.badge}>✉️ Invitation valide</div>
                <div style={styles.codeBox}>{code}</div>
                <div style={styles.title}>Créer ton accès</div>
                <div style={styles.sub}>
                  Tu as été invité(e) à rejoindre Mansa Terminal.
                  Crée ton compte pour accéder à la plateforme.
                </div>
              </div>

              {error && <div style={styles.error}>⚠️ {error}</div>}

              <form onSubmit={handleSubmit}>
                <label style={styles.label}>Nom d'utilisateur</label>
                <input
                  style={styles.input}
                  type="text"
                  placeholder="ghost_trader"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  autoComplete="username"
                />

                <label style={styles.label}>Adresse email</label>
                <input
                  style={styles.input}
                  type="email"
                  placeholder="ton@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />

                <label style={styles.label}>Mot de passe</label>
                <div style={{ position: 'relative' }}>
                  <input
                    style={styles.input}
                    type={showPass ? 'text' : 'password'}
                    placeholder="8 caractères minimum"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    style={{ position: 'absolute', right: '12px', top: '11px', background: 'none', border: 'none', color: 'rgba(255,255,255,.3)', cursor: 'pointer', fontSize: '14px' }}
                  >{showPass ? '🙈' : '👁️'}</button>
                </div>

                <label style={styles.label}>Confirmer le mot de passe</label>
                <input
                  style={styles.input}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Répète le mot de passe"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                />

                <button
                  style={{ ...styles.btn, opacity: loading ? .6 : 1 }}
                  type="submit"
                  disabled={loading}
                >
                  {loading ? '⌛ Création...' : '🚀 ACCÉDER AU TERMINAL'}
                </button>
              </form>

              <div style={styles.divider} />
              <div style={{ fontSize: '9px', color: 'rgba(255,255,255,.2)', textAlign: 'center', lineHeight: '1.5' }}>
                Accès sur invitation uniquement · Mansa Terminal par Process Trading Life
              </div>
            </>
          )}

          {/* ── Succès ── */}
          {step === 'success' && (
            <>
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
                <div style={styles.title}>Compte créé !</div>
                <div style={styles.sub}>
                  Ton accès à Mansa Terminal est activé.
                  <br />Tu peux maintenant te connecter.
                </div>
                <a
                  href="https://mansa-backend.vercel.app/terminal.html"
                  style={{
                    ...styles.btn,
                    display: 'block',
                    textDecoration: 'none',
                    textAlign: 'center',
                    marginTop: '20px',
                  }}
                >
                  🖥️ OUVRIR LE TERMINAL
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// Vérifie le code côté serveur au chargement de la page
export async function getServerSideProps({ params }) {
  const { code } = params
  if (!code) return { props: { code: '', valid: false, error: 'Code manquant' } }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mansa-backend.vercel.app'
    const r = await fetch(`${baseUrl}/api/invite?action=verify&code=${encodeURIComponent(code)}`)
    const data = await r.json()

    return {
      props: {
        code: code.toUpperCase(),
        valid: data.ok,
        error: data.ok ? null : (data.error || 'Code invalide'),
        label: data.label || null,
      }
    }
  } catch {
    return { props: { code: code.toUpperCase(), valid: false, error: 'Erreur de vérification' } }
  }
}

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─── Génération tokens ─────────────────────────────────────────────────────
function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, plan: user.plan },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );
}

function generateRefreshToken() {
  return uuidv4() + '-' + Date.now();
}

// ─── POST /auth/register ───────────────────────────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const { username, password, email, invite_code } = req.body;

    // Validation
    if (!username || !password) {
      return res.status(400).json({ error: 'Identifiant et mot de passe requis.' });
    }
    if (username.length < 3 || username.length > 30) {
      return res.status(400).json({ error: 'Identifiant : 3 à 30 caractères.' });
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({ error: 'Identifiant : lettres, chiffres, _ et - uniquement.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Mot de passe : minimum 6 caractères.' });
    }

    // Code d'invitation (optionnel — activer si tu veux un accès fermé)
    if (process.env.INVITE_CODE_REQUIRED === 'true') {
      if (!invite_code || invite_code !== process.env.INVITE_CODE) {
        return res.status(403).json({ error: 'Code d\'invitation invalide.' });
      }
    }

    // Hash mot de passe
    const password_hash = await bcrypt.hash(password, 12);

    // Créer utilisateur
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, plan, created_at`,
      [username.toLowerCase(), email || null, password_hash]
    );
    const user = result.rows[0];

    // Générer tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    const refreshHash = await bcrypt.hash(refreshToken, 8);

    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [user.id, refreshHash]
    );

    console.log(`[AUTH] Nouveau compte: ${user.username}`);

    res.status(201).json({
      message: 'Compte créé avec succès.',
      access_token: accessToken,
      refresh_token: refreshToken,
      user: { id: user.id, username: user.username, plan: user.plan }
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Identifiant et mot de passe requis.' });
    }

    // Trouver utilisateur
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username.toLowerCase()]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' });
    }
    if (!user.is_active) {
      return res.status(403).json({ error: 'Compte désactivé. Contactez l\'administrateur.' });
    }

    // Vérifier mot de passe
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' });
    }

    // Mettre à jour last_login
    await pool.query(
      'UPDATE users SET last_login = NOW(), login_count = login_count + 1 WHERE id = $1',
      [user.id]
    );

    // Tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken();
    const refreshHash = await bcrypt.hash(refreshToken, 8);

    // Nettoyer anciens refresh tokens de cet user
    await pool.query(
      'DELETE FROM refresh_tokens WHERE user_id = $1 AND expires_at < NOW()',
      [user.id]
    );
    await pool.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [user.id, refreshHash]
    );

    console.log(`[AUTH] Connexion: ${user.username}`);

    res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
      user: { id: user.id, username: user.username, plan: user.plan }
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /auth/refresh ────────────────────────────────────────────────────
router.post('/refresh', async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ error: 'refresh_token requis.' });
    }

    // Chercher tous les refresh tokens actifs et vérifier
    const tokens = await pool.query(
      `SELECT rt.*, u.username, u.plan, u.is_active
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.expires_at > NOW()`
    );

    let found = null;
    for (const row of tokens.rows) {
      const match = await bcrypt.compare(refresh_token, row.token_hash);
      if (match) { found = row; break; }
    }

    if (!found) return res.status(401).json({ error: 'Refresh token invalide ou expiré.' });
    if (!found.is_active) return res.status(403).json({ error: 'Compte désactivé.' });

    const user = { id: found.user_id, username: found.username, plan: found.plan };
    const newAccessToken = generateAccessToken(user);

    res.json({ access_token: newAccessToken });
  } catch (err) {
    next(err);
  }
});

// ─── GET /auth/me ──────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, plan, created_at, last_login, login_count FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// ─── POST /auth/logout ─────────────────────────────────────────────────────
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    // Supprimer tous les refresh tokens de l'utilisateur
    await pool.query('DELETE FROM refresh_tokens WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'Déconnexion réussie.' });
  } catch (err) {
    next(err);
  }
});

// ─── PUT /auth/password ────────────────────────────────────────────────────
router.put('/password', requireAuth, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'Mot de passe actuel et nouveau requis.' });
    }
    if (new_password.length < 6) {
      return res.status(400).json({ error: 'Nouveau mot de passe : minimum 6 caractères.' });
    }

    const result = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(current_password, result.rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Mot de passe actuel incorrect.' });

    const newHash = await bcrypt.hash(new_password, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

    res.json({ message: 'Mot de passe mis à jour.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

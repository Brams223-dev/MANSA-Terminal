const express = require('express');
const pool = require('../db/pool');
const { requireAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

const router = express.Router();
router.use(requireAdmin);

// ─── GET /admin/users ─────────────────────────────────────────────────────
router.get('/users', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, plan, is_active, created_at, last_login, login_count
       FROM users ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) { next(err); }
});

// ─── POST /admin/users/:id/activate ──────────────────────────────────────
router.post('/users/:id/activate', async (req, res, next) => {
  try {
    await pool.query('UPDATE users SET is_active = true WHERE id = $1', [req.params.id]);
    res.json({ message: 'Compte activé.' });
  } catch (err) { next(err); }
});

// ─── POST /admin/users/:id/deactivate ────────────────────────────────────
router.post('/users/:id/deactivate', async (req, res, next) => {
  try {
    await pool.query('UPDATE users SET is_active = false WHERE id = $1', [req.params.id]);
    res.json({ message: 'Compte désactivé.' });
  } catch (err) { next(err); }
});

// ─── PUT /admin/users/:id/plan ────────────────────────────────────────────
router.put('/users/:id/plan', async (req, res, next) => {
  try {
    const { plan } = req.body;
    if (!['community', 'pro', 'admin'].includes(plan)) {
      return res.status(400).json({ error: 'Plan invalide.' });
    }
    await pool.query('UPDATE users SET plan = $1 WHERE id = $2', [plan, req.params.id]);
    res.json({ message: `Plan mis à jour: ${plan}` });
  } catch (err) { next(err); }
});

// ─── DELETE /admin/users/:id ──────────────────────────────────────────────
router.delete('/users/:id', async (req, res, next) => {
  try {
    // Empêcher de supprimer son propre compte
    if (req.params.id === req.user.id) {
      return res.status(400).json({ error: 'Impossible de supprimer votre propre compte.' });
    }
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ message: 'Compte supprimé.' });
  } catch (err) { next(err); }
});

// ─── GET /admin/stats ─────────────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const [users, trades] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total,
                  SUM(CASE WHEN is_active THEN 1 ELSE 0 END) AS active,
                  SUM(CASE WHEN last_login > NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) AS weekly_active
                  FROM users`),
      pool.query('SELECT COUNT(*) AS total FROM journal_trades')
    ]);
    res.json({
      users: users.rows[0],
      trades: trades.rows[0]
    });
  } catch (err) { next(err); }
});

// ─── POST /admin/reset-password ───────────────────────────────────────────
router.post('/reset-password', async (req, res, next) => {
  try {
    const { username, new_password } = req.body;
    if (!username || !new_password) {
      return res.status(400).json({ error: 'username et new_password requis.' });
    }
    const hash = await bcrypt.hash(new_password, 12);
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING id, username',
      [hash, username.toLowerCase()]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Utilisateur introuvable.' });
    res.json({ message: `Mot de passe réinitialisé pour ${result.rows[0].username}` });
  } catch (err) { next(err); }
});

module.exports = router;

const express = require('express');
const pool = require('../db/pool');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Toutes les routes journal nécessitent une authentification
router.use(requireAuth);

// ─── GET /journal ─────────────────────────────────────────────────────────
// Récupère tous les trades de l'utilisateur connecté
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT * FROM journal_trades
       WHERE user_id = $1
       ORDER BY trade_date DESC, created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

// ─── POST /journal ────────────────────────────────────────────────────────
// Ajoute un nouveau trade
router.post('/', async (req, res, next) => {
  try {
    const {
      trade_date, pair, direction, entry, stop_loss, take_profit,
      lot_size, result: tradeResult, pips, strategy, setup, notes,
      entry_images, mgmt_images
    } = req.body;

    // Validation basique
    if (!pair || !direction || !entry || !trade_date) {
      return res.status(400).json({ error: 'Paire, direction, entrée et date sont requis.' });
    }
    if (!['BUY', 'SELL'].includes(direction)) {
      return res.status(400).json({ error: 'Direction doit être BUY ou SELL.' });
    }

    const result = await pool.query(
      `INSERT INTO journal_trades
         (user_id, trade_date, pair, direction, entry, stop_loss, take_profit,
          lot_size, result, pips, strategy, setup, notes, entry_images, mgmt_images)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       RETURNING *`,
      [
        req.user.id, trade_date, pair.toUpperCase(), direction,
        entry, stop_loss || null, take_profit || null,
        lot_size || null, tradeResult || null, pips || null,
        strategy || null, setup || null, notes || null,
        JSON.stringify(entry_images || []),
        JSON.stringify(mgmt_images || [])
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /journal/:id ─────────────────────────────────────────────────────
// Met à jour un trade (notamment pour ajouter des mgmt_images)
router.put('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      trade_date, pair, direction, entry, stop_loss, take_profit,
      lot_size, result: tradeResult, pips, strategy, setup, notes,
      entry_images, mgmt_images
    } = req.body;

    // Vérifier que le trade appartient bien à l'utilisateur
    const check = await pool.query(
      'SELECT id FROM journal_trades WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (!check.rows[0]) {
      return res.status(404).json({ error: 'Trade introuvable.' });
    }

    const result = await pool.query(
      `UPDATE journal_trades SET
         trade_date = COALESCE($1, trade_date),
         pair = COALESCE($2, pair),
         direction = COALESCE($3, direction),
         entry = COALESCE($4, entry),
         stop_loss = $5, take_profit = $6,
         lot_size = $7, result = $8, pips = $9,
         strategy = $10, setup = $11, notes = $12,
         entry_images = COALESCE($13, entry_images),
         mgmt_images = COALESCE($14, mgmt_images)
       WHERE id = $15 AND user_id = $16
       RETURNING *`,
      [
        trade_date, pair ? pair.toUpperCase() : null, direction,
        entry, stop_loss ?? null, take_profit ?? null,
        lot_size ?? null, tradeResult ?? null, pips ?? null,
        strategy ?? null, setup ?? null, notes ?? null,
        entry_images ? JSON.stringify(entry_images) : null,
        mgmt_images ? JSON.stringify(mgmt_images) : null,
        id, req.user.id
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /journal/:id ──────────────────────────────────────────────────
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM journal_trades WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Trade introuvable.' });
    }
    res.json({ message: 'Trade supprimé.' });
  } catch (err) {
    next(err);
  }
});

// ─── GET /journal/stats ───────────────────────────────────────────────────
router.get('/stats', async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT
         COUNT(*) AS total_trades,
         SUM(CASE WHEN result > 0 THEN 1 ELSE 0 END) AS wins,
         SUM(CASE WHEN result < 0 THEN 1 ELSE 0 END) AS losses,
         ROUND(SUM(result)::numeric, 2) AS total_pnl,
         ROUND(AVG(result)::numeric, 2) AS avg_result,
         ROUND(AVG(pips)::numeric, 1) AS avg_pips,
         SUM(CASE WHEN result > 0 THEN result ELSE 0 END) AS gross_profit,
         ABS(SUM(CASE WHEN result < 0 THEN result ELSE 0 END)) AS gross_loss
       FROM journal_trades
       WHERE user_id = $1`,
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;

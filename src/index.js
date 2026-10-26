require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const journalRoutes = require('./routes/journal');
const adminRoutes = require('./routes/admin');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Security middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Trop de requêtes, réessayez dans 15 minutes.' }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Trop de tentatives de connexion.' }
});

app.use(limiter);
app.use(express.json({ limit: '10mb' })); // 10MB pour les screenshots base64

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Mansa Terminal API', version: '1.0.0' });
});

app.use('/auth', authLimiter, authRoutes);
app.use('/journal', journalRoutes);
app.use('/admin', adminRoutes);

// ─── Error handler ────────────────────────────────────────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🦁 Mansa Terminal API démarré sur le port ${PORT}`);
  console.log(`   Env: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Frontend autorisé: ${process.env.FRONTEND_URL || 'tous'}\n`);
});

module.exports = app;

-- Mansa Terminal — Schéma initial
-- À exécuter sur Supabase SQL Editor ou Railway PostgreSQL

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Table users ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username    VARCHAR(50) UNIQUE NOT NULL,
  email       VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  plan        VARCHAR(20) DEFAULT 'community',  -- community | pro | admin
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  last_login  TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0
);

-- Index
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ─── Table journal_trades ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS journal_trades (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trade_date    DATE NOT NULL,
  pair          VARCHAR(20) NOT NULL,
  direction     VARCHAR(4) NOT NULL CHECK (direction IN ('BUY','SELL')),
  entry         DECIMAL(18,5) NOT NULL,
  stop_loss     DECIMAL(18,5),
  take_profit   DECIMAL(18,5),
  lot_size      DECIMAL(10,4),
  result        DECIMAL(10,2),        -- P&L en USD/€
  pips          DECIMAL(10,1),
  strategy      VARCHAR(50),
  setup         VARCHAR(50),
  notes         TEXT,
  entry_images  JSONB DEFAULT '[]',   -- array de base64 strings
  mgmt_images   JSONB DEFAULT '[]',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journal_user_id ON journal_trades(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_date ON journal_trades(trade_date DESC);

-- ─── Table refresh_tokens ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);

-- ─── Vue stats utilisateur ──────────────────────────────────────────────────
CREATE OR REPLACE VIEW user_stats AS
SELECT
  u.id,
  u.username,
  u.plan,
  COUNT(jt.id) AS total_trades,
  SUM(CASE WHEN jt.result > 0 THEN 1 ELSE 0 END) AS winning_trades,
  SUM(CASE WHEN jt.result < 0 THEN 1 ELSE 0 END) AS losing_trades,
  ROUND(SUM(jt.result)::numeric, 2) AS total_pnl,
  ROUND(AVG(jt.result)::numeric, 2) AS avg_result,
  MAX(jt.trade_date) AS last_trade_date
FROM users u
LEFT JOIN journal_trades jt ON jt.user_id = u.id
GROUP BY u.id, u.username, u.plan;

-- ─── Trigger updated_at ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_journal_updated_at
  BEFORE UPDATE ON journal_trades
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Compte admin par défaut (CHANGE LE MOT DE PASSE après!) ───────────────
-- Le hash ci-dessous correspond à 'MansaAdmin2024!' — À changer immédiatement
-- INSERT INTO users (username, email, password_hash, plan)
-- VALUES ('admin', 'admin@mansaterminal.com', '$2b$12$...', 'admin');

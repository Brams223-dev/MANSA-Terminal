-- Migration 001 : Système d'invitation Mansa Terminal
-- À exécuter dans Supabase SQL Editor

-- Table des codes d'invitation
CREATE TABLE IF NOT EXISTS invite_codes (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code        text UNIQUE NOT NULL,
  label       text,
  active      boolean DEFAULT true NOT NULL,
  max_uses    int DEFAULT NULL,       -- NULL = illimité
  uses_count  int DEFAULT 0 NOT NULL,
  expires_at  timestamptz DEFAULT NULL,
  last_used_at timestamptz DEFAULT NULL,
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- Index pour lookup rapide par code
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_active ON invite_codes(active);

-- Table des utilisations (journal d'audit)
CREATE TABLE IF NOT EXISTS invite_uses (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_code text NOT NULL REFERENCES invite_codes(code),
  user_id     uuid NOT NULL,
  user_email  text NOT NULL,
  used_at     timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invite_uses_code ON invite_uses(invite_code);
CREATE INDEX IF NOT EXISTS idx_invite_uses_user ON invite_uses(user_id);

-- Sécurité : seul le service role peut lire/écrire (pas d'accès public)
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_uses  ENABLE ROW LEVEL SECURITY;

-- Pas de policy publique → seul le service role (via ADMIN_SECRET) peut accéder
-- L'API /api/invite.js utilise getSupabaseAdmin() qui bypass le RLS

-- Commentaires
COMMENT ON TABLE invite_codes IS 'Codes d''invitation Mansa Terminal — générés par Ghost';
COMMENT ON TABLE invite_uses  IS 'Journal des utilisations de codes d''invitation';

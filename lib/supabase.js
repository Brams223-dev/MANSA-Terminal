// lib/supabase.js — Client Supabase pour Mansa Terminal
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Client public (frontend) — limité par Row Level Security
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Client admin (API routes server-side) — bypass RLS pour le scraper
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Client avec le JWT de l'utilisateur (pour les routes protégées)
export function supabaseUser(jwt) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } }
  })
}

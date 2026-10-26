-- ============================================================
-- MANSA TERMINAL — Schema Supabase
-- Colle ce fichier dans Supabase > SQL Editor > New query
-- ============================================================

-- Extension UUID (activée par défaut sur Supabase)
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────
-- TABLE : brvm_prices (cache scraper)
-- ─────────────────────────────────────────
create table if not exists public.brvm_prices (
  ticker          text primary key,
  nom             text,
  prix            numeric(12, 2) not null default 0,
  variation       numeric(6, 2) default 0,
  volume          bigint default 0,
  plus_haut       numeric(12, 2) default 0,
  plus_bas        numeric(12, 2) default 0,
  capitalisation  numeric(18, 2) default 0,
  updated_at      timestamptz default now()
);

-- Pas de RLS ici : données publiques
alter table public.brvm_prices enable row level security;
create policy "brvm_prices public read"
  on public.brvm_prices for select using (true);
-- Seul le service role (admin) peut écrire
create policy "brvm_prices admin write"
  on public.brvm_prices for all using (auth.role() = 'service_role');

-- ─────────────────────────────────────────
-- TABLE : watchlist
-- ─────────────────────────────────────────
create table if not exists public.watchlist (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  ticker      text not null,
  created_at  timestamptz default now(),
  unique(user_id, ticker)
);

alter table public.watchlist enable row level security;
create policy "watchlist own"
  on public.watchlist for all
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- TABLE : portfolio
-- ─────────────────────────────────────────
create table if not exists public.portfolio (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  ticker      text not null,
  qty         integer not null check (qty > 0),
  prix_achat  numeric(12, 2) not null check (prix_achat > 0),
  note        text,
  created_at  timestamptz default now()
);

alter table public.portfolio enable row level security;
create policy "portfolio own"
  on public.portfolio for all
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- TABLE : alertes
-- ─────────────────────────────────────────
create table if not exists public.alertes (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  ticker          text not null,
  prix            numeric(12, 2) not null,
  sens            text not null check (sens in ('>', '<')),
  actif           boolean default true,
  declenchee_at   timestamptz,
  created_at      timestamptz default now()
);

alter table public.alertes enable row level security;
create policy "alertes own"
  on public.alertes for all
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────
-- Vue utile : portfolio enrichi
-- ─────────────────────────────────────────
create or replace view public.portfolio_enrichi as
  select
    p.*,
    b.prix as cours_actuel,
    b.variation,
    b.nom,
    (b.prix * p.qty) as valeur,
    ((b.prix - p.prix_achat) * p.qty) as pnl,
    case when p.prix_achat > 0
      then round(((b.prix - p.prix_achat) / p.prix_achat * 100)::numeric, 2)
      else 0
    end as pnl_pct
  from public.portfolio p
  left join public.brvm_prices b on b.ticker = p.ticker;

-- ─────────────────────────────────────────
-- Index de performance
-- ─────────────────────────────────────────
create index if not exists idx_watchlist_user on public.watchlist(user_id);
create index if not exists idx_portfolio_user on public.portfolio(user_id);
create index if not exists idx_alertes_user_actif on public.alertes(user_id, actif);
create index if not exists idx_alertes_ticker on public.alertes(ticker) where actif = true;

-- ─────────────────────────────────────────
-- Données de démo (optionnel)
-- ─────────────────────────────────────────
insert into public.brvm_prices (ticker, nom, prix, variation, volume, capitalisation)
values
  ('SNTS', 'Sonatel', 28500, 4.8, 148420, 1710000000000),
  ('CBIBF', 'Coris Bank', 8850, 2.1, 52340, 265500000000),
  ('PALC', 'Palm Côte d''Ivoire', 6200, 1.5, 34200, 124000000000),
  ('OREC', 'OREC', 4500, -0.8, 12300, 90000000000),
  ('CPHC', 'CROWN SIEM', 1200, 0.3, 8900, 36000000000),
  ('ETIT', 'Ecobank Transnat.', 2250, 3.2, 67800, 562500000000),
  ('BOAB', 'BOA Bénin', 3400, 1.1, 23400, 85000000000),
  ('SLBC', 'SOLIBRA', 135000, 0.7, 4500, 297000000000)
on conflict (ticker) do update set
  prix = excluded.prix,
  variation = excluded.variation,
  updated_at = now();

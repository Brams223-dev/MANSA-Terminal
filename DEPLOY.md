# 🚀 Guide Déploiement Mansa Terminal Backend

## Étape 1 — Créer le projet Supabase (5 min)

1. Va sur **supabase.com** → "New project"
2. Nom : `mansa-terminal`, région : **West EU (Ireland)** ou **US East**
3. Génère un mot de passe fort → "Create project" → attends 2 min

4. Dans le dashboard Supabase : **SQL Editor** → "New query"
5. Colle tout le contenu de `sql/schema.sql` → "Run"
   ✅ Tu dois voir "Success. No rows returned"

6. Va dans **Settings > API** et note :
   - `Project URL` → ce sera `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → ce sera `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` (⚠️ secret!) → ce sera `SUPABASE_SERVICE_ROLE_KEY`

## Étape 2 — Préparer le code (2 min)

```bash
# Clone ou crée le dossier
cd mansa-terminal-backend
npm install

# Crée le fichier d'environnement local
cp .env.example .env.local
# Remplis les 3 variables avec tes clés Supabase
```

Contenu de `.env.local` :
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
SUPABASE_SERVICE_ROLE_KEY=eyJhb...
CRON_SECRET=un-secret-que-tu-inventes-ex-mansa2024secret
```

## Étape 3 — Déployer sur Vercel (3 min)

**Option A — Via GitHub (recommandé) :**
1. Crée un repo GitHub `mansa-terminal` (privé)
2. Push le code :
   ```bash
   git init && git add . && git commit -m "init mansa backend"
   git remote add origin https://github.com/TON_USER/mansa-terminal.git
   git push -u origin main
   ```
3. Va sur **vercel.com** → "New Project" → importe ton repo GitHub
4. Dans "Environment Variables", ajoute les 4 variables de ton `.env.local`
5. "Deploy" → attends 1 min

**Option B — Via CLI Vercel :**
```bash
npm install -g vercel
vercel login
vercel --prod
# Remplis les variables d'env quand demandé
```

✅ Ton API est live sur `https://mansa-terminal.vercel.app`

## Étape 4 — Configurer l'authentification Supabase

Dans **Supabase > Authentication > Settings** :
- `Site URL` : `https://mansa-terminal.vercel.app`
- `Redirect URLs` : `https://mansa-terminal.vercel.app/**`
- Active "Email confirmations" si tu veux valider les emails

## Étape 5 — Connecter le terminal HTML

Dans `mansa_terminal_nologin.html`, remplace :
```javascript
var MANSA_API = 'https://mansa-terminal.vercel.app/api'
var MANSA_SUPABASE_URL = 'https://xxxxx.supabase.co'
var MANSA_SUPABASE_KEY = 'eyJhb...' // clé anon publique
```

## Tester l'API

```bash
# Données BRVM en cache
curl https://mansa-terminal.vercel.app/api/brvm

# Forcer le scraping (avec le secret cron)
curl -H "Authorization: Bearer mansa2024secret" \
  "https://mansa-terminal.vercel.app/api/brvm?refresh=1"

# Checker les alertes (cron)
curl -H "Authorization: Bearer mansa2024secret" \
  https://mansa-terminal.vercel.app/api/alertes/check
```

## Architecture résumée

```
BRVM.org ──[cron 1h]──► /api/brvm ──► Supabase brvm_prices
                                              │
Terminal HTML ◄────────────────────────────────┘
     │
     ├── Auth Supabase (email/password)
     ├── GET /api/watchlist  ◄──► Supabase watchlist
     ├── GET /api/portfolio  ◄──► Supabase portfolio + brvm_prices
     └── GET /api/alertes    ◄──► Supabase alertes
                [cron 15min] ─────── /api/alertes/check
```

## Coût mensuel

| Service | Free tier | Limite |
|---------|-----------|--------|
| Vercel | 0€ | 100GB bandwidth, fonctions illimitées |
| Supabase | 0€ | 500MB DB, 50k users auth, 5GB transfer |
| **Total** | **0€/mois** | Suffisant pour 1000 utilisateurs |

Upgrade nécessaire seulement après ~1000 utilisateurs actifs.

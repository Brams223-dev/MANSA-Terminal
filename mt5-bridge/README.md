# 🖥️ Mansa Terminal — Bridge MT5

Ce script Python crée un pont entre le **Terminal Mansa** (browser) et **MetaTrader 5** installé sur ton PC/VPS.

Il te permet de :
- Voir tes graphiques MT5 directement dans le terminal (sans abonnement TradingView)
- Passer des ordres Market et Pending
- Gérer tes positions (modifier SL/TP, fermer)
- Trader depuis n'importe quel compte (prop firm ou compte propre)

---

## 📦 Installation

### 1. Prérequis
- Windows (MetaTrader5 Python lib = Windows only)
- Python 3.8+
- MetaTrader 5 installé et ouvert

### 2. Installer les dépendances
```bash
pip install MetaTrader5 websockets
```

### 3. Lancer le bridge

**Option A — MT5 déjà ouvert et connecté (compte actif)**
```bash
python mt5_bridge.py
```
Le bridge se connecte automatiquement au compte actif dans MT5.

**Option B — Connexion avec credentials**
```bash
python mt5_bridge.py --login 12345678 --password MonMotDePasse --server "ICMarkets-Demo"
```

**Option C — Accès depuis un autre appareil sur le réseau local**
```bash
python mt5_bridge.py --host 0.0.0.0 --port 8765
```
Puis dans le terminal Mansa, entre l'IP de ton PC (ex: `192.168.1.10`) au lieu de `localhost`.

---

## 🌐 Connexion dans le terminal

1. Lance le bridge Python sur ton PC
2. Ouvre le terminal Mansa → onglet **🖥️ TRADING MT5**
3. Paramètres bridge :
   - **Adresse** : `localhost` (ou IP de ton PC)
   - **Port** : `8765`
4. Clique **CONNECTER**

---

## ✅ Comptes supportés

Fonctionne avec **n'importe quel compte MT5** :
- Comptes réels (ton broker)
- Comptes démo
- Prop firms (FTMO, MFF, E8, The5ers, Funded Next, etc.)
- Comptes cent

Il suffit que MetaTrader 5 soit installé avec ce compte actif.

---

## 🔒 Sécurité

- Le bridge écoute sur `localhost` par défaut (inaccessible depuis internet)
- Pour l'utiliser via internet, utilise un tunnel SSH ou VPN
- Ne partage jamais ton fichier bridge lancé en `--host 0.0.0.0` sans protection

---

## 📡 API du bridge (pour développeurs)

Le bridge expose une API WebSocket JSON :

| Action | Paramètres | Retour |
|--------|------------|--------|
| `connect` | `{login, password, server}` | `{ok, account}` |
| `account` | — | `{ok, balance, equity, ...}` |
| `positions` | — | `{ok, positions:[...]}` |
| `orders` | — | `{ok, orders:[...]}` |
| `ohlcv` | `{symbol, tf, count}` | `{ok, candles:[{time,open,high,low,close}]}` |
| `tick` | `{symbol}` | `{ok, bid, ask, spread}` |
| `place_order` | `{symbol, type, volume, sl, tp, price}` | `{ok, ticket, price}` |
| `close_position` | `{ticket}` | `{ok}` |
| `modify_position` | `{ticket, sl, tp}` | `{ok}` |
| `close_all` | — | `{ok, closed, total}` |
| `history` | `{days}` | `{ok, deals:[...]}` |
| `ping` | — | `{ok, pong, mt5_connected}` |

Les événements push (sans requête) :
- `{event: "ticks", data: {EURUSD: {bid, ask, time}, ...}}` — envoyé toutes les 1.5s

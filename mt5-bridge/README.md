# MANSA TERMINAL — Bridge MT5 (V1 sécurisée)

Ce pont local permet au cockpit MANSA de lire les informations d'un MetaTrader 5 installé sur le même PC Windows.

## Périmètre V1

- Connexion au terminal MT5 déjà ouvert.
- Lecture du compte, des positions, des ordres en attente, des cotations, des bougies et de l'historique.
- **Compte démo uniquement** : la connexion à un compte réel est refusée par le bridge.
- **Lecture seule** : les actions `place_order`, `close_position`, `modify_position` et `close_all` sont refusées côté serveur.
- Écoute locale uniquement : `localhost` ou `127.0.0.1`. Les interfaces réseau telles que `0.0.0.0` sont refusées.

Cette étape ne permet donc pas encore de passer des ordres. Le trading sera réactivé dans une version ultérieure après authentification du canal local, validation des paramètres de risque, gestion des retours MT5 et tests de bout en bout sur compte démo.

## Installation

Prérequis :
- Windows
- Python 3.8+
- MetaTrader 5 installé et ouvert sur un compte démo

Installer les dépendances :

```bash
pip install MetaTrader5 websockets
```

Lancer le bridge depuis ce dossier :

```bash
python mt5_bridge.py
```

Le bridge écoute sur `ws://localhost:8765`. Ne modifie pas l'adresse d'écoute pour l'exposer sur le réseau.

## Connexion dans MANSA

1. Ouvre MetaTrader 5 sur un compte de démonstration.
2. Lance `python mt5_bridge.py` sur le même PC.
3. Dans MANSA, utilise l'adresse `localhost` et le port `8765`.
4. Vérifie que l'interface indique clairement la connexion MT5 démo.

## Multi-terminal : plusieurs comptes en parallèle

Le gestionnaire **MANSA Intelligence · Fleet Control** peut sonder plusieurs bridges en parallèle, lire l'identité et l'equity de chaque compte démo et afficher les résultats séparément. Pour que cette isolation soit réelle, chaque profil doit utiliser :

- une installation MT5 indépendante (idéalement un dossier d'installation distinct) ;
- le chemin complet de son propre `terminal64.exe` ;
- un bridge Python dédié ;
- un port local unique.

Le bridge accepte désormais `--terminal-path` et transmet ce chemin à `mt5.initialize(path=...)`. Exemple Windows, à lancer depuis le dossier `mt5-bridge` :

```powershell
# Terminal MT5 A
python mt5_bridge.py --host localhost --port 8765 --terminal-path "C:\\Program Files\\Broker A MT5\\terminal64.exe"

# Terminal MT5 B (autre installation MT5)
python mt5_bridge.py --host localhost --port 8766 --terminal-path "D:\\Trading\\Broker B MT5\\terminal64.exe"
```

Dans MANSA, crée un profil par installation avec le même port et le même chemin. Le bouton **Scanner tous les comptes** interroge chaque bridge indépendamment. Le profil connecté au graphique reste une connexion active ; le scan des autres profils ouvre une courte connexion de lecture pour relever leur compte, puis la ferme.

**Important :** chaque terminal doit déjà être installé et configuré sur le compte démo attendu. Le bridge refuse tout compte qui n'est pas en mode démo. Ne configure pas deux bridges sur le même port. N'utilise pas le même dossier MT5 pour plusieurs bridges : installe des copies indépendantes pour éviter que les processus se disputent la même instance. Le scan est une lecture ponctuelle, pas une garantie de flux temps réel permanent pour tous les comptes.

Les profils et leurs derniers relevés sont conservés dans le stockage local du navigateur. Aucun mot de passe MT5 n'est enregistré ni transmis par MANSA. Les relevés anciens peuvent devenir obsolètes ; relance le scan avant de comparer.

## MANSA Prop Intelligence

L'onglet **Prop Dashboard** permet d'associer à chaque profil local un nom de prop firm, une phase, un capital initial, un objectif de profit, une perte journalière maximale, une perte totale maximale et un mode de drawdown STATIC ou TRAILING. Les règles sont enregistrées localement dans le navigateur, par profil. Le scan récupère un snapshot MT5 (équité, balance, réalisé du jour, flottant) pour alimenter les indicateurs.

Le calcul journalier V1 additionne le réalisé du jour retourné par MT5 (commissions d'entrée incluses) et le P&L flottant. Le mode TRAILING conserve localement un plus-haut d'équité observé. Ce sont des estimations de suivi : les règles réelles peuvent se baser sur le solde, l'équité, le drawdown relatif, le fuseau horaire du serveur, une heure de reset, les pertes flottantes, des frais ou des règles de cohérence différentes. Il faut saisir les règles exactes de la société et vérifier leur méthode officielle. Le dashboard ne bloque pas les ordres et ne certifie pas qu'un challenge est conforme.

**Compatibilité actuelle :** le bridge refuse toujours les comptes MT5 dont le mode n'est pas DEMO. Certaines prop firms utilisent des comptes de démonstration même en phase funded ; d'autres configurations en compte réel ne seront pas acceptées par cette V1. Aucune restriction de sécurité n'a été levée pour cette fonctionnalité.

## Actions de lecture disponibles

| Action | Paramètres | Usage |
|---|---|---|
| `connect` | aucun | Vérifie le compte actif et refuse les comptes réels |
| `account` | — | Informations du compte |
| `positions` | — | Positions ouvertes |
| `orders` | — | Ordres en attente |
| `ohlcv` | `{symbol, tf, count}` | Bougies historiques |
| `tick` | `{symbol}` | Bid/ask |
| `history` | `{days}` | Historique des deals |
| `ping` | — | État du bridge |

Les actions d'exécution et de modification d'ordres sont explicitement bloquées côté bridge dans cette version, même si un client tente de les appeler.

## Limites et sécurité

- Le bridge est destiné à un usage local sur le PC Windows qui exécute MT5.
- Ne fournis jamais de mot de passe de compte dans une commande ou dans un dépôt Git.
- Le protocole WebSocket actuel n'est pas encore doté d'un mécanisme d'appairage/authentification robuste. Ne l'expose pas à un réseau partagé ou à Internet.
- Ce bridge est une version de développement, pas un composant certifié ni prêt pour une utilisation financière en production.

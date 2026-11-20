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

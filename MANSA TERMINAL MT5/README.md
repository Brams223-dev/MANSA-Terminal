# MANSA TERMINAL MT5

Terminal MANSA pour Windows, dont la disposition reprend la capture de référence fournie : graphique central, outils latéraux, watchlist, fiche instrument et tableau des positions. Le design et les éléments graphiques MANSA restent distincts des assets propriétaires de TradingView.

## Démarrer sur Windows

1. Installez et ouvrez MetaTrader 5 sur le PC.
2. Suivez les prérequis du [pont MT5](../mt5-bridge/README.md), puis démarrez-le dans PowerShell depuis la racine du dépôt :

   ```powershell
   python .\mt5-bridge\mt5_bridge.py
   ```

3. Ouvrez `MANSA TERMINAL MT5\index.html` dans un navigateur récent avec une connexion Internet.
4. Cliquez sur **Connecter MT5** et gardez l'adresse `localhost` et le port `8765`.

Le pont se connecte à la session déjà ouverte de MetaTrader 5. Le terminal synchronise les bougies, les informations du compte, les positions ouvertes et l'historique. Aucun identifiant MT5 n'est demandé par cette page.

## Démo et données MT5

Avant la connexion, les prix et bougies sont simulés et l'interface affiche **DÉMO · DONNÉES SIMULÉES**. Après une connexion réussie, les données du compte et les bougies proviennent du pont local MT5. Si la connexion échoue, l'interface revient au mode démo. Cette première version n'envoie aucun ordre.

## Graphique

Le graphique utilise [TradingView Lightweight Charts](https://github.com/tradingview/lightweight-charts), une bibliothèque open source sous licence Apache 2.0. L'attribution TradingView est visible dans l'interface et la bibliothèque est chargée depuis un CDN; une connexion Internet est donc requise pour le graphique.

Le design MANSA est original et ne reprend pas les éléments graphiques propriétaires de TradingView.

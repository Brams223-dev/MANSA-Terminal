#!/usr/bin/env python3
"""
MANSA TERMINAL — Bridge MT5
============================
Lance ce script sur le PC/VPS où MetaTrader 5 est installé.
Il crée un serveur WebSocket local que le terminal Mansa utilise
pour exécuter des ordres et lire les positions en temps réel.

Prérequis :
  pip install MetaTrader5 websockets asyncio

Usage :
  python mt5_bridge.py
  python mt5_bridge.py --host 0.0.0.0 --port 8765  (accès réseau local)
  python mt5_bridge.py --login 12345678 --password MonMDP --server "ICMarkets-Demo"
"""

import asyncio
import json
import argparse
import logging
import datetime
from typing import Optional

try:
    import MetaTrader5 as mt5
    MT5_AVAILABLE = True
except ImportError:
    MT5_AVAILABLE = False
    print("⚠️  MetaTrader5 non installé — pip install MetaTrader5")

try:
    import websockets
    WS_AVAILABLE = True
except ImportError:
    WS_AVAILABLE = False
    print("⚠️  websockets non installé — pip install websockets")

# ─── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    datefmt="%H:%M:%S"
)
log = logging.getLogger("MT5Bridge")

# ─── Globals ─────────────────────────────────────────────────────────────────
CONNECTED_CLIENTS = set()
MT5_CONNECTED = False

# ─── MT5 helpers ─────────────────────────────────────────────────────────────

def mt5_connect(login: Optional[int] = None,
                password: Optional[str] = None,
                server: Optional[str] = None) -> dict:
    """Initialise et connecte MT5. Retourne un dict status."""
    global MT5_CONNECTED
    if not MT5_AVAILABLE:
        return {"ok": False, "error": "MetaTrader5 non installé"}

    kwargs = {}
    if login:    kwargs["login"]    = int(login)
    if password: kwargs["password"] = password
    if server:   kwargs["server"]   = server

    if not mt5.initialize(**kwargs):
        err = mt5.last_error()
        MT5_CONNECTED = False
        return {"ok": False, "error": f"MT5 init échoué: {err}"}

    info = mt5.account_info()
    if info is None:
        MT5_CONNECTED = False
        return {"ok": False, "error": "Compte non trouvé"}

    MT5_CONNECTED = True
    log.info(f"✅ MT5 connecté — {info.name} | {info.server} | Balance: {info.balance}")
    return {
        "ok": True,
        "account": {
            "login":   info.login,
            "name":    info.name,
            "server":  info.server,
            "balance": info.balance,
            "equity":  info.equity,
            "margin":  info.margin,
            "free_margin": info.margin_free,
            "profit":  info.profit,
            "currency": info.currency,
            "leverage": info.leverage,
        }
    }


def get_account_info() -> dict:
    if not MT5_CONNECTED:
        return {"ok": False, "error": "Non connecté à MT5"}
    info = mt5.account_info()
    if info is None:
        return {"ok": False, "error": "Impossible de lire le compte"}
    return {
        "ok": True,
        "balance":      round(info.balance, 2),
        "equity":       round(info.equity, 2),
        "margin":       round(info.margin, 2),
        "free_margin":  round(info.margin_free, 2),
        "profit":       round(info.profit, 2),
        "currency":     info.currency,
        "leverage":     info.leverage,
        "name":         info.name,
        "server":       info.server,
        "login":        info.login,
    }


def get_positions() -> dict:
    if not MT5_CONNECTED:
        return {"ok": False, "error": "Non connecté"}
    positions = mt5.positions_get()
    result = []
    if positions:
        for p in positions:
            result.append({
                "ticket":   p.ticket,
                "symbol":   p.symbol,
                "type":     "BUY" if p.type == 0 else "SELL",
                "volume":   p.volume,
                "price_open": p.price_open,
                "price_current": p.price_current,
                "sl":       p.sl,
                "tp":       p.tp,
                "profit":   round(p.profit, 2),
                "swap":     round(p.swap, 2),
                "time":     datetime.datetime.fromtimestamp(p.time).strftime("%H:%M:%S"),
                "comment":  p.comment,
                "magic":    p.magic,
            })
    return {"ok": True, "positions": result}


def get_orders() -> dict:
    """Ordres en attente (pending)."""
    if not MT5_CONNECTED:
        return {"ok": False, "error": "Non connecté"}
    orders = mt5.orders_get()
    result = []
    if orders:
        type_names = {0:"BUY", 1:"SELL", 2:"BUY_LIMIT", 3:"SELL_LIMIT",
                      4:"BUY_STOP", 5:"SELL_STOP"}
        for o in orders:
            result.append({
                "ticket":  o.ticket,
                "symbol":  o.symbol,
                "type":    type_names.get(o.type, str(o.type)),
                "volume":  o.volume_current,
                "price":   o.price_open,
                "sl":      o.sl,
                "tp":      o.tp,
                "time":    datetime.datetime.fromtimestamp(o.time_setup).strftime("%H:%M:%S"),
            })
    return {"ok": True, "orders": result}


def get_tick(symbol: str) -> dict:
    if not MT5_CONNECTED:
        return {"ok": False, "error": "Non connecté"}
    tick = mt5.symbol_info_tick(symbol)
    if tick is None:
        return {"ok": False, "error": f"Symbol {symbol} introuvable"}
    return {
        "ok": True,
        "symbol": symbol,
        "bid":    tick.bid,
        "ask":    tick.ask,
        "spread": round((tick.ask - tick.bid) * 10000, 1),
        "time":   datetime.datetime.fromtimestamp(tick.time).strftime("%H:%M:%S"),
    }


def get_ohlcv(symbol: str, timeframe_str: str = "H1", count: int = 300) -> dict:
    """Récupère les bougies pour Lightweight Charts."""
    TF_MAP = {
        "M1":  mt5.TIMEFRAME_M1,  "M5":  mt5.TIMEFRAME_M5,
        "M15": mt5.TIMEFRAME_M15, "M30": mt5.TIMEFRAME_M30,
        "H1":  mt5.TIMEFRAME_H1,  "H4":  mt5.TIMEFRAME_H4,
        "D1":  mt5.TIMEFRAME_D1,  "W1":  mt5.TIMEFRAME_W1,
    }
    if not MT5_CONNECTED:
        return {"ok": False, "error": "Non connecté"}
    tf = TF_MAP.get(timeframe_str.upper(), mt5.TIMEFRAME_H1)
    bars = mt5.copy_rates_from_pos(symbol, tf, 0, count)
    if bars is None or len(bars) == 0:
        return {"ok": False, "error": f"Pas de données pour {symbol}"}
    candles = []
    for b in bars:
        candles.append({
            "time":  int(b["time"]),
            "open":  float(b["open"]),
            "high":  float(b["high"]),
            "low":   float(b["low"]),
            "close": float(b["close"]),
            "volume": int(b["tick_volume"]),
        })
    return {"ok": True, "symbol": symbol, "tf": timeframe_str, "candles": candles}


def place_order(symbol: str, order_type: str, volume: float,
                sl: float = 0.0, tp: float = 0.0,
                comment: str = "Mansa Terminal",
                price: float = 0.0) -> dict:
    """
    Passe un ordre Market ou Pending.
    order_type: BUY | SELL | BUY_LIMIT | SELL_LIMIT | BUY_STOP | SELL_STOP
    """
    if not MT5_CONNECTED:
        return {"ok": False, "error": "Non connecté à MT5"}

    # Vérifie et active le symbole
    if not mt5.symbol_select(symbol, True):
        return {"ok": False, "error": f"Symbol {symbol} non disponible chez ce broker"}

    tick = mt5.symbol_info_tick(symbol)
    if tick is None:
        return {"ok": False, "error": f"Pas de prix pour {symbol}"}

    TYPE_MAP = {
        "BUY":        (mt5.ORDER_TYPE_BUY,        tick.ask),
        "SELL":       (mt5.ORDER_TYPE_SELL,        tick.bid),
        "BUY_LIMIT":  (mt5.ORDER_TYPE_BUY_LIMIT,  price),
        "SELL_LIMIT": (mt5.ORDER_TYPE_SELL_LIMIT,  price),
        "BUY_STOP":   (mt5.ORDER_TYPE_BUY_STOP,   price),
        "SELL_STOP":  (mt5.ORDER_TYPE_SELL_STOP,   price),
    }
    if order_type not in TYPE_MAP:
        return {"ok": False, "error": f"Type d'ordre inconnu: {order_type}"}

    mt5_type, exec_price = TYPE_MAP[order_type]
    if price > 0:
        exec_price = price

    sym_info = mt5.symbol_info(symbol)
    digits = sym_info.digits if sym_info else 5

    request = {
        "action":   mt5.TRADE_ACTION_DEAL if order_type in ("BUY","SELL") else mt5.TRADE_ACTION_PENDING,
        "symbol":   symbol,
        "volume":   float(volume),
        "type":     mt5_type,
        "price":    exec_price,
        "sl":       float(sl) if sl else 0.0,
        "tp":       float(tp) if tp else 0.0,
        "deviation": 20,
        "magic":    112233,
        "comment":  comment,
        "type_time":  mt5.ORDER_TIME_GTC,
        "type_filling": mt5.ORDER_FILLING_IOC,
    }

    result = mt5.order_send(request)
    if result is None:
        return {"ok": False, "error": f"order_send retourné None: {mt5.last_error()}"}

    if result.retcode != mt5.TRADE_RETCODE_DONE:
        return {
            "ok": False,
            "error": f"Retcode {result.retcode}: {result.comment}",
            "retcode": result.retcode,
        }

    log.info(f"✅ Ordre exécuté #{result.order} — {order_type} {volume} {symbol} @ {result.price}")
    return {
        "ok": True,
        "ticket": result.order,
        "price":  result.price,
        "volume": result.volume,
        "symbol": symbol,
        "type":   order_type,
    }


def close_position(ticket: int) -> dict:
    """Ferme une position par son ticket."""
    if not MT5_CONNECTED:
        return {"ok": False, "error": "Non connecté"}

    pos = mt5.positions_get(ticket=ticket)
    if not pos:
        return {"ok": False, "error": f"Position #{ticket} non trouvée"}
    p = pos[0]

    tick = mt5.symbol_info_tick(p.symbol)
    close_price = tick.bid if p.type == 0 else tick.ask
    close_type  = mt5.ORDER_TYPE_SELL if p.type == 0 else mt5.ORDER_TYPE_BUY

    request = {
        "action":   mt5.TRADE_ACTION_DEAL,
        "symbol":   p.symbol,
        "volume":   p.volume,
        "type":     close_type,
        "position": ticket,
        "price":    close_price,
        "deviation": 20,
        "magic":    112233,
        "comment":  "Mansa Close",
        "type_filling": mt5.ORDER_FILLING_IOC,
    }

    result = mt5.order_send(request)
    if result is None or result.retcode != mt5.TRADE_RETCODE_DONE:
        err = mt5.last_error() if result is None else result.comment
        return {"ok": False, "error": f"Fermeture échouée: {err}"}

    log.info(f"✅ Position #{ticket} fermée")
    return {"ok": True, "ticket": ticket, "closed_price": result.price}


def modify_position(ticket: int, sl: float = 0.0, tp: float = 0.0) -> dict:
    """Modifie SL/TP d'une position ouverte."""
    if not MT5_CONNECTED:
        return {"ok": False, "error": "Non connecté"}

    request = {
        "action":   mt5.TRADE_ACTION_SLTP,
        "position": ticket,
        "sl":       float(sl),
        "tp":       float(tp),
    }
    result = mt5.order_send(request)
    if result is None or result.retcode != mt5.TRADE_RETCODE_DONE:
        err = mt5.last_error() if result is None else result.comment
        return {"ok": False, "error": f"Modification échouée: {err}"}
    return {"ok": True, "ticket": ticket, "sl": sl, "tp": tp}


def close_all_positions() -> dict:
    """Ferme toutes les positions ouvertes."""
    positions = mt5.positions_get()
    if not positions:
        return {"ok": True, "closed": 0}
    results = []
    for p in positions:
        r = close_position(p.ticket)
        results.append(r)
    closed = sum(1 for r in results if r["ok"])
    return {"ok": True, "closed": closed, "total": len(positions), "details": results}


def get_history(days: int = 7) -> dict:
    """Historique des trades des N derniers jours."""
    if not MT5_CONNECTED:
        return {"ok": False, "error": "Non connecté"}
    from_date = datetime.datetime.now() - datetime.timedelta(days=days)
    to_date   = datetime.datetime.now()
    deals = mt5.history_deals_get(from_date, to_date)
    result = []
    if deals:
        for d in deals:
            if d.entry == 0:  # ENTRY deals uniquement
                continue
            result.append({
                "ticket": d.ticket,
                "order":  d.order,
                "symbol": d.symbol,
                "type":   "BUY" if d.type == 0 else "SELL",
                "volume": d.volume,
                "price":  d.price,
                "profit": round(d.profit, 2),
                "time":   datetime.datetime.fromtimestamp(d.time).strftime("%Y-%m-%d %H:%M"),
                "comment": d.comment,
            })
    result.sort(key=lambda x: x["time"], reverse=True)
    return {"ok": True, "deals": result[:100]}


# ─── WebSocket handler ────────────────────────────────────────────────────────

async def handler(websocket, path=""):
    CONNECTED_CLIENTS.add(websocket)
    client_ip = websocket.remote_address[0] if websocket.remote_address else "?"
    log.info(f"🔌 Client connecté: {client_ip}")
    try:
        async for raw in websocket:
            try:
                msg = json.loads(raw)
                action = msg.get("action", "")
                response = dispatch(action, msg)
                response["_id"] = msg.get("_id")  # echo request ID
                await websocket.send(json.dumps(response))
            except Exception as e:
                await websocket.send(json.dumps({"ok": False, "error": str(e)}))
    except Exception as e:
        log.warning(f"Client déconnecté: {e}")
    finally:
        CONNECTED_CLIENTS.discard(websocket)


def dispatch(action: str, msg: dict) -> dict:
    """Route les messages vers la bonne fonction MT5."""
    log.info(f"← {action}")
    if action == "connect":
        return mt5_connect(
            login=msg.get("login"),
            password=msg.get("password"),
            server=msg.get("server"),
        )
    elif action == "account":
        return get_account_info()
    elif action == "positions":
        return get_positions()
    elif action == "orders":
        return get_orders()
    elif action == "tick":
        return get_tick(msg.get("symbol", "EURUSD"))
    elif action == "ohlcv":
        return get_ohlcv(
            symbol=msg.get("symbol", "EURUSD"),
            timeframe_str=msg.get("tf", "H1"),
            count=msg.get("count", 300),
        )
    elif action == "place_order":
        return place_order(
            symbol=msg.get("symbol", "EURUSD"),
            order_type=msg.get("type", "BUY"),
            volume=float(msg.get("volume", 0.01)),
            sl=float(msg.get("sl", 0)),
            tp=float(msg.get("tp", 0)),
            comment=msg.get("comment", "Mansa Terminal"),
            price=float(msg.get("price", 0)),
        )
    elif action == "close_position":
        return close_position(int(msg.get("ticket", 0)))
    elif action == "modify_position":
        return modify_position(
            ticket=int(msg.get("ticket", 0)),
            sl=float(msg.get("sl", 0)),
            tp=float(msg.get("tp", 0)),
        )
    elif action == "close_all":
        return close_all_positions()
    elif action == "history":
        return get_history(days=int(msg.get("days", 7)))
    elif action == "ping":
        return {"ok": True, "pong": True, "mt5_connected": MT5_CONNECTED}
    else:
        return {"ok": False, "error": f"Action inconnue: {action}"}


# ─── Broadcast tick (optionnel — live prices push) ───────────────────────────

async def broadcast_ticks(symbols: list, interval: float = 1.0):
    """Envoie les prix live à tous les clients connectés."""
    while True:
        await asyncio.sleep(interval)
        if not CONNECTED_CLIENTS or not MT5_CONNECTED:
            continue
        ticks = {}
        for sym in symbols:
            t = mt5.symbol_info_tick(sym)
            if t:
                ticks[sym] = {"bid": t.bid, "ask": t.ask,
                               "time": int(t.time)}
        if ticks:
            msg = json.dumps({"event": "ticks", "data": ticks})
            dead = set()
            for ws in CONNECTED_CLIENTS:
                try:
                    await ws.send(msg)
                except:
                    dead.add(ws)
            CONNECTED_CLIENTS -= dead


# ─── Main ─────────────────────────────────────────────────────────────────────

async def main(args):
    # Auto-connect si credentials fournis en CLI
    if args.login:
        result = mt5_connect(
            login=int(args.login),
            password=args.password,
            server=args.server,
        )
        if not result["ok"]:
            log.error(f"Connexion MT5 échouée: {result['error']}")
        else:
            log.info("MT5 connecté au démarrage")

    SYMBOLS_LIVE = ["EURUSD", "GBPUSD", "USDJPY", "GBPJPY", "XAUUSD",
                    "BTCUSD", "US30", "NAS100", "SP500"]

    log.info(f"🚀 Bridge démarré sur ws://{args.host}:{args.port}")
    log.info(f"   Terminal Mansa → Paramètres bridge → ws://{args.host}:{args.port}")

    server = await websockets.serve(handler, args.host, args.port)
    await asyncio.gather(
        server.wait_closed(),
        broadcast_ticks(SYMBOLS_LIVE, interval=1.5),
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Mansa Terminal — Bridge MT5")
    parser.add_argument("--host",     default="localhost", help="Adresse d'écoute")
    parser.add_argument("--port",     default=8765, type=int, help="Port WebSocket")
    parser.add_argument("--login",    default=None, help="Numéro de compte MT5")
    parser.add_argument("--password", default=None, help="Mot de passe MT5")
    parser.add_argument("--server",   default=None, help="Serveur broker MT5")
    args = parser.parse_args()

    if not MT5_AVAILABLE or not WS_AVAILABLE:
        print("\n❌ Dépendances manquantes. Installe :")
        print("   pip install MetaTrader5 websockets\n")
        exit(1)

    asyncio.run(main(args))

# MANSA TERMINAL MT5 — Product vision & V1 scope

## Product ambition

Build a Windows desktop trading terminal with a familiar, TradingView-inspired charting workflow and native execution through the trader's locally installed MetaTrader 5 terminal. MANSA must have its own visual identity and must not copy proprietary TradingView assets or imply an official TradingView affiliation.

## V1 — must work before expansion

- Windows desktop application with a polished dark interface.
- Multi-chart workspace: 1, 2, 4 and 6 panels; synchronized symbol, timeframe, crosshair and viewport options.
- Candlesticks, volume, watchlist, drawing tools and a focused initial indicator set.
- MT5 local bridge for account, symbol, tick, OHLCV, positions, pending orders and history.
- Demo-account trading only in the first release.
- Order ticket and chart-based order preparation with explicit confirmation.
- Position management (modify SL/TP, close) only after safety controls and end-to-end tests.
- Clear connection state and clear distinction between simulated data and broker-confirmed data.

## Product principles

1. Charting and navigation should feel familiar to experienced TradingView users, while MANSA branding, layout and implementation remain original.
2. No fake execution state: show an order as filled only after the MT5 bridge returns a broker-confirmed result; reconcile with MT5 positions/deals.
3. Risk-first defaults: show volume, estimated exposure, SL/TP and potential loss before order confirmation.
4. No engagement mechanics that pressure users to trade more. Retention should come from useful analysis, learning, personalization and trustworthy performance tools.
5. Build for localization from the start (initially French and English), keyboard accessibility and responsive desktop layouts.

## Planned differentiators (after V1 stability)

- MANSA AI Copilot: explain chart context and help formulate scenarios; never promise predictions or returns.
- MANSA What If: scenario comparison using historical data and clearly stated assumptions.
- MANSA Trade DNA: behavioral and performance analytics.
- MANSA Market Radar: volatility, unusual moves and event awareness.
- MANSA Trade Shield: configurable risk limits and pre-trade checks.
- MANSA Replay / Chart Lab: historical replay, strategy testing and reusable chart templates.

## Existing repository assets to audit and preserve

- `mt5-bridge/mt5_bridge.py`: existing Python MetaTrader5/WebSocket bridge; not approved for production use until security and execution review is complete.
- `MANSA TERMINAL MT5/index.html`: existing terminal UI prototype; inspect and selectively reuse.
- `src/`, `pages/`, `lib/`, Supabase and migrations: existing API/auth/journal infrastructure; preserve where useful after dependency, authorization and data-model review.

## Critical bridge hardening required before any live execution

The current bridge source exposes order placement, position modification and bulk-close actions over WebSocket. Before enabling any trading action:
- Keep the listener bound to loopback by default; do not expose it on LAN/public interfaces without authenticated, encrypted transport and explicit pairing.
- Add origin/host validation, per-session authentication, request validation, rate limits and replay protection.
- Remove credentials from command-line arguments; use a secure local credential flow and never log secrets.
- Add an explicit demo-only execution gate in the bridge itself, not merely in the UI.
- Require confirmation for every order and a separate confirmation for bulk-close; disable bulk-close in V1.
- Validate symbol, volume min/max/step, tick size, stops/freeze levels, filling mode, margin and trading permissions against broker metadata.
- Handle partial fills and all relevant MT5 retcodes; reconcile order, deal and position tickets before displaying final status.
- Add automated tests and manual tests against a dedicated demo account before release.

## Architecture direction

- Desktop shell: Electron + React + TypeScript is the leading option, subject to a compatibility audit of the current repository.
- Chart layer: evaluate Lightweight Charts and its applicable license/attribution; do not assume TradingView Advanced Charts is freely embeddable.
- Local execution: a hardened Windows MANSA CONNECT process talks to the locally installed MT5 terminal.
- Existing Next.js/Supabase services may support accounts, preferences and journal features, but cloud services must never be treated as a direct substitute for the local MT5 terminal.
- Keep charting, broker connectivity, order state, analytics and UI as separate modules.

## Release gates

No release is considered ready until Windows packaging, clean-install testing, chart performance, multi-chart synchronization, bridge security review, demo order lifecycle tests, data-source/licensing review, crash recovery and clear user-facing risk disclosures are complete.

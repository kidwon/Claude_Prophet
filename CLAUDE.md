# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

Claude Prophet is an AI-powered autonomous options trading system. It connects Claude Code agents to live/paper trading via:
- A **Go HTTP backend** (port 4534) that interfaces with Alpaca Markets API
- A **Node.js MCP server** that exposes 40+ trading tools to Claude Code
- A **React dashboard** for visualization
- A **SQLite database** with vector similarity search for trade memory

All trading operations must go through MCP tools—never call Alpaca directly.

## Build & Run Commands

### Go Backend
```bash
go build -o prophet_bot ./cmd/bot   # Build binary
./prophet_bot                        # Run (requires .env)
```

### Dashboard
```bash
cd dashboard
npm install
npm run dev       # Dev server on :5173
npm run build     # Build to dist/
npm run lint      # ESLint
```

### MCP Server
Starts automatically via `.mcp.json` when Claude Code initializes. Runs as stdio process via Node.js.

### Automated Scripts
- `./autonomous_trading.sh` — Start Go bot + autonomous trading session
- `./monitor_trading.sh` — Monitor running bot
- `./stop_trading.sh` — Graceful shutdown

## Architecture

```
Claude Code → mcp-server.js (stdio) → Go HTTP API (port 4534) → Alpaca Markets API
                    ↓
              vectorDB.js (SQLite + embeddings) — trade memory/similarity search
```

### Go Backend Structure
- `cmd/bot/main.go` — Entry point, Gin router setup
- `controllers/` — HTTP handlers (Order, Position, Intelligence, News, Activity)
- `services/` — Business logic:
  - `alpaca_trading.go` — Order placement and cancellation
  - `alpaca_data.go` — Historical bars, quotes
  - `alpaca_options_data.go` — Options chains and snapshots
  - `position_manager.go` — Managed position lifecycle (entry→stop loss→take profit)
  - `stock_analysis_service.go` — Technical analysis + news synthesis
  - `technical_analysis.go` — RSI, MACD, momentum indicators
  - `news_service.go` — Google News + MarketWatch aggregation
  - `gemini_service.go` — AI news summarization via Gemini
  - `activity_logger.go` — Trade journaling
- `database/storage.go` — SQLite persistence via GORM
- `config/config.go` — `.env` loading with Cloudflare Worker fallback
- `interfaces/` — Service interfaces
- `models/` — Shared data structures

### MCP Server (`mcp-server.js`)
Routes Claude tool calls to Go backend. Also handles:
- Vector DB operations via `vectorDB.js` (ChromaDB-compatible, sqlite-vec)
- Gemini AI calls for news intelligence
- File I/O for `news_summaries/` and `decisive_actions/` directories

### Key Data Flows
1. **Trade execution**: MCP tool → mcp-server.js → Go controller → AlpacaTradingService → Alpaca API
2. **Trade memory**: After closing → `store_trade_setup()` → 384-dim embeddings in SQLite
3. **Analysis**: `analyze_stocks()` → technical indicators + news → Gemini synthesis → recommendations
4. **Managed positions**: `place_managed_position()` → PositionManager monitors with stop-loss/take-profit/trailing

### Database Tables (SQLite)
- `db_orders`, `db_bars`, `db_positions` — Trading data cache
- `db_managed_positions` — Full position lifecycle state
- `trade_embeddings` + `trade_vectors` — Vector search memory

## AI Agents (`.claude/agents/`)
- `ceo-agent.md` — Portfolio oversight, capital allocation → maps to `paragon-trading-ceo` subagent
- `strategy-agent.md` — Technical analysis, entry/exit → maps to `stratagem-options-scalper` subagent
- `consultant-agent.md` — Adversarial risk analysis → maps to `daedalus-intelligence-director` subagent
- `engineer-agent.md` — Go infrastructure work → maps to `forge-go-engineer` subagent

See `.claude/SYSTEM_ARCHITECTURE.md` for agent responsibilities and `.claude/AGENT_QUICK_START.md` for pre-approved workflows.

## Environment Configuration

Required `.env` variables:
```bash
ALPACA_API_KEY=
ALPACA_SECRET_KEY=
GEMINI_API_KEY=
ALPACA_BASE_URL=https://paper-api.alpaca.markets   # paper trading
DATABASE_PATH=./data/prophet_trader.db
SERVER_PORT=4534
```

## Key Conventions

- **Managed positions over raw orders**: Use `place_managed_position()` for built-in risk controls
- **Log all decisions**: Every trade decision must call `log_decision()` and `log_activity()`
- **Check market hours**: Call `get_datetime` before placing orders
- **Learn from trades**: Call `store_trade_setup()` after closing a position
- **Options symbol format**: OCC format (e.g., `TSLA251219C00400000` = TSLA Dec 19 2025 $400 Call)
- Activity logs go to `activity_logs/activity_YYYY-MM-DD.json`
- Trade decisions go to `decisive_actions/` as individual JSON files

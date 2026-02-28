# FinSentinel (Hackathon Scaffold)

Finance-track AI system focused on one polished flow:
- ingest portfolio + transaction-style inputs
- run deep-learning anomaly/risk inference
- output confidence + action recommendation

## Stack
- Frontend: React.js (Vite)
- Backend: Node.js + Express
- ML service: Python FastAPI + PyTorch (real DL)
- DB: Postgres

## Why this architecture
- Node backend for app/orchestration (team-friendly)
- Python ML service for real deep learning credibility
- Postgres service for persistence and future audit logs
- Dockerized microservice split for judge-friendly complexity + easy teammate setup

## Folders
- `frontend/` UI (terminal-style dashboard)
- `backend/` API gateway + business logic
- `ml_service/` model training + inference endpoints
- `data/` synthetic seed data
- `docs/` demo/runbook

## Core flow (ship this first)
1. Upload/mock portfolio data
2. Backend calls ML service for anomaly/risk score
3. UI shows confidence + recommendation
4. Action panel: hedge / hold / rebalance suggestion

## Run with Docker (microservices)
```bash
docker compose up --build
```

Services:
- Frontend: http://localhost:5173
- Backend API: http://localhost:4000
- ML service: http://localhost:8000
- Postgres: localhost:5432

## Deadline plan
- T-18h: working end-to-end flow
- T-12h: UI polish + confidence output
- T-6h: deployment + demo hardening
- T-2h: bugfix + rehearsal

## Deploy Steps

```bash
# 1. Clone and checkout
git clone https://github.com/sanjey99/hackathon-fin-ai.git
cd hackathon-fin-ai
git checkout autopilot/night-20260228

# 2. Start all services
docker compose up --build -d

# 3. Verify health
curl http://localhost:4000/health   # Backend
curl http://localhost:8000/health   # ML service

# 4. Open UI
open http://localhost:5173
```

For manual (no Docker) setup, see [docs/RUNBOOK.md](docs/RUNBOOK.md).

## Known Limitations

1. **Synthetic data only** — All ML models use heuristic/synthetic scoring. No real market data or trained fraud models are used.
2. **No persistence** — No database connected in this build. All data is in-memory and resets on restart.
3. **No authentication** — No login or API key protection. All endpoints are open.
4. **Frontend served via Babel CDN** — The live `index.html` uses Babel standalone to transpile JSX in-browser. The Vite build system (`npm run build`) compiles a separate legacy app shell, not the current UI.
5. **Hardcoded API URLs** — Frontend `App.jsx` has `const API = 'http://localhost:4000'` and `const ML = 'http://localhost:8000'`. For remote deploy, these must be edited manually.
6. **Stock picker scores are deterministic** — Scores rotate every 5 minutes based on a hash seed, not real market signals.
7. **Fraud scoring is heuristic** — The `/fraud/score` endpoint uses rule-based heuristics (amount, foreign flag, late-night, category), not a trained ML model.
8. **Single-user** — No concurrent session handling or rate limiting.
9. **No HTTPS** — All traffic is plain HTTP. Not suitable for production without a reverse proxy.

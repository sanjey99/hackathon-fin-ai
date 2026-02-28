# FinSentinel (Hackathon Scaffold)

Finance-track AI system focused on one polished flow:
- ingest portfolio + transaction-style inputs
- run deep-learning anomaly/risk inference
- output confidence + action recommendation

## Stack
- Frontend: React (Vite)
- Backend: Node.js + Express
- ML service: Python FastAPI + PyTorch (real DL)
- DB: Postgres

## Why this architecture
- Node backend for app/orchestration (team-friendly)
- Python ML service for real deep learning credibility
- Single monorepo for speed; service split for judge-friendly complexity

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

## Deadline plan
- T-18h: working end-to-end flow
- T-12h: UI polish + confidence output
- T-6h: deployment + demo hardening
- T-2h: bugfix + rehearsal

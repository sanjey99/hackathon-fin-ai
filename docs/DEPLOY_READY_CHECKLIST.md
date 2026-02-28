# Deploy Ready Checklist (Hackathon)

A build is considered deploy-ready **only if all checks below pass**.

## Code & Build
- [x] Frontend build passes (`cd frontend && npm install && npm run build`)
- [x] Backend starts without runtime errors
- [x] ML service starts without runtime errors
- [x] No unresolved merge conflicts

## Endpoints
- [x] `GET /health` returns ok
- [x] `GET /api/system/status` returns backend/ml/ws status
- [x] `POST /api/portfolio/optimize` returns full metrics + recommendation
- [x] `GET /api/stocks/picker` returns picks + rejected reasons
- [x] `POST /api/fraud/scan` returns per-transaction + account-level outputs

## Frontend UX
- [x] Portfolio tab is default landing tab
- [x] Stock picker tab refreshes at 5-minute interval
- [x] Fraud tab supports CSV upload and scan
- [x] Loading/error/empty states visible and clean
- [x] Demo marker visible: `Hackathon build – deploy ready`

## Reliability
- [x] Buttons disabled while request in-flight
- [x] Failed API calls show readable messages (no blank screen)
- [x] Demo mode/fallback path is available

## Docs
- [x] `docs/RUNBOOK.md` has startup + smoke test commands
- [x] `README.md` includes known limitations and deploy steps

## Git/Branch
- [x] Work branch pushed and synced
- [ ] PR to main created or main directly updated (team decision)
- [x] Last 3 commits have clear messages

---

Set `READY_FOR_DEPLOY=true` in `COPILOT_OUTBOX.md` only after every checkbox is done.

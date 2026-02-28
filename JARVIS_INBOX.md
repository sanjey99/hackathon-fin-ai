# JARVIS_INBOX.md

> Copilot worker must read this file first at the start of every cycle.
> After completing a packet (or getting blocked), update `COPILOT_OUTBOX.md`.

## Global rules
- Work branch: `autopilot/night-20260228`
- Allowed paths: `backend/`, `frontend/`, `ml_service/`, `docs/`, `data/`
- Do NOT edit secrets/env/auth files
- Do NOT force-push `main`
- Commit every 30-60 mins with clear message

---

## Packet P-000 (High)
Status: TODO

Goal:
- Integrate Figma API design sync so frontend work follows target design tokens/components.

Edit only:
- `scripts/figma_sync.py`
- `config/figma_targets.json`
- `docs/FIGMA_INTEGRATION.md`

Tasks:
1. Confirm figma sync script works with file key and token loading.
2. Produce `design/figma/*` artifacts from a real target file.
3. Add mapping checklist for frontend parity.

Acceptance:
- [ ] Sync command returns success JSON.
- [ ] Artifacts exist under `design/figma/`.
- [ ] Team can rerun with docs only.

---

## Packet P-001 (High)
Status: TODO

Goal:
- Complete robust API flow for demo reliability.

Edit only:
- `backend/src/index.js`
- `ml_service/app.py`
- `docs/RUNBOOK.md`

Tasks:
1. Backend: add `GET /api/demo-cases` with 3 named vectors.
2. Backend: validate `POST /api/infer` input (`features` numeric array, length 1..64).
3. ML service: add `GET /model/info` with `{model_type,input_dim,threshold,model_loaded}`.
4. ML service: `/infer` must include `timestamp` and `decision_reason`.
5. Update runbook with curl commands for new endpoints.

Acceptance:
- [ ] `/api/demo-cases` returns valid JSON list.
- [ ] bad infer payload returns HTTP 400 with readable error.
- [ ] `/model/info` works.
- [ ] `/api/infer` response includes `decision_reason` + `timestamp`.

If blocked:
- write blocker + context in `COPILOT_OUTBOX.md` and stop.

---

## Packet P-002 (High)
Status: TODO

Goal:
- Upgrade frontend from raw output to polished demo cards.

Edit only:
- `frontend/index.html`

Tasks:
1. Add demo-case dropdown fed by `/api/demo-cases`.
2. Add status indicators for backend + ML health.
3. Render output as cards:
   - Risk Score
   - Label
   - Confidence
   - Recommendation
   - Decision Reason
4. Keep dark finance-terminal style.

Acceptance:
- [ ] One-click simulate works from UI.
- [ ] No manual JSON editing required.
- [ ] Output cards display all fields.

---

## Packet P-003 (Medium)
Status: TODO

Goal:
- Add simple persistence for audit trail.

Edit only:
- `backend/src/index.js`
- `docs/RUNBOOK.md`

Tasks:
1. Add optional `POST /api/audit` to insert inference record into Postgres.
2. Add `GET /api/audit/recent?limit=20`.
3. If DB unavailable, fail gracefully with clear message.

Acceptance:
- [ ] API doesn't crash if DB is down.
- [ ] recent endpoint returns array format.

---

## Packet P-004 (Medium)
Status: TODO

Goal:
- Demo hardening + one-command verification.

Edit only:
- `docs/RUNBOOK.md`
- `README.md`

Tasks:
1. Add "5-minute judge demo" script section.
2. Add troubleshooting matrix (CORS, ML not ready, bad payload).
3. Add command checklist for pre-demo validation.

Acceptance:
- [ ] Team member can run from scratch via docs.


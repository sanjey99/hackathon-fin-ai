# Delivery Plan — ARCH-CORE-P5

## Packet: ARCH-CORE-P5
**Branch:** `lane/orchestrator/next-packet-4`

## Milestones

| # | Step | Status |
|---|------|--------|
| 1 | Define policy profiles (strict / balanced / permissive) | ✅ Done |
| 2 | Implement fusion evaluator with profile-aware thresholds | ✅ Done |
| 3 | Add input validation schemas | ✅ Done |
| 4 | Wire GET/POST `/api/governance/fusion/config` routes | ✅ Done |
| 5 | Wire POST `/api/governance/fusion/evaluate` route | ✅ Done |
| 6 | Integration tests (routes) | ✅ Done |
| 7 | Unit/observability tests (evaluator + profiles) | ✅ Done |
| 8 | Documentation (POLICY_RULES, INTEGRATION_CHECKLIST) | ✅ Done |
| 9 | Run full test suite, verify green | ✅ Done |
| 10 | Commit & push | ✅ Done |

## Files changed

| File | Change type |
|------|------------|
| `backend/src/fusion/policyProfiles.js` | **New** |
| `backend/src/fusion/fusionEvaluator.js` | **New** |
| `backend/src/fusion/schema.js` | **New** |
| `backend/src/index.js` | Modified (imports + 3 routes) |
| `backend/package.json` | Modified (vitest devDep + test scripts) |
| `backend/test/integration/fusion.routes.test.js` | **New** |
| `backend/test/unit/fusion.observability.test.js` | **New** |
| `docs/POLICY_RULES.md` | **New** |
| `docs/INTEGRATION_CHECKLIST.md` | **New** |
| `docs/DELIVERY_PLAN.md` | **New** |

## Risk assessment

- **Low risk**: All changes are additive; no existing fields/contracts modified.
- In-memory state resets on restart — acceptable for MVP, flagged for future persistence.

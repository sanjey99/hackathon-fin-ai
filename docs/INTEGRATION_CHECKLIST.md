# Integration Checklist — ARCH-CORE-P5

## Policy Profiles for Fusion Decisions

- [x] `backend/src/fusion/policyProfiles.js` — profile definitions + in-memory state
- [x] `backend/src/fusion/fusionEvaluator.js` — evaluation engine using active profile
- [x] `backend/src/fusion/schema.js` — input validation helpers
- [x] `backend/src/index.js` — routes wired:
  - `GET  /api/governance/fusion/config`
  - `POST /api/governance/fusion/config`
  - `POST /api/governance/fusion/evaluate`
- [x] `backend/test/integration/fusion.routes.test.js` — route-level tests
- [x] `backend/test/unit/fusion.observability.test.js` — unit tests for evaluator, profiles, schema
- [x] `docs/POLICY_RULES.md` — full API & policy documentation

## Verification matrix

| Check | Status |
|-------|--------|
| Default profile = balanced | ✅ |
| Strict raises review/block tendency | ✅ |
| Permissive lowers unnecessary review | ✅ |
| Invalid profile → 400 | ✅ |
| GET config returns active profile | ✅ |
| POST config updates profile immediately | ✅ |
| Fusion response includes `policy_profile` | ✅ |
| No breaking changes to existing endpoints | ✅ |
| Existing tests unaffected | ✅ |

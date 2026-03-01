# Policy Rules — Fusion Decision Engine

## Overview

The fusion evaluator applies a **policy profile** to risk signals and produces a
governance-level decision: `allow`, `review`, or `block`.

Profiles are switched at runtime via API and take effect immediately.
State is held in-memory only (no DB/file persistence).

---

## Profiles

| Profile      | allow_below | block_above | Uncertainty sensitivity | Stale handling |
|-------------|-------------|-------------|------------------------|----------------|
| **strict**      | 0.25        | 0.65        | 1.5×                   | `reject` (→ block) |
| **balanced** *(default)* | 0.40 | 0.75    | 1.0×                   | `review`       |
| **permissive**  | 0.55        | 0.90        | 0.5×                   | `allow` (pass-through) |

### Decision thresholds

- `risk_score < allow_below` → **allow**
- `risk_score > block_above` → **block**
- Otherwise → **review**

### Uncertainty guard

If `uncertainty × sensitivity > 0.5`, the decision is escalated to **review**
regardless of the raw score (unless a stale guard already produced a harder result).

### Stale signal handling

When `stale: true` is set on the input:

| Profile    | Action  |
|-----------|---------|
| strict      | block   |
| balanced    | review  |
| permissive  | pass-through (evaluate on score) |

---

## API

### Read current profile

```
GET /api/governance/fusion/config
```

Response:
```json
{
  "ok": true,
  "profile": "balanced",
  "details": {
    "name": "balanced",
    "decision_thresholds": { "allow_below": 0.40, "block_above": 0.75 },
    "uncertainty_guard_sensitivity": 1.0,
    "stale_handling": "review"
  },
  "valid_profiles": ["strict", "balanced", "permissive"]
}
```

### Switch profile

```
POST /api/governance/fusion/config
Content-Type: application/json

{ "profile": "strict" }
```

Returns the new active profile (same shape as GET).

Invalid profile names return `400`.

### Evaluate fusion

```
POST /api/governance/fusion/evaluate
Content-Type: application/json

{
  "risk_score": 0.62,
  "uncertainty": 0.3,
  "stale": false
}
```

Response:
```json
{
  "ok": true,
  "decision": "review",
  "risk_score": 0.62,
  "policy_profile": "balanced",
  "thresholds_applied": { "allow_below": 0.40, "block_above": 0.75 },
  "ts": "2026-03-01T..."
}
```

If a guard fires, the response includes `guard_triggered` (e.g. `"uncertainty"`,
`"stale_review"`, `"stale_reject"`).

---

## Design constraints

- No breaking changes to existing API contracts.
- Default behaviour (balanced) is equivalent to pre-profile logic.
- Profile state is in-memory; restarts reset to balanced.

# Runbook (MVP)

## Preferred: Docker microservices
```bash
# optional: train model first (outside docker)
cd ml_service && python3 train.py && cd ..
# optional: generate synthetic csv
python3 data/generate_synthetic.py

docker compose up --build
```

Then open:
- Frontend: http://localhost:5173
- Backend health: http://localhost:4000/health
- ML health: http://localhost:8000/health

## Test inference quickly
```bash
curl -s -X POST http://localhost:4000/api/infer \
  -H 'Content-Type: application/json' \
  -d '{"features":[0.1,0.4,0.2,0.3,0.8,0.2,0.5,0.9]}'
```

## New endpoints (P-001)

### List demo cases
```bash
curl -s http://localhost:4000/api/demo-cases | python3 -m json.tool
```

### ML model info
```bash
curl -s http://localhost:8000/model/info | python3 -m json.tool
```

### Validate bad infer payload (expect HTTP 400)
```bash
curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:4000/api/infer \
  -H 'Content-Type: application/json' \
  -d '{"features":"not-an-array"}'
# Should return: 400

curl -s -X POST http://localhost:4000/api/infer \
  -H 'Content-Type: application/json' \
  -d '{"features":[]}'
# Should return: {"ok":false,"error":"\"features\" length must be between 1 and 64 (got 0)."}
```

### Infer response now includes timestamp + decision_reason
```bash
curl -s -X POST http://localhost:4000/api/infer \
  -H 'Content-Type: application/json' \
  -d '{"features":[0.95,0.72,-0.18,0.41,0.07,1.01,0.15,0.32]}' | python3 -m json.tool
# Response includes: risk_score, label, confidence, recommendation, decision_reason, timestamp
```

## Fallback (no Docker)
### Start ML service
```bash
cd ml_service
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```

### Start backend
```bash
cd backend
npm install
ML_URL=http://localhost:8000 npm run dev
```

## P-003 — Backend reliability hardening

### Standard error shape
All error responses now follow this contract:
```json
{ "ok": false, "error": "<human-readable string>", "context": "<endpoint hint>", "ts": "<ISO-8601 UTC>" }
```
- Validation failures → **HTTP 400**
- ML upstream failures (timeout / unreachable) → **HTTP 502**

### System status check
```bash
curl -s http://localhost:4000/api/system/status | python3 -m json.tool
# Expected:
# {
#   "ok": true,
#   "backend_ok": true,
#   "ml_ok": true,
#   "ws_enabled": false,
#   "timestamp": "2026-...",
#   "notes": "<present only when ML is down>"
# }
```

### Model info via backend proxy
```bash
curl -s http://localhost:4000/api/model-info | python3 -m json.tool
# Returns: model_type, input_dim, threshold, model_loaded
```

### Ensemble endpoint (runs all 3 demo cases)
```bash
curl -s -X POST http://localhost:4000/api/ensemble \
  -H 'Content-Type: application/json' \
  -d '{}' | python3 -m json.tool
# Returns: { ok, results: [{name, risk_score, label, ...}, ...], ts }

# Or override with custom features:
curl -s -X POST http://localhost:4000/api/ensemble \
  -H 'Content-Type: application/json' \
  -d '{"features":[0.9,0.8,0.7,0.6,0.5,0.4,0.3,0.2]}' | python3 -m json.tool
```

### Quick failure tests

**Bad payload → 400 with standard error shape:**
```bash
curl -s -X POST http://localhost:4000/api/infer \
  -H 'Content-Type: application/json' \
  -d '{"features":"not-an-array"}' | python3 -m json.tool
# { "ok": false, "error": "...", "context": "input validation", "ts": "..." }

curl -s -X POST http://localhost:4000/api/infer \
  -H 'Content-Type: application/json' \
  -d '{}' | python3 -m json.tool
# { "ok": false, "error": "\"features\" field is required.", "context": "input validation", "ts": "..." }
```

**ML timeout simulation (stop ML service, then call infer):**
```bash
# After stopping ML service:
curl -s -X POST http://localhost:4000/api/infer \
  -H 'Content-Type: application/json' \
  -d '{"features":[0.1,0.2,0.3,0.4,0.5,0.6,0.7,0.8]}'
# Returns HTTP 502: { "ok": false, "error": "ML service timed out after 8000ms (/infer)", ... }
```

**System status when ML is down:**
```bash
curl -s http://localhost:4000/api/system/status | python3 -m json.tool
# ml_ok will be false, notes will explain why
```

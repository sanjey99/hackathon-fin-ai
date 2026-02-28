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
- WebSocket stream: ws://localhost:4000/ws/signals

## Test endpoints quickly
```bash
curl -s http://localhost:4000/api/demo-cases
curl -s http://localhost:4000/api/model-info
curl -s http://localhost:4000/api/simulate
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

### Start frontend (Vite)
```bash
cd frontend
npm install
VITE_API_URL=http://localhost:4000 npm run dev
```

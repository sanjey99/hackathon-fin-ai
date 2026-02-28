# Runbook (MVP)

## Start ML service
```bash
cd ml_service
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```

## Start backend
```bash
cd backend
npm install
ML_URL=http://localhost:8000 npm run dev
```

## Test inference
```bash
curl -s -X POST http://localhost:4000/api/infer \
  -H 'Content-Type: application/json' \
  -d '{"features":[0.1,0.4,0.2,0.3,0.8,0.2,0.5,0.9]}' | jq
```

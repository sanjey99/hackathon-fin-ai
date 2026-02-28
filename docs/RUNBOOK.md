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

---

## Frontend Deploy Smoke Checks

### Pre-deploy Checklist
```bash
# 1. Build succeeds without errors
cd frontend && npm run build

# 2. Verify dist output exists
ls dist/index.html dist/assets/

# 3. Check no TypeScript errors
npx tsc --noEmit

# 4. Preview production build locally
npx vite preview --port 5173
```

### UX Behavior Verification

#### Loading States
- **Risk Score tab**: Click "RUN MODEL" → button shows spinner + "PROCESSING..." text → button is disabled during execution → output panel shows animated inference steps
- **Portfolio tab**: Click "OPTIMIZE" → button shows spinner + "OPTIMIZING..." text → button is disabled during execution
- **All tabs**: No blank/white screens at any point; idle state shows instruction card

#### Error States
- **API unreachable**: Footer health indicator turns red; error cards appear with descriptive messages
- **Risk model failure**: Error card appears in both input and output panels with message
- **Portfolio optimization failure**: Error card appears below OPTIMIZE button

#### Empty / Idle States
- **Risk Score (first visit)**: Shows orange instruction card: "READY TO START — Configure loan parameters below and click RUN MODEL"
- **Risk Output panel (idle)**: Shows "NO DATA YET" placeholder with instructions
- **Portfolio (first visit)**: Shows instruction hint below OPTIMIZE button

#### Demo Mode
- **Toggle location**: Top-right corner of the app, labeled "DEMO MODE" with an on/off switch
- **When ON**: All API calls route to `/api/simulate` for safe, deterministic output; orange "DEMO MODE ACTIVE" indicator visible in footer; terminal prompt shows `--mode=demo`
- **When OFF**: Normal ensemble/inference flow is used; standard API calls
- **Toggle is persistent**: Stays active across tab switches within the same session

#### Footer Panel
- Always visible at bottom of screen (32px height)
- Shows: API base URL, health status indicator (green/yellow/red), last updated timestamp
- Deploy-ready marker: Green badge reading "FRONTEND DEPLOY-READY"

### Quick Smoke Test Script
```bash
# Start all services
docker compose up --build -d

# Wait for startup
sleep 10

# 1. Verify frontend loads
curl -s http://localhost:5173 | grep -q "FinSentinel" && echo "✅ Frontend HTML loads" || echo "❌ Frontend failed"

# 2. Verify backend health
curl -sf http://localhost:4000/health && echo "✅ Backend healthy" || echo "❌ Backend unhealthy"

# 3. Verify ML health
curl -sf http://localhost:8000/health && echo "✅ ML healthy" || echo "❌ ML unhealthy"

# 4. Verify simulate endpoint (used by demo mode)
curl -sf http://localhost:4000/api/simulate && echo "✅ Simulate endpoint OK" || echo "❌ Simulate failed"

# 5. Open browser and check:
#    - No blank screens
#    - Footer shows "FRONTEND DEPLOY-READY"
#    - Demo Mode toggle visible top-right
#    - Each tab renders without errors
```

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
# Health checks
curl -s http://localhost:4000/health
curl -s http://localhost:8000/health
curl -s http://localhost:4000/api/system/status

# Demo cases
curl -s http://localhost:4000/api/demo-cases

# Model info
curl -s http://localhost:4000/api/model-info

# Simulate
curl -s http://localhost:4000/api/simulate

# Run inference
curl -s -X POST http://localhost:4000/api/infer \
  -H 'Content-Type: application/json' \
  -d '{"features":[0.1,0.4,0.2,0.3,0.8,0.2,0.5,0.9]}'

# Portfolio optimisation
curl -s -X POST http://localhost:4000/api/portfolio/optimize \
  -H 'Content-Type: application/json' \
  -d '{"assets":[{"symbol":"AAPL","weight":0.4},{"symbol":"MSFT","weight":0.3},{"symbol":"NVDA","weight":0.3}],"simulations":500,"horizon_days":30}'

# Stock picker
curl -s http://localhost:4000/api/stocks/picker

# Fraud scan
curl -s -X POST http://localhost:4000/api/fraud/scan \
  -H 'Content-Type: application/json' \
  -d '{"rows":[{"amount":150,"merchant":"Amazon","category":"retail","hour":14,"is_foreign":false},{"amount":8500,"merchant":"Unknown","category":"wire_transfer","hour":3,"is_foreign":true},{"amount":12000,"merchant":"Offshore LLC","category":"cash_advance","hour":1,"is_foreign":true}]}'
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

---

## API Base URL Configuration

| Service   | Env Variable         | Default                  | Used By    |
|-----------|---------------------|--------------------------|------------|
| Backend   | `ML_URL`            | `http://ml:8000`         | Backend → ML calls |
| Frontend  | (hardcoded in App.jsx) | `http://localhost:4000` | Browser → Backend |
| Frontend  | `VITE_API_URL`      | `http://localhost:4000`  | Vite build (if used) |

**To change the backend API URL at deploy time** (e.g. behind a reverse proxy):
- For the CDN-served `index.html`/`App.jsx`: edit the `const API = '...'` line in `frontend/src/App.jsx`.
- For the Docker backend: set `ML_URL` in `docker-compose.yml` or as an environment variable.

---

## Demo Day Checklist

Before the demo, verify in order:

1. **Services running**: `docker compose up --build -d` — all 3 containers healthy
2. **Backend health**: `curl http://localhost:4000/health` → `{"status":"ok"}`
3. **ML health**: `curl http://localhost:8000/health` → `{"status":"ok"}`
4. **Open browser**: http://localhost:5173
5. **Portfolio tab** (default): Click a Preset → Run Optimisation → see KPI cards + weights
6. **Stock Picker tab**: Verify picks load, countdown timer visible, click Refresh
7. **Fraud tab**: Click "Load Sample" → "Scan for Fraud" → see account alert + transactions
8. **Risk Score tab**: Click "Run Model" → see risk output
9. **Footer**: Confirm "Hackathon build – deploy ready" marker visible
10. **Error handling**: Stop ML container → retry an action → confirm error banner (no blank screen)

---

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

# 4. System status
curl -sf http://localhost:4000/api/system/status && echo "✅ System status OK" || echo "❌ System status failed"

# 5. Portfolio optimisation
curl -sf -X POST http://localhost:4000/api/portfolio/optimize \
  -H 'Content-Type: application/json' \
  -d '{"assets":[{"symbol":"AAPL","weight":0.5},{"symbol":"MSFT","weight":0.5}],"simulations":100}' \
  | grep -q "var_95" && echo "✅ Portfolio optimize OK" || echo "❌ Portfolio optimize failed"

# 6. Stock picker
curl -sf http://localhost:4000/api/stocks/picker | grep -q "picks" && echo "✅ Stock picker OK" || echo "❌ Stock picker failed"

# 7. Fraud scan
curl -sf -X POST http://localhost:4000/api/fraud/scan \
  -H 'Content-Type: application/json' \
  -d '{"rows":[{"amount":8500,"merchant":"Unknown","category":"wire_transfer","hour":3,"is_foreign":true}]}' \
  | grep -q "account_alert" && echo "✅ Fraud scan OK" || echo "❌ Fraud scan failed"

# 8. Inference
curl -sf -X POST http://localhost:4000/api/infer \
  -H 'Content-Type: application/json' \
  -d '{"features":[0.1,0.4,0.2,0.3,0.8,0.2,0.5,0.9]}' \
  | grep -q "risk_score" && echo "✅ Inference OK" || echo "❌ Inference failed"

# 9. Open browser and check:
#    - Portfolio tab is default landing
#    - Stock Picker tab loads with auto-refresh countdown
#    - Fraud tab: paste CSV + scan works
#    - Risk Score tab: ensemble + scenario buttons work
#    - Footer shows "Hackathon build – deploy ready"
#    - No blank screens on any tab
```

---

## Mobile QA (M-CRIT1)

### Device Testing Matrix

| Device/Width | Target | Priority |
|---|---|---|
| 320px (iPhone SE) | All content visible, no horizontal scroll | P0 |
| 375px (iPhone 12/13) | Single-column layouts, touch targets ≥ 40px | P0 |
| 430px (iPhone 14 Pro Max) | Comfortable spacing, readable text | P0 |
| 768px (iPad portrait) | Sidebar hidden, 1-col layouts | P1 |

### Mobile QA Checklist

1. **No horizontal overflow** — swipe left/right should not reveal off-screen content on any tab
2. **TopBar** — brand visible, tabs scrollable horizontally, hamburger menu opens sidebar overlay
3. **Sidebar** — hidden by default on ≤768px; opens as overlay via menu button; dismissible by tapping overlay
4. **Risk Score tab** — input form stacks above output panel; gauge + SHAP chart fit in viewport width
5. **Portfolio tab** — input panel stacks above charts; allocation map wraps properly; efficient frontier chart readable
6. **Fraud Detect tab** — transaction table scrolls horizontally inside container; drawer opens below table on mobile
7. **All buttons** — minimum 40px touch target; no tiny click areas
8. **Input fields** — 16px font-size to prevent iOS auto-zoom on focus
9. **Scrolling** — all panels have `-webkit-overflow-scrolling: touch` for smooth momentum scroll

### Testing Commands
```bash
# Chrome DevTools mobile simulation
# 1. Open http://localhost:5173
# 2. F12 → Toggle Device Toolbar (Ctrl+Shift+M)
# 3. Select "iPhone SE" (320px), "iPhone 12 Pro" (390px), "iPhone 14 Pro Max" (430px)
# 4. Navigate all tabs and verify no horizontal overflow
# 5. Test hamburger menu → sidebar overlay → dismiss
# 6. Verify all buttons and inputs are usable with touch
```

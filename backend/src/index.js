import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true, service: 'backend' }));

// Demo cases: 3 named feature vectors for one-click simulation
const DEMO_CASES = [
  {
    name: 'High-Risk Trade',
    description: 'Unusual volume spike with correlated anomaly signals',
    features: [0.95, 0.72, -0.18, 0.41, 0.07, 1.01, 0.15, 0.32]
  },
  {
    name: 'Normal Transaction',
    description: 'Routine low-volatility market activity',
    features: [0.10, 0.20, 0.05, 0.15, 0.30, 0.12, 0.08, 0.25]
  },
  {
    name: 'Borderline Case',
    description: 'Mid-range signals requiring closer monitoring',
    features: [0.60, 0.55, 0.40, 0.50, 0.48, 0.62, 0.45, 0.58]
  }
];

app.get('/api/demo-cases', (_req, res) => {
  return res.json({ ok: true, cases: DEMO_CASES });
});

app.get('/api/simulate', async (_req, res) => {
  try {
    const r = await fetch(`${process.env.ML_URL || 'http://localhost:8000'}/simulate`);
    const data = await r.json();
    return res.json({ ok: true, ...data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post('/api/infer', async (req, res) => {
  // --- Input validation ---
  const { features } = req.body || {};
  if (!features) {
    return res.status(400).json({ ok: false, error: '"features" field is required.' });
  }
  if (!Array.isArray(features)) {
    return res.status(400).json({ ok: false, error: '"features" must be an array.' });
  }
  if (features.length < 1 || features.length > 64) {
    return res.status(400).json({ ok: false, error: `"features" length must be between 1 and 64 (got ${features.length}).` });
  }
  if (!features.every(v => typeof v === 'number' && isFinite(v))) {
    return res.status(400).json({ ok: false, error: '"features" must contain only finite numeric values.' });
  }
  // --- Forward to ML service ---
  try {
    const payload = req.body;
    const r = await fetch(`${process.env.ML_URL || 'http://localhost:8000'}/infer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await r.json();
    return res.json({ ok: true, ...data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`backend listening on :${port}`));

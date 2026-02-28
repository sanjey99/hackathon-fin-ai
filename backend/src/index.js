import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const ML_URL = process.env.ML_URL || 'http://localhost:8000';

const DEMO_CASES = [
  { name: 'normal_profile', features: [0.12, 0.08, -0.1, 0.03, 0.15, -0.06, 0.02, 0.01] },
  { name: 'suspicious_profile', features: [1.2, 0.95, -0.45, 0.3, 0.1, 1.1, 0.2, 0.5] },
  { name: 'portfolio_stress', features: [0.6, 0.7, -0.3, 0.5, -0.4, 0.9, -0.2, 0.1] },
];

function validPayload(body) {
  if (!body || !Array.isArray(body.features)) return 'features must be an array';
  if (body.features.length < 1 || body.features.length > 64) return 'features length must be 1..64';
  if (!body.features.every((x) => Number.isFinite(Number(x)))) return 'features must contain only numbers';
  return null;
}

app.get('/health', (_req, res) => res.json({ ok: true, service: 'backend' }));

app.get('/api/demo-cases', (_req, res) => {
  res.json({ ok: true, cases: DEMO_CASES });
});

app.get('/api/model-info', async (_req, res) => {
  try {
    const r = await fetch(`${ML_URL}/model/info`);
    const data = await r.json();
    return res.json({ ok: true, ...data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

app.get('/api/simulate', async (_req, res) => {
  try {
    const r = await fetch(`${ML_URL}/simulate`);
    const data = await r.json();
    return res.json({ ok: true, ...data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

app.post('/api/infer', async (req, res) => {
  try {
    const err = validPayload(req.body);
    if (err) return res.status(400).json({ ok: false, error: err });

    const payload = { features: req.body.features.map((x) => Number(x)) };
    const r = await fetch(`${ML_URL}/infer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ ok: false, ...data });
    return res.json({ ok: true, ...data });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`backend listening on :${port}`));

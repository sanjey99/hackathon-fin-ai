import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const ML_URL = process.env.ML_URL || 'http://localhost:8000';
const ML_TIMEOUT_MS = 8000;

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Standard error response body. */
function errBody(error, context = undefined) {
  const body = { ok: false, error: String(error), ts: new Date().toISOString() };
  if (context !== undefined) body.context = String(context);
  return body;
}

/**
 * fetch() wrapper with AbortController timeout.
 * Throws a descriptive Error on timeout or network failure.
 */
async function mlFetch(path, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ML_TIMEOUT_MS);
  try {
    const res = await fetch(`${ML_URL}${path}`, { ...opts, signal: controller.signal });
    return res;
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error(`ML service timed out after ${ML_TIMEOUT_MS}ms (${path})`);
    }
    throw new Error(`ML service unreachable: ${e.message}`);
  } finally {
    clearTimeout(timer);
  }
}

/** Validate features array; returns null if valid, or a 400-ready message. */
function validateFeatures(features) {
  if (features === undefined || features === null) return '"features" field is required.';
  if (!Array.isArray(features)) return '"features" must be an array.';
  if (features.length < 1 || features.length > 64)
    return `"features" length must be between 1 and 64 (got ${features.length}).`;
  if (!features.every(v => typeof v === 'number' && isFinite(v)))
    return '"features" must contain only finite numeric values.';
  return null;
}

// ── Static data ───────────────────────────────────────────────────────────────

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

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => res.json({ ok: true, service: 'backend', ts: new Date().toISOString() }));

// GET /api/system/status — composite health check
app.get('/api/system/status', async (_req, res) => {
  let ml_ok = false;
  let ml_notes = null;
  try {
    const r = await mlFetch('/health');
    const d = await r.json();
    ml_ok = d?.ok === true;
  } catch (e) {
    ml_notes = e.message;
  }
  return res.json({
    ok: true,
    backend_ok: true,
    ml_ok,
    ws_enabled: false,
    timestamp: new Date().toISOString(),
    ...(ml_notes ? { notes: ml_notes } : {})
  });
});

// GET /api/demo-cases
app.get('/api/demo-cases', (_req, res) => {
  return res.json({ ok: true, cases: DEMO_CASES });
});

// GET /api/model-info — proxy to ML /model/info with timeout
app.get('/api/model-info', async (_req, res) => {
  try {
    const r = await mlFetch('/model/info');
    const data = await r.json();
    return res.json({ ok: true, ...data });
  } catch (e) {
    return res.status(502).json(errBody(e.message, 'GET /model/info'));
  }
});

// GET /api/simulate — proxy to ML /simulate with timeout
app.get('/api/simulate', async (_req, res) => {
  try {
    const r = await mlFetch('/simulate');
    const data = await r.json();
    return res.json({ ok: true, ...data });
  } catch (e) {
    return res.status(502).json(errBody(e.message, 'GET /simulate'));
  }
});

// POST /api/infer — validate + proxy to ML /infer with timeout
app.post('/api/infer', async (req, res) => {
  const { features } = req.body || {};
  const validationError = validateFeatures(features);
  if (validationError) {
    return res.status(400).json(errBody(validationError, 'input validation'));
  }
  try {
    const r = await mlFetch('/infer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ features })
    });
    const data = await r.json();
    return res.json({ ok: true, ...data });
  } catch (e) {
    return res.status(502).json(errBody(e.message, 'POST /infer'));
  }
});

// POST /api/ensemble — run all demo cases through ML and return batch results
app.post('/api/ensemble', async (req, res) => {
  // Accept optional override features, otherwise run all 3 demo cases
  const { features } = req.body || {};
  const cases = features
    ? [{ name: 'Custom', features }]
    : DEMO_CASES;

  if (features) {
    const validationError = validateFeatures(features);
    if (validationError) {
      return res.status(400).json(errBody(validationError, 'input validation'));
    }
  }

  try {
    const results = await Promise.all(
      cases.map(async (c) => {
        const r = await mlFetch('/infer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ features: c.features })
        });
        const data = await r.json();
        return { name: c.name, ...data };
      })
    );
    return res.json({ ok: true, results, ts: new Date().toISOString() });
  } catch (e) {
    return res.status(502).json(errBody(e.message, 'POST /ensemble'));
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`backend listening on :${port}`));

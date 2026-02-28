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
async function mlFetch(path, opts = {}, timeoutMs = ML_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${ML_URL}${path}`, { ...opts, signal: controller.signal });
    return res;
  } catch (e) {
    if (e.name === 'AbortError') {
      throw new Error(`ML service timed out after ${timeoutMs}ms (${path})`);  
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

// ── Portfolio helpers ────────────────────────────────────────────────────────

function validatePortfolioInput(body) {
  const { assets, simulations, horizon_days } = body || {};
  if (!assets || !Array.isArray(assets) || assets.length === 0)
    return '"assets" must be a non-empty array.';
  for (const a of assets) {
    if (!a.symbol || typeof a.symbol !== 'string')
      return 'Each asset must have a "symbol" string.';
    if (typeof a.weight !== 'number' || !isFinite(a.weight) || a.weight < 0)
      return `Asset "${a.symbol}" weight must be a non-negative finite number.`;
  }
  const weightSum = assets.reduce((s, a) => s + a.weight, 0);
  if (Math.abs(weightSum - 1.0) > 0.03)
    return `Asset weights must sum to 1.0 (±0.03), got ${weightSum.toFixed(4)}.`;
  if (simulations !== undefined && (!Number.isInteger(simulations) || simulations < 1 || simulations > 100000))
    return '"simulations" must be a positive integer ≤ 100000.';
  if (horizon_days !== undefined && (!Number.isInteger(horizon_days) || horizon_days < 1 || horizon_days > 365))
    return '"horizon_days" must be a positive integer ≤ 365.';
  return null;
}

function checkConstraints(assets, constraints, metrics) {
  const c = constraints || {};
  const maxW = Math.max(...assets.map(a => a.weight));
  const minW = Math.min(...assets.map(a => a.weight));
  return {
    max_drawdown_pass:      c.max_drawdown      != null ? Math.abs(metrics.var_95) <= c.max_drawdown      : true,
    max_concentration_pass: c.max_concentration != null ? maxW <= c.max_concentration                      : true,
    min_liquidity_pass:     c.min_liquidity     != null ? minW >= c.min_liquidity                          : true,
    target_return_pass:     c.target_return     != null ? metrics.expected_return >= c.target_return       : true,
  };
}

function buildRecommendation(assets, constraintsCheck) {
  const anyFail = Object.values(constraintsCheck).some(v => v === false);
  if (!anyFail) {
    return {
      action: 'hold',
      summary: 'All constraints satisfied. Current allocation is within acceptable risk parameters.',
      proposed_weights: assets.map(a => ({ symbol: a.symbol, weight: a.weight })),
    };
  }
  const weights = assets.map(a => a.weight);
  const maxIdx  = weights.indexOf(Math.max(...weights));
  const minIdx  = weights.indexOf(Math.min(...weights));
  const delta   = parseFloat(Math.min(0.05, (weights[maxIdx] - weights[minIdx]) / 2).toFixed(4));
  const proposed = weights.map((w, i) => {
    if (i === maxIdx) return parseFloat((w - delta).toFixed(4));
    if (i === minIdx) return parseFloat((w + delta).toFixed(4));
    return w;
  });
  const failed = Object.entries(constraintsCheck)
    .filter(([, v]) => !v)
    .map(([k]) => k.replace(/_pass$/, '').replace(/_/g, ' '));
  return {
    action: 'rebalance',
    summary: `Constraints violated: ${failed.join(', ')}. Reduce ${assets[maxIdx].symbol} and increase ${assets[minIdx].symbol} allocation.`,
    proposed_weights: assets.map((a, i) => ({ symbol: a.symbol, weight: proposed[i] })),
  };
}

// POST /api/portfolio/optimize — Monte Carlo portfolio risk & recommendation
app.post('/api/portfolio/optimize', async (req, res) => {
  const body = req.body || {};
  const validError = validatePortfolioInput(body);
  if (validError) return res.status(400).json(errBody(validError, 'input validation'));

  const assets      = body.assets;
  const constraints = body.constraints || {};
  const simulations  = body.simulations  ?? 1000;
  const horizon_days = body.horizon_days ?? 30;

  let mcResult;
  try {
    const r = await mlFetch('/portfolio/montecarlo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assets, simulations, horizon_days, constraints }),
    }, 15000);
    mcResult = await r.json();
  } catch (e) {
    return res.status(502).json(errBody(e.message, 'POST /portfolio/montecarlo'));
  }

  const metrics = {
    var_95:              mcResult.var_95,
    cvar_95:             mcResult.cvar_95,
    probability_of_loss: mcResult.probability_of_loss,
    expected_return:     mcResult.expected_return,
  };
  const constraintsCheck = checkConstraints(assets, constraints, metrics);
  const recommendation   = buildRecommendation(assets, constraintsCheck);

  return res.json({
    ok: true,
    metrics,
    constraints_check:         constraintsCheck,
    recommendation,
    simulated_paths_summary:   mcResult.simulated_paths_summary,
    confidence:                mcResult.confidence,
    error_rate:                mcResult.error_rate,
    timestamp:                 new Date().toISOString(),
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`backend listening on :${port}`));

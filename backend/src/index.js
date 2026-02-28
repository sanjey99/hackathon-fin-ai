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

// ── Stock Picker ─────────────────────────────────────────────────────────────

const STOCK_UNIVERSE = [
  { symbol: 'AAPL',  name: 'Apple Inc.',          sector: 'Tech' },
  { symbol: 'MSFT',  name: 'Microsoft Corp.',     sector: 'Tech' },
  { symbol: 'NVDA',  name: 'NVIDIA Corp.',        sector: 'Tech' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.',       sector: 'Tech' },
  { symbol: 'AMZN',  name: 'Amazon.com Inc.',     sector: 'Consumer' },
  { symbol: 'META',  name: 'Meta Platforms Inc.',  sector: 'Tech' },
  { symbol: 'TSLA',  name: 'Tesla Inc.',          sector: 'Auto' },
  { symbol: 'JPM',   name: 'JPMorgan Chase',      sector: 'Finance' },
  { symbol: 'V',     name: 'Visa Inc.',           sector: 'Finance' },
  { symbol: 'JNJ',   name: 'Johnson & Johnson',   sector: 'Healthcare' },
  { symbol: 'WMT',   name: 'Walmart Inc.',        sector: 'Consumer' },
  { symbol: 'PG',    name: 'Procter & Gamble',    sector: 'Consumer' },
  { symbol: 'UNH',   name: 'UnitedHealth Group',  sector: 'Healthcare' },
  { symbol: 'HD',    name: 'Home Depot Inc.',      sector: 'Consumer' },
  { symbol: 'MA',    name: 'Mastercard Inc.',      sector: 'Finance' },
  { symbol: 'BAC',   name: 'Bank of America',     sector: 'Finance' },
  { symbol: 'XOM',   name: 'Exxon Mobil Corp.',   sector: 'Energy' },
  { symbol: 'KO',    name: 'Coca-Cola Co.',       sector: 'Consumer' },
  { symbol: 'PFE',   name: 'Pfizer Inc.',         sector: 'Healthcare' },
  { symbol: 'INTC',  name: 'Intel Corp.',         sector: 'Tech' },
];

function deterministicScore(symbol, seed) {
  // Deterministic pseudo-random scores using simple hash
  let h = 0;
  const s = symbol + ':' + seed;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h % 10000) / 10000;
}

function generateStockPicks() {
  const now = new Date();
  // Seed changes every 5 minutes for refresh simulation
  const seed = Math.floor(now.getTime() / 300000).toString();

  const scored = STOCK_UNIVERSE.map(stock => {
    const momentum = parseFloat(deterministicScore(stock.symbol, seed + 'mom').toFixed(4));
    const value    = parseFloat(deterministicScore(stock.symbol, seed + 'val').toFixed(4));
    const quality  = parseFloat(deterministicScore(stock.symbol, seed + 'qlt').toFixed(4));
    const overall  = parseFloat(((momentum + value + quality) / 3).toFixed(4));
    const confidence = parseFloat((0.60 + overall * 0.35).toFixed(4));

    const tags = [];
    if (momentum > 0.7) tags.push('strong momentum');
    if (value > 0.7) tags.push('value play');
    if (quality > 0.7) tags.push('high quality');
    if (momentum < 0.3) tags.push('weak momentum');
    if (value < 0.3) tags.push('expensive');
    if (quality < 0.3) tags.push('low quality');
    if (tags.length === 0) tags.push('balanced');

    return { ...stock, momentum, value, quality, overall, confidence, reason_tags: tags };
  });

  scored.sort((a, b) => b.overall - a.overall);

  const PICK_COUNT = 8;
  const picks = scored.slice(0, PICK_COUNT);
  const rejected = scored.slice(PICK_COUNT).map(s => ({
    ...s,
    reason_not_selected: s.overall < 0.4
      ? `Low composite score (${s.overall.toFixed(2)})`
      : s.momentum < 0.3
        ? `Weak momentum (${s.momentum.toFixed(2)})`
        : `Ranked below top ${PICK_COUNT} (score ${s.overall.toFixed(2)})`
  }));

  return { picks, rejected, generated_at: now.toISOString(), seed };
}

// GET /api/stocks/picker — real-time stock picks with equal-weight scoring
app.get('/api/stocks/picker', (_req, res) => {
  const { picks, rejected, generated_at, seed } = generateStockPicks();
  return res.json({
    ok: true,
    picks,
    rejected,
    universe_size: STOCK_UNIVERSE.length,
    refresh_interval_sec: 300,
    generated_at,
    seed,
    timestamp: new Date().toISOString(),
  });
});

// ── Fraud Detection ──────────────────────────────────────────────────────────

function validateFraudScanInput(body) {
  const { rows } = body || {};
  if (!rows || !Array.isArray(rows) || rows.length === 0)
    return '"rows" must be a non-empty array of transaction objects.';
  if (rows.length > 500)
    return `Maximum 500 rows allowed (got ${rows.length}).`;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (!r || typeof r !== 'object')
      return `Row ${i} must be an object.`;
    if (typeof r.amount !== 'number' || !isFinite(r.amount))
      return `Row ${i}: "amount" must be a finite number.`;
  }
  return null;
}

// POST /api/fraud/scan — scan transactions for fraud
app.post('/api/fraud/scan', async (req, res) => {
  const body = req.body || {};
  const validError = validateFraudScanInput(body);
  if (validError) return res.status(400).json(errBody(validError, 'input validation'));

  const rows = body.rows;

  // Call ML service for batch scoring
  let mlScores;
  try {
    const r = await mlFetch('/fraud/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    }, 15000);
    mlScores = await r.json();
  } catch (e) {
    return res.status(502).json(errBody(e.message, 'POST /fraud/score'));
  }

  const transactions = mlScores.transactions || [];

  // Compute account-level alert
  const avgRisk = transactions.length > 0
    ? transactions.reduce((s, t) => s + (t.fraud_score || 0), 0) / transactions.length
    : 0;
  const maxRisk = transactions.length > 0
    ? Math.max(...transactions.map(t => t.fraud_score || 0))
    : 0;
  const highRiskCount = transactions.filter(t => (t.fraud_score || 0) > 0.7).length;

  let action = 'monitor';
  let alert_score = parseFloat(((avgRisk * 0.4 + maxRisk * 0.6)).toFixed(4));
  if (maxRisk > 0.85 || highRiskCount >= 3) { action = 'block'; alert_score = Math.max(alert_score, 0.85); }
  else if (maxRisk > 0.6 || highRiskCount >= 1) { action = 'review'; alert_score = Math.max(alert_score, 0.50); }

  return res.json({
    ok: true,
    transactions,
    account_alert: {
      alert_score: parseFloat(alert_score.toFixed(4)),
      action,
      high_risk_count: highRiskCount,
      total_scanned: transactions.length,
      summary: action === 'block'
        ? `Critical: ${highRiskCount} high-risk transactions detected. Recommend immediate account block.`
        : action === 'review'
          ? `Warning: ${highRiskCount} suspicious transactions flagged for manual review.`
          : 'All transactions within acceptable risk thresholds. Continue monitoring.',
    },
    timestamp: new Date().toISOString(),
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`backend listening on :${port}`));

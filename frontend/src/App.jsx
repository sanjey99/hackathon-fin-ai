/* FinSentinel Terminal — P-H2: Portfolio Optimisation hero tab
   OpenBB/Bloomberg-inspired layout with tabbed navigation.
   Loaded via Babel standalone (CDN) from index.html.
   API: /api/portfolio/optimize, /api/demo-cases, /api/infer, /api/simulate, /health, /model/info
*/

const API = 'http://localhost:4000';
const ML  = 'http://localhost:8000';

// ─── tiny helpers ────────────────────────────────────────────────────────────
const cls = (...a) => a.filter(Boolean).join(' ');
const pct = (v, d = 1) => typeof v === 'number' ? (v * 100).toFixed(d) + '%' : '—';
const fmt = (v, d = 4) => typeof v === 'number' ? v.toFixed(d) : '—';

function useFetch(url) {
  const [data, setData] = React.useState(null);
  const [err,  setErr]  = React.useState(null);
  React.useEffect(() => {
    fetch(url).then(r => r.json()).then(setData).catch(e => setErr(String(e)));
  }, [url]);
  return { data, err };
}

// ─── Presets ─────────────────────────────────────────────────────────────────
const PRESETS = {
  'Tech Heavy': [
    { symbol: 'AAPL', weight: 0.30 },
    { symbol: 'MSFT', weight: 0.25 },
    { symbol: 'NVDA', weight: 0.20 },
    { symbol: 'GOOGL', weight: 0.15 },
    { symbol: 'AMZN', weight: 0.10 },
  ],
  'Balanced': [
    { symbol: 'SPY', weight: 0.30 },
    { symbol: 'BND', weight: 0.25 },
    { symbol: 'VWO', weight: 0.15 },
    { symbol: 'GLD', weight: 0.15 },
    { symbol: 'QQQ', weight: 0.15 },
  ],
  'Conservative Bond': [
    { symbol: 'BND', weight: 0.40 },
    { symbol: 'TLT', weight: 0.25 },
    { symbol: 'LQD', weight: 0.20 },
    { symbol: 'TIPS', weight: 0.10 },
    { symbol: 'SHY', weight: 0.05 },
  ],
  'Crypto Mix': [
    { symbol: 'BTC', weight: 0.40 },
    { symbol: 'ETH', weight: 0.30 },
    { symbol: 'SOL', weight: 0.15 },
    { symbol: 'LINK', weight: 0.10 },
    { symbol: 'DOT', weight: 0.05 },
  ],
};

// ─── KPI chip ────────────────────────────────────────────────────────────────
function KpiChip({ label, value, accent }) {
  return (
    <div className="kpi-chip">
      <span className="kpi-label">{label}</span>
      <span className={cls('kpi-value', accent)}>{value ?? '—'}</span>
    </div>
  );
}

// ─── Status dot ──────────────────────────────────────────────────────────────
function StatusDot({ ok, label }) {
  return (
    <span className={cls('status-dot', ok ? 'ok' : 'err')}>
      <span className="dot" />
      {label}
    </span>
  );
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────
function TabBar({ tabs, active, onChange, beOk, mlOk }) {
  return (
    <div className="tab-bar">
      <div className="tab-bar-left">
        <span className="brand-name-sm">FinSentinel</span>
        {tabs.map(t => (
          <button
            key={t.id}
            className={cls('tab-btn', active === t.id && 'active')}
            onClick={() => onChange(t.id)}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>
      <div className="tab-bar-right">
        <StatusDot ok={beOk} label="Backend" />
        <StatusDot ok={mlOk} label="ML" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── PORTFOLIO OPTIMISATION TAB ──────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function PortfolioInputPanel({ assets, setAssets, inputMode, setInputMode, csvText, setCsvText }) {
  function addRow() {
    setAssets([...assets, { symbol: '', weight: 0 }]);
  }
  function removeRow(i) {
    setAssets(assets.filter((_, idx) => idx !== i));
  }
  function updateRow(i, field, val) {
    const next = assets.map((a, idx) => idx === i ? { ...a, [field]: field === 'weight' ? Number(val) : val.toUpperCase() } : a);
    setAssets(next);
  }
  function loadPreset(name) {
    setAssets(PRESETS[name].map(a => ({ ...a })));
    setInputMode('manual');
  }
  function parseCSV() {
    try {
      const lines = csvText.trim().split('\n').filter(Boolean);
      const parsed = lines.map(line => {
        const parts = line.split(',').map(s => s.trim());
        return { symbol: parts[0].toUpperCase(), weight: parseFloat(parts[1]) || 0 };
      }).filter(a => a.symbol);
      if (parsed.length > 0) { setAssets(parsed); setInputMode('manual'); }
    } catch (e) { /* ignore parse errors */ }
  }

  const weightSum = assets.reduce((s, a) => s + (a.weight || 0), 0);

  return (
    <div className="pf-input-panel">
      <div className="section-heading">Portfolio Input</div>

      {/* Mode switches */}
      <div className="pf-mode-bar">
        {['manual', 'preset', 'csv'].map(m => (
          <button key={m} className={cls('pf-mode-btn', inputMode === m && 'active')} onClick={() => setInputMode(m)}>
            {m === 'manual' ? '✎ Manual' : m === 'preset' ? '☰ Preset' : '⬆ CSV'}
          </button>
        ))}
      </div>

      {/* Preset mode */}
      {inputMode === 'preset' && (
        <div className="pf-presets">
          {Object.keys(PRESETS).map(name => (
            <button key={name} className="pf-preset-card" onClick={() => loadPreset(name)}>
              <span className="pf-preset-name">{name}</span>
              <span className="pf-preset-detail">{PRESETS[name].length} assets</span>
            </button>
          ))}
        </div>
      )}

      {/* CSV mode */}
      {inputMode === 'csv' && (
        <div className="pf-csv-section">
          <p className="hint">Paste CSV: one row per asset.  Format: <code>SYMBOL,WEIGHT</code></p>
          <textarea
            className="pf-csv-input"
            rows={5}
            placeholder={"AAPL,0.30\nMSFT,0.25\nNVDA,0.20\nGOOGL,0.15\nAMZN,0.10"}
            value={csvText}
            onChange={e => setCsvText(e.target.value)}
          />
          <button className="btn-secondary btn-sm" onClick={parseCSV}>Parse CSV</button>
        </div>
      )}

      {/* Manual assets table (always visible) */}
      {inputMode === 'manual' && (
        <div className="pf-assets-list">
          <div className="pf-row pf-header-row">
            <span className="pf-cell sym-head">Symbol</span>
            <span className="pf-cell wt-head">Weight</span>
            <span className="pf-cell act-head"></span>
          </div>
          {assets.map((a, i) => (
            <div key={i} className="pf-row">
              <input
                className="pf-cell pf-sym-input"
                value={a.symbol}
                onChange={e => updateRow(i, 'symbol', e.target.value)}
                placeholder="AAPL"
                maxLength={10}
              />
              <input
                className="pf-cell pf-wt-input"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={a.weight}
                onChange={e => updateRow(i, 'weight', e.target.value)}
              />
              <button className="pf-cell pf-rm-btn" onClick={() => removeRow(i)} title="Remove">×</button>
            </div>
          ))}
          <div className="pf-add-row">
            <button className="btn-secondary btn-sm" onClick={addRow}>+ Add Asset</button>
            <span className={cls('pf-weight-sum', Math.abs(weightSum - 1) > 0.03 ? 'warn' : 'ok')}>
              Σ {weightSum.toFixed(2)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function ConstraintsPanel({ constraints, setConstraints }) {
  function upd(key, val) {
    setConstraints(prev => ({ ...prev, [key]: val }));
  }

  return (
    <div className="pf-constraints-panel">
      <div className="section-heading">Constraints & Parameters</div>
      <div className="pf-cstr-grid">
        <label className="pf-cstr-item">
          <span className="pf-cstr-label">Max Drawdown</span>
          <input type="number" step="0.01" min="0" max="1" placeholder="e.g. 0.15"
            value={constraints.max_drawdown} onChange={e => upd('max_drawdown', e.target.value)} className="pf-cstr-input" />
        </label>
        <label className="pf-cstr-item">
          <span className="pf-cstr-label">Max Concentration</span>
          <input type="number" step="0.01" min="0" max="1" placeholder="e.g. 0.40"
            value={constraints.max_concentration} onChange={e => upd('max_concentration', e.target.value)} className="pf-cstr-input" />
        </label>
        <label className="pf-cstr-item">
          <span className="pf-cstr-label">Min Liquidity</span>
          <input type="number" step="0.01" min="0" max="1" placeholder="e.g. 0.05"
            value={constraints.min_liquidity} onChange={e => upd('min_liquidity', e.target.value)} className="pf-cstr-input" />
        </label>
        <label className="pf-cstr-item">
          <span className="pf-cstr-label">Target Return</span>
          <input type="number" step="0.001" min="-1" max="5" placeholder="e.g. 0.05"
            value={constraints.target_return} onChange={e => upd('target_return', e.target.value)} className="pf-cstr-input" />
        </label>
        <label className="pf-cstr-item">
          <span className="pf-cstr-label">Simulations</span>
          <input type="number" step="100" min="100" max="100000"
            value={constraints.simulations} onChange={e => upd('simulations', e.target.value)} className="pf-cstr-input" />
        </label>
        <label className="pf-cstr-item">
          <span className="pf-cstr-label">Horizon (days)</span>
          <input type="number" step="1" min="1" max="365"
            value={constraints.horizon_days} onChange={e => upd('horizon_days', e.target.value)} className="pf-cstr-input" />
        </label>
      </div>
    </div>
  );
}

function PortfolioResults({ result, loading, error }) {
  if (loading) {
    return (
      <div className="pf-results">
        <div className="pf-loading">
          <div className="pf-spinner" />
          <span>Running Monte Carlo simulation…</span>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="pf-results">
        <div className="err-banner">{error}</div>
      </div>
    );
  }
  if (!result) {
    return (
      <div className="pf-results">
        <div className="pf-empty-state">
          <div className="pf-empty-icon">📊</div>
          <div className="pf-empty-title">No Results Yet</div>
          <div className="pf-empty-sub">Configure your portfolio and click <strong>Run Optimisation</strong> to see risk metrics, recommendations, and proposed weights.</div>
        </div>
      </div>
    );
  }

  const m = result.metrics || {};
  const rec = result.recommendation || {};
  const cc = result.constraints_check || {};
  const paths = result.simulated_paths_summary || {};
  const isRebalance = rec.action === 'rebalance';

  return (
    <div className="pf-results">
      {/* ── Risk Metrics KPIs ── */}
      <div className="section-heading">Risk Metrics</div>
      <div className="pf-kpi-grid">
        <div className="pf-kpi-card red-glow">
          <span className="pf-kpi-label">VaR (95%)</span>
          <span className="pf-kpi-val red">{pct(m.var_95, 2)}</span>
        </div>
        <div className="pf-kpi-card red-glow">
          <span className="pf-kpi-label">CVaR (95%)</span>
          <span className="pf-kpi-val red">{pct(m.cvar_95, 2)}</span>
        </div>
        <div className="pf-kpi-card">
          <span className="pf-kpi-label">P(Loss)</span>
          <span className={cls('pf-kpi-val', m.probability_of_loss > 0.5 ? 'red' : 'amber')}>{pct(m.probability_of_loss, 1)}</span>
        </div>
        <div className="pf-kpi-card green-glow">
          <span className="pf-kpi-label">Expected Return</span>
          <span className={cls('pf-kpi-val', m.expected_return >= 0 ? 'green' : 'red')}>{pct(m.expected_return, 2)}</span>
        </div>
        <div className="pf-kpi-card">
          <span className="pf-kpi-label">Confidence</span>
          <span className="pf-kpi-val">{pct(result.confidence, 1)}</span>
        </div>
        <div className="pf-kpi-card">
          <span className="pf-kpi-label">Error Rate</span>
          <span className="pf-kpi-val">{fmt(result.error_rate, 4)}</span>
        </div>
      </div>

      {/* ── Recommendation ── */}
      <div className="section-heading" style={{ marginTop: '20px' }}>Recommendation</div>
      <div className={cls('pf-rec-card', isRebalance ? 'rebalance' : 'hold')}>
        <div className="pf-rec-action">
          {isRebalance ? '⚖ REBALANCE' : '✓ HOLD'}
        </div>
        <div className="pf-rec-summary">{rec.summary || '—'}</div>
      </div>

      {/* ── Constraints Check ── */}
      {Object.keys(cc).length > 0 && (
        <React.Fragment>
          <div className="section-heading" style={{ marginTop: '16px' }}>Constraints Check</div>
          <div className="pf-cc-row">
            {Object.entries(cc).map(([k, v]) => (
              <span key={k} className={cls('pf-cc-badge', v ? 'pass' : 'fail')}>
                {v ? '✓' : '✗'} {k.replace(/_pass$/, '').replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </React.Fragment>
      )}

      {/* ── Proposed Weights Table ── */}
      {rec.proposed_weights && rec.proposed_weights.length > 0 && (
        <React.Fragment>
          <div className="section-heading" style={{ marginTop: '16px' }}>Proposed Weights</div>
          <table className="market-table pf-weights-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th style={{textAlign:'right'}}>Weight</th>
                <th style={{textAlign:'right'}}>Allocation</th>
              </tr>
            </thead>
            <tbody>
              {rec.proposed_weights.map((pw, i) => (
                <tr key={i}>
                  <td className="name">{pw.symbol}</td>
                  <td style={{textAlign:'right', fontVariantNumeric:'tabular-nums'}}>{pw.weight.toFixed(4)}</td>
                  <td style={{textAlign:'right'}}>
                    <div className="pf-alloc-bar-bg">
                      <div className="pf-alloc-bar" style={{ width: `${Math.min(pw.weight * 100, 100)}%` }} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </React.Fragment>
      )}

      {/* ── Simulation Summary ── */}
      {paths.simulations && (
        <React.Fragment>
          <div className="section-heading" style={{ marginTop: '16px' }}>Simulation Summary</div>
          <div className="pf-paths-strip">
            <KpiChip label="Min" value={paths.min_final?.toFixed(4)} accent="red" />
            <KpiChip label="P25" value={paths.p25_final?.toFixed(4)} />
            <KpiChip label="Median" value={paths.median_final?.toFixed(4)} />
            <KpiChip label="P75" value={paths.p75_final?.toFixed(4)} />
            <KpiChip label="Max" value={paths.max_final?.toFixed(4)} accent="green" />
          </div>
          <p className="pf-sim-note">{paths.simulations.toLocaleString()} simulations · {paths.horizon_days} day horizon</p>
        </React.Fragment>
      )}

      {/* ── Raw JSON ── */}
      <details className="advanced" style={{ marginTop: '16px' }}>
        <summary>Raw Response</summary>
        <pre className="adv-pre">{JSON.stringify(result, null, 2)}</pre>
      </details>
    </div>
  );
}

function PortfolioTab() {
  const [inputMode, setInputMode] = React.useState('preset');
  const [assets, setAssets] = React.useState(PRESETS['Tech Heavy'].map(a => ({ ...a })));
  const [csvText, setCsvText] = React.useState('');
  const [constraints, setConstraints] = React.useState({
    max_drawdown: '',
    max_concentration: '',
    min_liquidity: '',
    target_return: '',
    simulations: 1000,
    horizon_days: 30,
  });

  const [result, setResult] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  async function runOptimisation() {
    setLoading(true); setError(null); setResult(null);

    // Build constraints object — only include non-empty numeric values
    const cObj = {};
    if (constraints.max_drawdown !== '')     cObj.max_drawdown      = parseFloat(constraints.max_drawdown);
    if (constraints.max_concentration !== '') cObj.max_concentration = parseFloat(constraints.max_concentration);
    if (constraints.min_liquidity !== '')     cObj.min_liquidity     = parseFloat(constraints.min_liquidity);
    if (constraints.target_return !== '')     cObj.target_return     = parseFloat(constraints.target_return);

    const body = {
      assets: assets.filter(a => a.symbol.trim() !== ''),
      constraints: cObj,
      simulations:  parseInt(constraints.simulations, 10) || 1000,
      horizon_days: parseInt(constraints.horizon_days, 10) || 30,
    };

    try {
      const r = await fetch(`${API}/api/portfolio/optimize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || d.message || `HTTP ${r.status}`);
      setResult(d);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  const weightSum = assets.reduce((s, a) => s + (a.weight || 0), 0);
  const validAssets = assets.filter(a => a.symbol.trim() !== '').length;
  const canSubmit = validAssets >= 1 && Math.abs(weightSum - 1) <= 0.03 && !loading;

  return (
    <div className="pf-layout">
      {/* ── Left: inputs ── */}
      <div className="pf-col-left">
        <PortfolioInputPanel
          assets={assets}
          setAssets={setAssets}
          inputMode={inputMode}
          setInputMode={setInputMode}
          csvText={csvText}
          setCsvText={setCsvText}
        />
        <ConstraintsPanel constraints={constraints} setConstraints={setConstraints} />

        <button
          className="btn-primary pf-run-btn"
          disabled={!canSubmit}
          onClick={runOptimisation}
        >
          {loading ? '⏳ Running…' : '▶ Run Optimisation'}
        </button>
        {!canSubmit && !loading && (
          <p className="pf-validation-hint">
            {validAssets < 1 ? 'Add at least 1 asset.' : `Weights must sum to 1.00 (currently ${weightSum.toFixed(2)})`}
          </p>
        )}
      </div>

      {/* ── Right: results ── */}
      <div className="pf-col-right">
        <PortfolioResults result={result} loading={loading} error={error} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── RISK SCORE TAB (original flow, preserved) ──────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function DecisionPanel({ result, loading }) {
  if (loading) return <div className="decision-panel loading">Analyzing…</div>;
  if (!result)  return <div className="decision-panel empty">Run a scenario to see output.</div>;

  const isAnomaly = result.label === 'anomaly';
  const score = typeof result.risk_score === 'number'
    ? (result.risk_score * 100).toFixed(1) + '%'
    : '—';
  const conf = typeof result.confidence === 'number'
    ? (result.confidence * 100).toFixed(1) + '%'
    : '—';

  return (
    <div className={cls('decision-panel', isAnomaly ? 'anomaly' : 'normal')}>
      <div className="decision-label">{isAnomaly ? '⚠ ANOMALY' : '✓ NORMAL'}</div>

      <div className="decision-row">
        <span className="dr-key">Risk Score</span>
        <span className={cls('dr-val', isAnomaly ? 'red' : 'green')}>{score}</span>
      </div>
      <div className="decision-row">
        <span className="dr-key">Confidence</span>
        <span className="dr-val">{conf}</span>
      </div>
      <div className="decision-row">
        <span className="dr-key">Label</span>
        <span className="dr-val">{result.label ?? '—'}</span>
      </div>
      <div className="decision-row">
        <span className="dr-key">Recommendation</span>
        <span className="dr-val rec">{result.recommendation ?? '—'}</span>
      </div>
      <div className="decision-row col">
        <span className="dr-key">Decision Reason</span>
        <span className="dr-reason">{result.decision_reason ?? '—'}</span>
      </div>

      <details className="advanced">
        <summary>Advanced</summary>
        <pre className="adv-pre">{JSON.stringify(result, null, 2)}</pre>
      </details>
    </div>
  );
}

function RiskScoreTab() {
  const { data: demoCasesData } = useFetch(`${API}/api/demo-cases`);
  const { data: modelInfoData } = useFetch(`${ML}/model/info`);
  const demoCases = demoCasesData?.cases ?? null;
  const modelInfo = modelInfoData ?? null;

  const [selectedCase, setSelectedCase] = React.useState(0);
  const [result, setResult]   = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [errMsg, setErrMsg]   = React.useState(null);

  async function getFeatures(useManual) {
    if (useManual) {
      const raw = document.getElementById('manual-features')?.value || '';
      return raw.split(',').map(x => Number(x.trim())).filter(x => !isNaN(x));
    }
    if (demoCases && demoCases[selectedCase]) {
      return demoCases[selectedCase].features;
    }
    return [0.1, 0.4, 0.2, 0.3, 0.8, 0.2, 0.5, 0.9];
  }

  async function runEnsemble() {
    setLoading(true); setErrMsg(null);
    try {
      const features = await getFeatures(false);
      const r = await fetch(`${API}/api/infer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setResult(d);
    } catch (e) { setErrMsg(String(e)); }
    finally { setLoading(false); }
  }

  async function runScenario() {
    setLoading(true); setErrMsg(null);
    try {
      const r = await fetch(`${API}/api/simulate`);
      const d = await r.json();
      setResult(d);
    } catch (e) { setErrMsg(String(e)); }
    finally { setLoading(false); }
  }

  const KPI_CASES = demoCases ? demoCases.length : 0;

  return (
    <div className="layout-3col">
      <div className="col-left">
        <div className="section-heading">Scenario</div>
        <select className="case-select" value={selectedCase} onChange={e => setSelectedCase(Number(e.target.value))}>
          {(demoCases || []).map((c, i) => (
            <option key={i} value={i}>{c.name}</option>
          ))}
        </select>
        {demoCases && demoCases[selectedCase] && (
          <p className="case-desc">{demoCases[selectedCase].description}</p>
        )}

        <div className="cta-group" style={{ marginTop: '14px' }}>
          <button className="btn-primary" onClick={runEnsemble} disabled={loading}>
            {loading ? 'Running…' : '▶ Run Ensemble'}
          </button>
          <button className="btn-secondary" onClick={runScenario} disabled={loading}>
            ⚡ Run Scenario
          </button>
        </div>

        <div className="section-heading" style={{marginTop:'24px'}}>Features</div>
        <p className="hint">Selected case features are sent automatically. Override below if needed.</p>
        <details className="advanced">
          <summary>Manual override</summary>
          <textarea id="manual-features" className="feat-input" defaultValue="0.1,0.4,0.2,0.3,0.8,0.2,0.5,0.9" rows={3} />
        </details>
      </div>

      <div className="col-centre">
        <div className="section-heading">Model Overview</div>
        <div className="kpi-strip">
          <KpiChip label="Model"     value={modelInfo?.model_type} />
          <KpiChip label="Input Dim" value={modelInfo?.input_dim} />
          <KpiChip label="Threshold" value={modelInfo?.threshold} />
          <KpiChip label="Loaded"    value={modelInfo?.model_loaded ? 'Yes' : 'No'} accent={modelInfo?.model_loaded ? 'green' : 'red'} />
          <KpiChip label="Scenarios" value={KPI_CASES} />
        </div>

        <div className="section-heading" style={{marginTop:'20px'}}>Demo Cases</div>
        <table className="market-table">
          <thead>
            <tr><th>#</th><th>Name</th><th>Description</th><th>Vectors</th></tr>
          </thead>
          <tbody>
            {(demoCases || []).map((c, i) => (
              <tr key={i}>
                <td className="idx">{i + 1}</td>
                <td className="name">{c.name}</td>
                <td className="desc">{c.description}</td>
                <td className="vecs">{c.features?.length ?? '?'}D</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="col-right">
        <div className="section-heading">Decision Output</div>
        {errMsg && <div className="err-banner">{errMsg}</div>}
        <DecisionPanel result={result} loading={loading} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── STOCK PICKER TAB ───────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

function StockPickerTab() {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [lastRefresh, setLastRefresh] = React.useState(null);
  const [countdown, setCountdown] = React.useState(300);

  async function fetchPicks() {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${API}/api/stocks/picker?universe=top20&refresh=5m`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setData(d);
      setLastRefresh(new Date());
      setCountdown(300);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  // Auto-fetch on mount
  React.useEffect(() => { fetchPicks(); }, []);

  // Auto-refresh every 300s
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { fetchPicks(); return 300; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const picks = data?.picks || [];
  const rejected = data?.rejected || [];

  if (loading && !data) {
    return (
      <div className="sp-layout">
        <div className="pf-loading">
          <div className="pf-spinner" />
          <span>Loading stock picks…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="sp-layout">
      <div className="sp-header">
        <div>
          <div className="section-heading" style={{marginBottom: '2px'}}>Stock Picker — Top 20 Universe</div>
          <span className="sp-meta">
            {lastRefresh ? `Last refresh: ${lastRefresh.toLocaleTimeString()}` : ''} · Next in {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
          </span>
        </div>
        <button className="btn-primary btn-sm" onClick={fetchPicks} disabled={loading}>
          {loading ? '↻ Refreshing…' : '↻ Refresh Now'}
        </button>
      </div>

      {error && <div className="err-banner">{error}</div>}

      {!data && !error && (
        <div className="pf-empty-state">
          <div className="pf-empty-icon">📈</div>
          <div className="pf-empty-title">No Data</div>
          <div className="pf-empty-sub">Click Refresh to load stock picks.</div>
        </div>
      )}

      {data && (
        <React.Fragment>
          {/* ── Top Picks ── */}
          <div className="section-heading" style={{marginTop:'16px'}}>Top Picks</div>
          <table className="market-table sp-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Symbol</th>
                <th>Name</th>
                <th>Sector</th>
                <th style={{textAlign:'right'}}>Momentum</th>
                <th style={{textAlign:'right'}}>Value</th>
                <th style={{textAlign:'right'}}>Quality</th>
                <th style={{textAlign:'right'}}>Overall</th>
                <th style={{textAlign:'right'}}>Confidence</th>
                <th>Tags</th>
              </tr>
            </thead>
            <tbody>
              {picks.map((s, i) => (
                <tr key={s.symbol}>
                  <td className="idx">{i + 1}</td>
                  <td className="name">{s.symbol}</td>
                  <td className="desc">{s.name}</td>
                  <td><span className="sp-sector-badge">{s.sector}</span></td>
                  <td style={{textAlign:'right'}} className={s.momentum > 0.6 ? 'green-text' : s.momentum < 0.3 ? 'red-text' : ''}>{(s.momentum * 100).toFixed(1)}</td>
                  <td style={{textAlign:'right'}} className={s.value > 0.6 ? 'green-text' : s.value < 0.3 ? 'red-text' : ''}>{(s.value * 100).toFixed(1)}</td>
                  <td style={{textAlign:'right'}} className={s.quality > 0.6 ? 'green-text' : s.quality < 0.3 ? 'red-text' : ''}>{(s.quality * 100).toFixed(1)}</td>
                  <td style={{textAlign:'right', fontWeight: 700}} className={s.overall > 0.6 ? 'green-text' : s.overall < 0.4 ? 'red-text' : ''}>{(s.overall * 100).toFixed(1)}</td>
                  <td style={{textAlign:'right'}}>{(s.confidence * 100).toFixed(0)}%</td>
                  <td>
                    <div className="sp-tags">
                      {s.reason_tags.map((t, j) => <span key={j} className={cls('sp-tag', t.includes('strong') || t.includes('high') || t.includes('value play') ? 'positive' : t.includes('weak') || t.includes('low') || t.includes('expensive') ? 'negative' : '')}>{t}</span>)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ── Rejected ── */}
          <details className="advanced" style={{marginTop:'24px'}}>
            <summary style={{fontSize:'12px'}}>Rejected Stocks ({rejected.length})</summary>
            <table className="market-table sp-table" style={{marginTop:'8px'}}>
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Name</th>
                  <th style={{textAlign:'right'}}>Overall</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                {rejected.map(s => (
                  <tr key={s.symbol} className="sp-rejected-row">
                    <td className="name" style={{opacity:0.6}}>{s.symbol}</td>
                    <td className="desc" style={{opacity:0.6}}>{s.name}</td>
                    <td style={{textAlign:'right', opacity:0.6}}>{(s.overall * 100).toFixed(1)}</td>
                    <td><span className="sp-reject-reason">{s.reason_not_selected}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        </React.Fragment>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── FRAUD DETECTION TAB ────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const SAMPLE_CSV = `amount,merchant,category,hour,is_foreign
150.00,Amazon,retail,14,false
8500.00,Unknown Merchant,wire_transfer,3,true
45.00,Starbucks,food,9,false
3200.00,CryptoExchange,crypto,2,true
75.00,Netflix,subscription,20,false
12000.00,Offshore LLC,cash_advance,1,true
250.00,Walmart,retail,15,false
6000.00,Casino Royal,gambling,23,false`;

function FraudTab() {
  const [csvText, setCsvText] = React.useState('');
  const [result, setResult] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  function parseCSVToRows(text) {
    const lines = text.trim().split('\n').filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim());
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
      return {
        amount: parseFloat(obj.amount) || 0,
        merchant: obj.merchant || '',
        category: obj.category || '',
        hour: parseInt(obj.hour, 10) || 12,
        is_foreign: obj.is_foreign === 'true' || obj.is_foreign === '1',
      };
    });
  }

  async function runScan() {
    setLoading(true); setError(null); setResult(null);
    const rows = parseCSVToRows(csvText);
    if (rows.length === 0) {
      setError('No valid rows found. Paste CSV with headers: amount,merchant,category,hour,is_foreign');
      setLoading(false);
      return;
    }
    try {
      const r = await fetch(`${API}/api/fraud/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || d.message || `HTTP ${r.status}`);
      setResult(d);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  function loadSample() {
    setCsvText(SAMPLE_CSV);
  }

  const alert = result?.account_alert;
  const txns = result?.transactions || [];

  return (
    <div className="fd-layout">
      {/* ── Left: Input ── */}
      <div className="fd-col-left">
        <div className="section-heading">Transaction Input (CSV)</div>
        <p className="hint">Paste CSV with headers: amount, merchant, category, hour, is_foreign</p>
        <textarea
          className="pf-csv-input fd-csv-input"
          rows={10}
          placeholder={SAMPLE_CSV}
          value={csvText}
          onChange={e => setCsvText(e.target.value)}
        />
        <div className="fd-btn-row">
          <button className="btn-secondary btn-sm" onClick={loadSample}>Load Sample</button>
          <button className="btn-primary fd-scan-btn" onClick={runScan} disabled={loading || !csvText.trim()}>
            {loading ? '⏳ Scanning…' : '🔍 Scan for Fraud'}
          </button>
        </div>
      </div>

      {/* ── Right: Results ── */}
      <div className="fd-col-right">
        {loading && (
          <div className="pf-loading">
            <div className="pf-spinner" />
            <span>Scanning transactions…</span>
          </div>
        )}

        {error && <div className="err-banner">{error}</div>}

        {!result && !loading && !error && (
          <div className="pf-empty-state">
            <div className="pf-empty-icon">🛡</div>
            <div className="pf-empty-title">No Scan Results</div>
            <div className="pf-empty-sub">Paste transaction CSV and click <strong>Scan for Fraud</strong> to analyze transactions for suspicious activity.</div>
          </div>
        )}

        {result && (
          <React.Fragment>
            {/* ── Account Alert ── */}
            <div className="section-heading">Account Alert</div>
            <div className={cls('fd-alert-card', alert?.action === 'block' ? 'fd-block' : alert?.action === 'review' ? 'fd-review' : 'fd-monitor')}>
              <div className="fd-alert-action">
                {alert?.action === 'block' ? '🚫 BLOCK' : alert?.action === 'review' ? '⚠ REVIEW' : '✓ MONITOR'}
              </div>
              <div className="fd-alert-score">Alert Score: {(alert?.alert_score * 100).toFixed(1)}%</div>
              <div className="fd-alert-summary">{alert?.summary}</div>
              <div className="fd-alert-meta">{alert?.high_risk_count} high-risk · {alert?.total_scanned} scanned</div>
            </div>

            {/* ── Transactions Table ── */}
            <div className="section-heading" style={{marginTop:'20px'}}>Transaction Results</div>
            <table className="market-table fd-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Merchant</th>
                  <th>Category</th>
                  <th style={{textAlign:'right'}}>Amount</th>
                  <th style={{textAlign:'right'}}>Fraud Score</th>
                  <th>Label</th>
                  <th>Suspicious Features</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t, i) => (
                  <tr key={i} className={t.label === 'fraudulent' ? 'fd-row-fraud' : t.label === 'suspicious' ? 'fd-row-suspicious' : ''}>
                    <td className="idx">{i + 1}</td>
                    <td className="name">{t.merchant}</td>
                    <td>{t.category}</td>
                    <td style={{textAlign:'right', fontVariantNumeric:'tabular-nums'}}>${t.amount.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                    <td style={{textAlign:'right'}}>
                      <span className={cls('fd-score-badge', t.fraud_score > 0.65 ? 'high' : t.fraud_score > 0.4 ? 'mid' : 'low')}>
                        {(t.fraud_score * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      <span className={cls('fd-label-badge', t.label === 'fraudulent' ? 'fraud' : t.label === 'suspicious' ? 'sus' : 'legit')}>
                        {t.label}
                      </span>
                    </td>
                    <td>
                      <div className="sp-tags">
                        {t.suspicious_features.map((f, j) => <span key={j} className="sp-tag negative">{f}</span>)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <details className="advanced" style={{marginTop:'16px'}}>
              <summary>Raw Response</summary>
              <pre className="adv-pre">{JSON.stringify(result, null, 2)}</pre>
            </details>
          </React.Fragment>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── ROOT APP WITH TABS ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

const TABS = [
  { id: 'portfolio', label: 'Portfolio', icon: '📊' },
  { id: 'stocks',    label: 'Stock Picker', icon: '📈' },
  { id: 'fraud',     label: 'Fraud Detect', icon: '🛡' },
  { id: 'risk',      label: 'Risk Score', icon: '⚡' },
];

function App() {
  const [activeTab, setActiveTab] = React.useState('portfolio');
  const { data: beHealthData } = useFetch(`${API}/health`);
  const { data: mlHealthData } = useFetch(`${ML}/health`);
  const beOk = beHealthData?.ok === true;
  const mlOk = mlHealthData?.ok === true;

  return (
    <div className="app-shell">
      <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} beOk={beOk} mlOk={mlOk} />
      <div className="tab-content">
        {activeTab === 'portfolio' && <PortfolioTab />}
        {activeTab === 'stocks' && <StockPickerTab />}
        {activeTab === 'fraud' && <FraudTab />}
        {activeTab === 'risk' && <RiskScoreTab />}
      </div>
      <div className="app-footer">
        <span>Hackathon build – deploy ready</span>
        <span>API: {API}</span>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

/* FinSentinel Terminal — P-002 UI
   OpenBB/Bloomberg-inspired 3-column layout.
   Loaded via Babel standalone (CDN) from index.html.
   All existing API calls preserved: /api/demo-cases, /api/infer, /api/simulate, /health, /model/info
*/

const API = 'http://localhost:4000';
const ML  = 'http://localhost:8000';

// ─── tiny helpers ────────────────────────────────────────────────────────────
const cls = (...a) => a.filter(Boolean).join(' ');

function useFetch(url) {
  const [data, setData] = React.useState(null);
  const [err,  setErr]  = React.useState(null);
  React.useEffect(() => {
    fetch(url).then(r => r.json()).then(setData).catch(e => setErr(String(e)));
  }, [url]);
  return { data, err };
}

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

// ─── Decision card ───────────────────────────────────────────────────────────
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

// ─── Left column ─────────────────────────────────────────────────────────────
function LeftPanel({ demoCases, selectedCase, onSelectCase, onRunEnsemble, onRunScenario, loading, beOk, mlOk }) {
  return (
    <div className="col-left">
      <div className="brand">
        <span className="brand-name">FinSentinel</span>
        <span className="brand-tag">Finance Intelligence</span>
      </div>

      <div className="status-bar">
        <StatusDot ok={beOk} label="Backend" />
        <StatusDot ok={mlOk} label="ML" />
      </div>

      <div className="section-heading">Scenario</div>
      <select
        className="case-select"
        value={selectedCase}
        onChange={e => onSelectCase(Number(e.target.value))}
      >
        {(demoCases || []).map((c, i) => (
          <option key={i} value={i}>{c.name}</option>
        ))}
      </select>
      {demoCases && demoCases[selectedCase] && (
        <p className="case-desc">{demoCases[selectedCase].description}</p>
      )}

      <div className="cta-group">
        <button className="btn-primary" onClick={onRunEnsemble} disabled={loading}>
          {loading ? 'Running…' : '▶ Run Ensemble'}
        </button>
        <button className="btn-secondary" onClick={onRunScenario} disabled={loading}>
          ⚡ Run Scenario
        </button>
      </div>

      <div className="section-heading" style={{marginTop:'24px'}}>Features</div>
      <p className="hint">Selected case features are sent automatically. Override below if needed.</p>

      <details className="advanced">
        <summary>Manual override</summary>
        <textarea
          id="manual-features"
          className="feat-input"
          defaultValue="0.1,0.4,0.2,0.3,0.8,0.2,0.5,0.9"
          rows={3}
        />
      </details>
    </div>
  );
}

// ─── Centre column ────────────────────────────────────────────────────────────
function CentrePanel({ modelInfo, demoCases }) {
  const KPI_CASES = demoCases ? demoCases.length : 0;

  return (
    <div className="col-centre">
      <div className="section-heading">Model Overview</div>
      <div className="kpi-strip">
        <KpiChip label="Model"      value={modelInfo?.model_type} />
        <KpiChip label="Input Dim"  value={modelInfo?.input_dim} />
        <KpiChip label="Threshold"  value={modelInfo?.threshold} />
        <KpiChip label="Loaded"     value={modelInfo?.model_loaded ? 'Yes' : 'No'} accent={modelInfo?.model_loaded ? 'green' : 'red'} />
        <KpiChip label="Scenarios"  value={KPI_CASES} />
      </div>

      <div className="section-heading" style={{marginTop:'20px'}}>Demo Cases</div>
      <table className="market-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Description</th>
            <th>Vectors</th>
          </tr>
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
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
function App() {
  const { data: demoCasesData } = useFetch(`${API}/api/demo-cases`);
  const { data: modelInfoData }  = useFetch(`${ML}/model/info`);
  const { data: beHealthData }   = useFetch(`${API}/health`);
  const { data: mlHealthData }   = useFetch(`${ML}/health`);

  const demoCases = demoCasesData?.cases ?? null;
  const modelInfo = modelInfoData ?? null;
  const beOk = beHealthData?.ok === true;
  const mlOk = mlHealthData?.ok === true;

  const [selectedCase, setSelectedCase] = React.useState(0);
  const [result,  setResult]  = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [errMsg,  setErrMsg]  = React.useState(null);

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

  return (
    <div className="layout">
      <LeftPanel
        demoCases={demoCases}
        selectedCase={selectedCase}
        onSelectCase={setSelectedCase}
        onRunEnsemble={runEnsemble}
        onRunScenario={runScenario}
        loading={loading}
        beOk={beOk}
        mlOk={mlOk}
      />
      <CentrePanel modelInfo={modelInfo} demoCases={demoCases} />
      <div className="col-right">
        <div className="section-heading">Decision Output</div>
        {errMsg && <div className="err-banner">{errMsg}</div>}
        <DecisionPanel result={result} loading={loading} />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);

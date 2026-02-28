import React, { useEffect, useState } from 'react';

const API = process.env.REACT_APP_API_URL || 'http://localhost:4000';

const styles = {
  body: { background:'#070b12', color:'#eaf1ff', fontFamily:'Inter,Arial,sans-serif', maxWidth:980, margin:'24px auto', padding:'0 16px' },
  card: { border:'1px solid rgba(255,255,255,.15)', borderRadius:12, padding:16, marginTop:12, background:'#0c1220' },
  input: { padding:'8px 10px', borderRadius:8, border:'1px solid #24324a', background:'#0f182c', color:'#eaf1ff' },
  badge: (ok) => ({ display:'inline-block', padding:'4px 8px', borderRadius:999, border:'1px solid '+(ok?'#2f8f62':'#8f3b3b'), background: ok?'#103025':'#2e1818', fontSize:12, marginRight:6 }),
  grid: { display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:12 },
  metric: { border:'1px solid rgba(255,255,255,.12)', borderRadius:10, padding:10, background:'#0f1729' }
};

export default function App(){
  const [cases,setCases]=useState([]);
  const [selected,setSelected]=useState('');
  const [features,setFeatures]=useState('0.1,0.4,0.2,0.3,0.8,0.2,0.5,0.9');
  const [backendOk,setBackendOk]=useState(false);
  const [mlOk,setMlOk]=useState(false);
  const [raw,setRaw]=useState('(waiting)');
  const [result,setResult]=useState({});

  useEffect(()=>{ init(); },[]);

  async function init(){
    await Promise.all([loadCases(), health()]);
  }
  async function health(){
    try { const r = await fetch(`${API}/health`); setBackendOk(r.ok);} catch { setBackendOk(false); }
    try { const r = await fetch(`${API}/api/model-info`); setMlOk(r.ok);} catch { setMlOk(false); }
  }
  async function loadCases(){
    try {
      const r = await fetch(`${API}/api/demo-cases`);
      const d = await r.json();
      const arr = d.cases || [];
      setCases(arr);
      if (arr.length) setSelected(arr[0].name);
    } catch {}
  }
  function loadCase(){
    const c = cases.find(x=>x.name===selected);
    if (c) setFeatures(c.features.join(','));
  }
  async function runInfer(){
    const arr = features.split(',').map(x=>Number(x.trim())).filter(x=>!Number.isNaN(x));
    setRaw('running /api/infer ...');
    try{
      const r = await fetch(`${API}/api/infer`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({features:arr})});
      const d = await r.json();
      setRaw(JSON.stringify(d,null,2));
      if (d.ok) setResult(d);
    }catch(e){ setRaw('error: '+e); }
  }
  async function runSim(){
    setRaw('running /api/simulate ...');
    try{
      const r = await fetch(`${API}/api/simulate`);
      const d = await r.json();
      setRaw(JSON.stringify(d,null,2));
      if (d.ok) setResult(d);
    }catch(e){ setRaw('error: '+e); }
  }

  return (
    <div style={styles.body}>
      <h1>FinSentinel — Finance Intelligence Copilot</h1>
      <p>
        <span style={styles.badge(true)}>Finance Track</span>
        <span style={styles.badge(true)}>Deep Learning</span>
        <span style={styles.badge(true)}>Microservices</span>
      </p>

      <div style={styles.card}>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
          <label>Demo case:</label>
          <select style={styles.input} value={selected} onChange={e=>setSelected(e.target.value)}>
            {cases.map(c=><option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
          <button style={styles.input} onClick={loadCase}>Load Case</button>
        </div>
        <div style={{marginTop:10}}>
          <label>Input features (comma-separated): </label>
          <input style={{...styles.input, width:'100%', marginTop:6}} value={features} onChange={e=>setFeatures(e.target.value)} />
        </div>
        <div style={{marginTop:10}}>
          <button style={styles.input} onClick={runInfer}>Run Inference</button>
          <button style={styles.input} onClick={runSim}>Run Simulated Case</button>
        </div>
        <div style={{marginTop:10}}>
          <span style={styles.badge(backendOk)}>Backend: {backendOk?'OK':'DOWN'}</span>
          <span style={styles.badge(mlOk)}>ML: {mlOk?'OK':'DOWN'}</span>
        </div>
      </div>

      <div style={styles.card}>
        <h3>Result</h3>
        <div style={styles.grid}>
          <div style={styles.metric}><div>Risk Score</div><b>{result.risk_score ?? '-'}</b></div>
          <div style={styles.metric}><div>Label</div><b>{result.label ?? '-'}</b></div>
          <div style={styles.metric}><div>Confidence</div><b>{result.confidence ?? '-'}</b></div>
          <div style={styles.metric}><div>Recommendation</div><b>{result.recommendation ?? '-'}</b></div>
        </div>
        <div style={{...styles.metric, marginTop:10}}><div>Decision Reason</div><b>{result.decision_reason ?? '-'}</b></div>
        <div style={{...styles.metric, marginTop:10}}><div>Timestamp</div><b>{result.timestamp ?? '-'}</b></div>
      </div>

      <div style={styles.card}>
        <h3>Raw Output</h3>
        <pre style={{whiteSpace:'pre-wrap'}}>{raw}</pre>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const WS = (import.meta.env.VITE_WS_URL || 'ws://localhost:4000/ws/signals');

const styles = {
  page:{ background:'#05080f', color:'#d9e5ff', fontFamily:'Inter,Arial,sans-serif', minHeight:'100vh', padding:'12px' },
  grid:{ display:'grid', gridTemplateColumns:'240px 1fr 360px', gap:10 },
  panel:{ border:'1px solid #1f2d47', background:'#0b1322', borderRadius:8, padding:10 },
  title:{ fontSize:12, color:'#8fb7ff', textTransform:'uppercase', letterSpacing:1.2 },
  table:{ width:'100%', borderCollapse:'collapse', fontSize:13 },
  td:{ borderBottom:'1px solid #1f2d47', padding:'6px 4px' },
  badge:(ok)=>({display:'inline-block',padding:'3px 8px',borderRadius:999,border:'1px solid '+(ok?'#2a7c57':'#7c2a2a'),background:ok?'#0e2f22':'#2f1212',fontSize:11,marginRight:6})
};

function LeftNav(){
  return (
    <div style={styles.panel}>
      <div style={styles.title}>Console</div>
      <div style={{marginTop:10,lineHeight:1.9}}>
        <div>Watchlist</div><div>Signals</div><div>Risk</div><div>Alerts</div><div>Scenarios</div><div>Audit</div>
      </div>
    </div>
  );
}

function MarketTable({markets}){
  return (
    <div style={styles.panel}>
      <div style={styles.title}>Live Market Feed</div>
      <table style={{...styles.table, marginTop:8}}>
        <thead><tr><th align='left'>Symbol</th><th align='right'>Price</th><th align='right'>Δ%</th><th align='right'>Volume</th></tr></thead>
        <tbody>
          {markets.map(m=>(
            <tr key={m.symbol}>
              <td style={styles.td}>{m.symbol}</td>
              <td style={{...styles.td,textAlign:'right'}}>{m.price}</td>
              <td style={{...styles.td,textAlign:'right', color:m.changePct>=0?'#79e8a7':'#ff8b8b'}}>{m.changePct}</td>
              <td style={{...styles.td,textAlign:'right'}}>{m.volume.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RightPanel({ensemble, regime, backendOk, mlOk, wsOk}){
  return (
    <div style={styles.panel}>
      <div style={styles.title}>Model Decision</div>
      <div style={{marginTop:8}}>
        <span style={styles.badge(backendOk)}>Backend {backendOk?'OK':'DOWN'}</span>
        <span style={styles.badge(mlOk)}>ML {mlOk?'OK':'DOWN'}</span>
        <span style={styles.badge(wsOk)}>WS {wsOk?'OK':'DOWN'}</span>
      </div>
      <div style={{marginTop:12,fontSize:14}}>
        <div><b>Regime:</b> {regime?.regime || '-'}</div>
        <div><b>Action:</b> {ensemble?.action?.action || '-'}</div>
        <div><b>Confidence:</b> {ensemble?.action?.confidence ?? '-'}</div>
        <div><b>Uncertainty:</b> {ensemble?.uncertainty ?? '-'}</div>
        <div><b>Disagreement:</b> {String(ensemble?.disagreement ?? false)}</div>
      </div>
      <div style={{marginTop:12,padding:8,border:'1px solid #1f2d47',borderRadius:6,fontSize:12,color:'#a8c4ff'}}>
        {ensemble?.summary || 'Awaiting ensemble output...'}
      </div>
    </div>
  );
}

export default function App(){
  const [backendOk,setBackendOk]=useState(false);
  const [mlOk,setMlOk]=useState(false);
  const [wsOk,setWsOk]=useState(false);
  const [markets,setMarkets]=useState([]);
  const [regime,setRegime]=useState(null);
  const [ensemble,setEnsemble]=useState(null);
  const [features,setFeatures]=useState('0.6,0.7,-0.3,0.5,-0.4,0.9,-0.2,0.1');
  const [scenario,setScenario]=useState('volatility-spike');
  const [log,setLog]=useState([]);

  useEffect(()=>{ health(); connectWS(); },[]);

  async function health(){
    try{ const r=await fetch(`${API}/health`); setBackendOk(r.ok);}catch{setBackendOk(false)}
    try{ const r=await fetch(`${API}/api/model-info`); setMlOk(r.ok);}catch{setMlOk(false)}
  }

  function connectWS(){
    const ws = new WebSocket(WS);
    ws.onopen = ()=>setWsOk(true);
    ws.onclose = ()=>setWsOk(false);
    ws.onmessage = (ev)=>{
      const d = JSON.parse(ev.data);
      if(d.type==='tick'){
        setMarkets(d.markets || []);
        setRegime(d.regime || null);
        setLog((prev)=>[`${new Date().toLocaleTimeString()} tick ${d.regime?.regime || ''}`,...prev].slice(0,12));
      }
    };
  }

  async function runEnsemble(){
    const arr = features.split(',').map(x=>Number(x.trim())).filter(x=>!Number.isNaN(x));
    const r = await fetch(`${API}/api/ensemble`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({features:arr})});
    const d = await r.json();
    if(d.ok){
      setEnsemble(d);
      setRegime(d.regime);
      setMarkets(d.markets || markets);
      setLog((prev)=>[`${new Date().toLocaleTimeString()} ensemble -> ${d.action?.action}`,...prev].slice(0,12));
    }
  }

  async function runScenario(){
    const r = await fetch(`${API}/api/scenario/run`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({scenario})});
    const d = await r.json();
    if(d.ok){
      setRegime(d.regime);
      setMarkets(d.after || []);
      setLog((prev)=>[`${new Date().toLocaleTimeString()} scenario ${scenario}`,...prev].slice(0,12));
    }
  }

  const anomalyRatio = useMemo(()=>{
    if(!markets.length) return '-';
    const hi = markets.filter(m=>Math.abs(m.changePct)>1).length;
    return `${hi}/${markets.length}`;
  },[markets]);

  return (
    <div style={styles.page}>
      <h2 style={{margin:'4px 0 10px'}}>FinSentinel // Bloomberg-style AI Finance Ops Console</h2>
      <div style={styles.grid}>
        <div>
          <LeftNav/>
          <div style={{...styles.panel, marginTop:10}}>
            <div style={styles.title}>Actions</div>
            <div style={{marginTop:8,fontSize:12}}>Features</div>
            <textarea value={features} onChange={e=>setFeatures(e.target.value)} style={{width:'100%',height:58,background:'#0f182c',color:'#eaf1ff',border:'1px solid #24324a',borderRadius:6}} />
            <button onClick={runEnsemble} style={{marginTop:8,width:'100%',background:'#0f182c',color:'#eaf1ff',border:'1px solid #24324a',borderRadius:6,padding:8}}>Run Ensemble</button>
            <div style={{marginTop:8}}>
              <select value={scenario} onChange={e=>setScenario(e.target.value)} style={{width:'100%',background:'#0f182c',color:'#eaf1ff',border:'1px solid #24324a',borderRadius:6,padding:8}}>
                <option value='volatility-spike'>Volatility Spike</option>
                <option value='rate-hike'>Rate Hike</option>
                <option value='liquidity-crunch'>Liquidity Crunch</option>
              </select>
            </div>
            <button onClick={runScenario} style={{marginTop:8,width:'100%',background:'#0f182c',color:'#eaf1ff',border:'1px solid #24324a',borderRadius:6,padding:8}}>Run Scenario</button>
          </div>
        </div>

        <div>
          <MarketTable markets={markets}/>
          <div style={{...styles.panel, marginTop:10}}>
            <div style={styles.title}>KPI</div>
            <div style={{marginTop:8,fontSize:13}}>Anomaly-like moves: <b>{anomalyRatio}</b></div>
            <div style={{fontSize:13}}>Avg regime score: <b>{regime?.score ?? '-'}</b></div>
          </div>
          <div style={{...styles.panel, marginTop:10}}>
            <div style={styles.title}>Event Feed</div>
            <div style={{marginTop:8,fontSize:12,lineHeight:1.6}}>{log.map((x,i)=><div key={i}>{x}</div>)}</div>
          </div>
        </div>

        <RightPanel ensemble={ensemble} regime={regime} backendOk={backendOk} mlOk={mlOk} wsOk={wsOk}/>
      </div>
    </div>
  );
}

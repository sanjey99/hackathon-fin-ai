import { useState, useEffect, useRef } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Plus, Minus, Play, Loader, TrendingUp, TrendingDown, AlertTriangle, X, ExternalLink, Info, Target, Shield, Zap } from 'lucide-react';
import { C, DATA_SOURCE_STYLE } from './colors';
import type { DataSourceKind } from './colors';

interface Asset {
  ticker: string;
  weight: number;
  color: string;
}

const COLORS = [C.orange, C.cyan, C.green, '#9B59B6', '#E74C3C', '#3498DB', '#F39C12', '#1ABC9C', '#E67E22'];

/* ── Ticker auto-suggest universe ──────────────────────────────────────────── */
const TICKER_UNIVERSE = [
  { sym: 'AAPL', name: 'Apple Inc.' }, { sym: 'MSFT', name: 'Microsoft Corp.' },
  { sym: 'GOOGL', name: 'Alphabet Inc.' }, { sym: 'AMZN', name: 'Amazon.com' },
  { sym: 'TSLA', name: 'Tesla Inc.' }, { sym: 'NVDA', name: 'NVIDIA Corp.' },
  { sym: 'META', name: 'Meta Platforms' }, { sym: 'JPM', name: 'JPMorgan Chase' },
  { sym: 'V', name: 'Visa Inc.' }, { sym: 'JNJ', name: 'Johnson & Johnson' },
  { sym: 'BND', name: 'Vanguard Total Bond' }, { sym: 'GLD', name: 'SPDR Gold Shares' },
  { sym: 'VNQ', name: 'Vanguard Real Estate' }, { sym: 'QQQ', name: 'Invesco Nasdaq 100' },
  { sym: 'SPY', name: 'SPDR S&P 500' }, { sym: 'IWM', name: 'iShares Russell 2000' },
  { sym: 'XOM', name: 'Exxon Mobil' }, { sym: 'PFE', name: 'Pfizer Inc.' },
  { sym: 'KO', name: 'Coca-Cola Co.' }, { sym: 'BAC', name: 'Bank of America' },
  { sym: 'WMT', name: 'Walmart Inc.' }, { sym: 'HD', name: 'Home Depot' },
  { sym: 'INTC', name: 'Intel Corp.' }, { sym: 'DIS', name: 'Walt Disney' },
];

type Objective = 'max_sharpe' | 'min_risk' | 'max_return';
const OBJECTIVES: { id: Objective; label: string; icon: typeof Target; desc: string }[] = [
  { id: 'max_sharpe', label: 'MAX SHARPE', icon: Target, desc: 'Maximize risk-adjusted return' },
  { id: 'min_risk', label: 'MIN RISK', icon: Shield, desc: 'Minimize portfolio volatility' },
  { id: 'max_return', label: 'MAX RETURN', icon: Zap, desc: 'Maximize expected return' },
];

const INITIAL_ASSETS: Asset[] = [
  { ticker: 'AAPL', weight: 20, color: COLORS[0] },
  { ticker: 'MSFT', weight: 15, color: COLORS[1] },
  { ticker: 'GOOGL', weight: 15, color: COLORS[2] },
  { ticker: 'AMZN', weight: 10, color: COLORS[3] },
  { ticker: 'TSLA', weight: 5, color: COLORS[4] },
  { ticker: 'BND', weight: 20, color: COLORS[5] },
  { ticker: 'GLD', weight: 10, color: COLORS[6] },
  { ticker: 'VNQ', weight: 5, color: COLORS[7] },
];

const OPTIMIZED_WEIGHTS: Record<string, number> = {
  AAPL: 18, MSFT: 22, GOOGL: 12, AMZN: 8, TSLA: 3, BND: 25, GLD: 8, VNQ: 4,
};

// Efficient frontier data
const FRONTIER = Array.from({ length: 30 }, (_, i) => {
  const t = i / 29;
  const risk = 2 + t * 22;
  const ret = 1.5 + Math.pow(t, 0.5) * 10 + t * 2;
  return { risk: parseFloat(risk.toFixed(2)), return: parseFloat(ret.toFixed(2)) };
});

const PORTFOLIO_ALERTS = [
  { severity: 'high', msg: 'TSLA volatility exceeds threshold (σ > 45%)', time: '2m ago' },
  { severity: 'high', msg: 'VaR breach: Drawdown risk elevated to 5.2%', time: '7m ago' },
  { severity: 'medium', msg: 'AMZN position underweight vs benchmark', time: '14m ago' },
  { severity: 'medium', msg: 'Correlation spike: AAPL-MSFT > 0.87', time: '28m ago' },
  { severity: 'low', msg: 'Portfolio rebalancing opportunity detected', time: '35m ago' },
  { severity: 'low', msg: 'GLD approaching target weight threshold', time: '52m ago' },
  { severity: 'medium', msg: 'Sector concentration: Tech > 60%', time: '1h ago' },
];

const SEVERITY_COLOR: Record<string, string> = { high: C.red, medium: C.yellow, low: C.green };

function TreemapBlock({ asset, optimized, onClick }: { asset: Asset; optimized?: number; onClick?: () => void }) {
  const diff = optimized !== undefined ? optimized - asset.weight : 0;
  return (
    <div
      onClick={onClick}
      title={`${asset.ticker}: ${asset.weight}% → ${optimized ?? asset.weight}% — click for details`}
      style={{
        flex: `0 0 ${Math.max(asset.weight, 4)}%`,
        height: asset.weight > 15 ? 80 : asset.weight > 8 ? 60 : 44,
        background: `${asset.color}22`,
        border: `1px solid ${asset.color}60`,
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        margin: 2,
      }}
    >
      <span style={{ fontFamily: C.mono, fontSize: 11, color: asset.color, fontWeight: 600 }}>{asset.ticker}</span>
      <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text }}>{asset.weight}%</span>
      {diff !== 0 && (
        <span style={{ fontFamily: C.mono, fontSize: 8, color: diff > 0 ? C.green : C.red }}>
          {diff > 0 ? '+' : ''}{diff}%
        </span>
      )}
      <div style={{
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        height: 3,
        background: asset.color,
        opacity: 0.6,
        transform: `scaleX(${asset.weight / 25})`,
        transformOrigin: 'left',
      }} />
    </div>
  );
}

const CustomFrontierTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0]?.payload;
    return (
      <div style={{ background: C.bgPanel, border: `1px solid ${C.border}`, padding: '6px 10px', borderRadius: 2 }}>
        <div style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim }}>Risk: <span style={{ color: C.text }}>{d?.risk}%</span></div>
        <div style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim }}>Return: <span style={{ color: C.text }}>{d?.return}%</span></div>
      </div>
    );
  }
  return null;
};

export function Portfolio({ demoMode = true }: { demoMode?: boolean }) {
  const [assets, setAssets] = useState<Asset[]>(INITIAL_ASSETS);
  const [newTicker, setNewTicker] = useState('');
  const [suggestions, setSuggestions] = useState<typeof TICKER_UNIVERSE>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [objective, setObjective] = useState<Objective>('max_sharpe');
  const [maxVol, setMaxVol] = useState(18);
  const [minReturn, setMinReturn] = useState(7);
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('done');
  const [showOptimized, setShowOptimized] = useState(true);
  const [healthScore, setHealthScore] = useState(76);
  const [tickerError, setTickerError] = useState('');
  const [drawerAsset, setDrawerAsset] = useState<Asset | null>(null);
  const [frontierData, setFrontierData] = useState(FRONTIER);
  const [currentPt, setCurrentPt] = useState([{ risk: 15.2, return: 8.7 }]);
  const [optimizedPt, setOptimizedPt] = useState([{ risk: 11.8, return: 9.8 }]);
  const [whyText, setWhyText] = useState('');
  const suggestRef = useRef<HTMLDivElement>(null);
  const [metrics, setMetrics] = useState({
    sharpe: 1.24, var95: 3.8, maxDrawdown: 12.4, expectedReturn: 8.7
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setMetrics(m => ({
        sharpe: parseFloat((m.sharpe + (Math.random() - 0.5) * 0.02).toFixed(2)),
        var95: parseFloat((m.var95 + (Math.random() - 0.5) * 0.05).toFixed(2)),
        maxDrawdown: parseFloat((m.maxDrawdown + (Math.random() - 0.5) * 0.1).toFixed(1)),
        expectedReturn: parseFloat((m.expectedReturn + (Math.random() - 0.5) * 0.05).toFixed(1)),
      }));
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const totalWeight = assets.reduce((sum, a) => sum + a.weight, 0);

  const addAsset = (ticker?: string) => {
    const t = (ticker ?? newTicker).trim().toUpperCase();
    setTickerError('');
    if (!t) { setTickerError('Enter a ticker symbol'); return; }
    if (!/^[A-Z]{1,6}$/.test(t)) { setTickerError('Invalid ticker format'); return; }
    if (assets.find(a => a.ticker === t)) { setTickerError(`${t} already in portfolio`); return; }
    if (assets.length >= 15) { setTickerError('Max 15 assets'); return; }
    setAssets(prev => [...prev, { ticker: t, weight: 5, color: COLORS[prev.length % COLORS.length] }]);
    setNewTicker('');
    setShowSuggestions(false);
  };

  const onTickerInput = (val: string) => {
    const v = val.toUpperCase();
    setNewTicker(v);
    setTickerError('');
    if (v.length > 0) {
      const existing = new Set(assets.map(a => a.ticker));
      const matches = TICKER_UNIVERSE.filter(t => !existing.has(t.sym) && (t.sym.startsWith(v) || t.name.toUpperCase().includes(v)));
      setSuggestions(matches.slice(0, 6));
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const removeAsset = (ticker: string) => {
    setAssets(prev => prev.filter(a => a.ticker !== ticker));
  };

  const updateWeight = (ticker: string, weight: number) => {
    setAssets(prev => prev.map(a => a.ticker === ticker ? { ...a, weight: Math.max(0, Math.min(100, weight)) } : a));
  };

  const runOptimizer = () => {
    setStatus('running');
    setTimeout(() => {
      // Objective-aware optimized weights
      const objConfig: Record<Objective, { weights: Record<string, number>; health: number; m: typeof metrics; pt: { risk: number; return: number }; why: string }> = {
        max_sharpe: {
          weights: { AAPL: 18, MSFT: 22, GOOGL: 12, AMZN: 8, TSLA: 3, BND: 25, GLD: 8, VNQ: 4 },
          health: 84,
          m: { sharpe: 1.52, var95: 3.1, maxDrawdown: 10.2, expectedReturn: 9.8 },
          pt: { risk: 11.8, return: 9.8 },
          why: 'The optimizer maximized the Sharpe ratio by reducing high-volatility positions (TSLA −2%, VNQ −1%) and increasing stable exposures (BND +5%, MSFT +7%). This shifts the portfolio closer to the efficient frontier tangent point, yielding a 22% improvement in risk-adjusted return.',
        },
        min_risk: {
          weights: { AAPL: 12, MSFT: 14, GOOGL: 8, AMZN: 6, TSLA: 2, BND: 35, GLD: 15, VNQ: 8 },
          health: 88,
          m: { sharpe: 1.18, var95: 2.2, maxDrawdown: 7.5, expectedReturn: 6.4 },
          pt: { risk: 7.5, return: 6.4 },
          why: 'Volatility minimization increased fixed income (BND +15%) and gold (GLD +5%) allocations while reducing equity exposure. This portfolio sits on the minimum-variance point of the efficient frontier, cutting drawdown risk by 40%.',
        },
        max_return: {
          weights: { AAPL: 25, MSFT: 28, GOOGL: 18, AMZN: 14, TSLA: 8, BND: 3, GLD: 2, VNQ: 2 },
          health: 62,
          m: { sharpe: 0.95, var95: 5.8, maxDrawdown: 18.1, expectedReturn: 13.2 },
          pt: { risk: 20.5, return: 13.2 },
          why: 'Maximum return tilts aggressively into growth equities (+MSFT, +AAPL, +TSLA) at the cost of higher volatility. VaR rises to 5.8% and drawdown risk increases significantly. This sits near the top-right of the efficient frontier.',
        },
      };
      const cfg = objConfig[objective];
      setAssets(prev => prev.map(a => ({
        ...a,
        weight: cfg.weights[a.ticker] ?? a.weight,
      })));
      setHealthScore(cfg.health);
      setMetrics(cfg.m);
      setOptimizedPt([cfg.pt]);
      setWhyText(cfg.why);
      // Regenerate frontier with slight variation per objective
      const seed = objective === 'min_risk' ? 0.8 : objective === 'max_return' ? 1.3 : 1.0;
      setFrontierData(Array.from({ length: 30 }, (_, i) => {
        const t = i / 29;
        const risk = 2 + t * 22 * seed;
        const ret = 1.5 + Math.pow(t, 0.5) * 10 * seed + t * 2;
        return { risk: parseFloat(risk.toFixed(2)), return: parseFloat(ret.toFixed(2)) };
      }));
      setShowOptimized(true);
      setStatus('done');
    }, 2000);
  };

  // Scatter data from state (currentPt, optimizedPt)

  const MetricRow = ({ label, value, unit, color, prev, tooltip }: { label: string; value: number; unit: string; color?: string; prev?: number; tooltip?: string }) => {
    const increased = prev !== undefined && value > prev;
    const decreased = prev !== undefined && value < prev;
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 0',
        borderBottom: `1px solid ${C.border}`,
      }}>
        <span style={{ fontFamily: C.sans, fontSize: 11, color: C.textDim }}>{label}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {increased && <TrendingUp size={10} color={C.green} />}
          {decreased && <TrendingDown size={10} color={C.red} />}
          <span style={{ fontFamily: C.mono, fontSize: 13, color: color || C.text }}>
            {value}{unit}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div data-portfolio-layout style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* LEFT: Portfolio Input 280px */}
      <div style={{
        width: 280,
        flexShrink: 0,
        borderRight: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '16px 16px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ width: 3, height: 14, background: C.orange }} />
            <span style={{ fontFamily: C.mono, fontSize: 10, color: C.orange, letterSpacing: '0.15em' }}>PORTFOLIO INPUT</span>
            {(() => { const src: DataSourceKind = demoMode ? 'SIMULATED' : 'LIVE'; const s = DATA_SOURCE_STYLE[src]; return (
              <span style={{ fontFamily: C.mono, fontSize: 8, padding: '2px 7px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: 2, color: s.color, letterSpacing: '0.08em', marginLeft: 4 }}>
                {src}
              </span>
            ); })()}
          </div>

          {/* Weight warning */}
          {Math.abs(totalWeight - 100) > 0.5 && (
            <div style={{
              background: 'rgba(255,214,0,0.08)',
              border: `1px solid ${C.yellow}40`,
              borderRadius: 2,
              padding: '6px 10px',
              marginBottom: 10,
              display: 'flex',
              gap: 6,
              alignItems: 'center',
            }}>
              <AlertTriangle size={10} color={C.yellow} />
              <span style={{ fontFamily: C.mono, fontSize: 9, color: C.yellow }}>TOTAL: {totalWeight}% (must = 100%)</span>
            </div>
          )}
        </div>

        {/* Asset List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
          {/* Column headers */}
          <div style={{ display: 'flex', gap: 8, paddingBottom: 6, borderBottom: `1px solid ${C.border}`, marginBottom: 4 }}>
            <span style={{ fontFamily: C.mono, fontSize: 8, color: C.textDim, flex: 1 }}>TICKER</span>
            <span style={{ fontFamily: C.mono, fontSize: 8, color: C.textDim, width: 60, textAlign: 'center' }}>WEIGHT %</span>
            <span style={{ fontFamily: C.mono, fontSize: 8, color: C.textDim, width: 24 }} />
          </div>

          {assets.map((asset) => (
            <div key={asset.ticker} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 0',
              borderBottom: `1px solid ${C.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                <div style={{ width: 3, height: 14, background: asset.color, flexShrink: 0 }} />
                <span style={{ fontFamily: C.mono, fontSize: 11, color: C.text }}>{asset.ticker}</span>
              </div>
              <input
                type="number"
                value={asset.weight}
                onChange={e => updateWeight(asset.ticker, parseInt(e.target.value) || 0)}
                style={{
                  width: 48,
                  background: C.bgCard,
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  color: C.text,
                  fontFamily: C.mono,
                  fontSize: 11,
                  padding: '3px 6px',
                  textAlign: 'center',
                  outline: 'none',
                }}
              />
              <span style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim }}>%</span>
              <button
                onClick={() => removeAsset(asset.ticker)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textDim, padding: 2, flexShrink: 0 }}
              >
                <Minus size={11} />
              </button>
            </div>
          ))}

          {/* Add row */}
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0' }}>
              <input
                placeholder="TICKER"
                value={newTicker}
                onChange={e => onTickerInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addAsset(); if (e.key === 'Escape') setShowSuggestions(false); }}
                onFocus={() => newTicker.length > 0 && suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                style={{
                  flex: 1,
                  background: C.bgCard,
                  border: `1px solid ${tickerError ? C.red : C.border}`,
                  borderRadius: 2,
                  color: C.text,
                  fontFamily: C.mono,
                  fontSize: 11,
                  padding: '5px 8px',
                  outline: 'none',
                }}
              />
              <button
                onClick={() => addAsset()}
                style={{
                  background: 'rgba(255,107,0,0.15)',
                  border: `1px solid ${C.orange}40`,
                  borderRadius: 2,
                  color: C.orange,
                  padding: '5px 8px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontFamily: C.mono, fontSize: 9,
                }}
              >
                <Plus size={11} /> ADD
              </button>
            </div>
            {tickerError && <div style={{ fontFamily: C.mono, fontSize: 8, color: C.red, marginBottom: 4 }}>{tickerError}</div>}
            {/* Auto-suggest dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div ref={suggestRef} style={{
                position: 'absolute', top: 38, left: 0, right: 40, zIndex: 200,
                background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)', maxHeight: 140, overflowY: 'auto',
              }}>
                {suggestions.map(s => (
                  <div key={s.sym} onMouseDown={() => addAsset(s.sym)} style={{
                    padding: '6px 10px', cursor: 'pointer', display: 'flex', gap: 8, alignItems: 'center',
                    borderBottom: `1px solid ${C.border}`,
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,107,0,0.08)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    <span style={{ fontFamily: C.mono, fontSize: 10, color: C.orange, width: 40 }}>{s.sym}</span>
                    <span style={{ fontFamily: C.sans, fontSize: 9, color: C.textDim }}>{s.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Objective & Constraints */}
        <div style={{ padding: 16, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
          {/* Objective selector */}
          <span style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>OBJECTIVE</span>
          <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
            {OBJECTIVES.map(obj => {
              const Icon = obj.icon;
              const sel = objective === obj.id;
              return (
                <button key={obj.id} onClick={() => setObjective(obj.id)} title={obj.desc} style={{
                  flex: 1, padding: '6px 0', background: sel ? 'rgba(255,107,0,0.15)' : 'transparent',
                  border: `1px solid ${sel ? C.orange + '60' : C.border}`, borderRadius: 2,
                  color: sel ? C.orange : C.textDim, cursor: 'pointer', fontFamily: C.mono, fontSize: 7,
                  letterSpacing: '0.06em', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                }}>
                  <Icon size={10} />
                  {obj.label}
                </button>
              );
            })}
          </div>

          <span style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, letterSpacing: '0.1em', display: 'block', marginBottom: 12 }}>CONSTRAINTS</span>

          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontFamily: C.sans, fontSize: 10, color: C.textDim }}>Max Volatility</span>
              <span style={{ fontFamily: C.mono, fontSize: 11, color: C.cyan }}>{maxVol}%</span>
            </div>
            <div style={{ position: 'relative', height: 4, background: C.border, borderRadius: 1 }}>
              <div style={{ width: `${maxVol / 30 * 100}%`, height: '100%', background: C.cyan, borderRadius: 1 }} />
              <input type="range" min={5} max={30} value={maxVol} onChange={e => setMaxVol(parseInt(e.target.value))}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }} />
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontFamily: C.sans, fontSize: 10, color: C.textDim }}>Min Return Target</span>
              <span style={{ fontFamily: C.mono, fontSize: 11, color: C.green }}>{minReturn}%</span>
            </div>
            <div style={{ position: 'relative', height: 4, background: C.border, borderRadius: 1 }}>
              <div style={{ width: `${minReturn / 20 * 100}%`, height: '100%', background: C.green, borderRadius: 1 }} />
              <input type="range" min={2} max={20} value={minReturn} onChange={e => setMinReturn(parseInt(e.target.value))}
                style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }} />
            </div>
          </div>

          <button
            onClick={runOptimizer}
            disabled={status === 'running'}
            style={{
              width: '100%',
              height: 40,
              background: status === 'running' ? 'rgba(255,107,0,0.3)' : C.orange,
              border: 'none',
              borderRadius: 2,
              color: '#fff',
              fontFamily: C.mono,
              fontSize: 11,
              letterSpacing: '0.2em',
              cursor: status === 'running' ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {status === 'running' ? (
              <><div style={{ animation: 'spin 1s linear infinite', display: 'flex' }}><Loader size={13} /></div> OPTIMIZING...</>
            ) : (
              <><Play size={13} /> OPTIMIZE</>
            )}
          </button>
        </div>
      </div>

      {/* CENTER: Visualizations */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        borderRight: `1px solid ${C.border}`,
        overflow: 'hidden',
      }}>
        {/* Treemap */}
        <div style={{
          flex: 1,
          padding: 16,
          borderBottom: `1px solid ${C.border}`,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 3, height: 14, background: C.cyan }} />
              <span style={{ fontFamily: C.mono, fontSize: 10, color: C.cyan, letterSpacing: '0.15em' }}>ALLOCATION MAP</span>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 8, height: 3, background: C.orange, opacity: 0.5 }} />
                <span style={{ fontFamily: C.mono, fontSize: 8, color: C.textDim }}>CURRENT</span>
              </div>
              {showOptimized && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 8, height: 3, background: C.green, opacity: 0.5 }} />
                  <span style={{ fontFamily: C.mono, fontSize: 8, color: C.textDim }}>OPTIMIZED</span>
                </div>
              )}
            </div>
          </div>
          <div style={{
            flex: 1,
            display: 'flex',
            flexWrap: 'wrap',
            alignContent: 'flex-start',
            gap: 2,
            overflow: 'hidden',
          }}>
            {assets.map(asset => (
              <TreemapBlock
                key={asset.ticker}
                asset={asset}
                optimized={showOptimized ? OPTIMIZED_WEIGHTS[asset.ticker] : undefined}
                onClick={() => setDrawerAsset(asset)}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8, flexShrink: 0 }}>
            <span style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim }}>
              TOTAL ALLOCATED: <span style={{ color: Math.abs(totalWeight - 100) < 1 ? C.green : C.red }}>{totalWeight}%</span>
            </span>
          </div>
        </div>

        {/* Efficient Frontier */}
        <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexShrink: 0 }}>
            <div style={{ width: 3, height: 14, background: C.green }} />
            <span style={{ fontFamily: C.mono, fontSize: 10, color: C.green, letterSpacing: '0.15em' }}>EFFICIENT FRONTIER</span>
            <span style={{ fontFamily: C.mono, fontSize: 8, color: C.textDim, marginLeft: 8 }}>RISK (σ) vs EXPECTED RETURN</span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                <CartesianGrid stroke={C.border} strokeWidth={0.5} strokeDasharray="2 4" />
                <XAxis
                  dataKey="risk"
                  name="Risk"
                  type="number"
                  domain={[0, 26]}
                  tick={{ fill: C.textDim, fontSize: 9, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: C.border }}
                  tickLine={false}
                  label={{ value: 'RISK (σ%)', position: 'insideBottom', offset: -12, fill: C.textDim, fontSize: 9, fontFamily: 'JetBrains Mono' }}
                />
                <YAxis
                  dataKey="return"
                  name="Return"
                  type="number"
                  domain={[0, 16]}
                  tick={{ fill: C.textDim, fontSize: 9, fontFamily: 'JetBrains Mono' }}
                  axisLine={{ stroke: C.border }}
                  tickLine={false}
                  label={{ value: 'RETURN (%)', angle: -90, position: 'insideLeft', fill: C.textDim, fontSize: 9, fontFamily: 'JetBrains Mono' }}
                />
                <Tooltip content={<CustomFrontierTooltip />} cursor={{ strokeDasharray: '3 3', stroke: C.border }} />
                {/* Frontier curve */}
                <Scatter data={frontierData} fill={C.cyan} fillOpacity={0.4} line={{ stroke: C.cyan, strokeWidth: 1.5, strokeOpacity: 0.8 }} shape="circle" r={2} />
                {/* Current portfolio */}
                <Scatter data={currentPt} fill={C.orange} r={8} shape="circle" name="Current" />
                {/* Optimized portfolio */}
                {showOptimized && <Scatter data={optimizedPt} fill={C.green} r={8} shape="diamond" name="Optimized" />}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexShrink: 0, marginTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.orange }} />
              <span style={{ fontFamily: C.mono, fontSize: 8, color: C.textDim }}>CURRENT (σ={currentPt[0].risk}%, r={currentPt[0].return}%)</span>
            </div>
            {showOptimized && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, background: C.green, transform: 'rotate(45deg)' }} />
                <span style={{ fontFamily: C.mono, fontSize: 8, color: C.textDim }}>OPTIMIZED (σ={optimizedPt[0].risk}%, r={optimizedPt[0].return}%)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: Metrics & Alerts 260px */}
      <div style={{
        width: 260,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Health Score */}
        <div style={{ padding: 16, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 3, height: 14, background: healthScore >= 80 ? C.green : healthScore >= 60 ? C.yellow : C.red }} />
            <span style={{ fontFamily: C.mono, fontSize: 10, color: C.orange, letterSpacing: '0.15em' }}>PORTFOLIO HEALTH</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <span style={{
              fontFamily: C.mono,
              fontSize: 48,
              color: healthScore >= 80 ? C.green : healthScore >= 60 ? C.yellow : C.red,
              fontWeight: 700,
              lineHeight: 1,
            }}>{healthScore}</span>
            <span style={{ fontFamily: C.mono, fontSize: 13, color: C.textDim }}>/100</span>
            <div style={{ marginLeft: 4, padding: '2px 8px', background: healthScore >= 80 ? 'rgba(0,255,156,0.1)' : 'rgba(255,214,0,0.1)', border: `1px solid ${healthScore >= 80 ? C.green : C.yellow}40`, borderRadius: 2 }}>
              <span style={{ fontFamily: C.mono, fontSize: 9, color: healthScore >= 80 ? C.green : C.yellow }}>
                {healthScore >= 80 ? 'GOOD' : 'FAIR'}
              </span>
            </div>
          </div>
          {/* Health bar */}
          <div style={{ height: 4, background: C.border, borderRadius: 1 }}>
            <div style={{
              width: `${healthScore}%`,
              height: '100%',
              background: healthScore >= 80 ? C.green : healthScore >= 60 ? C.yellow : C.red,
              borderRadius: 1,
              transition: 'width 0.8s ease',
            }} />
          </div>
        </div>

        {/* Metrics */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <span style={{ fontFamily: C.mono, fontSize: 9, color: C.orange, letterSpacing: '0.12em', display: 'block', marginBottom: 8 }}>KEY METRICS</span>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontFamily: C.sans, fontSize: 11, color: C.textDim, display: 'flex', alignItems: 'center', gap: 4 }}>Sharpe Ratio <Info size={8} title="Risk-adjusted return: excess return per unit of volatility. Higher is better." style={{ cursor: 'help' }} /></span>
            <span style={{ fontFamily: C.mono, fontSize: 13, color: metrics.sharpe >= 1.5 ? C.green : metrics.sharpe >= 1.0 ? C.yellow : C.red }}>
              {metrics.sharpe}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontFamily: C.sans, fontSize: 11, color: C.textDim, display: 'flex', alignItems: 'center', gap: 4 }}>VaR (95%) <Info size={8} title="Value at Risk: Maximum expected loss over 1 day at 95% confidence. Lower is better." style={{ cursor: 'help' }} /></span>
            <span style={{ fontFamily: C.mono, fontSize: 13, color: metrics.var95 < 4 ? C.green : C.yellow }}>
              -{metrics.var95}%
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontFamily: C.sans, fontSize: 11, color: C.textDim, display: 'flex', alignItems: 'center', gap: 4 }}>Max Drawdown <Info size={8} title="Largest peak-to-trough decline in portfolio value. Lower is better." style={{ cursor: 'help' }} /></span>
            <span style={{ fontFamily: C.mono, fontSize: 13, color: metrics.maxDrawdown < 12 ? C.yellow : C.red }}>
              -{metrics.maxDrawdown}%
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0' }}>
            <span style={{ fontFamily: C.sans, fontSize: 11, color: C.textDim, display: 'flex', alignItems: 'center', gap: 4 }}>Expected Return <Info size={8} title="Annualized expected portfolio return based on historical factor analysis." style={{ cursor: 'help' }} /></span>
            <span style={{ fontFamily: C.mono, fontSize: 13, color: C.green }}>
              +{metrics.expectedReturn}%
            </span>
          </div>
        </div>

        {/* Why this recommendation? */}
        {whyText && (
          <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <span style={{ fontFamily: C.mono, fontSize: 9, color: C.cyan, letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>WHY THIS RECOMMENDATION?</span>
            <p style={{ fontFamily: C.sans, fontSize: 10, color: C.text, lineHeight: 1.5, margin: 0 }}>{whyText}</p>
          </div>
        )}

        {/* Alert Feed */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '12px 16px 8px', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: C.mono, fontSize: 9, color: C.orange, letterSpacing: '0.12em' }}>ALERT FEED</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <span style={{ fontFamily: C.mono, fontSize: 8, color: C.red }}>
                {PORTFOLIO_ALERTS.filter(a => a.severity === 'high').length} HIGH
              </span>
              <span style={{ fontFamily: C.mono, fontSize: 8, color: C.textDim }}>·</span>
              <span style={{ fontFamily: C.mono, fontSize: 8, color: C.yellow }}>
                {PORTFOLIO_ALERTS.filter(a => a.severity === 'medium').length} MED
              </span>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px' }}>
            {PORTFOLIO_ALERTS.map((alert, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 10,
                  padding: '8px 0',
                  borderBottom: `1px solid ${C.border}`,
                }}
              >
                <div style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  background: SEVERITY_COLOR[alert.severity],
                  flexShrink: 0,
                  marginTop: 3,
                  boxShadow: `0 0 5px ${SEVERITY_COLOR[alert.severity]}`,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: C.sans, fontSize: 10, color: C.text, lineHeight: 1.4 }}>{alert.msg}</div>
                  <div style={{ fontFamily: C.mono, fontSize: 8, color: C.textDim, marginTop: 3 }}>{alert.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Asset Detail Drawer */}
      {drawerAsset && (
        <>
          <div onClick={() => setDrawerAsset(null)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 400 }} />
          <div style={{
            position: 'absolute', top: 0, right: 0, bottom: 0, width: 300,
            background: C.bgPanel, borderLeft: `1px solid ${C.border}`,
            zIndex: 401, display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.4)',
          }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 4, height: 18, background: drawerAsset.color, borderRadius: 1 }} />
                <span style={{ fontFamily: C.mono, fontSize: 16, color: C.text, fontWeight: 600 }}>{drawerAsset.ticker}</span>
              </div>
              <button onClick={() => setDrawerAsset(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textDim, padding: 4 }}>
                <X size={14} />
              </button>
            </div>
            <div style={{ padding: 16, flex: 1, overflowY: 'auto' }}>
              {/* Name lookup */}
              {(() => {
                const info = TICKER_UNIVERSE.find(t => t.sym === drawerAsset.ticker);
                return info ? <div style={{ fontFamily: C.sans, fontSize: 11, color: C.textDim, marginBottom: 12 }}>{info.name}</div> : null;
              })()}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontFamily: C.sans, fontSize: 10, color: C.textDim }}>Current Weight</span>
                <span style={{ fontFamily: C.mono, fontSize: 12, color: C.text }}>{drawerAsset.weight}%</span>
              </div>
              {showOptimized && OPTIMIZED_WEIGHTS[drawerAsset.ticker] !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontFamily: C.sans, fontSize: 10, color: C.textDim }}>Optimized Weight</span>
                  <span style={{ fontFamily: C.mono, fontSize: 12, color: C.green }}>{OPTIMIZED_WEIGHTS[drawerAsset.ticker]}%</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontFamily: C.sans, fontSize: 10, color: C.textDim }}>Portfolio Share</span>
                <span style={{ fontFamily: C.mono, fontSize: 12, color: C.text }}>{totalWeight > 0 ? (drawerAsset.weight / totalWeight * 100).toFixed(1) : 0}%</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontFamily: C.sans, fontSize: 10, color: C.textDim }}>Color</span>
                <div style={{ width: 14, height: 14, background: drawerAsset.color, borderRadius: 2 }} />
              </div>
              <a
                href={`https://finance.yahoo.com/quote/${drawerAsset.ticker}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  marginTop: 16, padding: '8px 12px',
                  border: `1px solid ${C.cyan}40`, borderRadius: 2,
                  background: 'rgba(0,199,172,0.08)', textDecoration: 'none',
                  fontFamily: C.mono, fontSize: 10, color: C.cyan,
                  cursor: 'pointer',
                }}
              >
                <ExternalLink size={11} /> View on Yahoo Finance
              </a>
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
        input[type="range"] { -webkit-appearance: none; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; background: ${C.orange}; border-radius: 1px; cursor: pointer; }
      `}</style>
    </div>
  );
}
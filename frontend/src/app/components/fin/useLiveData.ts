import { useState, useEffect, useCallback, useRef } from 'react';

/* ── Types ─────────────────────────────────────────────────────────────────── */

export interface Ticker {
  sym: string;
  val: number;
  chg: number;        // pct change
  prevVal: number;
  updatedAt: number;  // ms
}

export interface AlertItem {
  id: string;
  msg: string;
  time: number;       // ms timestamp
  sev: 'critical' | 'warning' | 'info';
  acked: boolean;
}

export interface LiveData {
  connected: boolean;
  stale: boolean;              // true if > 15 s since last successful poll
  lastPollMs: number | null;
  tickers: Ticker[];
  alerts: AlertItem[];
  backendOk: boolean;
  mlOk: boolean;
}

export interface LiveActions {
  ackAlert: (id: string) => void;
  ackAll: () => void;
}

/* ── Constants ─────────────────────────────────────────────────────────────── */

const POLL_INTERVAL = 10_000;   // 10 s
const STALE_THRESHOLD = 15_000; // 15 s
const TICKER_JITTER_INTERVAL = 4_000; // micro-fluctuations every 4 s

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';

/* ── Seed tickers ──────────────────────────────────────────────────────────── */

const SEED_TICKERS: Ticker[] = [
  { sym: 'S&P', val: 5248.32, chg: 0.84, prevVal: 5248.32, updatedAt: Date.now() },
  { sym: 'NDX', val: 18342.10, chg: 1.22, prevVal: 18342.10, updatedAt: Date.now() },
  { sym: 'BTC', val: 67482.00, chg: -0.37, prevVal: 67482.00, updatedAt: Date.now() },
];

/* ── Seed alerts ───────────────────────────────────────────────────────────── */

let _alertId = 0;
function mkAlert(msg: string, sev: AlertItem['sev'], agoMs: number): AlertItem {
  return { id: `a-${++_alertId}`, msg, sev, time: Date.now() - agoMs, acked: false };
}

const SEED_ALERTS: AlertItem[] = [
  mkAlert('High-risk loan flagged', 'critical', 32_000),
  mkAlert('Fraud detected: TXN-8850', 'critical', 74_000),
  mkAlert('Portfolio rebalanced', 'info', 165_000),
  mkAlert('Model retrained OK', 'info', 252_000),
  mkAlert('Risk threshold updated', 'warning', 390_000),
  mkAlert('VaR breach: 5.2%', 'critical', 420_000),
  mkAlert('New market data ingested', 'info', 600_000),
];

/* ── Micro-fluctuation helper ──────────────────────────────────────────────── */

function jitterTicker(t: Ticker): Ticker {
  // Small random delta: ±0.08 % of value
  const pct = (Math.random() - 0.5) * 0.16;
  const delta = t.val * (pct / 100);
  const newVal = parseFloat((t.val + delta).toFixed(2));
  const newChg = parseFloat((t.chg + pct * 0.3).toFixed(2));
  return { ...t, prevVal: t.val, val: newVal, chg: newChg, updatedAt: Date.now() };
}

/* ── Periodic new alert generator (simulated) ──────────────────────────────── */

const RANDOM_ALERTS: { msg: string; sev: AlertItem['sev'] }[] = [
  { msg: 'Anomalous trading volume detected', sev: 'warning' },
  { msg: 'Model confidence dip: FRAUD DNN', sev: 'warning' },
  { msg: 'New inference batch completed', sev: 'info' },
  { msg: 'Risk engine heartbeat OK', sev: 'info' },
  { msg: 'High-exposure account flagged', sev: 'critical' },
];

/* ── Hook ──────────────────────────────────────────────────────────────────── */

export function useLiveData(): [LiveData, LiveActions] {
  const [connected, setConnected] = useState(false);
  const [lastPollMs, setLastPollMs] = useState<number | null>(null);
  const [stale, setStale] = useState(false);
  const [tickers, setTickers] = useState<Ticker[]>(SEED_TICKERS);
  const [alerts, setAlerts] = useState<AlertItem[]>(SEED_ALERTS);
  const [backendOk, setBackendOk] = useState(false);
  const [mlOk, setMlOk] = useState(false);
  const lastSuccessRef = useRef<number>(0);

  /* Poll backend /api/system/status */
  const poll = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/system/status`, { signal: AbortSignal.timeout(8000) });
      const data = await res.json();
      const now = Date.now();
      setConnected(true);
      setBackendOk(data.backend_ok ?? false);
      setMlOk(data.ml_ok ?? false);
      setLastPollMs(now);
      lastSuccessRef.current = now;
      setStale(false);
    } catch {
      setConnected(false);
    }
  }, []);

  /* Stale checker — runs every second */
  useEffect(() => {
    const iv = setInterval(() => {
      if (lastSuccessRef.current > 0 && Date.now() - lastSuccessRef.current > STALE_THRESHOLD) {
        setStale(true);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  /* Poll interval */
  useEffect(() => {
    poll(); // initial
    const iv = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(iv);
  }, [poll]);

  /* Ticker micro-fluctuations */
  useEffect(() => {
    const iv = setInterval(() => {
      setTickers(prev => prev.map(jitterTicker));
    }, TICKER_JITTER_INTERVAL);
    return () => clearInterval(iv);
  }, []);

  /* Simulated new alerts every 25-40 s */
  useEffect(() => {
    const iv = setInterval(() => {
      const pick = RANDOM_ALERTS[Math.floor(Math.random() * RANDOM_ALERTS.length)];
      setAlerts(prev => [mkAlert(pick.msg, pick.sev, 0), ...prev].slice(0, 20));
    }, 25_000 + Math.random() * 15_000);
    return () => clearInterval(iv);
  }, []);

  /* Actions */
  const ackAlert = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, acked: true } : a));
  }, []);

  const ackAll = useCallback(() => {
    setAlerts(prev => prev.map(a => ({ ...a, acked: true })));
  }, []);

  return [
    { connected, stale, lastPollMs, tickers, alerts, backendOk, mlOk },
    { ackAlert, ackAll },
  ];
}

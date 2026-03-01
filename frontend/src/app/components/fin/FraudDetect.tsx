import { useState, useRef, useCallback } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { X, CheckCircle, AlertTriangle, Ban, ChevronRight, Shield, Upload, FileText, Clock } from 'lucide-react';
import { C, DATA_SOURCE_STYLE } from './colors';
import type { DataSourceKind } from './colors';

interface Transaction {
  id: string;
  ts: string;
  amount: number;
  merchant: string;
  channel: string;
  fraudScore: number;
  status: 'CLEAR' | 'REVIEW' | 'FLAGGED';
  radarData: { subject: string; A: number }[];
  ruleTriggers: string[];
  anomalies: string[];
}

const TRANSACTIONS: Transaction[] = [
  { id: 'TXN-8841', ts: '09:12:34', amount: 2450.00, merchant: 'TechStore Pro', channel: 'ONLINE', fraudScore: 12, status: 'CLEAR',
    radarData: [{ subject: 'Velocity', A: 15 }, { subject: 'Geo-Risk', A: 8 }, { subject: 'Device Trust', A: 92 }, { subject: 'Merchant Risk', A: 10 }, { subject: 'Time Anomaly', A: 5 }, { subject: 'Amt Dev', A: 20 }],
    ruleTriggers: [], anomalies: [] },
  { id: 'TXN-8842', ts: '09:15:21', amount: 189.99, merchant: 'Grocery Hub', channel: 'POS', fraudScore: 8, status: 'CLEAR',
    radarData: [{ subject: 'Velocity', A: 10 }, { subject: 'Geo-Risk', A: 5 }, { subject: 'Device Trust', A: 95 }, { subject: 'Merchant Risk', A: 6 }, { subject: 'Time Anomaly', A: 12 }, { subject: 'Amt Dev', A: 8 }],
    ruleTriggers: [], anomalies: [] },
  { id: 'TXN-8843', ts: '09:18:44', amount: 9750.00, merchant: 'FX Transfer Ltd', channel: 'WIRE', fraudScore: 78, status: 'FLAGGED',
    radarData: [{ subject: 'Velocity', A: 85 }, { subject: 'Geo-Risk', A: 72 }, { subject: 'Device Trust', A: 30 }, { subject: 'Merchant Risk', A: 65 }, { subject: 'Time Anomaly', A: 78 }, { subject: 'Amt Dev', A: 90 }],
    ruleTriggers: ['R-042: High velocity wire', 'R-018: New FX payee', 'R-091: Geo mismatch'],
    anomalies: ['Amount 4.2σ above mean', 'New device fingerprint', 'Off-hours transaction'] },
  { id: 'TXN-8844', ts: '09:22:11', amount: 450.00, merchant: 'Gas Station 44', channel: 'POS', fraudScore: 45, status: 'REVIEW',
    radarData: [{ subject: 'Velocity', A: 55 }, { subject: 'Geo-Risk', A: 48 }, { subject: 'Device Trust', A: 70 }, { subject: 'Merchant Risk', A: 35 }, { subject: 'Time Anomaly', A: 40 }, { subject: 'Amt Dev', A: 50 }],
    ruleTriggers: ['R-011: High frequency POS'],
    anomalies: ['Unusual purchase category'] },
  { id: 'TXN-8845', ts: '09:24:58', amount: 3200.00, merchant: 'Jewelry World', channel: 'ONLINE', fraudScore: 62, status: 'REVIEW',
    radarData: [{ subject: 'Velocity', A: 60 }, { subject: 'Geo-Risk', A: 35 }, { subject: 'Device Trust', A: 55 }, { subject: 'Merchant Risk', A: 70 }, { subject: 'Time Anomaly', A: 45 }, { subject: 'Amt Dev', A: 75 }],
    ruleTriggers: ['R-033: High-value luxury', 'R-055: Browser anomaly'],
    anomalies: ['First purchase at merchant', 'High ticket item'] },
  { id: 'TXN-8846', ts: '09:27:33', amount: 28.50, merchant: 'Coffee Bean', channel: 'TAP', fraudScore: 5, status: 'CLEAR',
    radarData: [{ subject: 'Velocity', A: 8 }, { subject: 'Geo-Risk', A: 3 }, { subject: 'Device Trust', A: 98 }, { subject: 'Merchant Risk', A: 4 }, { subject: 'Time Anomaly', A: 10 }, { subject: 'Amt Dev', A: 5 }],
    ruleTriggers: [], anomalies: [] },
  { id: 'TXN-8847', ts: '09:31:12', amount: 15600.00, merchant: 'Offshore Inc', channel: 'WIRE', fraudScore: 91, status: 'FLAGGED',
    radarData: [{ subject: 'Velocity', A: 92 }, { subject: 'Geo-Risk', A: 95 }, { subject: 'Device Trust', A: 15 }, { subject: 'Merchant Risk', A: 88 }, { subject: 'Time Anomaly', A: 85 }, { subject: 'Amt Dev', A: 96 }],
    ruleTriggers: ['R-099: Sanctioned entity list', 'R-042: High velocity wire', 'R-077: Shell company signal', 'R-018: Unknown payee'],
    anomalies: ['Offshore jurisdiction', 'Amount exceeds threshold', 'No prior relationship', 'IP location mismatch'] },
  { id: 'TXN-8848', ts: '09:34:05', amount: 750.00, merchant: 'Hotel Grand', channel: 'ONLINE', fraudScore: 29, status: 'CLEAR',
    radarData: [{ subject: 'Velocity', A: 22 }, { subject: 'Geo-Risk', A: 30 }, { subject: 'Device Trust', A: 85 }, { subject: 'Merchant Risk', A: 20 }, { subject: 'Time Anomaly', A: 25 }, { subject: 'Amt Dev', A: 35 }],
    ruleTriggers: [], anomalies: ['Travel booking pattern OK'] },
  { id: 'TXN-8849', ts: '09:36:44', amount: 1200.00, merchant: 'Electronics Plus', channel: 'POS', fraudScore: 38, status: 'CLEAR',
    radarData: [{ subject: 'Velocity', A: 35 }, { subject: 'Geo-Risk', A: 18 }, { subject: 'Device Trust', A: 88 }, { subject: 'Merchant Risk', A: 28 }, { subject: 'Time Anomaly', A: 20 }, { subject: 'Amt Dev', A: 42 }],
    ruleTriggers: [], anomalies: [] },
  { id: 'TXN-8850', ts: '09:41:17', amount: 5400.00, merchant: 'Crypto Exchange', channel: 'API', fraudScore: 84, status: 'FLAGGED',
    radarData: [{ subject: 'Velocity', A: 88 }, { subject: 'Geo-Risk', A: 65 }, { subject: 'Device Trust', A: 40 }, { subject: 'Merchant Risk', A: 80 }, { subject: 'Time Anomaly', A: 70 }, { subject: 'Amt Dev', A: 88 }],
    ruleTriggers: ['R-066: Crypto exchange', 'R-042: High velocity', 'R-081: API pattern anomaly'],
    anomalies: ['Crypto on-ramp detected', 'High velocity transfers', 'API key reused pattern'] },
  { id: 'TXN-8851', ts: '09:44:29', amount: 320.00, merchant: 'Fashion Store', channel: 'ONLINE', fraudScore: 21, status: 'CLEAR',
    radarData: [{ subject: 'Velocity', A: 18 }, { subject: 'Geo-Risk', A: 12 }, { subject: 'Device Trust', A: 90 }, { subject: 'Merchant Risk', A: 15 }, { subject: 'Time Anomaly', A: 22 }, { subject: 'Amt Dev', A: 25 }],
    ruleTriggers: [], anomalies: [] },
  { id: 'TXN-8852', ts: '09:47:53', amount: 2100.00, merchant: 'Auto Parts Inc', channel: 'POS', fraudScore: 52, status: 'REVIEW',
    radarData: [{ subject: 'Velocity', A: 58 }, { subject: 'Geo-Risk', A: 42 }, { subject: 'Device Trust', A: 68 }, { subject: 'Merchant Risk', A: 55 }, { subject: 'Time Anomaly', A: 48 }, { subject: 'Amt Dev', A: 62 }],
    ruleTriggers: ['R-033: Unusual purchase'],
    anomalies: ['Category mismatch', 'Location outlier'] },
  { id: 'TXN-8853', ts: '09:51:08', amount: 89.00, merchant: 'Bookstore', channel: 'TAP', fraudScore: 4, status: 'CLEAR',
    radarData: [{ subject: 'Velocity', A: 5 }, { subject: 'Geo-Risk', A: 2 }, { subject: 'Device Trust', A: 99 }, { subject: 'Merchant Risk', A: 3 }, { subject: 'Time Anomaly', A: 8 }, { subject: 'Amt Dev', A: 4 }],
    ruleTriggers: [], anomalies: [] },
  { id: 'TXN-8854', ts: '09:54:37', amount: 8900.00, merchant: 'Real Estate LLC', channel: 'WIRE', fraudScore: 73, status: 'FLAGGED',
    radarData: [{ subject: 'Velocity', A: 75 }, { subject: 'Geo-Risk', A: 70 }, { subject: 'Device Trust', A: 38 }, { subject: 'Merchant Risk', A: 68 }, { subject: 'Time Anomaly', A: 72 }, { subject: 'Amt Dev', A: 80 }],
    ruleTriggers: ['R-042: High velocity wire', 'R-018: New payee', 'R-033: Large wire amount'],
    anomalies: ['New business payee', 'High wire amount', 'No prior real estate TXN'] },
  { id: 'TXN-8855', ts: '09:58:22', amount: 650.00, merchant: 'Medical Center', channel: 'POS', fraudScore: 17, status: 'CLEAR',
    radarData: [{ subject: 'Velocity', A: 14 }, { subject: 'Geo-Risk', A: 10 }, { subject: 'Device Trust', A: 93 }, { subject: 'Merchant Risk', A: 12 }, { subject: 'Time Anomaly', A: 18 }, { subject: 'Amt Dev', A: 22 }],
    ruleTriggers: [], anomalies: [] },
];

const STATUS_CONFIG = {
  CLEAR: { color: C.green, bg: 'rgba(0,255,156,0.1)', border: 'rgba(0,255,156,0.3)' },
  REVIEW: { color: C.yellow, bg: 'rgba(255,214,0,0.1)', border: 'rgba(255,214,0,0.3)' },
  FLAGGED: { color: C.red, bg: 'rgba(255,59,59,0.1)', border: 'rgba(255,59,59,0.3)' },
};

const CHANNEL_COLORS: Record<string, string> = {
  ONLINE: C.cyan, POS: C.textDim, WIRE: C.orange, TAP: C.green, API: '#9B59B6',
};

function FraudScoreBar({ score }: { score: number }) {
  const color = score < 40 ? C.green : score < 65 ? C.yellow : C.red;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: C.border, borderRadius: 1 }}>
        <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 1 }} />
      </div>
      <span style={{ fontFamily: C.mono, fontSize: 10, color, minWidth: 24, textAlign: 'right' }}>{score}</span>
    </div>
  );
}

/* ── Audit timeline type ───────────────────────────────────────────────────── */
interface AuditEntry {
  txnId: string;
  action: string;
  time: number;
  user: string;
}

/* ── CSV parsing helper ────────────────────────────────────────────────────── */
const MAX_CSV_ROWS = 25;

function parseCSV(text: string): { rows: Transaction[]; errors: string[] } {
  const errors: string[] = [];
  const lines = text.trim().split('\n');
  if (lines.length < 2) { errors.push('CSV must have a header row plus at least 1 data row.'); return { rows: [], errors }; }

  const header = lines[0].split(',').map(h => h.trim().toLowerCase());
  const requiredCols = ['id', 'amount', 'merchant'];
  const missing = requiredCols.filter(c => !header.includes(c));
  if (missing.length > 0) { errors.push(`Missing required columns: ${missing.join(', ')}`); return { rows: [], errors }; }

  const dataLines = lines.slice(1);
  if (dataLines.length > MAX_CSV_ROWS) {
    errors.push(`CSV has ${dataLines.length} rows — max ${MAX_CSV_ROWS}. Only first ${MAX_CSV_ROWS} will be processed.`);
  }

  const rows: Transaction[] = [];
  const idIdx = header.indexOf('id');
  const amtIdx = header.indexOf('amount');
  const merchIdx = header.indexOf('merchant');
  const channelIdx = header.indexOf('channel');
  const scoreIdx = header.indexOf('fraudscore') !== -1 ? header.indexOf('fraudscore') : header.indexOf('fraud_score');

  for (let i = 0; i < Math.min(dataLines.length, MAX_CSV_ROWS); i++) {
    const cols = dataLines[i].split(',').map(c => c.trim());
    const id = cols[idIdx] || `CSV-${i + 1}`;
    const amount = parseFloat(cols[amtIdx]);
    if (isNaN(amount)) { errors.push(`Row ${i + 1}: invalid amount "${cols[amtIdx]}"`); continue; }
    const merchant = cols[merchIdx] || 'Unknown';
    const channel = cols[channelIdx] || 'ONLINE';
    const score = scoreIdx >= 0 ? parseInt(cols[scoreIdx]) || Math.floor(Math.random() * 100) : Math.floor(Math.random() * 100);
    const status: Transaction['status'] = score >= 65 ? 'FLAGGED' : score >= 40 ? 'REVIEW' : 'CLEAR';
    rows.push({
      id, ts: new Date().toLocaleTimeString('en-US', { hour12: false }), amount, merchant, channel,
      fraudScore: score, status,
      radarData: [
        { subject: 'Velocity', A: Math.min(100, score + Math.floor(Math.random() * 20 - 10)) },
        { subject: 'Geo-Risk', A: Math.floor(Math.random() * 80) },
        { subject: 'Device Trust', A: Math.max(0, 100 - score + Math.floor(Math.random() * 20 - 10)) },
        { subject: 'Merchant Risk', A: Math.floor(Math.random() * 80) },
        { subject: 'Time Anomaly', A: Math.floor(Math.random() * 80) },
        { subject: 'Amt Dev', A: Math.min(100, score + Math.floor(Math.random() * 15)) },
      ],
      ruleTriggers: score > 50 ? [`R-${Math.floor(Math.random() * 100).toString().padStart(3, '0')}: Auto-flagged`] : [],
      anomalies: score > 60 ? ['Uploaded CSV record'] : [],
    });
  }
  return { rows, errors };
}

const SAMPLE_CSV = `id,amount,merchant,channel,fraudscore
TXN-CSV-01,4200.00,SlotMachineOnline,ONLINE,82
TXN-CSV-02,189.50,Grocery Hub,POS,12
TXN-CSV-03,9100.00,CryptoSwap Ltd,API,91
TXN-CSV-04,55.00,Coffee Bean,TAP,6
TXN-CSV-05,3400.00,Jewelry Palace,ONLINE,67`;

export function FraudDetect({ demoMode = true }: { demoMode?: boolean }) {
  const [selected, setSelected] = useState<Transaction | null>(TRANSACTIONS[2]);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'CLEAR' | 'REVIEW' | 'FLAGGED'>('ALL');
  const [actionDone, setActionDone] = useState<Record<string, string>>({});

  /* ── CSV upload state ─────────────────────────────────────────────── */
  const [uploadedTxns, setUploadedTxns] = useState<Transaction[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showUploadZone, setShowUploadZone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Audit log ────────────────────────────────────────────────────── */
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  /* ── Active dataset (uploaded overrides hardcoded) ─────────────── */
  const allTxns = uploadedTxns.length > 0 ? uploadedTxns : TRANSACTIONS;
  const filtered = filter === 'ALL' ? allTxns : allTxns.filter(t => t.status === filter);

  /* ── CSV ingest handler ───────────────────────────────────────────── */
  const handleCSV = useCallback((text: string) => {
    const { rows, errors } = parseCSV(text);
    setParseErrors(errors);
    if (rows.length > 0) {
      setUploadedTxns(rows);
      setSelected(rows[0]);
      setDrawerOpen(true);
      setActionDone({});
      setAuditLog(prev => [...prev, { txnId: '-', action: `CSV UPLOADED (${rows.length} rows)`, time: Date.now(), user: 'analyst' }]);
    }
    setShowUploadZone(false);
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      file.text().then(handleCSV);
    } else {
      setParseErrors(['Only .csv files are supported.']);
    }
  }, [handleCSV]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) file.text().then(handleCSV);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [handleCSV]);

  /* ── Action handler (now records audit) ──────────────────────────── */
  const handleAction = (txnId: string, action: string) => {
    setActionDone(prev => ({ ...prev, [txnId]: action }));
    setAuditLog(prev => [...prev, { txnId, action, time: Date.now(), user: 'analyst' }]);
  };

  return (
    <div data-fraud-layout style={{ display: 'flex', height: '100%', overflow: 'hidden', position: 'relative' }}>

      {/* Main Table Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Table Header bar */}
        <div style={{
          padding: '12px 20px',
          borderBottom: `1px solid ${C.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          background: C.bgPanel,
          flexShrink: 0,
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 3, height: 14, background: C.red }} />
            <span style={{ fontFamily: C.mono, fontSize: 10, color: C.red, letterSpacing: '0.15em' }}>FRAUD DETECTION ENGINE</span>
            {(() => { const src: DataSourceKind = uploadedTxns.length > 0 ? 'CSV' : demoMode ? 'DEMO' : 'LIVE'; const s = DATA_SOURCE_STYLE[src]; return (
              <span style={{ fontFamily: C.mono, fontSize: 8, padding: '2px 7px', background: s.bg, border: `1px solid ${s.border}`, borderRadius: 2, color: s.color, letterSpacing: '0.08em', marginLeft: 4 }}>
                {src}
              </span>
            ); })()}
          </div>
          <div style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim }}>|</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.green, animation: 'blink 2s infinite' }} />
            <span style={{ fontFamily: C.mono, fontSize: 9, color: C.green }}>LIVE · {allTxns.length} TRANSACTIONS{uploadedTxns.length > 0 ? ' (CSV)' : ' · TODAY 09:00–10:00'}</span>
          </div>

          {/* Upload controls */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={() => setShowUploadZone(v => !v)} title="Upload CSV" style={{
              padding: '4px 10px', background: showUploadZone ? 'rgba(255,107,0,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${showUploadZone ? C.orange : C.border}`, borderRadius: 2, color: showUploadZone ? C.orange : C.textDim,
              fontFamily: C.mono, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Upload size={10} /> UPLOAD CSV
            </button>
            <button onClick={() => handleCSV(SAMPLE_CSV)} title="Load sample CSV" style={{
              padding: '4px 10px', background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${C.border}`, borderRadius: 2, color: C.textDim,
              fontFamily: C.mono, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <FileText size={10} /> SAMPLE
            </button>
            {uploadedTxns.length > 0 && (
              <button onClick={() => { setUploadedTxns([]); setParseErrors([]); setActionDone({}); setSelected(TRANSACTIONS[2]); }} style={{
                padding: '4px 10px', background: 'rgba(255,59,59,0.08)',
                border: `1px solid ${C.red}40`, borderRadius: 2, color: C.red,
                fontFamily: C.mono, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer',
              }}>
                RESET
              </button>
            )}
          </div>

          <div style={{ flex: 1 }} />
          {/* Filter tabs */}
          {(['ALL', 'CLEAR', 'REVIEW', 'FLAGGED'] as const).map(f => {
            const counts = { ALL: allTxns.length, CLEAR: allTxns.filter(t => t.status === 'CLEAR').length, REVIEW: allTxns.filter(t => t.status === 'REVIEW').length, FLAGGED: allTxns.filter(t => t.status === 'FLAGGED').length };
            const statusC = f === 'ALL' ? C.textDim : STATUS_CONFIG[f]?.color || C.textDim;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '4px 12px',
                  background: filter === f ? (f === 'ALL' ? 'rgba(255,255,255,0.08)' : STATUS_CONFIG[f as keyof typeof STATUS_CONFIG]?.bg || 'rgba(255,255,255,0.08)') : 'transparent',
                  border: `1px solid ${filter === f ? statusC : C.border}`,
                  borderRadius: 2,
                  color: filter === f ? statusC : C.textDim,
                  fontFamily: C.mono,
                  fontSize: 9,
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                {f} <span style={{ opacity: 0.7 }}>({counts[f]})</span>
              </button>
            );
          })}
        </div>

        {/* Drag/Drop Upload Zone */}
        {showUploadZone && (
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              margin: '0 20px', padding: '20px',
              border: `2px dashed ${isDragging ? C.orange : C.border}`,
              borderRadius: 4, textAlign: 'center', cursor: 'pointer',
              background: isDragging ? 'rgba(255,107,0,0.06)' : 'rgba(255,255,255,0.02)',
              transition: 'all 0.2s',
            }}
          >
            <Upload size={20} color={isDragging ? C.orange : C.textDim} style={{ marginBottom: 8 }} />
            <div style={{ fontFamily: C.mono, fontSize: 10, color: isDragging ? C.orange : C.textDim, marginBottom: 4 }}>
              {isDragging ? 'DROP CSV HERE' : 'DRAG & DROP CSV FILE OR CLICK TO BROWSE'}
            </div>
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, opacity: 0.6 }}>
              Required columns: id, amount, merchant · Optional: channel, fraudscore · Max {MAX_CSV_ROWS} rows
            </div>
            <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileSelect} />
          </div>
        )}

        {/* Parse Error Summary */}
        {parseErrors.length > 0 && (
          <div style={{
            margin: '0 20px', padding: '8px 12px',
            background: 'rgba(255,59,59,0.06)', border: `1px solid ${C.red}40`, borderRadius: 2,
          }}>
            <div style={{ fontFamily: C.mono, fontSize: 9, color: C.red, letterSpacing: '0.1em', marginBottom: 4 }}>
              PARSE WARNINGS ({parseErrors.length})
            </div>
            {parseErrors.map((e, i) => (
              <div key={i} style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, padding: '2px 0' }}>• {e}</div>
            ))}
          </div>
        )}

        {/* Table */}
        <div data-fraud-table-wrap style={{ flex: 1, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
              <tr style={{ background: C.bgPanel, borderBottom: `1px solid ${C.border}` }}>
                {['TXN ID', 'TIMESTAMP', 'AMOUNT', 'MERCHANT', 'CHANNEL', 'FRAUD SCORE', 'STATUS'].map(col => (
                  <th key={col} style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    fontFamily: C.mono,
                    fontSize: 9,
                    color: C.orange,
                    letterSpacing: '0.12em',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}>{col}</th>
                ))}
                <th style={{ padding: '10px 16px', fontFamily: C.mono, fontSize: 9, color: C.orange, letterSpacing: '0.12em', width: 40 }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((txn, i) => {
                const isSelected = selected?.id === txn.id;
                const sc = STATUS_CONFIG[txn.status];
                const rowBg = isSelected ? 'rgba(255,107,0,0.06)' : i % 2 === 0 ? C.bgAlt : '#0D1117';
                return (
                  <tr
                    key={txn.id}
                    onClick={() => { setSelected(txn); setDrawerOpen(true); }}
                    style={{
                      background: rowBg,
                      borderLeft: isSelected ? `3px solid ${C.orange}` : '3px solid transparent',
                      borderBottom: `1px solid ${C.border}`,
                      cursor: 'pointer',
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.borderLeft = `3px solid ${C.orange}40`;
                      if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,107,0,0.03)';
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.borderLeft = '3px solid transparent';
                      if (!isSelected) (e.currentTarget as HTMLElement).style.background = rowBg;
                    }}
                  >
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontFamily: C.mono, fontSize: 11, color: C.cyan }}>{txn.id}</span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontFamily: C.mono, fontSize: 11, color: C.textDim }}>{txn.ts}</span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontFamily: C.mono, fontSize: 11, color: C.text }}>
                        ${txn.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontFamily: C.sans, fontSize: 11, color: C.text }}>{txn.merchant}</span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{
                        fontFamily: C.mono, fontSize: 9,
                        color: CHANNEL_COLORS[txn.channel] || C.text,
                        background: `${CHANNEL_COLORS[txn.channel]}18`,
                        padding: '2px 6px',
                        borderRadius: 2,
                        border: `1px solid ${CHANNEL_COLORS[txn.channel]}40`,
                        letterSpacing: '0.1em',
                      }}>{txn.channel}</span>
                    </td>
                    <td style={{ padding: '10px 16px', minWidth: 120 }}>
                      <FraudScoreBar score={txn.fraudScore} />
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      {actionDone[txn.id] ? (
                        <span style={{
                          fontFamily: C.mono, fontSize: 9,
                          color: actionDone[txn.id] === 'APPROVED' ? C.green : actionDone[txn.id] === 'BLOCKED' ? C.red : C.yellow,
                          letterSpacing: '0.1em',
                        }}>{actionDone[txn.id]}</span>
                      ) : (
                        <span style={{
                          fontFamily: C.mono,
                          fontSize: 9,
                          color: sc.color,
                          background: sc.bg,
                          border: `1px solid ${sc.border}`,
                          borderRadius: 2,
                          padding: '3px 8px',
                          letterSpacing: '0.1em',
                        }}>{txn.status}</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 8px' }}>
                      <ChevronRight size={12} color={isSelected ? C.orange : C.border} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Drawer */}
      <div data-fraud-drawer style={{
        width: drawerOpen && selected ? 360 : 0,
        transition: 'width 0.25s ease',
        overflow: 'hidden',
        flexShrink: 0,
        borderLeft: `1px solid ${C.border}`,
        background: C.bgPanel,
      }}>
        {selected && (
          <div style={{ width: 360, height: '100%', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {/* Drawer Header */}
            <div style={{
              padding: '14px 16px',
              borderBottom: `1px solid ${C.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexShrink: 0,
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={13} color={C.orange} />
                  <span style={{ fontFamily: C.mono, fontSize: 10, color: C.orange, letterSpacing: '0.15em' }}>TRANSACTION DETAIL</span>
                </div>
                <span style={{ fontFamily: C.mono, fontSize: 12, color: C.cyan, marginTop: 2, display: 'block' }}>{selected.id}</span>
              </div>
              <button onClick={() => setDrawerOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.textDim, padding: 4 }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ padding: 16, flex: 1 }}>
              {/* TXN Info */}
              <div style={{
                background: C.bgCard,
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                padding: '12px',
                marginBottom: 12,
              }}>
                {[
                  { label: 'MERCHANT', value: selected.merchant },
                  { label: 'AMOUNT', value: `$${selected.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}` },
                  { label: 'CHANNEL', value: selected.channel },
                  { label: 'TIMESTAMP', value: `Today ${selected.ts}` },
                  { label: 'FRAUD SCORE', value: `${selected.fraudScore}/100`, color: selected.fraudScore < 40 ? C.green : selected.fraudScore < 65 ? C.yellow : C.red },
                ].map(item => (
                  <div key={item.label} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '5px 0',
                    borderBottom: `1px solid ${C.border}`,
                  }}>
                    <span style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim }}>{item.label}</span>
                    <span style={{ fontFamily: C.mono, fontSize: 10, color: (item as any).color || C.text }}>{item.value}</span>
                  </div>
                ))}
              </div>

              {/* Radar Chart */}
              <div style={{
                background: C.bgCard,
                border: `1px solid ${C.border}`,
                borderRadius: 2,
                padding: '12px',
                marginBottom: 12,
              }}>
                <span style={{ fontFamily: C.mono, fontSize: 9, color: C.orange, letterSpacing: '0.12em', display: 'block', marginBottom: 8 }}>ANOMALY BREAKDOWN</span>
                <ResponsiveContainer width="100%" height={180}>
                  <RadarChart data={selected.radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                    <PolarGrid stroke={C.border} strokeWidth={0.5} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: C.textDim, fontSize: 9, fontFamily: 'JetBrains Mono' }} />
                    <Radar
                      name="Risk"
                      dataKey="A"
                      stroke={selected.status === 'FLAGGED' ? C.red : selected.status === 'REVIEW' ? C.yellow : C.green}
                      fill={selected.status === 'FLAGGED' ? C.red : selected.status === 'REVIEW' ? C.yellow : C.green}
                      fillOpacity={0.18}
                      strokeWidth={1.5}
                    />
                    <Tooltip
                      contentStyle={{ background: C.bgPanel, border: `1px solid ${C.border}`, borderRadius: 2, fontFamily: C.mono, fontSize: 10 }}
                      labelStyle={{ color: C.orange }}
                      itemStyle={{ color: C.text }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Rule Triggers */}
              {selected.ruleTriggers.length > 0 && (
                <div style={{
                  background: C.bgCard,
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  padding: '12px',
                  marginBottom: 12,
                }}>
                  <span style={{ fontFamily: C.mono, fontSize: 9, color: C.red, letterSpacing: '0.12em', display: 'block', marginBottom: 8 }}>RULES FIRED ({selected.ruleTriggers.length})</span>
                  {selected.ruleTriggers.map((r, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '4px 0',
                      borderBottom: i < selected.ruleTriggers.length - 1 ? `1px solid ${C.border}` : 'none',
                    }}>
                      <AlertTriangle size={10} color={C.red} />
                      <span style={{ fontFamily: C.mono, fontSize: 9, color: C.text }}>{r}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Anomalies */}
              {selected.anomalies.length > 0 && (
                <div style={{
                  background: C.bgCard,
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  padding: '12px',
                  marginBottom: 12,
                }}>
                  <span style={{ fontFamily: C.mono, fontSize: 9, color: C.yellow, letterSpacing: '0.12em', display: 'block', marginBottom: 8 }}>ANOMALY SIGNALS</span>
                  {selected.anomalies.map((a, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '4px 0',
                      borderBottom: i < selected.anomalies.length - 1 ? `1px solid ${C.border}` : 'none',
                    }}>
                      <div style={{ width: 4, height: 4, borderRadius: '50%', background: C.yellow, flexShrink: 0 }} />
                      <span style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim }}>{a}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Model Verdict */}
              <div style={{
                background: C.bgCard,
                border: `1px solid ${selected.status === 'FLAGGED' ? C.red : selected.status === 'REVIEW' ? C.yellow : C.green}40`,
                borderRadius: 2,
                padding: '12px',
                marginBottom: 16,
              }}>
                <span style={{ fontFamily: C.mono, fontSize: 9, color: C.cyan, letterSpacing: '0.12em', display: 'block', marginBottom: 8 }}>MODEL VERDICT</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim }}>DECISION</span>
                  <span style={{
                    fontFamily: C.mono, fontSize: 10,
                    color: selected.status === 'FLAGGED' ? C.red : selected.status === 'REVIEW' ? C.yellow : C.green,
                  }}>
                    {selected.status === 'FLAGGED' ? 'BLOCK RECOMMENDED' : selected.status === 'REVIEW' ? 'MANUAL REVIEW' : 'AUTO-APPROVE'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim }}>CONFIDENCE</span>
                  <span style={{ fontFamily: C.mono, fontSize: 10, color: C.text }}>{(75 + selected.fraudScore * 0.22).toFixed(1)}%</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim }}>RISK CLASS</span>
                  <span style={{ fontFamily: C.mono, fontSize: 10, color: C.text }}>
                    {selected.status === 'FLAGGED' ? 'HIGH RISK' : selected.status === 'REVIEW' ? 'MEDIUM RISK' : 'LOW RISK'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              {!actionDone[selected.id] ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleAction(selected.id, 'APPROVED')}
                    style={{
                      flex: 1, padding: '9px 0',
                      background: 'rgba(0,255,156,0.1)',
                      border: `1px solid ${C.green}60`,
                      borderRadius: 2,
                      color: C.green,
                      fontFamily: C.mono,
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}
                  >
                    <CheckCircle size={12} /> APPROVE
                  </button>
                  <button
                    onClick={() => handleAction(selected.id, 'ESCALATED')}
                    style={{
                      flex: 1, padding: '9px 0',
                      background: 'rgba(255,214,0,0.1)',
                      border: `1px solid ${C.yellow}60`,
                      borderRadius: 2,
                      color: C.yellow,
                      fontFamily: C.mono,
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}
                  >
                    <AlertTriangle size={12} /> ESCALATE
                  </button>
                  <button
                    onClick={() => handleAction(selected.id, 'BLOCKED')}
                    style={{
                      flex: 1, padding: '9px 0',
                      background: 'rgba(255,59,59,0.1)',
                      border: `1px solid ${C.red}60`,
                      borderRadius: 2,
                      color: C.red,
                      fontFamily: C.mono,
                      fontSize: 10,
                      letterSpacing: '0.1em',
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    }}
                  >
                    <Ban size={12} /> BLOCK
                  </button>
                </div>
              ) : (
                <div style={{
                  padding: '10px',
                  background: actionDone[selected.id] === 'APPROVED' ? 'rgba(0,255,156,0.08)' : actionDone[selected.id] === 'BLOCKED' ? 'rgba(255,59,59,0.08)' : 'rgba(255,214,0,0.08)',
                  border: `1px solid ${actionDone[selected.id] === 'APPROVED' ? C.green : actionDone[selected.id] === 'BLOCKED' ? C.red : C.yellow}40`,
                  borderRadius: 2,
                  textAlign: 'center',
                }}>
                  <span style={{ fontFamily: C.mono, fontSize: 10, color: actionDone[selected.id] === 'APPROVED' ? C.green : actionDone[selected.id] === 'BLOCKED' ? C.red : C.yellow }}>
                    ✓ ACTION RECORDED: {actionDone[selected.id]}
                  </span>
                </div>
              )}

              {/* ── Audit Timeline ─────────────────────────────────── */}
              {auditLog.length > 0 && (
                <div style={{
                  marginTop: 16,
                  background: C.bgCard,
                  border: `1px solid ${C.border}`,
                  borderRadius: 2,
                  padding: '12px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <Clock size={11} color={C.cyan} />
                    <span style={{ fontFamily: C.mono, fontSize: 9, color: C.cyan, letterSpacing: '0.12em' }}>
                      AUDIT TIMELINE ({auditLog.length})
                    </span>
                  </div>
                  <div style={{ maxHeight: 160, overflowY: 'auto' }}>
                    {[...auditLog].reverse().map((entry, i) => {
                      const actionColor = entry.action === 'APPROVED' ? C.green
                        : entry.action === 'BLOCKED' ? C.red
                        : entry.action === 'ESCALATED' ? C.yellow
                        : C.textDim;
                      const age = Date.now() - entry.time;
                      const ageStr = age < 60_000 ? `${Math.floor(age / 1000)}s ago` : `${Math.floor(age / 60_000)}m ago`;
                      return (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'flex-start', gap: 8, padding: '5px 0',
                          borderBottom: i < auditLog.length - 1 ? `1px solid ${C.border}` : 'none',
                        }}>
                          <div style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: actionColor, marginTop: 3, flexShrink: 0,
                          }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: C.mono, fontSize: 9, color: actionColor }}>
                              {entry.action}
                              {entry.txnId !== '-' && (
                                <span style={{ color: C.textDim }}> — {entry.txnId}</span>
                              )}
                            </div>
                            <div style={{ fontFamily: C.mono, fontSize: 8, color: C.textDim, opacity: 0.6, marginTop: 1 }}>
                              {entry.user} · {ageStr}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: ${C.bg}; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
      `}</style>
    </div>
  );
}

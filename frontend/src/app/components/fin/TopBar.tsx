import { useState, useEffect } from 'react';
import { Bell, User, ChevronDown, Wifi, Menu } from 'lucide-react';
import { C } from './colors';

type Tab = 'RISK_SCORE' | 'FRAUD_DETECT' | 'PORTFOLIO';

interface TopBarProps {
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  onMenuToggle?: () => void;
  isMobile?: boolean;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'RISK_SCORE', label: 'RISK SCORE' },
  { id: 'FRAUD_DETECT', label: 'FRAUD DETECT' },
  { id: 'PORTFOLIO', label: 'PORTFOLIO' },
];

export function TopBar({ activeTab, setActiveTab, onMenuToggle, isMobile }: TopBarProps) {
  const [time, setTime] = useState(new Date());
  const [alertPulse, setAlertPulse] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const pulse = setInterval(() => {
      setAlertPulse(true);
      setTimeout(() => setAlertPulse(false), 600);
    }, 8000);
    return () => clearInterval(pulse);
  }, []);

  const timeStr = time.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = time.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase();
  const isMarketOpen = time.getHours() >= 9 && time.getHours() < 16 && time.getDay() > 0 && time.getDay() < 6;

  return (
    <header data-topbar style={{
      height: 48,
      background: C.bgPanel,
      borderBottom: `1px solid ${C.border}`,
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 0,
      flexShrink: 0,
      position: 'relative',
      zIndex: 100,
      overflow: 'hidden',
      maxWidth: '100vw',
    }}>
      {/* Mobile menu button */}
      {isMobile && (
        <button
          data-mobile-sidebar-toggle
          onClick={onMenuToggle}
          style={{
            background: 'none',
            border: 'none',
            color: C.textDim,
            cursor: 'pointer',
            padding: 4,
            marginRight: 8,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Menu size={18} />
        </button>
      )}
      {/* Brand */}
      <div data-topbar-brand style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 24, flexShrink: 0 }}>
        <span style={{
          fontFamily: C.mono,
          fontSize: 18,
          fontWeight: 700,
          color: C.orange,
          letterSpacing: '0.05em',
        }}>FIN·IQ</span>
        <div style={{
          background: 'rgba(255,107,0,0.15)',
          border: `1px solid rgba(255,107,0,0.3)`,
          borderRadius: 2,
          padding: '2px 6px',
        }}>
          <span style={{ fontFamily: C.mono, fontSize: 9, color: C.orange, letterSpacing: '0.1em' }}>TERMINAL v2.4</span>
        </div>
      </div>

      {/* Separator */}
      <div data-topbar-sep style={{ width: 1, height: 24, background: C.border, marginRight: 24 }} />

      {/* Clock + Market Status */}
      <div data-topbar-clock style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 28, flexShrink: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontFamily: C.mono, fontSize: 13, color: C.text, letterSpacing: '0.08em', lineHeight: 1.2 }}>{timeStr}</span>
          <span style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, letterSpacing: '0.06em', lineHeight: 1.2 }}>{dateStr}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 7, height: 7,
            borderRadius: '50%',
            background: isMarketOpen ? C.green : C.red,
            boxShadow: `0 0 8px ${isMarketOpen ? C.green : C.red}`,
            animation: 'pulse 2s infinite',
          }} />
          <span style={{ fontFamily: C.mono, fontSize: 9, color: isMarketOpen ? C.green : C.red, letterSpacing: '0.08em' }}>
            {isMarketOpen ? 'LIVE' : 'CLOSED'}
          </span>
        </div>
      </div>

      {/* Separator */}
      <div data-topbar-sep style={{ width: 1, height: 24, background: C.border, marginRight: 4 }} />

      {/* Tab Navigation */}
      <nav style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 0 }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                height: 48,
                padding: '0 20px',
                background: isActive ? 'rgba(255,107,0,0.08)' : 'transparent',
                border: 'none',
                borderBottom: isActive ? `2px solid ${C.orange}` : '2px solid transparent',
                color: isActive ? C.orange : C.textDim,
                fontFamily: C.mono,
                fontSize: 11,
                letterSpacing: '0.12em',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.color = C.text;
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.color = C.textDim;
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Market Tickers */}
      <div data-topbar-tickers style={{ display: 'flex', alignItems: 'center', gap: 16, marginRight: 20 }}>
        {[
          { sym: 'S&P', val: '5,248.32', chg: '+0.84%', up: true },
          { sym: 'NDX', val: '18,342.1', chg: '+1.22%', up: true },
          { sym: 'BTC', val: '67,482', chg: '-0.37%', up: false },
        ].map((t) => (
          <div key={t.sym} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim }}>{t.sym}</span>
              <span style={{ fontFamily: C.mono, fontSize: 11, color: C.text }}>{t.val}</span>
            </div>
            <span style={{ fontFamily: C.mono, fontSize: 9, color: t.up ? C.green : C.red }}>{t.chg}</span>
          </div>
        ))}
      </div>

      {/* Separator */}
      <div data-topbar-sep style={{ width: 1, height: 24, background: C.border, marginRight: 16 }} />

      {/* Right Side */}
      <div data-topbar-right style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setNotifOpen(!notifOpen); setProfileOpen(false); }}
            title="Notifications"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              padding: 4,
              color: C.textDim,
            }}
          >
            <Bell size={16} />
            <div style={{
              position: 'absolute',
              top: -2,
              right: -4,
              minWidth: 16,
              height: 16,
              background: C.red,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: alertPulse ? 'none' : 'badgePulse 1s ease',
            }}>
              <span style={{ fontFamily: C.mono, fontSize: 8, color: '#fff', fontWeight: 700 }}>7</span>
            </div>
          </button>
          {notifOpen && (
            <div style={{
              position: 'absolute',
              top: 36,
              right: 0,
              width: 260,
              background: C.bgPanel,
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              zIndex: 300,
              maxHeight: 300,
              overflowY: 'auto',
            }}>
              <div style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: C.mono, fontSize: 9, color: C.orange, letterSpacing: '0.1em' }}>NOTIFICATIONS</span>
                <span style={{ fontFamily: C.mono, fontSize: 8, color: C.textDim }}>7 unread</span>
              </div>
              {[
                { msg: 'High-risk loan flagged', time: '32s ago', sev: C.red },
                { msg: 'Fraud detected: TXN-8850', time: '1m ago', sev: C.red },
                { msg: 'Portfolio rebalanced', time: '3m ago', sev: C.green },
                { msg: 'Model retrained OK', time: '4m ago', sev: C.cyan },
                { msg: 'Risk threshold updated', time: '6m ago', sev: C.orange },
                { msg: 'VaR breach: 5.2%', time: '7m ago', sev: C.red },
                { msg: 'New market data ingested', time: '10m ago', sev: C.cyan },
              ].map((n, i) => (
                <div key={i} style={{ padding: '8px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 8, cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,107,0,0.05)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: n.sev, marginTop: 5, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontFamily: C.sans, fontSize: 10, color: C.text }}>{n.msg}</div>
                    <div style={{ fontFamily: C.mono, fontSize: 8, color: C.textDim }}>{n.time}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setProfileOpen(!profileOpen); setNotifOpen(false); }}
            title="User Profile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: 2,
              border: `1px solid ${C.border}`,
              background: 'none',
              color: C.text,
            }}
          >
            <div style={{
              width: 24, height: 24,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #FF6B00 0%, #FF8C33 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontFamily: C.mono, fontSize: 9, color: '#fff', fontWeight: 700 }}>JD</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: C.sans, fontSize: 11, color: C.text, lineHeight: 1.2 }}>J. Dawson</span>
              <span style={{ fontFamily: C.mono, fontSize: 9, color: C.textDim, lineHeight: 1.2 }}>ANALYST L2</span>
            </div>
            <ChevronDown size={12} color={C.textDim} />
          </button>
          {profileOpen && (
            <div style={{
              position: 'absolute',
              top: 42,
              right: 0,
              width: 180,
              background: C.bgPanel,
              border: `1px solid ${C.border}`,
              borderRadius: 4,
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              zIndex: 300,
            }}>
              {[
                { label: 'Settings', disabled: true },
                { label: 'API Keys', disabled: true },
                { label: 'Preferences', disabled: true },
                { label: 'Log Out', disabled: true },
              ].map((item, i) => (
                <div
                  key={i}
                  title={item.disabled ? 'Not available in demo' : ''}
                  style={{
                    padding: '8px 12px',
                    fontFamily: C.mono,
                    fontSize: 10,
                    color: item.disabled ? C.textDim : C.text,
                    cursor: item.disabled ? 'not-allowed' : 'pointer',
                    borderBottom: i < 3 ? `1px solid ${C.border}` : 'none',
                    opacity: item.disabled ? 0.5 : 1,
                  }}
                >
                  {item.label} {item.disabled && <span style={{ fontSize: 8, color: C.textDim }}>(demo)</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes badgePulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.4); }
          100% { transform: scale(1); }
        }
      `}</style>
    </header>
  );
}

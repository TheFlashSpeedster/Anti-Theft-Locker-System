import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { ESP32_IP, POLL_INTERVAL_MS } from './firebase';
import { loadLogs, mergeLogs, clearAllLogs, pruneIfNeeded } from './db';

import Login from './pages/Login';
import VaultStatus from './pages/VaultStatus';
import HardwareConfig from './pages/HardwareConfig';
import EventLog from './pages/EventLog';
import Settings from './pages/Settings';

// ── Default state factories ──────────────────────────────────────────────────
const DEFAULT_LIVE_STATE = {
  isLocked: true, isSecretCompartmentOpen: false, failedAttempts: 0,
  buzzerOn: false, isBreached: false, vibrationDetected: false,
  lcdText: [' SYSTEM LOCKED  ', '   ENTER PIN:   '], logs: [],
};
const DEFAULT_TEST_STATE = {
  isLocked: true, isSecretCompartmentOpen: false, failedAttempts: 0,
  buzzerOn: false, isBreached: false, vibrationDetected: false,
  lcdText: [' SYSTEM LOCKED  ', '   ENTER PIN:   '],
  logs: [{ id: 1, type: 'info', message: '[TEST] System initialized. Sandbox mode active.', timestamp: new Date().toLocaleString() }],
};

function loadTestState() {
  try { return JSON.parse(localStorage.getItem('test_state')) || DEFAULT_TEST_STATE; }
  catch { return DEFAULT_TEST_STATE; }
}
function saveTestState(s) {
  const { logs: _, ...withoutLogs } = s;
  localStorage.setItem('test_state', JSON.stringify(withoutLogs));
}

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

const DAYS  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function Clock({ compact = false }) {
  const now  = useClock();
  const hh   = String(now.getHours()).padStart(2, '0');
  const mm   = String(now.getMinutes()).padStart(2, '0');
  const ss   = String(now.getSeconds()).padStart(2, '0');
  const day  = DAYS[now.getDay()];
  const date = now.getDate();
  const mon  = MONTHS[now.getMonth()];
  const yr   = now.getFullYear();

  if (compact) {
    // Top-bar version — single row
    return (
      <div className="hidden md:flex flex-col items-end leading-none">
        <span className="font-mono text-sm font-bold text-text-primary tracking-widest tabular-nums">
          {hh}<span className="animate-pulse opacity-70">:</span>{mm}<span className="animate-pulse opacity-70">:</span>{ss}
        </span>
        <span className="font-mono text-[9px] text-text-variant/50 tracking-wider mt-0.5">
          {day.slice(0,3).toUpperCase()} · {String(date).padStart(2,'0')} {mon.toUpperCase()} {yr}
        </span>
      </div>
    );
  }

  // Sidebar version — larger display
  return (
    <div className="px-1">
      <div className="font-mono text-xl font-black text-text-primary tracking-widest tabular-nums leading-none">
        {hh}<span className="animate-pulse opacity-60 text-primary">:</span>{mm}<span className="animate-pulse opacity-60 text-primary">:</span>
        <span className="text-primary">{ss}</span>
      </div>
      <div className="font-mono text-[10px] text-text-variant/50 tracking-wider mt-1">
        {day} · {String(date).padStart(2,'0')} {mon} {yr}
      </div>
    </div>
  );
}

// ── Mode badge ───────────────────────────────────────────────────────────────
function ModeBadge({ mode, connected, onSwitch }) {
  const isTest = mode === 'test';
  return (
    <button onClick={onSwitch}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-mono uppercase tracking-widest transition-all
        ${isTest
          ? 'border-orange-500/50 bg-orange-500/10 text-orange-400 hover:bg-orange-500/20'
          : connected
            ? 'border-secondary/40 bg-secondary/10 text-secondary hover:bg-secondary/20'
            : 'border-yellow-500/40 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
        }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isTest ? 'bg-orange-400' : connected ? 'bg-secondary animate-pulse' : 'bg-yellow-400 animate-pulse'}`} />
      {isTest ? 'Test Mode' : connected ? 'Live · Online' : 'Live · Offline'}
      <span className="material-symbols-outlined text-[12px]">swap_horiz</span>
    </button>
  );
}

function Layout({ children, state, mode, connected, onLogout, onSwitchMode }) {
  const location = useLocation();
  const path = location.pathname;
  const getPageName = () => {
    if (path === '/') return 'Vault Status';
    if (path === '/hardware') return 'Hardware Config';
    if (path === '/logs') return 'Event Log';
    if (path === '/settings') return 'Settings';
    return '';
  };

  const statusDot = state.isBreached
    ? 'bg-tertiary glow-tertiary animate-ping'
    : mode === 'test' ? 'bg-orange-500 animate-pulse'
    : connected ? 'bg-secondary glow-secondary'
    : 'bg-yellow-500 animate-pulse';

  const statusLabel = state.isBreached
    ? 'System Breached'
    : mode === 'test' ? 'Test Mode'
    : connected ? 'ESP32 Live'
    : 'ESP32 Offline';

  return (
    <div className="flex h-screen overflow-hidden bg-bg-base text-text-primary">
      {/* ── Sidebar ── */}
      <aside className="hidden md:flex flex-col w-64 border-r border-white/5 relative z-10" style={{background:'linear-gradient(180deg,rgba(20,22,30,0.98) 0%,rgba(14,16,22,0.99) 100%)'}}>

        {/* Logo */}
        <div className="px-6 pt-7 pb-5 border-b border-white/5">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary text-[16px]">shield_lock</span>
            </div>
            <h1 className="font-manrope text-lg font-black tracking-widest text-white uppercase">
              Aether
            </h1>
          </div>
          <p className="text-[10px] text-text-variant/50 font-mono tracking-wider pl-9">Sentinel · v3.2 · Local</p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-5 px-3 space-y-0.5">
          {[
            { to: '/', icon: 'lock',           label: 'Vault Status' },
            { to: '/hardware', icon: 'developer_board', label: 'Hardware' },
            { to: '/logs',     icon: 'list_alt',        label: 'Event Log' },
            { to: '/settings', icon: 'settings',        label: 'Settings' },
          ].map(({ to, icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 font-manrope text-sm font-semibold tracking-wide group
                 ${isActive
                   ? 'bg-primary/12 text-primary'
                   : 'text-text-variant/70 hover:text-text-primary hover:bg-white/5'}`
              }>
              {({ isActive }) => (
                <>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200
                    ${isActive ? 'bg-primary/20' : 'bg-transparent group-hover:bg-white/5'}`}>
                    <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-primary' : ''}`}>{icon}</span>
                  </div>
                  <span>{label}</span>
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Status footer */}
        <div className="p-4 border-t border-white/5 space-y-3">
          <div className="flex items-center gap-2.5 px-1">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot}`} />
            <span className="text-[11px] font-mono uppercase tracking-widest text-text-variant/80">{statusLabel}</span>
          </div>
          <ModeBadge mode={mode} connected={connected} onSwitch={onSwitchMode} />
          <p className="text-[9px] font-mono text-text-variant/30 truncate px-1">{ESP32_IP}</p>
          <div className="mt-3 pt-3 border-t border-white/5">
            <Clock />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-0 overflow-y-auto">
        {/* Top App Bar */}
        <header className="h-16 glass-panel border-b border-b-primary/10 flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <h2 className="font-manrope font-semibold tracking-widest text-text-primary uppercase md:hidden">
              Aether Sentinel
            </h2>
            <div className="hidden md:flex items-center gap-3 text-text-variant font-mono text-sm uppercase tracking-widest">
              <span className="material-symbols-outlined text-[18px]">terminal</span>
              {getPageName()}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Clock compact />
            <div className="w-px h-6 bg-white/10 hidden md:block" />
            <ModeBadge mode={mode} connected={connected} onSwitch={onSwitchMode} />
            <button onClick={onLogout} title="Logout"
              className="text-text-variant hover:text-tertiary transition-colors">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </header>

        {/* Offline banner */}
        {mode === 'live' && !connected && (
          <div className="px-4 md:px-8 pt-4">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
              <span className="material-symbols-outlined text-xl">wifi_off</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider font-manrope">ESP32 Unreachable</p>
                <p className="text-[10px] font-mono opacity-70">
                  Cannot reach {ESP32_IP} — make sure you are on the same WiFi network.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 md:p-8 flex-1 pb-24 md:pb-8">
          {children}
        </div>
      </main>

      {/* ── Mobile Bottom Nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-white/8"
           style={{background:'rgba(12,14,20,0.97)', backdropFilter:'blur(20px)'}}>
        <div className="flex justify-around items-center px-2 py-1">
          {[
            { to: '/',         icon: 'lock',           label: 'Vault'    },
            { to: '/hardware', icon: 'developer_board', label: 'Hardware' },
            { to: '/logs',     icon: 'list_alt',        label: 'Logs'     },
            { to: '/settings', icon: 'settings',        label: 'Settings' },
          ].map(({ to, icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200
                 ${isActive ? 'text-primary' : 'text-text-variant/50 hover:text-text-variant'}`
              }>
              {({ isActive }) => (
                <>
                  <div className={`w-10 h-6 rounded-full flex items-center justify-center transition-all duration-200
                    ${isActive ? 'bg-primary/15' : ''}`}>
                    <span className="material-symbols-outlined text-[20px]">{icon}</span>
                  </div>
                  <span className="text-[10px] font-mono tracking-wide">{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* HUD Overlay */}
      <div className="fixed bottom-20 md:bottom-8 right-8 glass-panel p-4 rounded-xl border border-primary/20 pointer-events-none z-30 hidden md:block">
        <div className="space-y-3 font-mono text-xs uppercase tracking-wider">
          <div className="flex items-center justify-between gap-6">
            <span className="text-text-variant">Mode</span>
            <span className={mode === 'test' ? 'text-orange-400' : 'text-secondary'}>{mode === 'test' ? 'TEST' : 'LIVE'}</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-text-variant">ESP32</span>
            <span className={connected ? 'text-secondary' : 'text-yellow-400'}>{connected ? 'ONLINE' : 'OFFLINE'}</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-text-variant">Link</span>
            <span className="text-secondary">LOCAL WiFi</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('auth') === 'true');
  const [mode, setMode] = useState(() => localStorage.getItem('app_mode') || 'live');

  // ── Live state: polled from ESP32 /status ────────────────────────────────
  const [liveState, setLiveState]   = useState(DEFAULT_LIVE_STATE);
  const [connected, setConnected]   = useState(false);

  // ── Test state: local only ───────────────────────────────────────────────
  const [testState, setTestState]   = useState(loadTestState);
  const [testLogs, setTestLogs]     = useState(() => DEFAULT_TEST_STATE.logs);

  const activeState = mode === 'test'
    ? { ...testState, logs: testLogs }
    : { ...liveState };

  const switchMode = () => {
    const next = mode === 'live' ? 'test' : 'live';
    setMode(next);
    localStorage.setItem('app_mode', next);
  };

  // ── Poll ESP32 /status every POLL_INTERVAL_MS ────────────────────────────
  const pollTimer  = useRef(null);
  const failCount  = useRef(0);          // consecutive failure counter
  const FAIL_THRESHOLD = 3;             // go offline only after 3 missed polls (~3 s)

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`${ESP32_IP}/status`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();

      // Success — reset strike counter and mark online
      failCount.current = 0;

      let newLcdText = [' SYSTEM LOCKED  ', '   ENTER PIN:   '];
      if (!data.isLocked)               newLcdText = [' ACCESS GRANTED ', '  DOOR OPENED   '];
      else if (data.isBreached)         newLcdText = [' SYSTEM BREACHED', '  ALARM ACTIVE! '];
      else if (data.failedAttempts > 0) newLcdText = [' INCORRECT PIN  ', `  ATTEMPTS: ${data.failedAttempts}/3 `];

      setLiveState(prev => ({
        ...prev,
        isLocked:                data.isLocked               ?? prev.isLocked,
        isSecretCompartmentOpen: data.isSecretCompartmentOpen ?? prev.isSecretCompartmentOpen,
        failedAttempts:          data.failedAttempts          ?? prev.failedAttempts,
        buzzerOn:                data.buzzerOn                ?? prev.buzzerOn,
        isBreached:              data.isBreached              ?? prev.isBreached,
        vibrationDetected:       data.vibrationDetected       ?? prev.vibrationDetected,
        lcdText: newLcdText,
      }));
      setConnected(true);
    } catch {
      // Only flip to offline after FAIL_THRESHOLD consecutive misses
      failCount.current += 1;
      if (failCount.current >= FAIL_THRESHOLD) {
        setConnected(false);
      }
    }
  }, []);

  // ── Poll ESP32 /logs every 5s ────────────────────────────────────────────
  const pollLogs = useCallback(async () => {
    try {
      const res = await fetch(`${ESP32_IP}/logs`, { signal: AbortSignal.timeout(2000) });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.logs)) {
        // 1. Merge fresh ESP32 logs into IndexedDB (idempotent)
        await mergeLogs(data.logs);
        await pruneIfNeeded();

        // 2. Read full history from IndexedDB (newest-first)
        const all = await loadLogs();
        setLiveState(prev => ({ ...prev, logs: all.map((l, i) => ({ id: i, ...l })) }));
      }
    } catch { /* silent */ }
  }, []);

  // Load persisted logs from IndexedDB once on mount (before first ESP32 poll)
  useEffect(() => {
    if (mode !== 'live') return;
    loadLogs()
      .then(all => {
        if (all.length > 0)
          setLiveState(prev => ({ ...prev, logs: all.map((l, i) => ({ id: i, ...l })) }));
      })
      .catch(() => {});
  }, [mode]);

  useEffect(() => {
    if (mode !== 'live') return;
    pollStatus();
    pollLogs();
    const statusTimer = setInterval(pollStatus, POLL_INTERVAL_MS);
    const logsTimer   = setInterval(pollLogs, 5000);
    return () => { clearInterval(statusTimer); clearInterval(logsTimer); };
  }, [mode, pollStatus, pollLogs]);

  // ── Command handler ───────────────────────────────────────────────────────
  const addTestLog = useCallback((type, message) => {
    setTestLogs(prev => [{ id: Date.now(), type, message, timestamp: new Date().toLocaleString() }, ...prev].slice(0, 100));
  }, []);

  const sendCommand = useCallback(async (cmd) => {
    if (mode === 'live') {
      if (!connected) return;
      try {
        await fetch(`${ESP32_IP}/command`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cmd }),
          signal: AbortSignal.timeout(3000),
        });
        // Poll immediately to reflect the change
        setTimeout(pollStatus, 300);
      } catch (err) {
        console.error('ESP32 command failed:', err);
      }
      return;
    }

    // ── TEST mode: local simulation ──────────────────────────────────────
    setTestState(prev => {
      let next = { ...prev };
      switch (cmd) {
        case '/unlock':
          next = { ...next, isLocked: false, lcdText: [' ACCESS GRANTED ', '  DOOR OPENED   '] };
          addTestLog('success', '[TEST] Door unlocked remotely'); break;
        case '/lock':
          next = { ...next, isLocked: true, lcdText: [' SYSTEM LOCKED  ', '   ENTER PIN:   '] };
          addTestLog('info', '[TEST] Door locked'); break;
        case '/trapdoor_open':
          next = { ...next, isSecretCompartmentOpen: true };
          addTestLog('info', '[TEST] Trapdoor opened'); break;
        case '/trapdoor_close':
          next = { ...next, isSecretCompartmentOpen: false };
          addTestLog('info', '[TEST] Trapdoor sealed'); break;
        case '/trapdoor_flip':
          next = { ...next, isSecretCompartmentOpen: false };
          addTestLog('info', '[TEST] Trapdoor flip complete'); break;
        case '/buzzer_on':
          next = { ...next, buzzerOn: true, isBreached: true };
          addTestLog('warning', '[TEST] Buzzer + breach latched via web'); break;
        case '/buzzer_off':
          next = { ...next, buzzerOn: false };
          addTestLog('info', '[TEST] Buzzer silenced'); break;
        case '/reset':
          next = { ...DEFAULT_TEST_STATE };
          addTestLog('info', '[TEST] System fully reset'); break;
        case '__sim_wrong_pin': {
          const attempts = prev.failedAttempts + 1;
          if (attempts >= 3) {
            addTestLog('critical', '[TEST] 3 wrong PINs — breach triggered');
            next = { ...next, failedAttempts: attempts, buzzerOn: true, isSecretCompartmentOpen: true, isBreached: true, lcdText: [' SYSTEM BREACHED', '  ALARM ACTIVE! '] };
          } else {
            addTestLog('warning', `[TEST] Wrong PIN — attempt ${attempts}/3`);
            next = { ...next, failedAttempts: attempts, lcdText: [' INCORRECT PIN  ', `  ATTEMPTS: ${attempts}/3 `] };
          }
          break;
        }
        case '__sim_vibration':
          addTestLog('critical', '[TEST] Vibration detected — tamper alert');
          next = { ...next, vibrationDetected: true, buzzerOn: true, isBreached: true, lcdText: ['TAMPER DETECTED!', '  ALARM ACTIVE! '] };
          break;
        default: break;
      }
      saveTestState(next);
      return next;
    });
  }, [mode, connected, addTestLog, pollStatus]);

  const handleLogout = () => {
    localStorage.removeItem('auth');
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) return <Login onLogin={() => setIsLoggedIn(true)} />;

  const canControl = mode === 'test' || connected;

  return (
    <Router>
      <Layout state={activeState} mode={mode} connected={connected} onLogout={handleLogout} onSwitchMode={switchMode}>
        <Routes>
          <Route path="/"         element={<VaultStatus state={activeState} connected={connected} mode={mode} canControl={canControl} onCommand={sendCommand} />} />
          <Route path="/hardware" element={<HardwareConfig state={activeState} />} />
          <Route path="/logs"     element={<EventLog logs={activeState.logs} onClearLogs={async () => {
            await clearAllLogs();
            setLiveState(prev => ({ ...prev, logs: [] }));
          }} />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;

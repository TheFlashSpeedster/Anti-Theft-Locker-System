import { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { db } from './firebase';
import { ref, onValue, set } from 'firebase/database';
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

// Persist test state in localStorage so it survives page refresh
function loadTestState() {
  try { return JSON.parse(localStorage.getItem('test_state')) || DEFAULT_TEST_STATE; }
  catch { return DEFAULT_TEST_STATE; }
}
function saveTestState(s) {
  const { logs: _, ...withoutLogs } = s; // don't persist logs in localStorage
  localStorage.setItem('test_state', JSON.stringify(withoutLogs));
}

// ── Mode badge helper ────────────────────────────────────────────────────────
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
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-r-primary/20 relative z-10">
        <div className="p-6 border-b border-b-primary/10">
          <h1 className="font-manrope text-2xl font-bold tracking-widest text-primary glow-primary-text uppercase">
            Aether Sentinel
          </h1>
          <p className="text-xs text-text-variant tracking-wider mt-1 font-mono">v3.1.0-PROD</p>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2">
          {[
            { to: '/', icon: 'lock', label: 'Vault Status' },
            { to: '/hardware', icon: 'developer_board', label: 'Hardware' },
            { to: '/logs', icon: 'list_alt', label: 'Event Log' },
            { to: '/settings', icon: 'settings', label: 'Settings' },
          ].map(({ to, icon, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 font-manrope tracking-widest uppercase text-sm
                ${isActive ? 'bg-primary/10 text-primary border-l-2 border-primary' : 'text-text-variant hover:bg-surface-container hover:text-text-primary'}`}>
              <span className="material-symbols-outlined">{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-t-primary/10 space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${statusDot}`} />
            <span className="text-xs font-mono uppercase tracking-widest text-text-variant">{statusLabel}</span>
          </div>
          <ModeBadge mode={mode} connected={connected} onSwitch={onSwitchMode} />
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
            <div className="hidden md:flex items-center gap-2 text-text-variant font-mono text-sm uppercase tracking-widest">
              <span className="material-symbols-outlined text-[18px]">terminal</span>
              {getPageName()}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ModeBadge mode={mode} connected={connected} onSwitch={onSwitchMode} />
            <button onClick={onLogout} title="Logout"
              className="text-text-variant hover:text-tertiary transition-colors">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </header>

        {/* Offline banner (Live mode only) */}
        {mode === 'live' && !connected && (
          <div className="px-4 md:px-8 pt-4">
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400">
              <span className="material-symbols-outlined text-xl">wifi_off</span>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider font-manrope">ESP32 Offline</p>
                <p className="text-[10px] font-mono opacity-70">Showing last known state. Controls locked until ESP32 reconnects.</p>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 md:p-8 flex-1 pb-24 md:pb-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden glass-panel border-t border-t-primary/20 fixed bottom-0 left-0 right-0 z-20 flex justify-around p-3">
        {[
          { to: '/', icon: 'lock' }, { to: '/hardware', icon: 'developer_board' },
          { to: '/logs', icon: 'list_alt' }, { to: '/settings', icon: 'settings' },
        ].map(({ to, icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-text-variant'}`}>
            <span className="material-symbols-outlined">{icon}</span>
          </NavLink>
        ))}
      </nav>

      {/* HUD Overlay (desktop) */}
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
            <span className="text-text-variant">POWER</span>
            <span className="text-secondary">MAINS (5V)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('auth') === 'true');

  // ── Mode: 'live' | 'test' ────────────────────────────────────────────────
  const [mode, setMode] = useState(() => localStorage.getItem('app_mode') || 'live');

  // ── Live state: mirrors Firebase, NEVER locally mutated ─────────────────
  const [liveState, setLiveState] = useState(DEFAULT_LIVE_STATE);
  const [connected, setConnected] = useState(false);

  // ── Test state: local only, persisted in localStorage ───────────────────
  const [testState, setTestState] = useState(loadTestState);
  const [testLogs, setTestLogs] = useState(() => DEFAULT_TEST_STATE.logs);

  // Active state shown to pages
  const activeState = mode === 'test'
    ? { ...testState, logs: testLogs }
    : { ...liveState };

  const switchMode = () => {
    const next = mode === 'live' ? 'test' : 'live';
    setMode(next);
    localStorage.setItem('app_mode', next);
  };

  // ── Firebase: live state ─────────────────────────────────────────────────
  const STALE_MS = 25000;
  const wallClockRef  = useRef(0);
  const lastUptimeRef = useRef(parseInt(localStorage.getItem('esp32_uptime') || '0'));

  useEffect(() => {
    const statusRef = ref(db, 'locker/status');
    const unsubscribe = onValue(statusRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) { setConnected(false); return; }

      const uptimeMs = data.uptimeMs ?? 0;
      if (uptimeMs > 0 && uptimeMs !== lastUptimeRef.current) {
        lastUptimeRef.current = uptimeMs;
        localStorage.setItem('esp32_uptime', uptimeMs);
        wallClockRef.current = Date.now();
        setConnected(true);
      }

      let newLcdText = [' SYSTEM LOCKED  ', '   ENTER PIN:   '];
      if (!data.isLocked)              newLcdText = [' ACCESS GRANTED ', '  DOOR OPENED   '];
      else if (data.isBreached)        newLcdText = [' SYSTEM BREACHED', '  ALARM ACTIVE! '];
      else if (data.failedAttempts > 0) newLcdText = [' INCORRECT PIN  ', `  ATTEMPTS: ${data.failedAttempts}/3 `];

      // Update live state ONLY — never touches testState
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
    }, () => setConnected(false));

    const watchdog = setInterval(() => {
      const wall = wallClockRef.current;
      if (wall === 0 || Date.now() - wall >= STALE_MS) setConnected(false);
    }, 5000);

    return () => { unsubscribe(); clearInterval(watchdog); };
  }, []);

  // ── Firebase: live logs ───────────────────────────────────────────────────
  useEffect(() => {
    const logsRef = ref(db, 'locker/logs');
    const unsubscribe = onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      const logsArray = Object.entries(data)
        .map(([id, log]) => ({ id, ...log }))
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 50);
      setLiveState(prev => ({ ...prev, logs: logsArray }));
    });
    return () => unsubscribe();
  }, []);

  // ── Command handler ───────────────────────────────────────────────────────
  const addTestLog = useCallback((type, message) => {
    setTestLogs(prev => [{ id: Date.now(), type, message, timestamp: new Date().toLocaleString() }, ...prev].slice(0, 100));
  }, []);

  const sendCommand = useCallback(async (cmd) => {
    if (mode === 'live') {
      // Live mode: only send if ESP32 is connected
      if (!connected) return;
      try {
        await set(ref(db, 'locker/command'), { cmd, ts: Math.floor(Date.now() / 1000) });
      } catch (err) {
        console.error('Firebase command failed:', err);
      }
      return;
    }

    // ── TEST mode: update local state only, never touches Firebase ──────
    setTestState(prev => {
      let next = { ...prev };
      switch (cmd) {
        case '/unlock':
          next = { ...next, isLocked: false, lcdText: [' ACCESS GRANTED ', '  DOOR OPENED   '] };
          addTestLog('success', '[TEST] Door unlocked remotely');
          break;
        case '/lock':
          next = { ...next, isLocked: true, lcdText: [' SYSTEM LOCKED  ', '   ENTER PIN:   '] };
          addTestLog('info', '[TEST] Door locked');
          break;
        case '/trapdoor_open':
          next = { ...next, isSecretCompartmentOpen: true };
          addTestLog('info', '[TEST] Trapdoor opened');
          break;
        case '/trapdoor_close':
          next = { ...next, isSecretCompartmentOpen: false };
          addTestLog('info', '[TEST] Trapdoor sealed');
          break;
        case '/trapdoor_flip':
          next = { ...next, isSecretCompartmentOpen: false };
          addTestLog('info', '[TEST] Trapdoor flip complete');
          break;
        case '/buzzer_on':
          next = { ...next, buzzerOn: true, isBreached: true };
          addTestLog('warning', '[TEST] Buzzer + breach latched via web');
          break;
        case '/buzzer_off':
          next = { ...next, buzzerOn: false };
          addTestLog('info', '[TEST] Buzzer silenced');
          break;
        case '/reset':
          next = { ...DEFAULT_TEST_STATE };
          addTestLog('info', '[TEST] System fully reset');
          break;
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
        default:
          break;
      }
      saveTestState(next); // persist to localStorage (survives refresh)
      return next;
    });
  }, [mode, connected, addTestLog]);

  const handleLogout = () => {
    localStorage.removeItem('auth');
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) return <Login onLogin={() => setIsLoggedIn(true)} />;

  // In live mode offline → controls disabled (pass canControl flag)
  const canControl = mode === 'test' || connected;

  return (
    <Router>
      <Layout state={activeState} mode={mode} connected={connected} onLogout={handleLogout} onSwitchMode={switchMode}>
        <Routes>
          <Route path="/" element={<VaultStatus state={activeState} connected={connected} mode={mode} canControl={canControl} onCommand={sendCommand} />} />
          <Route path="/hardware" element={<HardwareConfig state={activeState} />} />
          <Route path="/logs" element={<EventLog logs={activeState.logs} />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;

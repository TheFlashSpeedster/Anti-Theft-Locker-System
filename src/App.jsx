import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { db } from './firebase';
import { ref, onValue, set } from 'firebase/database';
import Login from './pages/Login';
import VaultStatus from './pages/VaultStatus';
import HardwareConfig from './pages/HardwareConfig';
import EventLog from './pages/EventLog';
import Settings from './pages/Settings';

function Layout({ children, systemState, connected, onLogout }) {
  const location = useLocation();
  const path = location.pathname;
  
  const getPageName = () => {
    if (path === '/') return 'Vault Status';
    if (path === '/hardware') return 'Hardware Configuration';
    if (path === '/logs') return 'Event Log';
    if (path === '/settings') return 'Settings';
    return '';
  };

  return (
    <div className="flex h-screen overflow-hidden bg-bg-base text-text-primary">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-r-primary/20 relative z-10">
        <div className="p-6 border-b border-b-primary/10">
          <h1 className="font-manrope text-2xl font-bold tracking-widest text-primary glow-primary-text uppercase">
            Aether Sentinel
          </h1>
          <p className="text-xs text-text-variant tracking-wider mt-1 font-mono">v3.0.0-PROD</p>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2">
          <NavLink to="/" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 font-manrope tracking-widest uppercase text-sm ${isActive ? 'bg-primary/10 text-primary border-l-2 border-primary' : 'text-text-variant hover:bg-surface-container hover:text-text-primary'}`}>
            <span className="material-symbols-outlined">lock</span>
            Vault Status
          </NavLink>
          <NavLink to="/hardware" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 font-manrope tracking-widest uppercase text-sm ${isActive ? 'bg-primary/10 text-primary border-l-2 border-primary' : 'text-text-variant hover:bg-surface-container hover:text-text-primary'}`}>
            <span className="material-symbols-outlined">developer_board</span>
            Hardware
          </NavLink>
          <NavLink to="/logs" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 font-manrope tracking-widest uppercase text-sm ${isActive ? 'bg-primary/10 text-primary border-l-2 border-primary' : 'text-text-variant hover:bg-surface-container hover:text-text-primary'}`}>
            <span className="material-symbols-outlined">list_alt</span>
            Event Log
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 font-manrope tracking-widest uppercase text-sm ${isActive ? 'bg-primary/10 text-primary border-l-2 border-primary' : 'text-text-variant hover:bg-surface-container hover:text-text-primary'}`}>
            <span className="material-symbols-outlined">settings</span>
            Settings
          </NavLink>
        </nav>
        
        <div className="p-4 border-t border-t-primary/10">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${systemState.isBreached ? 'bg-tertiary glow-tertiary animate-pulse' : connected ? 'bg-secondary glow-secondary' : 'bg-orange-500 animate-pulse'}`}></div>
            <span className="text-xs font-mono uppercase tracking-widest text-text-variant">
              {systemState.isBreached ? 'System Breached' : connected ? 'ESP32 Live' : 'Simulation Mode'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-0 overflow-y-auto">
        {/* Top App Bar */}
        <header className="h-16 glass-panel border-b border-b-primary/10 flex items-center justify-between px-6 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <h2 className="font-manrope font-semibold tracking-widest text-text-primary uppercase md:hidden">
              Aether Sentinel
            </h2>
            <div className="hidden md:flex items-center gap-2 text-text-variant font-mono text-sm uppercase tracking-widest">
              <span className="material-symbols-outlined text-[18px]">terminal</span>
              {getPageName()}
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Connection badge */}
            <div className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-mono uppercase tracking-widest ${connected ? 'border-secondary/40 bg-secondary/10 text-secondary' : 'border-orange-500/40 bg-orange-500/10 text-orange-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-secondary' : 'bg-orange-400 animate-pulse'}`} />
              {connected ? 'Firebase Live' : 'Sim Mode'}
            </div>
            <button
              onClick={onLogout}
              title="Logout"
              className="text-text-variant hover:text-tertiary transition-colors"
            >
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </header>

        <div className="p-4 md:p-8 flex-1 pb-24 md:pb-8">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden glass-panel border-t border-t-primary/20 fixed bottom-0 left-0 right-0 z-20 flex justify-around p-3">
        <NavLink to="/" className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-text-variant'}`}>
          <span className="material-symbols-outlined">lock</span>
        </NavLink>
        <NavLink to="/hardware" className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-text-variant'}`}>
          <span className="material-symbols-outlined">developer_board</span>
        </NavLink>
        <NavLink to="/logs" className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-text-variant'}`}>
          <span className="material-symbols-outlined">list_alt</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `flex flex-col items-center gap-1 ${isActive ? 'text-primary' : 'text-text-variant'}`}>
          <span className="material-symbols-outlined">settings</span>
        </NavLink>
      </nav>

      {/* HUD Overlay */}
      <div className="fixed bottom-20 md:bottom-8 right-8 glass-panel p-4 rounded-xl border border-primary/20 pointer-events-none z-30 hidden md:block">
        <div className="space-y-3 font-mono text-xs uppercase tracking-wider">
          <div className="flex items-center justify-between gap-6">
            <span className="text-text-variant">Firebase</span>
            <span className={connected ? 'text-secondary' : 'text-orange-400'}>{connected ? 'CONNECTED' : 'OFFLINE'}</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-text-variant">ESP32</span>
            <span className={connected ? 'text-secondary' : 'text-orange-400'}>{connected ? 'REPORTING' : 'NO DATA'}</span>
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

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('auth') === 'true');
  const [connected, setConnected] = useState(false);
  const [systemState, setSystemState] = useState({
    isLocked: true,
    isSecretCompartmentOpen: false,
    failedAttempts: 0,
    buzzerOn: false,
    isBreached: false,
    vibrationDetected: false,
    lcdText: [" SYSTEM LOCKED  ", "   ENTER PIN:   "],
    logs: [
      { id: 1, type: 'info', message: 'System Initialized. All sectors secure.', timestamp: new Date(Date.now() - 3600000).toLocaleString() },
    ]
  });

  // ── FIREBASE: listen to ESP32 state ──────────────────────────────────────
  // LIVE DETECTION: ESP32 pushes uptimeMs=millis() every heartbeat.
  // We persist the last seen value in localStorage. On page reload, if Firebase
  // still has the same uptimeMs as localStorage → stale → offline instantly.
  // If uptimeMs is different → ESP32 sent a new heartbeat → live.
  const STALE_MS = 25000; // 3 missed heartbeats (heartbeat = 8s)
  const wallClockRef  = useRef(0); // 0 = stale until first new heartbeat
  const lastUptimeRef = useRef(parseInt(localStorage.getItem('esp32_uptime') || '0'));

  useEffect(() => {
    const statusRef = ref(db, 'locker/status');
    const unsubscribe = onValue(statusRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) { setConnected(false); return; }

      // uptimeMs always increments → if different from last stored → genuine new push
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

      setSystemState(prev => ({
        ...prev,
        isLocked:                data.isLocked               ?? prev.isLocked,
        isSecretCompartmentOpen: data.isSecretCompartmentOpen ?? prev.isSecretCompartmentOpen,
        failedAttempts:          data.failedAttempts          ?? prev.failedAttempts,
        buzzerOn:                data.buzzerOn                ?? prev.buzzerOn,
        isBreached:              data.isBreached              ?? prev.isBreached,
        vibrationDetected:       data.vibrationDetected       ?? prev.vibrationDetected,
        lcdText: newLcdText,
      }));
    }, (error) => {
      console.error('Firebase read error:', error);
      setConnected(false);
    });

    // Watchdog: checks every 5s if the last genuine heartbeat is older than STALE_MS.
    // wallClockRef=0 means no heartbeat received yet → always offline until first one.
    const watchdog = setInterval(() => {
      const wall = wallClockRef.current;
      if (wall === 0 || Date.now() - wall >= STALE_MS) setConnected(false);
    }, 5000);

    return () => { unsubscribe(); clearInterval(watchdog); };
  }, []);


  // ── FIREBASE: listen to logs from ESP32 ──────────────────────
  useEffect(() => {
    const logsRef = ref(db, 'locker/logs');
    const unsubscribe = onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) return;
      // Firebase stores objects; convert to sorted array
      const logsArray = Object.entries(data)
        .map(([id, log]) => ({ id, ...log }))
        .sort((a, b) => b.ts - a.ts)
        .slice(0, 50); // Keep last 50
      setSystemState(prev => ({ ...prev, logs: logsArray }));
    });
    return () => unsubscribe();
  }, []);

  const addLog = (type, message) => {
    setSystemState(prev => ({
      ...prev,
      logs: [{ id: Date.now(), type, message, timestamp: new Date().toLocaleString() }, ...prev.logs]
    }));
  };

  // ── Unified command handler: Live = Firebase, Offline = simulate locally ──
  const sendCommand = async (cmd) => {
    // Always attempt Firebase push
    try {
      await set(ref(db, 'locker/command'), { cmd, ts: Math.floor(Date.now() / 1000) }); // epoch SECONDS — fits in ESP32 32-bit long
    } catch (err) {
      console.error('Firebase command failed:', err);
    }

    // If not connected to ESP32, simulate state locally
    if (!connected) {
      setSystemState(prev => {
        let next = { ...prev };
        switch (cmd) {
          case '/unlock':
            next = { ...next, isLocked: false, lcdText: [' ACCESS GRANTED ', '  DOOR OPENED   '] };
            addLog('success', '[SIM] Door unlocked');
            break;
          case '/lock':
            next = { ...next, isLocked: true, lcdText: [' SYSTEM LOCKED  ', '   ENTER PIN:   '] };
            addLog('info', '[SIM] Door locked');
            break;
          case '/trapdoor_open':
            next = { ...next, isSecretCompartmentOpen: true };
            addLog('info', '[SIM] Trapdoor opened');
            break;
          case '/trapdoor_close':
            next = { ...next, isSecretCompartmentOpen: false };
            addLog('info', '[SIM] Trapdoor closed');
            break;
          case '/trapdoor_flip':
            next = { ...next, isSecretCompartmentOpen: false };
            addLog('info', '[SIM] Trapdoor flip sequence complete');
            break;
          case '/buzzer_on':
            next = { ...next, buzzerOn: true };
            addLog('warning', '[SIM] Buzzer activated');
            break;
          case '/buzzer_off':
            next = { ...next, buzzerOn: false };
            addLog('info', '[SIM] Buzzer deactivated');
            break;
          case '/reset':
            next = { ...next, isLocked: true, failedAttempts: 0, buzzerOn: false, isSecretCompartmentOpen: false, isBreached: false, vibrationDetected: false, lcdText: [' SYSTEM LOCKED  ', '   ENTER PIN:   '] };
            addLog('info', '[SIM] System reset');
            break;
          // Simulation-only physical inputs
          case '__sim_wrong_pin': {
            const attempts = prev.failedAttempts + 1;
            if (attempts >= 3) {
              addLog('critical', '[SIM] 3 failed attempts — alert triggered');
              next = { ...next, failedAttempts: attempts, buzzerOn: true, isSecretCompartmentOpen: true, isBreached: true, lcdText: [' SYSTEM BREACHED', '  ALARM ACTIVE! '] };
            } else {
              addLog('warning', `[SIM] Wrong PIN — attempt ${attempts}/3`);
              next = { ...next, failedAttempts: attempts, lcdText: [' INCORRECT PIN  ', `  ATTEMPTS: ${attempts}/3 `] };
            }
            break;
          }
          case '__sim_vibration':
            if (prev.isLocked) {
              addLog('critical', '[SIM] Vibration detected — tampering alert');
              next = { ...next, vibrationDetected: true, buzzerOn: true, isBreached: true, lcdText: ['TAMPER DETECTED!', '  ALARM ACTIVE! '] };
            }
            break;
          default:
            break;
        }
        return next;
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth');
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) return <Login onLogin={() => setIsLoggedIn(true)} />;

  return (
    <Router>
      <Layout systemState={systemState} connected={connected} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<VaultStatus state={systemState} connected={connected} onCommand={sendCommand} />} />
          <Route path="/hardware" element={<HardwareConfig state={systemState} />} />
          <Route path="/logs" element={<EventLog logs={systemState.logs} />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;

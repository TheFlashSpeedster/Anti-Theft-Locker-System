import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import VaultStatus from './pages/VaultStatus';
import HardwareConfig from './pages/HardwareConfig';
import EventLog from './pages/EventLog';
import Settings from './pages/Settings';

function Layout({ children, systemState }) {
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
          <p className="text-xs text-text-variant tracking-wider mt-1 font-mono">v2.4.0-STABLE</p>
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
            <div className={`w-3 h-3 rounded-full ${systemState.isBreached ? 'bg-tertiary glow-tertiary animate-pulse' : 'bg-secondary glow-secondary'}`}></div>
            <span className="text-xs font-mono uppercase tracking-widest text-text-variant">
              {systemState.isBreached ? 'System Breached' : 'System Online'}
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
            <button className="text-text-variant hover:text-primary transition-colors">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-surface-high border border-primary/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-sm">person</span>
            </div>
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
            <span className="text-text-variant">GPS LOC</span>
            <span className="text-primary">34.0522°N 118.2437°W</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-text-variant">UPLINK</span>
            <span className="text-secondary">14ms [STABLE]</span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-text-variant">BATT_LVL</span>
            <span className="text-secondary">98.4% [AC_PWR]</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [systemState, setSystemState] = useState({
    isLocked: true,
    isSecretCompartmentOpen: false,
    failedAttempts: 0,
    buzzerOn: false,
    ledOn: false,
    isBreached: false,
    logs: [
      { id: 1, type: 'info', message: 'System Initialized. All sectors secure.', timestamp: new Date(Date.now() - 3600000).toLocaleString() },
    ]
  });

  const addLog = (type, message) => {
    setSystemState(prev => ({
      ...prev,
      logs: [{ id: Date.now(), type, message, timestamp: new Date().toLocaleString() }, ...prev.logs]
    }));
  };

  const simulateCorrectPin = () => {
    setSystemState(prev => ({
      ...prev,
      isLocked: false,
      failedAttempts: 0,
      buzzerOn: false,
      ledOn: false,
      isBreached: false,
      isSecretCompartmentOpen: false,
    }));
    addLog('success', 'Auth Success - Locker Opened');
  };

  const simulateWrongPin = () => {
    setSystemState(prev => {
      const newAttempts = prev.failedAttempts + 1;
      if (newAttempts >= 3) {
        addLog('critical', 'CRITICAL: 3 Failed Attempts - Secret Compartment Deployed');
        addLog('warning', 'Alert Dispatched via Telegram');
        return {
          ...prev,
          failedAttempts: newAttempts,
          buzzerOn: true,
          ledOn: true,
          isSecretCompartmentOpen: true,
          isBreached: true,
        };
      }
      addLog('warning', `Auth Failed - Attempt ${newAttempts}/3`);
      return {
        ...prev,
        failedAttempts: newAttempts
      };
    });
  };

  const resetSystem = () => {
    setSystemState(prev => ({
      ...prev,
      isLocked: true,
      failedAttempts: 0,
      buzzerOn: false,
      ledOn: false,
      isSecretCompartmentOpen: false,
      isBreached: false,
    }));
    addLog('info', 'System Reset by Administrator');
  };

  return (
    <Router>
      <Layout systemState={systemState}>
        <Routes>
          <Route path="/" element={<VaultStatus state={systemState} onCorrectPin={simulateCorrectPin} onWrongPin={simulateWrongPin} onReset={resetSystem} />} />
          <Route path="/hardware" element={<HardwareConfig state={systemState} />} />
          <Route path="/logs" element={<EventLog logs={systemState.logs} />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;

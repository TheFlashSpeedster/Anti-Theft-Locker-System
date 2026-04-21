import React from 'react';

export default function VaultStatus({ state, onCorrectPin, onWrongPin, onReset }) {
  const { isLocked, isSecretCompartmentOpen, failedAttempts, buzzerOn, ledOn, isBreached } = state;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className={`p-8 md:p-12 rounded-3xl border ${isBreached ? 'bg-tertiary/10 border-tertiary glow-tertiary' : isLocked ? 'bg-secondary/10 border-secondary glow-secondary' : 'bg-primary/10 border-primary glow-primary'} transition-all duration-500 relative overflow-hidden`}>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-3 h-3 rounded-full ${isBreached ? 'bg-tertiary glow-tertiary animate-ping' : isLocked ? 'bg-secondary glow-secondary' : 'bg-primary glow-primary'}`}></div>
              <span className="font-mono text-sm tracking-widest uppercase text-text-variant">Live Monitoring</span>
            </div>
            <h1 className={`font-manrope text-5xl md:text-7xl font-bold tracking-tight uppercase ${isBreached ? 'text-tertiary glow-tertiary-text' : isLocked ? 'text-secondary glow-secondary-text' : 'text-primary glow-primary-text'}`}>
              {isBreached ? 'Breach Detected' : isLocked ? 'System Secured' : 'System Unlocked'}
            </h1>
            <p className="mt-6 text-text-variant text-lg max-w-xl font-light">
              {isBreached ? 'Unauthorized access threshold exceeded. Defensive countermeasures deployed.' : isLocked ? 'All kinetic and digital entry points are currently deadbolted. Biometric validation active.' : 'Locker access granted. Security protocols temporarily suspended for authorized user.'}
            </p>
          </div>
          
          <div className="hidden md:flex items-center justify-center">
            <div className={`w-48 h-48 rounded-full border-4 border-dashed flex items-center justify-center ${isBreached ? 'border-tertiary animate-spin-slow' : isLocked ? 'border-secondary/30' : 'border-primary/30'}`}>
              <div className={`w-36 h-36 rounded-full flex items-center justify-center ${isBreached ? 'bg-tertiary/20' : isLocked ? 'bg-secondary/20' : 'bg-primary/20'}`}>
                <span className={`material-symbols-outlined text-[80px] ${isBreached ? 'text-tertiary' : isLocked ? 'text-secondary' : 'text-primary'}`}>
                  {isBreached ? 'warning' : isLocked ? 'shield' : 'lock_open'}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-white/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
      </div>

      {/* Active States */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Locker Door */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <span className={`material-symbols-outlined ${isLocked ? 'text-secondary' : 'text-primary'}`}>{isLocked ? 'lock' : 'lock_open'}</span>
            <span className={`text-[10px] px-2 py-1 rounded font-mono uppercase tracking-wider ${isLocked ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'}`}>
              {isLocked ? 'Locked' : 'Unlocked'}
            </span>
          </div>
          <p className="text-xs text-text-variant font-mono uppercase tracking-widest mb-1">Vault A-1</p>
          <h3 className="font-manrope text-xl font-bold tracking-wider">Physical State</h3>
          <div className="mt-4 h-1 w-full bg-surface-high rounded overflow-hidden">
            <div className={`h-full ${isLocked ? 'bg-secondary w-full' : 'bg-primary w-full'}`}></div>
          </div>
        </div>

        {/* Secret Compartment */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <span className={`material-symbols-outlined ${isSecretCompartmentOpen ? 'text-tertiary' : 'text-secondary'}`}>{isSecretCompartmentOpen ? 'inventory_2' : 'inventory'}</span>
            <span className={`text-[10px] px-2 py-1 rounded font-mono uppercase tracking-wider ${isSecretCompartmentOpen ? 'bg-tertiary/20 text-tertiary' : 'bg-secondary/20 text-secondary'}`}>
              {isSecretCompartmentOpen ? 'Deployed' : 'Secured'}
            </span>
          </div>
          <p className="text-xs text-text-variant font-mono uppercase tracking-widest mb-1">Defense Array</p>
          <h3 className="font-manrope text-xl font-bold tracking-wider">Compartment</h3>
          <div className="mt-4 h-1 w-full bg-surface-high rounded overflow-hidden">
             <div className={`h-full ${isSecretCompartmentOpen ? 'bg-tertiary w-full' : 'bg-secondary w-full'}`}></div>
          </div>
        </div>

        {/* Failed Attempts */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <span className="material-symbols-outlined text-text-variant">fingerprint</span>
            <span className={`text-[10px] px-2 py-1 rounded font-mono uppercase tracking-wider ${failedAttempts === 0 ? 'bg-secondary/20 text-secondary' : failedAttempts >= 3 ? 'bg-tertiary/20 text-tertiary' : 'bg-primary/20 text-primary'}`}>
              {failedAttempts}/3
            </span>
          </div>
          <p className="text-xs text-text-variant font-mono uppercase tracking-widest mb-1">Auth Integrity</p>
          <h3 className="font-manrope text-xl font-bold tracking-wider">Failed Attempts</h3>
          <div className="mt-4 h-1 w-full bg-surface-high rounded flex gap-1">
            <div className={`h-full flex-1 rounded ${failedAttempts >= 1 ? 'bg-tertiary' : 'bg-surface-high'}`}></div>
            <div className={`h-full flex-1 rounded ${failedAttempts >= 2 ? 'bg-tertiary' : 'bg-surface-high'}`}></div>
            <div className={`h-full flex-1 rounded ${failedAttempts >= 3 ? 'bg-tertiary' : 'bg-surface-high'}`}></div>
          </div>
        </div>

        {/* Buzzer/LED */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <span className={`material-symbols-outlined ${buzzerOn ? 'text-tertiary animate-pulse' : 'text-text-variant'}`}>campaign</span>
            <span className={`text-[10px] px-2 py-1 rounded font-mono uppercase tracking-wider ${buzzerOn ? 'bg-tertiary/20 text-tertiary' : 'bg-surface-high text-text-variant'}`}>
              {buzzerOn ? 'Active' : 'Standby'}
            </span>
          </div>
          <p className="text-xs text-text-variant font-mono uppercase tracking-widest mb-1">Acoustic/Visual</p>
          <h3 className="font-manrope text-xl font-bold tracking-wider">Alarm State</h3>
          <div className="mt-4 flex gap-2">
            <div className={`h-2 flex-1 rounded ${buzzerOn ? 'bg-tertiary glow-tertiary' : 'bg-surface-high'}`}></div>
            <div className={`h-2 flex-1 rounded ${ledOn ? 'bg-tertiary glow-tertiary' : 'bg-surface-high'}`}></div>
          </div>
        </div>
      </div>

      {/* Simulation Center */}
      <div className="glass-panel rounded-3xl p-8 border-t border-t-primary/20 mt-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-surface-high">
          <div>
            <h2 className="font-manrope text-2xl font-bold tracking-widest uppercase text-text-primary">Simulation Center</h2>
            <p className="text-sm text-text-variant font-mono mt-1">Mock ESP32 Hardware Inputs</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button 
            onClick={onCorrectPin}
            className="group relative px-6 py-8 rounded-2xl bg-surface-container border border-primary/20 hover:bg-primary/10 hover:border-primary hover:glow-primary transition-all duration-300 flex flex-col items-center justify-center text-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="material-symbols-outlined text-4xl text-primary mb-4 group-hover:scale-110 transition-transform">password</span>
            <h4 className="font-manrope font-bold tracking-wider uppercase mb-2">Simulate Correct PIN</h4>
            <p className="text-xs text-text-variant">Authenticates user, unlocks main door, resets counters.</p>
          </button>

          <button 
            onClick={onWrongPin}
            className="group relative px-6 py-8 rounded-2xl bg-surface-container border border-tertiary/20 hover:bg-tertiary/10 hover:border-tertiary hover:glow-tertiary transition-all duration-300 flex flex-col items-center justify-center text-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-tertiary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="material-symbols-outlined text-4xl text-tertiary mb-4 group-hover:scale-110 transition-transform">gpp_bad</span>
            <h4 className="font-manrope font-bold tracking-wider uppercase mb-2">Simulate Wrong PIN</h4>
            <p className="text-xs text-text-variant">Increments fail counter. Triggers defense at 3 attempts.</p>
          </button>

          <button 
            onClick={onReset}
            className="group relative px-6 py-8 rounded-2xl bg-surface-container border border-secondary/20 hover:bg-secondary/10 hover:border-secondary hover:glow-secondary transition-all duration-300 flex flex-col items-center justify-center text-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="material-symbols-outlined text-4xl text-secondary mb-4 group-hover:scale-110 transition-transform">restart_alt</span>
            <h4 className="font-manrope font-bold tracking-wider uppercase mb-2">Reset System</h4>
            <p className="text-xs text-text-variant">Restores all defaults. Locks doors and clears alarms.</p>
          </button>
        </div>
      </div>
    </div>
  );
}

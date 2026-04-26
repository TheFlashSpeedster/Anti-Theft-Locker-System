import React from 'react';

export default function VaultStatus({ state, onCorrectPin, onWrongPin, onVibration, onReset }) {
  const { isLocked, isSecretCompartmentOpen, failedAttempts, buzzerOn, isBreached, vibrationDetected, lcdText } = state;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Hero Section */}
      <div className={`p-8 md:p-12 rounded-3xl border ${isBreached ? 'bg-tertiary/10 border-tertiary glow-tertiary' : isLocked ? 'bg-secondary/10 border-secondary glow-secondary' : 'bg-primary/10 border-primary glow-primary'} transition-all duration-500 relative overflow-hidden`}>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-3 h-3 rounded-full ${isBreached ? 'bg-tertiary glow-tertiary animate-ping' : isLocked ? 'bg-secondary glow-secondary' : 'bg-primary glow-primary'}`}></div>
              <span className="font-mono text-sm tracking-widest uppercase text-text-variant">System Overview</span>
            </div>
            <h1 className={`font-manrope text-5xl md:text-7xl font-bold tracking-tight uppercase ${isBreached ? 'text-tertiary glow-tertiary-text' : isLocked ? 'text-secondary glow-secondary-text' : 'text-primary glow-primary-text'}`}>
              {isBreached ? 'Breach Detected' : isLocked ? 'System Secured' : 'System Unlocked'}
            </h1>
            <p className="mt-6 text-text-variant text-lg max-w-xl font-light">
              {isBreached ? 'Unauthorized access or physical tampering detected. Alarm active.' : isLocked ? 'Main servo locked. Vibration sensors and keypad active.' : 'Main door open. Awaiting user interaction or timeout.'}
            </p>
          </div>
          
          <div className="hidden md:flex flex-col items-center justify-center space-y-4">
            {/* Virtual LCD Display */}
            <div className="p-2 bg-[#2d3024] border-4 border-[#1a1b15] rounded-lg shadow-inner w-64">
              <div className="bg-[#87ad34] p-3 rounded shadow-inner flex flex-col items-center justify-center font-mono text-[#1a1b15] tracking-widest relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10 pointer-events-none"></div>
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:2px_2px]"></div>
                <div className="relative z-10 w-full text-center">
                  <div className="font-bold text-lg leading-tight whitespace-pre">{lcdText[0] || '                '}</div>
                  <div className="font-bold text-lg leading-tight whitespace-pre">{lcdText[1] || '                '}</div>
                </div>
              </div>
              <div className="mt-1 text-center text-[10px] text-text-variant font-mono">16x2 I2C Display</div>
            </div>
          </div>
        </div>
        
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-white/5 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
      </div>

      {/* Active States */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Main Servo */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <span className={`material-symbols-outlined ${isLocked ? 'text-secondary' : 'text-primary'}`}>{isLocked ? 'lock' : 'lock_open'}</span>
            <span className={`text-[10px] px-2 py-1 rounded font-mono uppercase tracking-wider ${isLocked ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'}`}>
              {isLocked ? 'Locked' : 'Unlocked'}
            </span>
          </div>
          <p className="text-xs text-text-variant font-mono uppercase tracking-widest mb-1">Main Servo</p>
          <h3 className="font-manrope text-xl font-bold tracking-wider">Locker Door</h3>
          <div className="mt-4 h-1 w-full bg-surface-high rounded overflow-hidden">
            <div className={`h-full transition-all duration-500 ${isLocked ? 'bg-secondary w-full' : 'bg-primary w-full'}`}></div>
          </div>
        </div>

        {/* Trapdoor Servo */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <span className={`material-symbols-outlined ${isSecretCompartmentOpen ? 'text-tertiary' : 'text-secondary'}`}>{isSecretCompartmentOpen ? 'inventory_2' : 'inventory'}</span>
            <span className={`text-[10px] px-2 py-1 rounded font-mono uppercase tracking-wider ${isSecretCompartmentOpen ? 'bg-tertiary/20 text-tertiary' : 'bg-secondary/20 text-secondary'}`}>
              {isSecretCompartmentOpen ? 'Deployed' : 'Secured'}
            </span>
          </div>
          <p className="text-xs text-text-variant font-mono uppercase tracking-widest mb-1">Trapdoor Servo</p>
          <h3 className="font-manrope text-xl font-bold tracking-wider">Compartment</h3>
          <div className="mt-4 h-1 w-full bg-surface-high rounded overflow-hidden">
             <div className={`h-full transition-all duration-500 ${isSecretCompartmentOpen ? 'bg-tertiary w-full' : 'bg-secondary w-full'}`}></div>
          </div>
        </div>

        {/* Matrix Keypad State */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <span className="material-symbols-outlined text-text-variant">dialpad</span>
            <span className={`text-[10px] px-2 py-1 rounded font-mono uppercase tracking-wider ${failedAttempts === 0 ? 'bg-secondary/20 text-secondary' : failedAttempts >= 3 ? 'bg-tertiary/20 text-tertiary' : 'bg-primary/20 text-primary'}`}>
              {failedAttempts}/3 Fails
            </span>
          </div>
          <p className="text-xs text-text-variant font-mono uppercase tracking-widest mb-1">4x4 Matrix Keypad</p>
          <h3 className="font-manrope text-xl font-bold tracking-wider">Input Status</h3>
          <div className="mt-4 h-1 w-full bg-surface-high rounded flex gap-1">
            <div className={`h-full flex-1 rounded transition-colors ${failedAttempts >= 1 ? 'bg-tertiary glow-tertiary' : 'bg-surface-high'}`}></div>
            <div className={`h-full flex-1 rounded transition-colors ${failedAttempts >= 2 ? 'bg-tertiary glow-tertiary' : 'bg-surface-high'}`}></div>
            <div className={`h-full flex-1 rounded transition-colors ${failedAttempts >= 3 ? 'bg-tertiary glow-tertiary' : 'bg-surface-high'}`}></div>
          </div>
        </div>

        {/* SW-420 & Buzzer */}
        <div className="glass-panel p-6 rounded-2xl">
          <div className="flex justify-between items-start mb-4">
            <span className={`material-symbols-outlined ${buzzerOn ? 'text-tertiary animate-pulse' : 'text-text-variant'}`}>campaign</span>
            <span className={`text-[10px] px-2 py-1 rounded font-mono uppercase tracking-wider ${vibrationDetected ? 'bg-tertiary/20 text-tertiary' : 'bg-secondary/20 text-secondary'}`}>
              {vibrationDetected ? 'Vibration!' : 'Stable'}
            </span>
          </div>
          <p className="text-xs text-text-variant font-mono uppercase tracking-widest mb-1">SW-420 & Buzzer</p>
          <h3 className="font-manrope text-xl font-bold tracking-wider">Sensor/Alarm</h3>
          <div className="mt-4 flex gap-2">
            <div className={`h-2 flex-1 rounded transition-all ${vibrationDetected ? 'bg-tertiary glow-tertiary' : 'bg-secondary'}`} title="Vibration Sensor"></div>
            <div className={`h-2 flex-1 rounded transition-all ${buzzerOn ? 'bg-tertiary glow-tertiary' : 'bg-surface-high'}`} title="Buzzer"></div>
          </div>
        </div>
      </div>

      {/* Simulation Center */}
      <div className="glass-panel rounded-3xl p-8 border-t border-t-primary/20 mt-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 pb-6 border-b border-surface-high">
          <div>
            <h2 className="font-manrope text-2xl font-bold tracking-widest uppercase text-text-primary">Hardware Simulation</h2>
            <p className="text-sm text-text-variant font-mono mt-1">Mock ESP32 Physical Inputs</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            onClick={onCorrectPin}
            className="group relative px-4 py-6 rounded-2xl bg-surface-container border border-primary/20 hover:bg-primary/10 hover:border-primary hover:glow-primary transition-all duration-300 flex flex-col items-center justify-center text-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="material-symbols-outlined text-3xl text-primary mb-3 group-hover:scale-110 transition-transform">password</span>
            <h4 className="font-manrope font-bold text-sm tracking-wider uppercase mb-1">Keypad: Correct</h4>
            <p className="text-[10px] text-text-variant">Simulates valid 4-digit entry</p>
          </button>

          <button 
            onClick={onWrongPin}
            className="group relative px-4 py-6 rounded-2xl bg-surface-container border border-tertiary/20 hover:bg-tertiary/10 hover:border-tertiary hover:glow-tertiary transition-all duration-300 flex flex-col items-center justify-center text-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-tertiary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="material-symbols-outlined text-3xl text-tertiary mb-3 group-hover:scale-110 transition-transform">gpp_bad</span>
            <h4 className="font-manrope font-bold text-sm tracking-wider uppercase mb-1">Keypad: Wrong</h4>
            <p className="text-[10px] text-text-variant">Simulates invalid PIN entry</p>
          </button>

          <button 
            onClick={onVibration}
            className="group relative px-4 py-6 rounded-2xl bg-surface-container border border-tertiary/20 hover:bg-tertiary/10 hover:border-tertiary hover:glow-tertiary transition-all duration-300 flex flex-col items-center justify-center text-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-tertiary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="material-symbols-outlined text-3xl text-tertiary mb-3 group-hover:scale-110 transition-transform">vibration</span>
            <h4 className="font-manrope font-bold text-sm tracking-wider uppercase mb-1">SW-420 Trigger</h4>
            <p className="text-[10px] text-text-variant">Simulates physical tampering</p>
          </button>

          <button 
            onClick={onReset}
            className="group relative px-4 py-6 rounded-2xl bg-surface-container border border-secondary/20 hover:bg-secondary/10 hover:border-secondary hover:glow-secondary transition-all duration-300 flex flex-col items-center justify-center text-center overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="material-symbols-outlined text-3xl text-secondary mb-3 group-hover:scale-110 transition-transform">restart_alt</span>
            <h4 className="font-manrope font-bold text-sm tracking-wider uppercase mb-1">Hardware Reset</h4>
            <p className="text-[10px] text-text-variant">Re-initializes all components</p>
          </button>
        </div>
      </div>
    </div>
  );
}

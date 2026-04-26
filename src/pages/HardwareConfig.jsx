import React from 'react';

export default function HardwareConfig({ state }) {
  const { isLocked, isSecretCompartmentOpen, buzzerOn, failedAttempts, isBreached, vibrationDetected, lcdText } = state;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-manrope text-3xl font-bold tracking-widest uppercase glow-primary-text text-text-primary">Hardware Interfaces</h1>
          <p className="text-text-variant font-mono mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-secondary glow-secondary"></span>
            7 Physical Components Online
          </p>
        </div>
        <div className="flex gap-4">
          <button className="px-6 py-2 rounded-lg bg-surface-container border border-primary/20 text-primary font-mono text-sm uppercase tracking-wider hover:bg-primary/10 transition-colors">
            Ping Devices
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Core Logic & Sensors */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Core Microcontroller */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-[100px]">developer_board</span>
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <span className="text-xs text-text-variant font-mono uppercase tracking-widest">Main MCU</span>
                  <span className="text-[10px] px-2 py-1 rounded bg-secondary/20 text-secondary font-mono uppercase tracking-wider">Active</span>
                </div>
                <h3 className="font-manrope text-2xl font-bold tracking-wider mb-2">ESP32-WROOM</h3>
                <p className="text-xs text-text-variant font-mono mb-6">Dual-core Xtensa 32-bit LX6</p>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-high/50 p-3 rounded-lg border border-white/5 flex items-center gap-3">
                      <span className="material-symbols-outlined text-secondary text-sm">wifi</span>
                      <div>
                        <span className="block text-[10px] text-text-variant uppercase tracking-widest">WiFi</span>
                        <span className="font-mono text-xs">Connected</span>
                      </div>
                    </div>
                    <div className="bg-surface-high/50 p-3 rounded-lg border border-white/5 flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary text-sm">bluetooth</span>
                      <div>
                        <span className="block text-[10px] text-text-variant uppercase tracking-widest">BLE</span>
                        <span className="font-mono text-xs">Standby</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Input Peripherals */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-[100px]">dialpad</span>
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <span className="text-xs text-text-variant font-mono uppercase tracking-widest">Input Array</span>
                  <span className="text-[10px] px-2 py-1 rounded bg-primary/20 text-primary font-mono uppercase tracking-wider">Ready</span>
                </div>
                <h3 className="font-manrope text-2xl font-bold tracking-wider mb-2">4x4 Matrix Keypad</h3>
                <p className="text-xs text-text-variant font-mono mb-6">16-Button Membrane</p>
                
                <div className="space-y-4">
                  <div className="bg-surface-high/50 p-3 rounded-lg border border-white/5 flex flex-col justify-center items-center py-4">
                    <span className="block text-[10px] text-text-variant uppercase tracking-widest mb-2">Last Input Status</span>
                    <span className={`font-mono text-sm px-3 py-1 rounded ${failedAttempts > 0 ? 'bg-tertiary/20 text-tertiary' : 'bg-surface-high text-text-variant'}`}>
                      {failedAttempts > 0 ? `Failed Attempts: ${failedAttempts}` : 'Awaiting PIN...'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Visualization / Display */}
          <div className="glass-panel p-6 rounded-2xl h-full">
             <div className="flex justify-between items-end mb-6 border-b border-surface-high pb-4">
              <div>
                <h3 className="font-manrope text-xl font-bold tracking-wider">LCD 16x2 & I2C Module</h3>
                <p className="text-xs text-text-variant font-mono uppercase tracking-widest mt-1">Liquid Crystal Output via I2C</p>
              </div>
              <div className="text-right">
                <span className="block text-[10px] text-text-variant uppercase tracking-widest">SDA/SCL Pins</span>
                <span className="font-mono text-sm text-secondary">0x27 / 0x3F</span>
              </div>
            </div>
            
            <div className="w-full flex items-center justify-center p-8 bg-surface-container rounded-xl border border-white/5 shadow-inner">
              <div className="bg-[#87ad34] p-4 rounded-md shadow-[inset_0_0_20px_rgba(0,0,0,0.5)] border-4 border-[#2d3024] relative">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:2px_2px]"></div>
                <div className="font-mono text-[#1a1b15] text-2xl md:text-3xl font-bold tracking-[0.2em] relative z-10 leading-tight">
                  <div>{lcdText[0] || '                '}</div>
                  <div>{lcdText[1] || '                '}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Actuators & Sensors */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl h-full flex flex-col">
            <h3 className="font-manrope text-lg font-bold tracking-widest uppercase mb-6">Actuators & Alarms</h3>
            
            <div className="space-y-4 flex-1">
              {/* Main Door Motor */}
              <div className={`p-4 rounded-xl border transition-all duration-300 flex items-center gap-4 ${isLocked ? 'bg-surface-high/50 border-white/5' : 'bg-primary/10 border-primary glow-primary'}`}>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isLocked ? 'bg-surface-high' : 'bg-primary/20 text-primary'}`}>
                  <span className="material-symbols-outlined">{isLocked ? 'door_front' : 'door_open'}</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <span className="font-bold tracking-wider text-sm">Main Door</span>
                    <span className={`text-[10px] font-mono uppercase tracking-widest ${isLocked ? 'text-text-variant' : 'text-primary'}`}>{isLocked ? 'Locked' : 'Open'}</span>
                  </div>
                  <span className="text-xs text-text-variant font-mono">Servo Motor 1</span>
                </div>
              </div>

              {/* Compartment Motor */}
              <div className={`p-4 rounded-xl border transition-all duration-300 flex items-center gap-4 ${isSecretCompartmentOpen ? 'bg-tertiary/10 border-tertiary glow-tertiary' : 'bg-surface-high/50 border-white/5'}`}>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isSecretCompartmentOpen ? 'bg-tertiary/20 text-tertiary' : 'bg-surface-high'}`}>
                  <span className="material-symbols-outlined">move_down</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <span className="font-bold tracking-wider text-sm">Trapdoor</span>
                    <span className={`text-[10px] font-mono uppercase tracking-widest ${isSecretCompartmentOpen ? 'text-tertiary' : 'text-text-variant'}`}>{isSecretCompartmentOpen ? 'Deployed' : 'Secured'}</span>
                  </div>
                  <span className="text-xs text-text-variant font-mono">Servo Motor 2</span>
                </div>
              </div>

              {/* Vibration Sensor */}
              <div className={`p-4 rounded-xl border transition-all duration-300 flex items-center gap-4 ${vibrationDetected ? 'bg-tertiary/10 border-tertiary glow-tertiary' : 'bg-surface-high/50 border-white/5'}`}>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${vibrationDetected ? 'bg-tertiary/20 text-tertiary animate-pulse' : 'bg-surface-high'}`}>
                  <span className="material-symbols-outlined">vibration</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <span className="font-bold tracking-wider text-sm">Vibration Sensor</span>
                    <span className={`text-[10px] font-mono uppercase tracking-widest ${vibrationDetected ? 'text-tertiary' : 'text-text-variant'}`}>{vibrationDetected ? 'Triggered' : 'Stable'}</span>
                  </div>
                  <span className="text-xs text-text-variant font-mono">SW-420 Module</span>
                </div>
              </div>

              {/* System Buzzer */}
              <div className={`p-4 rounded-xl border transition-all duration-300 flex items-center gap-4 ${buzzerOn ? 'bg-tertiary/10 border-tertiary glow-tertiary' : 'bg-surface-high/50 border-white/5'}`}>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${buzzerOn ? 'bg-tertiary/20 text-tertiary animate-bounce' : 'bg-surface-high'}`}>
                  <span className="material-symbols-outlined">volume_up</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <span className="font-bold tracking-wider text-sm">Active Alarm</span>
                    <span className={`text-[10px] font-mono uppercase tracking-widest ${buzzerOn ? 'text-tertiary' : 'text-text-variant'}`}>{buzzerOn ? 'Sounding' : 'Silent'}</span>
                  </div>
                  <span className="text-xs text-text-variant font-mono">5V Piezo Buzzer</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

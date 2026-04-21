import React, { useState, useEffect } from 'react';

export default function HardwareConfig({ state }) {
  const { isLocked, isSecretCompartmentOpen, buzzerOn, ledOn } = state;
  const [sensorData, setSensorData] = useState(Array.from({ length: 20 }, () => Math.random() * 40));

  useEffect(() => {
    const interval = setInterval(() => {
      setSensorData(prev => {
        const newData = [...prev.slice(1)];
        // Add random noise, spike if buzzer/led is on
        const baseNoise = Math.random() * 30;
        const spike = (buzzerOn || ledOn) ? 60 + Math.random() * 40 : baseNoise;
        newData.push(spike);
        return newData;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [buzzerOn, ledOn]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="font-manrope text-3xl font-bold tracking-widest uppercase glow-primary-text text-text-primary">Hardware Configuration</h1>
          <p className="text-text-variant font-mono mt-2 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-secondary glow-secondary"></span>
            7 Components Active & Synchronized
          </p>
        </div>
        <div className="flex gap-4">
          <button className="px-6 py-2 rounded-lg bg-surface-container border border-primary/20 text-primary font-mono text-sm uppercase tracking-wider hover:bg-primary/10 transition-colors">
            Refresh Diagnostics
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Controllers & Sensors */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Master Controller */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-[100px]">memory</span>
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <span className="text-xs text-text-variant font-mono uppercase tracking-widest">Master Controller</span>
                  <span className="text-[10px] px-2 py-1 rounded bg-secondary/20 text-secondary font-mono uppercase tracking-wider">Active</span>
                </div>
                <h3 className="font-manrope text-2xl font-bold tracking-wider mb-8">ESP32-WROOM-32</h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-text-variant">CPU Load</span>
                      <span className="text-text-primary">{Math.round(sensorData[sensorData.length - 1])}%</span>
                    </div>
                    <div className="h-1 w-full bg-surface-high rounded overflow-hidden">
                      <div className="h-full bg-secondary transition-all duration-300" style={{ width: `${sensorData[sensorData.length - 1]}%` }}></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-high/50 p-3 rounded-lg border border-white/5">
                      <span className="block text-[10px] text-text-variant uppercase tracking-widest mb-1">Voltage</span>
                      <span className="font-mono text-sm">3.28 V</span>
                    </div>
                    <div className="bg-surface-high/50 p-3 rounded-lg border border-white/5">
                      <span className="block text-[10px] text-text-variant uppercase tracking-widest mb-1">Uptime</span>
                      <span className="font-mono text-sm">14d 2h</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Comm Link */}
            <div className="glass-panel p-6 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined text-[100px]">wifi</span>
              </div>
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <span className="text-xs text-text-variant font-mono uppercase tracking-widest">Comm Link</span>
                  <span className="text-[10px] px-2 py-1 rounded bg-secondary/20 text-secondary font-mono uppercase tracking-wider">Connected</span>
                </div>
                <h3 className="font-manrope text-2xl font-bold tracking-wider mb-8">WiFi 802.11 b/g/n</h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-text-variant">Signal Strength (RSSI)</span>
                      <span className="text-secondary">-42 dBm</span>
                    </div>
                    <div className="flex gap-1 h-2">
                      <div className="flex-1 bg-secondary rounded"></div>
                      <div className="flex-1 bg-secondary rounded"></div>
                      <div className="flex-1 bg-secondary rounded"></div>
                      <div className="flex-1 bg-secondary rounded"></div>
                      <div className="flex-1 bg-surface-high rounded"></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface-high/50 p-3 rounded-lg border border-white/5">
                      <span className="block text-[10px] text-text-variant uppercase tracking-widest mb-1">IP Address</span>
                      <span className="font-mono text-sm">192.168.1.104</span>
                    </div>
                    <div className="bg-surface-high/50 p-3 rounded-lg border border-white/5">
                      <span className="block text-[10px] text-text-variant uppercase tracking-widest mb-1">Latency</span>
                      <span className="font-mono text-sm">12ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sensor Telemetry Graph */}
          <div className="glass-panel p-6 rounded-2xl">
            <div className="flex justify-between items-end mb-8 border-b border-surface-high pb-4">
              <div>
                <h3 className="font-manrope text-xl font-bold tracking-wider">Vibration Sensor Telemetry</h3>
                <p className="text-xs text-text-variant font-mono uppercase tracking-widest mt-1">Real-Time SW-420 Data Feed</p>
              </div>
              <div className="flex gap-6 text-right">
                <div>
                  <span className="block text-[10px] text-text-variant uppercase tracking-widest">Current Magnitude</span>
                  <span className="font-mono text-lg text-secondary">0.{Math.round(sensorData[sensorData.length - 1]).toString().padStart(2, '0')} <span className="text-xs text-text-variant">G</span></span>
                </div>
                <div>
                  <span className="block text-[10px] text-text-variant uppercase tracking-widest">Threshold</span>
                  <span className="font-mono text-lg text-tertiary">0.85 <span className="text-xs text-text-variant">G</span></span>
                </div>
              </div>
            </div>

            <div className="h-48 flex items-end gap-1 sm:gap-2">
              {sensorData.map((value, index) => {
                const isHigh = value > 70;
                const height = `${Math.max(5, value)}%`;
                return (
                  <div key={index} className="flex-1 flex flex-col justify-end h-full group">
                    <div 
                      className={`w-full rounded-t-sm transition-all duration-300 ${isHigh ? 'bg-tertiary glow-tertiary' : 'bg-primary/40 group-hover:bg-primary/80'}`}
                      style={{ height }}
                    ></div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-4 text-[10px] font-mono text-text-variant uppercase tracking-widest">
              <span>10s Ago</span>
              <span>Real-Time Buffer</span>
              <span>Live</span>
            </div>
          </div>
        </div>

        {/* Right Column - Actuators */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl h-full flex flex-col">
            <h3 className="font-manrope text-lg font-bold tracking-widest uppercase mb-6">Drive Systems & Alerts</h3>
            
            <div className="space-y-4 flex-1">
              {/* Main Door Motor */}
              <div className={`p-4 rounded-xl border transition-all duration-300 flex items-center gap-4 ${isLocked ? 'bg-surface-high/50 border-white/5' : 'bg-primary/10 border-primary glow-primary'}`}>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isLocked ? 'bg-surface-high' : 'bg-primary/20 text-primary'}`}>
                  <span className="material-symbols-outlined">{isLocked ? 'door_front' : 'door_open'}</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <span className="font-bold tracking-wider text-sm">Main Door Motor</span>
                    <span className={`text-[10px] font-mono uppercase tracking-widest ${isLocked ? 'text-text-variant' : 'text-primary'}`}>{isLocked ? 'Idle' : 'Active'}</span>
                  </div>
                  <span className="text-xs text-text-variant font-mono">Servo SG90 - ID: MT-01</span>
                </div>
              </div>

              {/* Compartment Motor */}
              <div className={`p-4 rounded-xl border transition-all duration-300 flex items-center gap-4 ${isSecretCompartmentOpen ? 'bg-tertiary/10 border-tertiary glow-tertiary' : 'bg-surface-high/50 border-white/5'}`}>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isSecretCompartmentOpen ? 'bg-tertiary/20 text-tertiary' : 'bg-surface-high'}`}>
                  <span className="material-symbols-outlined">settings_motion_mode</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <span className="font-bold tracking-wider text-sm">Compartment Motor</span>
                    <span className={`text-[10px] font-mono uppercase tracking-widest ${isSecretCompartmentOpen ? 'text-tertiary' : 'text-text-variant'}`}>{isSecretCompartmentOpen ? 'Deployed' : 'Locked'}</span>
                  </div>
                  <span className="text-xs text-text-variant font-mono">Stepper 28BYJ-48</span>
                </div>
              </div>

              {/* System Buzzer */}
              <div className={`p-4 rounded-xl border transition-all duration-300 flex items-center gap-4 ${buzzerOn ? 'bg-tertiary/10 border-tertiary glow-tertiary' : 'bg-surface-high/50 border-white/5'}`}>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${buzzerOn ? 'bg-tertiary/20 text-tertiary animate-bounce' : 'bg-surface-high'}`}>
                  <span className="material-symbols-outlined">volume_up</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <span className="font-bold tracking-wider text-sm">System Buzzer</span>
                    <span className={`text-[10px] font-mono uppercase tracking-widest ${buzzerOn ? 'text-tertiary' : 'text-text-variant'}`}>{buzzerOn ? 'Sounding' : 'Silent'}</span>
                  </div>
                  <span className="text-xs text-text-variant font-mono">Piezo Alert - 5V</span>
                </div>
              </div>

              {/* Alert LED */}
              <div className={`p-4 rounded-xl border transition-all duration-300 flex items-center gap-4 ${ledOn ? 'bg-tertiary/10 border-tertiary glow-tertiary' : 'bg-surface-high/50 border-white/5'}`}>
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${ledOn ? 'bg-tertiary text-white shadow-[0_0_20px_rgba(255,115,80,0.8)]' : 'bg-surface-high'}`}>
                  <span className="material-symbols-outlined">lightbulb</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <span className="font-bold tracking-wider text-sm">Alert LED Matrix</span>
                    <span className={`text-[10px] font-mono uppercase tracking-widest ${ledOn ? 'text-tertiary' : 'text-text-variant'}`}>{ledOn ? 'Strobe' : 'Off'}</span>
                  </div>
                  <span className="text-xs text-text-variant font-mono">WS2812B Strip</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

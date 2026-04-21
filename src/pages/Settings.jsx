import React, { useState } from 'react';

export default function Settings() {
  const [telegramEnabled, setTelegramEnabled] = useState(true);
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [smsEnabled, setSmsEnabled] = useState(true);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <p className="text-xs text-text-variant font-mono uppercase tracking-widest mb-1">Configuration</p>
        <h1 className="font-manrope text-3xl font-bold tracking-widest uppercase text-text-primary">System Parameters</h1>
        <p className="text-sm text-text-variant font-mono mt-2">Configure notification nodes and core security logic for the Sentinel mesh.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transmission Channels */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 rounded-2xl">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-high">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">hub</span>
                <h2 className="font-manrope text-xl font-bold tracking-wider uppercase">Transmission Channels</h2>
              </div>
              <span className="text-[10px] px-2 py-1 rounded bg-secondary/20 text-secondary font-mono uppercase tracking-wider border border-secondary/30">
                Network Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Telegram Bot */}
              <div className={`p-5 rounded-xl border transition-all duration-300 ${telegramEnabled ? 'bg-surface-high border-primary/30 glow-primary' : 'bg-surface-high/30 border-white/5 opacity-70'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${telegramEnabled ? 'bg-primary/20 text-primary' : 'bg-surface-high text-text-variant'}`}>
                    <span className="material-symbols-outlined">send</span>
                  </div>
                  <button 
                    onClick={() => setTelegramEnabled(!telegramEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${telegramEnabled ? 'bg-primary' : 'bg-surface-high'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-bg-base transition-transform ${telegramEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <h3 className="font-bold tracking-wider mb-1">Telegram Bot API</h3>
                <p className="text-xs text-text-variant mb-4 h-8">Instant push alerts via secure API webhook.</p>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-text-variant mb-1">Bot Token</label>
                    <input 
                      type="password" 
                      defaultValue="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                      disabled={!telegramEnabled}
                      className="w-full bg-bg-base border border-white/10 rounded px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-primary/50 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-text-variant mb-1">Target Chat ID</label>
                    <input 
                      type="text" 
                      defaultValue="-100123456789"
                      disabled={!telegramEnabled}
                      className="w-full bg-bg-base border border-white/10 rounded px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-primary/50 disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* WhatsApp Business */}
              <div className={`p-5 rounded-xl border transition-all duration-300 ${whatsappEnabled ? 'bg-surface-high border-secondary/30 glow-secondary' : 'bg-surface-high/30 border-white/5 opacity-70'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${whatsappEnabled ? 'bg-secondary/20 text-secondary' : 'bg-surface-high text-text-variant'}`}>
                    <span className="material-symbols-outlined">chat</span>
                  </div>
                  <button 
                    onClick={() => setWhatsappEnabled(!whatsappEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${whatsappEnabled ? 'bg-secondary' : 'bg-surface-high'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-bg-base transition-transform ${whatsappEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <h3 className="font-bold tracking-wider mb-1">WhatsApp Business</h3>
                <p className="text-xs text-text-variant mb-4 h-8">Encrypted business channel for priority log streaming.</p>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-text-variant mb-1">API Webhook URL</label>
                    <input 
                      type="text" 
                      placeholder="https://api.whatsapp.com/v1/messages"
                      disabled={!whatsappEnabled}
                      className="w-full bg-bg-base border border-white/10 rounded px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-secondary/50 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-widest text-text-variant mb-1">Auth Bearer Token</label>
                    <input 
                      type="password" 
                      placeholder="Enter Bearer Token..."
                      disabled={!whatsappEnabled}
                      className="w-full bg-bg-base border border-white/10 rounded px-3 py-1.5 text-xs font-mono text-text-primary focus:outline-none focus:border-secondary/50 disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Logic Settings */}
          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
            {/* Edge Accent */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>
            
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-primary">tune</span>
              <h2 className="font-manrope text-xl font-bold tracking-wider uppercase">Alert Frequency & Logic</h2>
            </div>

            <div className="space-y-8">
              <div>
                <div className="flex justify-between text-xs font-mono uppercase tracking-widest mb-2">
                  <span className="text-text-variant">Detection Sensitivity</span>
                  <span className="text-primary">85%</span>
                </div>
                <input type="range" min="1" max="100" defaultValue="85" className="w-full h-1 bg-surface-high rounded-lg appearance-none cursor-pointer accent-primary" />
                <p className="text-[10px] text-text-variant mt-2 font-mono">Adjusting this affects PIR and vibration sensor thresholds across all hardware nodes.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-text-variant mb-2">Breach Interval Logic</label>
                  <select className="w-full bg-surface-container border border-white/10 rounded-lg px-4 py-3 text-sm font-mono text-text-primary focus:outline-none focus:border-primary/50 appearance-none">
                    <option>30 Seconds Burst (Aggressive)</option>
                    <option>60 Seconds (Standard)</option>
                    <option>5 Minutes (Passive)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-text-variant mb-2">Log Retention Policy</label>
                  <select className="w-full bg-surface-container border border-white/10 rounded-lg px-4 py-3 text-sm font-mono text-text-primary focus:outline-none focus:border-primary/50 appearance-none">
                    <option>30 Days (Archive)</option>
                    <option>90 Days (Compliance)</option>
                    <option>Indefinite (High Storage)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Side Settings */}
        <div className="space-y-6">
          {/* Silent Hours */}
          <div className="glass-panel p-6 rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-tertiary">nights_stay</span>
              <h3 className="font-manrope text-lg font-bold tracking-wider uppercase">Silent Hours</h3>
            </div>
            <p className="text-xs text-text-variant mb-6 leading-relaxed">Suppress non-critical notifications during designated maintenance or rest periods. Critical breaches bypass this.</p>
            
            <div className="space-y-3 mb-6">
              <div className="bg-surface-high/50 p-3 rounded-lg border border-white/5 flex justify-between items-center">
                <span className="text-sm font-bold tracking-wider">Night Watch</span>
                <span className="text-[10px] px-2 py-1 rounded bg-surface-container text-primary font-mono border border-white/10">22:00 - 06:00</span>
              </div>
              <div className="bg-surface-high/20 p-3 rounded-lg border border-white/5 flex justify-between items-center opacity-50">
                <span className="text-sm font-bold tracking-wider">Daily Reset</span>
                <span className="text-[10px] px-2 py-1 rounded bg-surface-container text-text-variant font-mono border border-white/10">Inactive</span>
              </div>
            </div>
            
            <button className="w-full py-2 rounded-lg border border-white/10 text-text-variant font-mono text-xs uppercase tracking-wider hover:bg-surface-high transition-colors flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">add</span>
              Add Time Slot
            </button>
          </div>

          {/* System Identity */}
          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden border border-primary/20 shadow-[inset_0_0_20px_rgba(129,236,255,0.05)]">
            <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none">
              <span className="material-symbols-outlined text-[150px]">fingerprint</span>
            </div>
            <h3 className="font-manrope text-sm font-bold tracking-wider uppercase mb-4 text-primary">System Identity</h3>
            
            <div className="flex gap-4 items-center mb-4">
              <div className="w-12 h-12 rounded bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">dns</span>
              </div>
              <div>
                <div className="font-bold tracking-widest text-sm">NODE-ID-X992</div>
                <div className="text-[10px] font-mono text-text-variant uppercase">Kernel 5.15.0-SENTINEL</div>
              </div>
            </div>
            
            <p className="text-[10px] text-text-variant leading-relaxed">
              All configurations are hardware-encrypted and synced with the central command vault. Pulse interval: 150ms.
            </p>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 mt-8">
        <p className="text-xs text-text-variant font-mono italic">
          <span className="material-symbols-outlined text-[14px] align-middle mr-1">sync</span>
          Last backup 4 minutes ago via secure uplink.
        </p>
        <div className="flex gap-4 w-full sm:w-auto">
          <button className="flex-1 sm:flex-none px-6 py-2 rounded-lg bg-surface-container border border-white/10 text-text-primary font-mono text-sm uppercase tracking-wider hover:bg-surface-high transition-colors">
            Reset Defaults
          </button>
          <button className="flex-1 sm:flex-none px-6 py-2 rounded-lg bg-primary text-bg-base font-bold font-mono text-sm uppercase tracking-wider hover:bg-primary-fixed transition-colors shadow-[0_0_15px_rgba(129,236,255,0.4)]">
            Apply Configuration
          </button>
        </div>
      </div>
    </div>
  );
}

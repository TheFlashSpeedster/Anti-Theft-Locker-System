import React, { useState } from 'react';

// ── Segmented Bar ────────────────────────────────────────────────────────────
function Bar({ segments = 6, filled, color }) {
  const c = { primary: 'bg-primary', secondary: 'bg-secondary', tertiary: 'bg-tertiary' };
  return (
    <div className="flex gap-0.5">
      {[...Array(segments)].map((_, i) => (
        <div key={i} className={`h-1.5 flex-1 rounded-sm transition-all duration-300 ${i < filled ? c[color] : 'bg-white/10'}`} />
      ))}
    </div>
  );
}

// ── Hardware Row ─────────────────────────────────────────────────────────────
function HWRow({ icon, name, pin, active, stateLabel, stateColor, pulse, controls, bar }) {
  const dot   = { primary: 'bg-primary', secondary: 'bg-secondary', tertiary: 'bg-tertiary' };
  const bdl   = { primary: 'border-l-primary', secondary: 'border-l-secondary', tertiary: 'border-l-tertiary' };
  const badge = {
    primary:   active ? 'bg-primary/20 text-primary border-primary/20'     : 'bg-white/5 text-text-variant border-white/10',
    secondary: active ? 'bg-secondary/20 text-secondary border-secondary/20' : 'bg-white/5 text-text-variant border-white/10',
    tertiary:  active ? 'bg-tertiary/20 text-tertiary border-tertiary/20'   : 'bg-white/5 text-text-variant border-white/10',
  };
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl bg-surface-container border-l-2 border border-white/5 transition-all ${active ? bdl[stateColor] : 'border-l-white/10'}`}>
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${active ? dot[stateColor] : 'bg-white/20'} ${pulse && active ? 'animate-pulse' : ''}`} />
      <div className="flex items-center gap-2 min-w-0 flex-shrink-0 w-28 md:w-36">
        <span className={`material-symbols-outlined text-[16px] ${active ? `text-${stateColor}` : 'text-text-variant'}`}>{icon}</span>
        <div>
          <p className="text-xs font-bold font-manrope truncate">{name}</p>
          <p className="text-[9px] text-text-variant font-mono hidden sm:block">{pin}</p>
        </div>
      </div>
      <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded font-mono uppercase tracking-wider border font-bold ${badge[stateColor]}`}>
        {stateLabel}
      </span>
      {bar && <div className="flex-1 hidden sm:block"><Bar {...bar} /></div>}
      {controls && <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">{controls}</div>}
    </div>
  );
}

// ── Small action pill button ─────────────────────────────────────────────────
function Pill({ label, icon, onClick, color = 'primary', loading }) {
  const c = {
    primary:   'border-primary/40 text-primary hover:bg-primary/15',
    secondary: 'border-secondary/40 text-secondary hover:bg-secondary/15',
    tertiary:  'border-tertiary/40 text-tertiary hover:bg-tertiary/15',
  };
  return (
    <button onClick={onClick} disabled={loading}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-mono uppercase tracking-widest font-bold transition-all ${c[color]} disabled:opacity-40`}>
      <span className={`material-symbols-outlined text-[13px] ${loading ? 'animate-spin' : ''}`}>{loading ? 'progress_activity' : icon}</span>
      {label}
    </button>
  );
}

// ── Big action button (Quick Controls) ───────────────────────────────────────
function BigBtn({ label, sub, icon, onClick, color = 'secondary', active = false, loading }) {
  const c = {
    primary:   { border: active ? 'border-primary shadow-[0_0_14px_rgba(129,236,255,0.2)]' : 'border-primary/20 hover:border-primary/50', text: 'text-primary', bg: active ? 'bg-primary/20' : 'bg-surface-container hover:bg-primary/10' },
    secondary: { border: active ? 'border-secondary shadow-[0_0_14px_rgba(0,255,180,0.15)]' : 'border-secondary/20 hover:border-secondary/50', text: 'text-secondary', bg: active ? 'bg-secondary/20' : 'bg-surface-container hover:bg-secondary/10' },
    tertiary:  { border: active ? 'border-tertiary shadow-[0_0_20px_rgba(255,80,80,0.3)]' : 'border-tertiary/30 hover:border-tertiary/60', text: 'text-tertiary', bg: active ? 'bg-tertiary/20' : 'bg-surface-container hover:bg-tertiary/10' },
  };
  const s = c[color];
  return (
    <button onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 font-bold transition-all relative overflow-hidden ${s.border} ${s.bg}`}>
      <span className={`material-symbols-outlined text-2xl ${s.text} ${active && color==='tertiary' ? 'animate-bounce' : ''}`}>
        {loading ? 'progress_activity' : icon}
      </span>
      <div className="text-left">
        <p className={`text-xs font-black uppercase tracking-wider font-manrope ${s.text}`}>{label}</p>
        {sub && <p className="text-[9px] font-mono opacity-50">{sub}</p>}
      </div>
    </button>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function VaultStatus({ state, connected, onCommand }) {
  const { isLocked, isSecretCompartmentOpen, failedAttempts, buzzerOn, isBreached, vibrationDetected, lcdText } = state;
  const [pending, setPending] = useState(null);

  const exec = (c) => async () => {
    setPending(c);
    await onCommand(c);
    setTimeout(() => setPending(null), 800);
  };
  const isP = (c) => pending === c;

  // ── BREACH MODE: show only the stop controls ─────────────────────────────
  if (isBreached) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        {/* Big red alert banner */}
        <div className="p-5 sm:p-8 rounded-2xl border-2 border-tertiary bg-tertiary/10 shadow-[0_0_40px_rgba(255,80,80,0.2)] relative overflow-hidden">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-3 h-3 rounded-full bg-tertiary animate-ping" />
            <span className="font-mono text-[10px] tracking-widest uppercase text-tertiary">Security Breach Detected</span>
          </div>
          <h1 className="font-manrope text-4xl sm:text-6xl font-black text-tertiary uppercase leading-none mb-2">
            !! BREACH !!
          </h1>
          <p className="text-sm text-tertiary/70 font-mono">
            {vibrationDetected ? 'Trigger: Physical Tampering (SW-420)' : 'Trigger: Authentication Failure'}
            {buzzerOn && ' · Buzzer active'}
          </p>
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-tertiary/10 rounded-full blur-3xl pointer-events-none" />
        </div>

        {/* Stop options */}
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-tertiary font-bold">Stop Alert</span>
          </div>
          <div className="p-4 space-y-3">
            {/* Primary: System Reset (web) */}
            <button onClick={exec('/reset')}
              className="w-full flex items-center gap-4 px-5 py-4 rounded-xl bg-secondary/10 border-2 border-secondary hover:bg-secondary/20 transition-all">
              <span className={`material-symbols-outlined text-3xl text-secondary ${isP('/reset') ? 'animate-spin' : ''}`}>
                {isP('/reset') ? 'progress_activity' : 'restart_alt'}
              </span>
              <div className="text-left">
                <p className="text-sm font-black uppercase tracking-wider font-manrope text-secondary">Stop Alert — Web Reset</p>
                <p className="text-[10px] font-mono text-text-variant">Clears alert, silences buzzer, seals trapdoor</p>
              </div>
            </button>

            {/* Silence buzzer only */}
            {buzzerOn && (
              <button onClick={exec('/buzzer_off')}
                className="w-full flex items-center gap-4 px-5 py-4 rounded-xl bg-surface-container border-2 border-secondary/30 hover:border-secondary hover:bg-secondary/10 transition-all">
                <span className={`material-symbols-outlined text-2xl text-secondary ${isP('/buzzer_off') ? 'animate-spin' : ''}`}>
                  {isP('/buzzer_off') ? 'progress_activity' : 'volume_off'}
                </span>
                <div className="text-left">
                  <p className="text-xs font-black uppercase tracking-wider font-manrope text-secondary">Silence Buzzer Only</p>
                  <p className="text-[9px] font-mono text-text-variant">Alert stays active — use Reset to fully clear</p>
                </div>
              </button>
            )}

            {/* Keypad hint */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-container border border-white/5">
              <span className="material-symbols-outlined text-xl text-text-variant">dialpad</span>
              <p className="text-[11px] font-mono text-text-variant">
                Or enter <span className="text-primary font-bold">correct PIN</span> on the physical keypad to clear the alert
              </p>
            </div>

            {/* Sim: correct PIN button (offline only) */}
            {!connected && (
              <button onClick={exec('/reset')}
                className="w-full flex items-center gap-4 px-5 py-3 rounded-xl bg-surface-container border border-orange-500/20 hover:border-orange-500/50 hover:bg-orange-500/10 transition-all">
                <span className="material-symbols-outlined text-xl text-orange-400">password</span>
                <div className="text-left">
                  <p className="text-xs font-black uppercase font-manrope text-orange-400">[SIM] Correct PIN entered</p>
                  <p className="text-[9px] font-mono text-text-variant">Simulate correct keypad PIN in sim mode</p>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Compact status during breach */}
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-white/5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-variant font-bold">Live Status</span>
          </div>
          <div className="p-3 space-y-2">
            <HWRow icon="campaign" name="Buzzer" pin="GPIO 23" active={buzzerOn} stateLabel={buzzerOn ? 'Alarming' : 'Silent'} stateColor="tertiary" pulse={buzzerOn} bar={{ segments: 6, filled: buzzerOn ? 6 : 0, color: 'tertiary' }} />
            <HWRow icon="sensors" name="SW-420" pin="GPIO 5" active={vibrationDetected} stateLabel={vibrationDetected ? 'Triggered' : 'Stable'} stateColor="tertiary" pulse={vibrationDetected} bar={{ segments: 6, filled: vibrationDetected ? 6 : 1, color: 'tertiary' }} />
            <HWRow icon={isLocked ? 'lock' : 'lock_open'} name="Main Door" pin="Servo 1 · GPIO 18" active={!isLocked} stateLabel={isLocked ? 'Locked' : 'Open'} stateColor="primary" bar={{ segments: 6, filled: isLocked ? 0 : 6, color: 'primary' }} />
            <HWRow icon={isSecretCompartmentOpen ? 'inventory_2' : 'inventory'} name="Trapdoor" pin="Servo 2 · GPIO 19" active={isSecretCompartmentOpen} stateLabel={isSecretCompartmentOpen ? 'Deployed' : 'Sealed'} stateColor="tertiary" bar={{ segments: 6, filled: isSecretCompartmentOpen ? 6 : 0, color: 'tertiary' }} />
          </div>
        </div>
      </div>
    );
  }

  // ── NORMAL MODE ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 max-w-3xl mx-auto">

      {/* Hero */}
      <div className={`p-5 sm:p-7 rounded-2xl border transition-all duration-500 relative overflow-hidden
        ${isLocked ? 'bg-surface-container border-white/10' : 'bg-primary/10 border-primary/40'}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <div className={`w-2 h-2 rounded-full ${isLocked ? 'bg-secondary' : 'bg-primary animate-pulse'}`} />
              <span className="text-[10px] font-mono uppercase tracking-widest text-text-variant">Aether Sentinel</span>
              <span className={`text-[9px] px-2 py-0.5 rounded-full font-mono uppercase tracking-wider border font-bold ${connected ? 'bg-secondary/10 border-secondary/30 text-secondary' : 'bg-orange-500/10 border-orange-500/30 text-orange-400'}`}>
                {connected ? '● Live' : '◌ Sim'}
              </span>
            </div>
            <h1 className={`font-manrope text-3xl sm:text-5xl font-black uppercase leading-none ${isLocked ? 'text-text-primary' : 'text-primary'}`}>
              {isLocked ? 'Secured' : 'Unlocked'}
            </h1>
            <p className="text-text-variant text-xs mt-1.5 font-light">{isLocked ? 'SW-420 & keypad active.' : 'Door open — auto-lock in 5s.'}</p>
          </div>
          {/* LCD */}
          <div className="flex-shrink-0 hidden sm:block">
            <div className="p-1.5 bg-[#2d3024] border-4 border-[#1a1b15] rounded-lg shadow-xl">
              <div className="bg-[#87ad34] px-2.5 py-2 rounded font-mono text-[#1a1b15] w-44 relative overflow-hidden">
                <div className="absolute inset-0 opacity-[0.07] bg-[repeating-linear-gradient(0deg,#000_0px,#000_1px,transparent_1px,transparent_4px)] pointer-events-none" />
                <div className="relative text-center">
                  <div className="font-bold text-xs leading-tight whitespace-pre tracking-wider">{lcdText[0]}</div>
                  <div className="font-bold text-xs leading-tight whitespace-pre tracking-wider mt-1">{lcdText[1]}</div>
                </div>
              </div>
              <div className="mt-0.5 text-center text-[8px] text-text-variant font-mono">16×2 I²C · 0x27</div>
            </div>
          </div>
        </div>
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-bl from-white/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Quick Controls */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-widest text-text-variant font-bold">Quick Controls</span>
          <span className={`text-[9px] px-2 py-0.5 rounded font-mono uppercase border ${connected ? 'text-secondary border-secondary/30 bg-secondary/10' : 'text-orange-400 border-orange-500/30 bg-orange-500/10'}`}>
            {connected ? 'Live' : 'Sim'}
          </span>
        </div>
        <div className="p-3 space-y-3">

          {/* Emergency */}
          <div>
            <p className="text-[9px] font-mono uppercase tracking-widest text-text-variant mb-2 px-0.5">⚠ Emergency</p>
            <div className="grid grid-cols-2 gap-2">
              <BigBtn label={buzzerOn ? 'Silence Alarm' : 'Trigger Alarm'} sub={buzzerOn ? 'Buzzer active — tap to stop' : 'Remote buzzer activation'}
                icon="campaign" color="tertiary" active={buzzerOn}
                onClick={buzzerOn ? exec('/buzzer_off') : exec('/buzzer_on')}
                loading={isP('/buzzer_on') || isP('/buzzer_off')} />
              <BigBtn label="System Reset" sub="Clears all alerts" icon="restart_alt" color="secondary"
                onClick={exec('/reset')} loading={isP('/reset')} />
            </div>
          </div>

          {/* Door */}
          <div>
            <p className="text-[9px] font-mono uppercase tracking-widest text-text-variant mb-2 px-0.5">🚪 Main Door</p>
            <div className="grid grid-cols-2 gap-2">
              <BigBtn label="Unlock" sub="Open main servo" icon="lock_open" color="primary" active={!isLocked}
                onClick={exec('/unlock')} loading={isP('/unlock')} />
              <BigBtn label="Lock" sub="Close main servo" icon="lock" color="secondary" active={isLocked}
                onClick={exec('/lock')} loading={isP('/lock')} />
            </div>
          </div>

          {/* Trapdoor */}
          <div>
            <p className="text-[9px] font-mono uppercase tracking-widest text-text-variant mb-2 px-0.5">📦 Compartment</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Open', icon: 'inventory_2', c: '/trapdoor_open', color: 'primary', active: isSecretCompartmentOpen },
                { label: 'Seal', icon: 'inventory',   c: '/trapdoor_close', color: 'secondary', active: !isSecretCompartmentOpen },
                { label: 'Flip', icon: 'autorenew',  c: '/trapdoor_flip',  color: 'secondary', active: false },
              ].map(b => (
                <button key={b.c} onClick={exec(b.c)}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 font-bold transition-all
                    ${b.active ? `bg-${b.color}/20 border-${b.color} text-${b.color}` : `bg-surface-container border-${b.color}/20 text-${b.color} hover:border-${b.color}/50 hover:bg-${b.color}/10`}`}>
                  <span className={`material-symbols-outlined text-xl ${isP(b.c) ? 'animate-spin' : ''}`}>{isP(b.c) ? 'progress_activity' : b.icon}</span>
                  <p className="text-[10px] font-black uppercase tracking-wide font-manrope">{b.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Sim-only inputs */}
          {!connected && (
            <div>
              <p className="text-[9px] font-mono uppercase tracking-widest text-orange-400 mb-2 px-0.5">◌ Simulation Inputs</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={exec('__sim_wrong_pin')}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-tertiary/20 bg-surface-container text-tertiary hover:border-tertiary/50 hover:bg-tertiary/10 transition-all">
                  <span className="material-symbols-outlined text-xl">gpp_bad</span>
                  <div className="text-left">
                    <p className="text-xs font-black uppercase font-manrope">Wrong PIN</p>
                    <p className="text-[9px] font-mono opacity-60">Keypad fail</p>
                  </div>
                </button>
                <button onClick={exec('__sim_vibration')}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-tertiary/20 bg-surface-container text-tertiary hover:border-tertiary/50 hover:bg-tertiary/10 transition-all">
                  <span className="material-symbols-outlined text-xl">vibration</span>
                  <div className="text-left">
                    <p className="text-xs font-black uppercase font-manrope">SW-420</p>
                    <p className="text-[9px] font-mono opacity-60">Tamper sim</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hardware Monitor */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[14px]">developer_board</span>
            <span className="text-[10px] font-mono uppercase tracking-widest text-text-variant font-bold">Hardware Monitor</span>
          </div>
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-tertiary/60" />
            <div className="w-2 h-2 rounded-full bg-primary/60 animate-pulse" />
            <div className="w-2 h-2 rounded-full bg-secondary/60" />
          </div>
        </div>
        <div className="p-3 space-y-2">
          <HWRow icon={isLocked ? 'lock' : 'lock_open'} name="Main Door" pin="Servo 1 · GPIO 18"
            active={!isLocked} stateLabel={isLocked ? 'Locked' : 'Unlocked'} stateColor="primary"
            bar={{ segments: 6, filled: isLocked ? 0 : 6, color: 'primary' }}
            controls={<Pill label={isLocked ? 'Unlock' : 'Lock'} icon={isLocked ? 'lock_open' : 'lock'}
              color={isLocked ? 'primary' : 'secondary'} loading={isP('/unlock') || isP('/lock')}
              onClick={isLocked ? exec('/unlock') : exec('/lock')} />} />

          <HWRow icon={isSecretCompartmentOpen ? 'inventory_2' : 'inventory'} name="Trapdoor" pin="Servo 2 · GPIO 19"
            active={isSecretCompartmentOpen} stateLabel={isSecretCompartmentOpen ? 'Open' : 'Sealed'} stateColor={isSecretCompartmentOpen ? 'tertiary' : 'secondary'}
            bar={{ segments: 6, filled: isSecretCompartmentOpen ? 6 : 0, color: 'tertiary' }}
            controls={<Pill label={isSecretCompartmentOpen ? 'Seal' : 'Open'} icon={isSecretCompartmentOpen ? 'inventory' : 'inventory_2'}
              color={isSecretCompartmentOpen ? 'secondary' : 'primary'} loading={isP('/trapdoor_open') || isP('/trapdoor_close')}
              onClick={isSecretCompartmentOpen ? exec('/trapdoor_close') : exec('/trapdoor_open')} />} />

          <HWRow icon="campaign" name="Buzzer" pin="Piezo · GPIO 23"
            active={buzzerOn} stateLabel={buzzerOn ? 'Alarming' : 'Silent'} stateColor="tertiary" pulse={buzzerOn}
            bar={{ segments: 6, filled: buzzerOn ? 6 : 0, color: 'tertiary' }}
            controls={<Pill label={buzzerOn ? 'Off' : 'On'} icon={buzzerOn ? 'volume_off' : 'campaign'}
              color={buzzerOn ? 'secondary' : 'tertiary'} loading={isP('/buzzer_on') || isP('/buzzer_off')}
              onClick={buzzerOn ? exec('/buzzer_off') : exec('/buzzer_on')} />} />

          <HWRow icon="sensors" name="SW-420" pin="Vibration · GPIO 5"
            active={vibrationDetected} stateLabel={vibrationDetected ? 'Triggered!' : 'Stable'} stateColor="tertiary" pulse={vibrationDetected}
            bar={{ segments: 6, filled: vibrationDetected ? 6 : 1, color: vibrationDetected ? 'tertiary' : 'secondary' }} />

          <HWRow icon="dialpad" name="Keypad 4×4" pin="GPIO 13,12,14,27..."
            active={failedAttempts > 0} stateLabel={failedAttempts > 0 ? `${failedAttempts}/3 Fails` : 'No Fails'}
            stateColor={failedAttempts >= 3 ? 'tertiary' : failedAttempts > 0 ? 'primary' : 'secondary'}
            bar={{ segments: 3, filled: failedAttempts, color: 'tertiary' }} />

          <HWRow icon="wifi" name="ESP32 WiFi" pin="WROOM-32 · 2.4 GHz"
            active={connected} stateLabel={connected ? 'Live' : 'Offline'} stateColor="secondary"
            bar={{ segments: 6, filled: connected ? 5 : 0, color: 'secondary' }} />
        </div>
      </div>

    </div>
  );
}

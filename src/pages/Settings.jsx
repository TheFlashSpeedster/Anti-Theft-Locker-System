import React, { useState, useEffect } from 'react';
import { ESP32_IP } from '../firebase';

// ── Helpers ──────────────────────────────────────────────────────────────────
function loadTelegramConfig() {
  return {
    botToken: localStorage.getItem('tg_bot_token') || '',
    chatId:   localStorage.getItem('tg_chat_id')   || '',
  };
}
function verifyDashPassword(input) {
  const stored = localStorage.getItem('dashboard_password') || 'admin123';
  return input === stored;
}

// ── Sub-components ────────────────────────────────────────────────────────────
function SaveBanner({ status }) {
  if (status === 'idle') return null;
  const ok  = status === 'ok';
  const err = status === 'error';
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono border transition-all
      ${ok  ? 'bg-secondary/10 border-secondary/30 text-secondary' : ''}
      ${err ? 'bg-tertiary/10  border-tertiary/30  text-tertiary'  : ''}`}>
      <span className="material-symbols-outlined text-[14px]">{ok ? 'check_circle' : 'error'}</span>
      {ok ? 'Saved successfully.' : 'Save failed — check connection.'}
    </div>
  );
}

// Reusable security confirmation modal
function ConfirmModal({ title, message, warning, onConfirm, onCancel, children }) {
  const [dashPwd, setDashPwd] = useState('');
  const [err,     setErr]     = useState('');

  const submit = () => {
    if (!verifyDashPassword(dashPwd)) { setErr('Incorrect dashboard password.'); return; }
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="glass-panel rounded-2xl p-6 w-full max-w-md border border-tertiary/30 shadow-[0_0_40px_rgba(255,80,80,0.15)]">
        <div className="flex items-start gap-3 mb-5">
          <span className="material-symbols-outlined text-tertiary text-2xl mt-0.5 flex-shrink-0">security</span>
          <div>
            <h3 className="font-manrope font-black text-lg text-text-primary">{title}</h3>
            <p className="text-xs font-mono text-text-variant mt-1">{message}</p>
          </div>
        </div>

        {warning && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-tertiary/10 border border-tertiary/30 text-tertiary text-xs font-mono mb-5">
            <span className="material-symbols-outlined text-[16px] mt-0.5 flex-shrink-0">warning</span>
            {warning}
          </div>
        )}

        {children}

        <div className="mt-4">
          <label className="block text-[10px] font-mono uppercase tracking-widest text-text-variant mb-1.5">
            Dashboard Password (confirmation)
          </label>
          <input
            type="password"
            value={dashPwd}
            onChange={e => { setDashPwd(e.target.value); setErr(''); }}
            onKeyDown={e => e.key === 'Enter' && submit()}
            placeholder="Enter your dashboard password"
            className="w-full bg-bg-base border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:border-primary/50 text-text-primary transition-colors"
            autoFocus
          />
          {err && <p className="text-tertiary text-[11px] font-mono mt-1">{err}</p>}
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-text-variant font-mono text-sm hover:bg-white/5 transition-colors">
            Cancel
          </button>
          <button onClick={submit}
            className="flex-1 px-4 py-2.5 rounded-xl bg-tertiary/20 border border-tertiary/50 text-tertiary font-mono text-sm font-bold hover:bg-tertiary/30 transition-colors">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Settings() {
  // ── Telegram ───────────────────────────────────────────────────────────────
  const [tgConfig,   setTgConfig]   = useState(loadTelegramConfig);
  const [showToken,  setShowToken]  = useState(false);
  const [tgStatus,   setTgStatus]   = useState('idle');

  const hasSavedToken  = !!localStorage.getItem('tg_bot_token');
  const hasSavedChatId = !!localStorage.getItem('tg_chat_id');

  // ── Locker PIN ─────────────────────────────────────────────────────────────
  const [lockerPin,        setLockerPin]        = useState('');
  const [lockerPinConfirm, setLockerPinConfirm] = useState('');
  const [pinStatus,        setPinStatus]        = useState('idle');
  const [pinError,         setPinError]         = useState('');
  const [showChangePinModal, setShowChangePinModal] = useState(false);
  const [showSavedPin,       setShowSavedPin]       = useState(false);
  const savedPin = localStorage.getItem('last_set_pin') || null;

  // ── Dashboard Password ─────────────────────────────────────────────────────
  const [dashCurrent, setDashCurrent] = useState('');
  const [dashNew,     setDashNew]     = useState('');
  const [dashConfirm, setDashConfirm] = useState('');
  const [dashStatus,  setDashStatus]  = useState('idle');
  const [dashError,   setDashError]   = useState('');

  // ── Auto-clear banners ─────────────────────────────────────────────────────
  useEffect(() => { if (tgStatus  !== 'idle') { const t = setTimeout(() => setTgStatus('idle'),  3500); return () => clearTimeout(t); } }, [tgStatus]);
  useEffect(() => { if (pinStatus !== 'idle') { const t = setTimeout(() => setPinStatus('idle'), 3500); return () => clearTimeout(t); } }, [pinStatus]);
  useEffect(() => { if (dashStatus !== 'idle') { const t = setTimeout(() => setDashStatus('idle'), 3500); return () => clearTimeout(t); } }, [dashStatus]);

  // ── Telegram save ──────────────────────────────────────────────────────────
  const saveTelegram = async () => {
    setTgStatus('saving');
    try {
      localStorage.setItem('tg_bot_token', tgConfig.botToken.trim());
      localStorage.setItem('tg_chat_id',   tgConfig.chatId.trim());
      const res = await fetch(`${ESP32_IP}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tgToken: tgConfig.botToken.trim(), tgChatId: tgConfig.chatId.trim() }),
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      setTgStatus('ok');
    } catch (err) {
      console.error('Telegram save failed:', err);
      setTgStatus('error');
    }
  };


  // ── Locker PIN: save (after confirmation) ─────────────────────────────────
  const doSavePin = async () => {
    setShowChangePinModal(false);
    setPinError('');
    if (lockerPin.length < 4) { setPinError('PIN must be at least 4 characters.'); return; }
    if (lockerPin !== lockerPinConfirm) { setPinError('PINs do not match.'); return; }
    setPinStatus('saving');
    try {
      const res = await fetch(`${ESP32_IP}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: lockerPin.trim() }),
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      localStorage.setItem('last_set_pin', lockerPin.trim());
      setLockerPin('');
      setLockerPinConfirm('');
      setPinStatus('ok');
    } catch (err) {
      console.error('PIN save failed:', err);
      setPinStatus('error');
    }
  };

  // ── Dashboard password save ───────────────────────────────────────────────
  const saveDashPassword = () => {
    setDashError('');
    if (!verifyDashPassword(dashCurrent)) { setDashError('Current password is incorrect.'); return; }
    if (dashNew.length < 6)    { setDashError('New password must be at least 6 characters.'); return; }
    if (dashNew !== dashConfirm) { setDashError('New passwords do not match.'); return; }
    localStorage.setItem('dashboard_password', dashNew);
    setDashCurrent(''); setDashNew(''); setDashConfirm('');
    setDashStatus('ok');
  };

  const inputCls = (accent = 'primary') =>
    `w-full bg-bg-base border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-text-primary focus:outline-none focus:border-${accent}/50 transition-colors placeholder:text-text-variant/30`;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Modals — only for PIN change */}
      {showChangePinModal && (
        <ConfirmModal
          title="Change Locker PIN"
          message="Confirm your identity before updating the PIN on the physical hardware."
          warning="The new PIN will be pushed to the ESP32 and saved to flash immediately."
          onConfirm={doSavePin}
          onCancel={() => setShowChangePinModal(false)}
        />
      )}

      {/* Header */}
      <div className="mb-6">
        <p className="text-xs text-text-variant font-mono uppercase tracking-widest mb-1">Configuration</p>
        <h1 className="font-manrope text-3xl font-bold tracking-widest uppercase text-text-primary">System Parameters</h1>
        <p className="text-sm text-text-variant font-mono mt-2">Manage Telegram alerts, locker PIN, and dashboard credentials.</p>
      </div>

      {/* ── 1. Telegram Configuration ── */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">send</span>
            <div>
              <h2 className="font-manrope text-xl font-bold tracking-wider uppercase">Telegram Alerts</h2>
              <p className="text-xs text-text-variant font-mono mt-0.5">Sent directly to ESP32 flash — no cloud.</p>
            </div>
          </div>
          <span className={`text-[10px] px-2.5 py-1 rounded-lg font-mono uppercase tracking-wider border font-bold
            ${hasSavedToken ? 'bg-secondary/10 text-secondary border-secondary/30' : 'bg-white/5 text-text-variant border-white/10'}`}>
            {hasSavedToken ? '● Configured' : '○ Not set'}
          </span>
        </div>

        {hasSavedToken && (
          <div className="flex flex-wrap gap-3 mb-5 p-3 rounded-xl bg-secondary/5 border border-secondary/20">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-widest text-text-variant mb-0.5">Saved Bot Token</p>
              <p className="font-mono text-xs text-secondary truncate">
                {showToken ? tgConfig.botToken || '—' : '••••••••••••••••••••••••••••••••••••••'}
              </p>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-widest text-text-variant mb-0.5">Saved Chat ID</p>
              <p className="font-mono text-xs text-secondary">{tgConfig.chatId || '—'}</p>
            </div>
            <button onClick={() => setShowToken(v => !v)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-secondary/30 text-secondary text-[11px] font-mono hover:bg-secondary/10 transition-colors flex-shrink-0 self-center">
              <span className="material-symbols-outlined text-[14px]">{showToken ? 'visibility_off' : 'visibility'}</span>
              {showToken ? 'Hide' : 'Reveal'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-variant mb-1.5">
              Bot Token {hasSavedToken && <span className="text-secondary">(override)</span>}
            </label>
            <input id="tg-bot-token" type="password"
              value={tgConfig.botToken}
              onChange={e => setTgConfig(p => ({ ...p, botToken: e.target.value }))}
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUV..."
              className={inputCls('primary')} />
            <p className="text-[10px] text-text-variant font-mono mt-1">Obtain from @BotFather on Telegram.</p>
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-variant mb-1.5">User / Chat ID</label>
            <input id="tg-chat-id" type="text"
              value={tgConfig.chatId}
              onChange={e => setTgConfig(p => ({ ...p, chatId: e.target.value }))}
              placeholder="e.g. 123456789 or -100123456789"
              className={inputCls('primary')} />
            <p className="text-[10px] text-text-variant font-mono mt-1">Send a message to @userinfobot to find your ID.</p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/5 gap-4 flex-wrap">
          <SaveBanner status={tgStatus} />
          <button id="save-telegram-btn" onClick={saveTelegram} disabled={tgStatus === 'saving'}
            className="ml-auto px-6 py-2.5 rounded-xl bg-primary text-bg-base font-bold font-mono text-sm uppercase tracking-wider hover:opacity-90 transition-opacity shadow-[0_0_12px_rgba(129,236,255,0.3)] disabled:opacity-60 flex items-center gap-2">
            <span className={`material-symbols-outlined text-[16px] ${tgStatus === 'saving' ? 'animate-spin' : ''}`}>
              {tgStatus === 'saving' ? 'progress_activity' : 'save'}
            </span>
            {tgStatus === 'saving' ? 'Saving…' : 'Save Telegram Config'}
          </button>
        </div>
      </div>

      {/* ── 2. Locker PIN ── */}
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary rounded-l-2xl" />

        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-secondary">pin</span>
            <div>
              <h2 className="font-manrope text-xl font-bold tracking-wider uppercase">Locker PIN</h2>
              <p className="text-xs text-text-variant font-mono mt-0.5">Pushed to ESP32 flash — takes effect immediately.</p>
            </div>
          </div>
        </div>

        {/* Current PIN display — always shown, masked by default */}
        <div className={`mb-5 p-4 rounded-xl border flex items-center gap-4 transition-all
          ${savedPin ? 'bg-secondary/5 border-secondary/20' : 'bg-white/3 border-white/8'}`}>
          <span className={`material-symbols-outlined text-xl flex-shrink-0 ${savedPin ? 'text-secondary' : 'text-text-variant/40'}`}>pin</span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono uppercase tracking-widest text-text-variant mb-1">Saved PIN (this browser)</p>
            {savedPin ? (
              <p className={`font-manrope font-black tracking-[0.4em] text-2xl text-secondary transition-all`}>
                {showSavedPin ? savedPin : '•'.repeat(savedPin.length)}
              </p>
            ) : (
              <p className="text-xs font-mono text-text-variant/50">Not yet set from this dashboard — use the form below.</p>
            )}
          </div>
          {savedPin && (
            <button onClick={() => setShowSavedPin(v => !v)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-secondary/30 text-secondary text-[11px] font-mono hover:bg-secondary/10 transition-colors flex-shrink-0">
              <span className="material-symbols-outlined text-[14px]">{showSavedPin ? 'visibility_off' : 'visibility'}</span>
              {showSavedPin ? 'Hide' : 'Reveal'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-variant mb-1.5">New PIN</label>
            <input id="locker-pin-new" type="password" value={lockerPin}
              onChange={e => setLockerPin(e.target.value)}
              placeholder="Min. 4 characters"
              className={inputCls('secondary')} />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-variant mb-1.5">Confirm New PIN</label>
            <input id="locker-pin-confirm" type="password" value={lockerPinConfirm}
              onChange={e => setLockerPinConfirm(e.target.value)}
              placeholder="Re-enter PIN"
              className={inputCls('secondary')} />
          </div>
        </div>

        {pinError && (
          <div className="flex items-center gap-2 mt-4 px-4 py-2.5 rounded-xl bg-tertiary/10 border border-tertiary/30 text-tertiary text-xs font-mono">
            <span className="material-symbols-outlined text-[14px]">error</span>
            {pinError}
          </div>
        )}

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/5 gap-4 flex-wrap">
          <SaveBanner status={pinStatus} />
          <button id="save-locker-pin-btn"
            onClick={() => {
              setPinError('');
              if (lockerPin.length < 4) { setPinError('PIN must be at least 4 characters.'); return; }
              if (lockerPin !== lockerPinConfirm) { setPinError('PINs do not match.'); return; }
              setShowChangePinModal(true);
            }}
            disabled={pinStatus === 'saving'}
            className="ml-auto px-6 py-2.5 rounded-xl bg-secondary text-bg-base font-bold font-mono text-sm uppercase tracking-wider hover:opacity-90 transition-opacity shadow-[0_0_12px_rgba(0,240,180,0.25)] disabled:opacity-60 flex items-center gap-2">
            <span className={`material-symbols-outlined text-[16px] ${pinStatus === 'saving' ? 'animate-spin' : ''}`}>
              {pinStatus === 'saving' ? 'progress_activity' : 'lock_reset'}
            </span>
            {pinStatus === 'saving' ? 'Updating…' : 'Update Locker PIN'}
          </button>
        </div>
      </div>

      {/* ── 3. Dashboard Password ── */}
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-tertiary rounded-l-2xl" />

        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
          <span className="material-symbols-outlined text-tertiary">manage_accounts</span>
          <div>
            <h2 className="font-manrope text-xl font-bold tracking-wider uppercase">Dashboard Password</h2>
            <p className="text-xs text-text-variant font-mono mt-0.5">Web login password. Stored locally in your browser.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-variant mb-1.5">Current Password</label>
            <input id="dash-current-password" type="password" value={dashCurrent}
              onChange={e => setDashCurrent(e.target.value)}
              placeholder="••••••••"
              className={inputCls('tertiary')} />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-variant mb-1.5">New Password</label>
            <input id="dash-new-password" type="password" value={dashNew}
              onChange={e => setDashNew(e.target.value)}
              placeholder="Min. 6 characters"
              className={inputCls('tertiary')} />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-variant mb-1.5">Confirm New</label>
            <input id="dash-confirm-password" type="password" value={dashConfirm}
              onChange={e => setDashConfirm(e.target.value)}
              placeholder="Re-enter password"
              className={inputCls('tertiary')} />
          </div>
        </div>

        {dashError && (
          <div className="flex items-center gap-2 mt-4 px-4 py-2.5 rounded-xl bg-tertiary/10 border border-tertiary/30 text-tertiary text-xs font-mono">
            <span className="material-symbols-outlined text-[14px]">error</span>
            {dashError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-5 pt-4 border-t border-white/5 gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-[10px] text-text-variant font-mono">
            <span className="material-symbols-outlined text-[14px]">info</span>
            Default password is <span className="text-primary font-bold ml-1">admin123</span>
          </div>
          <div className="flex items-center gap-4 ml-auto flex-wrap">
            <SaveBanner status={dashStatus} />
            <button id="save-dash-password-btn" onClick={saveDashPassword}
              className="px-6 py-2.5 rounded-xl bg-tertiary text-bg-base font-bold font-mono text-sm uppercase tracking-wider hover:opacity-90 transition-opacity shadow-[0_0_12px_rgba(255,100,100,0.25)] flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">key</span>
              Change Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

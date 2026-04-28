import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { ref, set } from 'firebase/database';

// ── Helpers ──────────────────────────────────────────────────────────────────
function loadTelegramConfig() {
  return {
    botToken: localStorage.getItem('tg_bot_token') || '',
    chatId:   localStorage.getItem('tg_chat_id')   || '',
  };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SaveBanner({ status }) {
  if (status === 'idle') return null;
  const isOk  = status === 'ok';
  const isErr = status === 'error';
  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono transition-all
      ${isOk  ? 'bg-secondary/10 border border-secondary/30 text-secondary' : ''}
      ${isErr ? 'bg-tertiary/10  border border-tertiary/30  text-tertiary'  : ''}
    `}>
      <span className="material-symbols-outlined text-[14px]">
        {isOk ? 'check_circle' : 'error'}
      </span>
      {isOk ? 'Saved successfully.' : 'Save failed — check console.'}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Settings() {
  // ── Telegram state ─────────────────────────────────────────────────────────
  const [tgConfig, setTgConfig]       = useState(loadTelegramConfig);
  const [showToken, setShowToken]     = useState(false);
  const [tgStatus, setTgStatus]       = useState('idle'); // idle | saving | ok | error

  // ── Locker PIN state ───────────────────────────────────────────────────────
  const [lockerPin,      setLockerPin]      = useState('');
  const [lockerPinConfirm, setLockerPinConfirm] = useState('');
  const [pinStatus,      setPinStatus]      = useState('idle');
  const [pinError,       setPinError]       = useState('');

  // ── Dashboard password state ───────────────────────────────────────────────
  const [dashCurrent, setDashCurrent] = useState('');
  const [dashNew,     setDashNew]     = useState('');
  const [dashConfirm, setDashConfirm] = useState('');
  const [dashStatus,  setDashStatus]  = useState('idle');
  const [dashError,   setDashError]   = useState('');

  // ── Auto-clear banners ─────────────────────────────────────────────────────
  useEffect(() => { if (tgStatus  !== 'idle') { const t = setTimeout(() => setTgStatus('idle'),  3000); return () => clearTimeout(t); } }, [tgStatus]);
  useEffect(() => { if (pinStatus !== 'idle') { const t = setTimeout(() => setPinStatus('idle'), 3000); return () => clearTimeout(t); } }, [pinStatus]);
  useEffect(() => { if (dashStatus !== 'idle') { const t = setTimeout(() => setDashStatus('idle'), 3000); return () => clearTimeout(t); } }, [dashStatus]);

  // ── Telegram save ──────────────────────────────────────────────────────────
  const saveTelegram = async () => {
    setTgStatus('saving');
    try {
      localStorage.setItem('tg_bot_token', tgConfig.botToken.trim());
      localStorage.setItem('tg_chat_id',   tgConfig.chatId.trim());
      // Also push to Firebase so ESP32 can read it
      await set(ref(db, 'locker/config/telegram'), {
        botToken: tgConfig.botToken.trim(),
        chatId:   tgConfig.chatId.trim(),
      });
      setTgStatus('ok');
    } catch (err) {
      console.error('Telegram save failed:', err);
      setTgStatus('error');
    }
  };

  // ── Locker PIN save ────────────────────────────────────────────────────────
  const saveLockerPin = async () => {
    setPinError('');
    if (lockerPin.length < 4) { setPinError('PIN must be at least 4 characters.'); return; }
    if (lockerPin !== lockerPinConfirm) { setPinError('PINs do not match.'); return; }
    setPinStatus('saving');
    try {
      await set(ref(db, 'locker/config/password'), lockerPin.trim());
      setLockerPin('');
      setLockerPinConfirm('');
      setPinStatus('ok');
    } catch (err) {
      console.error('PIN save failed:', err);
      setPinStatus('error');
    }
  };

  // ── Dashboard password save ────────────────────────────────────────────────
  const saveDashPassword = () => {
    setDashError('');
    const stored = localStorage.getItem('dashboard_password') || 'admin123';
    if (dashCurrent !== stored) { setDashError('Current password is incorrect.'); return; }
    if (dashNew.length < 6)    { setDashError('New password must be at least 6 characters.'); return; }
    if (dashNew !== dashConfirm) { setDashError('New passwords do not match.'); return; }
    localStorage.setItem('dashboard_password', dashNew);
    setDashCurrent(''); setDashNew(''); setDashConfirm('');
    setDashStatus('ok');
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-text-variant font-mono uppercase tracking-widest mb-1">Configuration</p>
        <h1 className="font-manrope text-3xl font-bold tracking-widest uppercase text-text-primary">System Parameters</h1>
        <p className="text-sm text-text-variant font-mono mt-2">Manage Telegram alerts, locker PIN, and dashboard access credentials.</p>
      </div>

      {/* ── 1. Telegram Configuration ── */}
      <div className="glass-panel p-6 rounded-2xl">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-high">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">send</span>
            <div>
              <h2 className="font-manrope text-xl font-bold tracking-wider uppercase">Telegram Alerts</h2>
              <p className="text-xs text-text-variant font-mono mt-0.5">Bot token &amp; user ID are pushed to Firebase so the ESP32 picks them up.</p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-1 rounded bg-primary/10 text-primary font-mono uppercase tracking-wider border border-primary/20">
            Active Channel
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Bot Token */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-variant mb-1.5">
              Bot Token
            </label>
            <div className="relative">
              <input
                id="tg-bot-token"
                type={showToken ? 'text' : 'password'}
                value={tgConfig.botToken}
                onChange={e => setTgConfig(p => ({ ...p, botToken: e.target.value }))}
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUV..."
                className="w-full bg-bg-base border border-white/10 rounded-lg pl-4 pr-10 py-2.5 text-sm font-mono text-text-primary focus:outline-none focus:border-primary/50 transition-colors placeholder:text-text-variant/30"
              />
              <button
                type="button"
                onClick={() => setShowToken(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-variant hover:text-primary transition-colors"
                title={showToken ? 'Hide token' : 'Show token'}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {showToken ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            <p className="text-[10px] text-text-variant font-mono mt-1">
              Obtain from @BotFather on Telegram.
            </p>
          </div>

          {/* Chat / User ID */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-variant mb-1.5">
              User / Chat ID
            </label>
            <input
              id="tg-chat-id"
              type="text"
              value={tgConfig.chatId}
              onChange={e => setTgConfig(p => ({ ...p, chatId: e.target.value }))}
              placeholder="e.g. 123456789 or -100123456789"
              className="w-full bg-bg-base border border-white/10 rounded-lg px-4 py-2.5 text-sm font-mono text-text-primary focus:outline-none focus:border-primary/50 transition-colors placeholder:text-text-variant/30"
            />
            <p className="text-[10px] text-text-variant font-mono mt-1">
              Send a message to @userinfobot to get your ID.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-surface-high gap-4 flex-wrap">
          <SaveBanner status={tgStatus} />
          <button
            id="save-telegram-btn"
            onClick={saveTelegram}
            disabled={tgStatus === 'saving'}
            className="ml-auto px-6 py-2 rounded-lg bg-primary text-bg-base font-bold font-mono text-sm uppercase tracking-wider hover:bg-primary-fixed transition-colors shadow-[0_0_12px_rgba(129,236,255,0.3)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">
              {tgStatus === 'saving' ? 'progress_activity' : 'save'}
            </span>
            {tgStatus === 'saving' ? 'Saving...' : 'Save Telegram Config'}
          </button>
        </div>
      </div>

      {/* ── 2. Locker PIN ── */}
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary rounded-l-2xl" />

        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-surface-high">
          <span className="material-symbols-outlined text-secondary">pin</span>
          <div>
            <h2 className="font-manrope text-xl font-bold tracking-wider uppercase">Locker PIN</h2>
            <p className="text-xs text-text-variant font-mono mt-0.5">Updates the physical keypad password stored on Firebase. ESP32 picks it up on next poll.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-variant mb-1.5">
              New PIN
            </label>
            <input
              id="locker-pin-new"
              type="password"
              value={lockerPin}
              onChange={e => setLockerPin(e.target.value)}
              placeholder="Min. 4 characters"
              className="w-full bg-bg-base border border-white/10 rounded-lg px-4 py-2.5 text-sm font-mono text-text-primary focus:outline-none focus:border-secondary/50 transition-colors placeholder:text-text-variant/30"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-variant mb-1.5">
              Confirm New PIN
            </label>
            <input
              id="locker-pin-confirm"
              type="password"
              value={lockerPinConfirm}
              onChange={e => setLockerPinConfirm(e.target.value)}
              placeholder="Re-enter PIN"
              className="w-full bg-bg-base border border-white/10 rounded-lg px-4 py-2.5 text-sm font-mono text-text-primary focus:outline-none focus:border-secondary/50 transition-colors placeholder:text-text-variant/30"
            />
          </div>
        </div>

        {pinError && (
          <div className="flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-tertiary/10 border border-tertiary/30 text-tertiary text-xs font-mono">
            <span className="material-symbols-outlined text-[14px]">error</span>
            {pinError}
          </div>
        )}

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-surface-high gap-4 flex-wrap">
          <SaveBanner status={pinStatus} />
          <button
            id="save-locker-pin-btn"
            onClick={saveLockerPin}
            disabled={pinStatus === 'saving'}
            className="ml-auto px-6 py-2 rounded-lg bg-secondary text-bg-base font-bold font-mono text-sm uppercase tracking-wider hover:opacity-90 transition-opacity shadow-[0_0_12px_rgba(0,240,180,0.25)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">
              {pinStatus === 'saving' ? 'progress_activity' : 'lock_reset'}
            </span>
            {pinStatus === 'saving' ? 'Updating...' : 'Update Locker PIN'}
          </button>
        </div>
      </div>

      {/* ── 3. Dashboard Password ── */}
      <div className="glass-panel p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-tertiary rounded-l-2xl" />

        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-surface-high">
          <span className="material-symbols-outlined text-tertiary">manage_accounts</span>
          <div>
            <h2 className="font-manrope text-xl font-bold tracking-wider uppercase">Dashboard Password</h2>
            <p className="text-xs text-text-variant font-mono mt-0.5">Changes the admin login password for this web dashboard. Stored locally in your browser.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-variant mb-1.5">
              Current Password
            </label>
            <input
              id="dash-current-password"
              type="password"
              value={dashCurrent}
              onChange={e => setDashCurrent(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-bg-base border border-white/10 rounded-lg px-4 py-2.5 text-sm font-mono text-text-primary focus:outline-none focus:border-tertiary/50 transition-colors placeholder:text-text-variant/30"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-variant mb-1.5">
              New Password
            </label>
            <input
              id="dash-new-password"
              type="password"
              value={dashNew}
              onChange={e => setDashNew(e.target.value)}
              placeholder="Min. 6 characters"
              className="w-full bg-bg-base border border-white/10 rounded-lg px-4 py-2.5 text-sm font-mono text-text-primary focus:outline-none focus:border-tertiary/50 transition-colors placeholder:text-text-variant/30"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-widest text-text-variant mb-1.5">
              Confirm New Password
            </label>
            <input
              id="dash-confirm-password"
              type="password"
              value={dashConfirm}
              onChange={e => setDashConfirm(e.target.value)}
              placeholder="Re-enter password"
              className="w-full bg-bg-base border border-white/10 rounded-lg px-4 py-2.5 text-sm font-mono text-text-primary focus:outline-none focus:border-tertiary/50 transition-colors placeholder:text-text-variant/30"
            />
          </div>
        </div>

        {dashError && (
          <div className="flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-tertiary/10 border border-tertiary/30 text-tertiary text-xs font-mono">
            <span className="material-symbols-outlined text-[14px]">error</span>
            {dashError}
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-5 pt-4 border-t border-surface-high gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-[10px] text-text-variant font-mono">
            <span className="material-symbols-outlined text-[14px]">info</span>
            Default password is <span className="text-primary font-bold">admin123</span>
          </div>
          <div className="flex items-center gap-4 ml-auto flex-wrap">
            <SaveBanner status={dashStatus} />
            <button
              id="save-dash-password-btn"
              onClick={saveDashPassword}
              className="px-6 py-2 rounded-lg bg-tertiary text-bg-base font-bold font-mono text-sm uppercase tracking-wider hover:opacity-90 transition-opacity shadow-[0_0_12px_rgba(255,100,100,0.25)] flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">key</span>
              Change Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

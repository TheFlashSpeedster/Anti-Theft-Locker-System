import React, { useState, useMemo } from 'react';

// ── Helpers ──────────────────────────────────────────────────────────────────
const TYPE_COLORS = {
  success:  'bg-secondary/20 text-secondary border-secondary/30',
  info:     'bg-primary/20 text-primary border-primary/30',
  warning:  'bg-orange-500/20 text-orange-400 border-orange-500/30',
  critical: 'bg-tertiary/20 text-tertiary border-tertiary/30',
};
const TYPE_ICONS = {
  success: 'check_circle', info: 'info', warning: 'warning', critical: 'error',
};
const ALL_TYPES = ['success', 'info', 'warning', 'critical'];
const PAGE_SIZE = 15;

function badge(type) { return TYPE_COLORS[type] || 'bg-white/5 text-text-variant border-white/10'; }
function icon(type)  { return TYPE_ICONS[type]  || 'fiber_manual_record'; }

// Parse "DD/MM/YYYY HH:MM:SS" or fall back to ms field
function parseTs(log) {
  if (log.ms)        return log.ms;           // uptime ms (always present)
  if (log.timestamp) {
    const [dmy, hms] = log.timestamp.split(' ');
    if (dmy && hms) {
      const [d, m, y] = dmy.split('/');
      return new Date(`${y}-${m}-${d}T${hms}`).getTime();
    }
  }
  return 0;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function EventLog({ logs, onClearLogs }) {
  const [search,      setSearch]      = useState('');
  const [typeFilter,  setTypeFilter]  = useState('all');  // 'all' | one of ALL_TYPES
  const [window,      setWindow]      = useState('all');  // all | 24h | 7d | 30d
  const [showFilter,  setShowFilter]  = useState(false);
  const [page,        setPage]        = useState(1);
  const [clearConfirm, setClearConfirm] = useState(false);

  // Filtered + searched list — sorted newest-first by savedAt
  const filtered = useMemo(() => {
    const now = Date.now();
    const windowMs = { '24h': 86400000, '7d': 604800000, '30d': 2592000000 }[window];
    const q = search.toLowerCase();

    return [...logs]
      .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))
      .filter(log => {
        if (typeFilter !== 'all' && log.type !== typeFilter) return false;
        if (windowMs) {
          const ts = parseTs(log);
          if (ts > 0 && (now - ts) > windowMs) return false;
        }
        if (q && !(
          log.message?.toLowerCase().includes(q) ||
          log.type?.toLowerCase().includes(q) ||
          log.timestamp?.toLowerCase().includes(q)
        )) return false;
        return true;
      });
  }, [logs, search, typeFilter, window]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSlice  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Export CSV
  const exportCSV = () => {
    const header = 'Type,Timestamp,Message\n';
    const rows   = filtered.map(l =>
      `"${l.type}","${l.timestamp || ''}","${(l.message || '').replace(/"/g, '""')}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `aether-log-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const WINDOW_OPTS = [
    { v: 'all', l: 'All' },
    { v: '24h', l: '24H' },
    { v: '7d',  l: '7D'  },
    { v: '30d', l: '30D' },
  ];

  return (
    <div className="space-y-5 max-w-6xl mx-auto">

      {/* Clear confirmation overlay */}
      {clearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-panel rounded-2xl p-6 w-full max-w-sm border border-tertiary/30 shadow-[0_0_40px_rgba(255,80,80,0.15)]">
            <div className="flex items-start gap-3 mb-5">
              <span className="material-symbols-outlined text-tertiary text-2xl flex-shrink-0">delete_forever</span>
              <div>
                <h3 className="font-manrope font-black text-lg">Clear All Logs?</h3>
                <p className="text-xs font-mono text-text-variant mt-1">This permanently deletes all {logs.length} stored events from IndexedDB. This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setClearConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-text-variant font-mono text-sm hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <button onClick={async () => { setClearConfirm(false); await onClearLogs?.(); }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-tertiary/20 border border-tertiary/50 text-tertiary font-mono text-sm font-bold hover:bg-tertiary/30 transition-colors">
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs text-text-variant font-mono uppercase tracking-widest mb-1">Security Audit</p>
          <h1 className="font-manrope text-3xl font-bold tracking-widest uppercase text-text-primary">
            Event Log
          </h1>
          <p className="text-xs text-text-variant font-mono mt-1">{filtered.length} events · ESP32 in-memory ring buffer</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Time window */}
          <div className="flex bg-surface-container rounded-xl p-1 border border-white/8">
            {WINDOW_OPTS.map(o => (
              <button key={o.v} onClick={() => { setWindow(o.v); setPage(1); }}
                className={`px-3 py-1.5 text-[11px] font-mono rounded-lg transition-all
                  ${window === o.v ? 'bg-primary/20 text-primary' : 'text-text-variant hover:text-text-primary'}`}>
                {o.l}
              </button>
            ))}
          </div>

          {/* Export CSV */}
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-container border border-white/8 text-text-variant font-mono text-xs uppercase tracking-wider hover:bg-secondary/10 hover:text-secondary hover:border-secondary/30 transition-all">
            <span className="material-symbols-outlined text-[16px]">download</span>
            Export CSV
          </button>

          {/* Clear history */}
          {onClearLogs && (
            <button onClick={() => setClearConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-container border border-white/8 text-text-variant font-mono text-xs uppercase tracking-wider hover:bg-tertiary/10 hover:text-tertiary hover:border-tertiary/30 transition-all">
              <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main panel */}
      <div className="glass-panel rounded-2xl overflow-hidden flex flex-col">

        {/* Search + Filter bar */}
        <div className="p-3 border-b border-white/5 flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-variant text-[18px]">search</span>
              <input
                type="text"
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by keyword, type, or timestamp…"
                className="w-full bg-surface-container border border-white/8 rounded-xl py-2 pl-10 pr-4 text-sm font-mono text-text-primary focus:outline-none focus:border-primary/50 transition-all placeholder:text-text-variant/40"
              />
              {search && (
                <button onClick={() => { setSearch(''); setPage(1); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-variant hover:text-primary">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
            <button onClick={() => setShowFilter(v => !v)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border font-mono text-xs uppercase tracking-wider transition-all
                ${showFilter ? 'bg-primary/15 border-primary/40 text-primary' : 'bg-surface-container border-white/8 text-text-variant hover:text-text-primary'}`}>
              <span className="material-symbols-outlined text-[16px]">filter_list</span>
              Filter
              {typeFilter !== 'all' && (
                <span className="w-4 h-4 rounded-full bg-primary text-bg-base text-[9px] font-black flex items-center justify-center">1</span>
              )}
            </button>
          </div>

          {/* Expandable type filter chips — single choice (radio) */}
          {showFilter && (
            <div className="flex flex-wrap gap-2 pt-1">
              {/* All option */}
              <button onClick={() => { setTypeFilter('all'); setPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[11px] font-mono uppercase tracking-wider transition-all
                  ${typeFilter === 'all'
                    ? 'bg-white/10 border-white/30 text-text-primary'
                    : 'border-white/5 bg-white/5 text-text-variant/40 hover:text-text-variant'}`}>
                <span className="material-symbols-outlined text-[13px]">list_alt</span>
                All
              </button>
              {ALL_TYPES.map(t => (
                <button key={t} onClick={() => { setTypeFilter(t); setPage(1); }}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border text-[11px] font-mono uppercase tracking-wider transition-all
                    ${typeFilter === t
                      ? `border ${badge(t)}`
                      : 'border-white/5 bg-white/5 text-text-variant/40 hover:text-text-variant'}`}>
                  <span className="material-symbols-outlined text-[13px]">{icon(t)}</span>
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-surface-container border-b border-white/5 z-10">
              <tr className="text-[10px] uppercase font-mono tracking-widest text-text-variant">
                <th className="px-5 py-3 font-normal w-28">Type</th>
                <th className="px-5 py-3 font-normal w-44">Timestamp</th>
                <th className="px-5 py-3 font-normal">Event</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] font-mono text-sm">
              {pageSlice.map((log, i) => (
                <tr key={log.id ?? i} className="hover:bg-white/[0.03] transition-colors">
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-widest border font-bold ${badge(log.type)}`}>
                      <span className="material-symbols-outlined text-[13px]">{icon(log.type)}</span>
                      {log.type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-text-variant text-xs whitespace-nowrap">
                    {log.timestamp || '—'}
                  </td>
                  <td className={`px-5 py-3 ${log.type === 'critical' ? 'text-tertiary font-semibold' : 'text-text-primary'}`}>
                    {log.message}
                  </td>
                </tr>
              ))}
              {pageSlice.length === 0 && (
                <tr>
                  <td colSpan="3" className="px-6 py-16 text-center text-text-variant">
                    <span className="material-symbols-outlined text-5xl mb-3 block opacity-30">receipt_long</span>
                    <p className="font-mono text-sm">
                      {search || activeTypes.size < ALL_TYPES.length
                        ? 'No events match your filters.'
                        : 'No events recorded yet.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: count + pagination */}
        <div className="p-3 border-t border-white/5 flex items-center justify-between text-xs text-text-variant font-mono">
          <span>
            {filtered.length === 0 ? 'No entries' : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container hover:bg-primary/20 hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) => p === '…'
                ? <span key={i} className="w-8 h-8 flex items-center justify-center text-text-variant/40">…</span>
                : <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors
                      ${page === p ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-surface-container hover:bg-primary/10 hover:text-primary'}`}>
                    {p}
                  </button>
              )}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container hover:bg-primary/20 hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

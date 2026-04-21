import React from 'react';

export default function EventLog({ logs }) {
  const getBadgeStyle = (type) => {
    switch (type) {
      case 'success':
        return 'bg-secondary/20 text-secondary border border-secondary/30';
      case 'info':
        return 'bg-primary/20 text-primary border border-primary/30';
      case 'warning':
        return 'bg-orange-500/20 text-orange-400 border border-orange-500/30';
      case 'critical':
        return 'bg-tertiary/20 text-tertiary border border-tertiary/30';
      default:
        return 'bg-surface-high text-text-variant border border-white/10';
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success': return 'check_circle';
      case 'info': return 'info';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'fiber_manual_record';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto h-full flex flex-col">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
        <div>
          <p className="text-xs text-text-variant font-mono uppercase tracking-widest mb-1">Security Audit</p>
          <h1 className="font-manrope text-3xl font-bold tracking-widest uppercase text-text-primary">System Activity Ledger</h1>
        </div>
        <div className="flex gap-4">
          <div className="flex bg-surface-container rounded-lg p-1 border border-primary/20">
            <button className="px-4 py-1 text-xs font-mono rounded bg-primary/20 text-primary">24H</button>
            <button className="px-4 py-1 text-xs font-mono rounded text-text-variant hover:text-text-primary">7D</button>
            <button className="px-4 py-1 text-xs font-mono rounded text-text-variant hover:text-text-primary">30D</button>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container border border-white/10 text-text-variant font-mono text-xs uppercase tracking-wider hover:bg-surface-high transition-colors">
            <span className="material-symbols-outlined text-sm">download</span>
            Export CSV
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-2xl flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-surface-high flex gap-4">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-variant">search</span>
            <input 
              type="text" 
              placeholder="Search ledger ID, category, or keyword..." 
              className="w-full bg-surface-high border border-white/5 rounded-lg py-2 pl-10 pr-4 text-sm font-mono text-text-primary focus:outline-none focus:border-primary/50 focus:glow-primary transition-all placeholder:text-text-variant/50"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-high border border-white/5 text-text-variant font-mono text-xs uppercase tracking-wider hover:bg-surface-high/80 transition-colors">
            <span className="material-symbols-outlined text-sm">filter_list</span>
            Filters
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-surface-container border-b border-surface-high z-10 text-[10px] uppercase font-mono tracking-widest text-text-variant">
              <tr>
                <th className="px-6 py-4 font-normal">Status</th>
                <th className="px-6 py-4 font-normal">Timestamp</th>
                <th className="px-6 py-4 font-normal">Event Description</th>
                <th className="px-6 py-4 font-normal hidden md:table-cell">Device ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-high/50 font-mono text-sm">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-high/30 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] uppercase tracking-widest ${getBadgeStyle(log.type)}`}>
                      <span className="material-symbols-outlined text-[14px]">{getIcon(log.type)}</span>
                      {log.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-text-variant whitespace-nowrap text-xs">
                    {log.timestamp}
                  </td>
                  <td className={`px-6 py-4 ${log.type === 'critical' ? 'text-tertiary font-bold' : 'text-text-primary'}`}>
                    {log.message}
                  </td>
                  <td className="px-6 py-4 text-text-variant text-xs hidden md:table-cell">
                    #NODE-{Math.floor(Math.random() * 900) + 100}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-text-variant">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-50">receipt_long</span>
                    <p className="font-mono text-sm">No events recorded in the current ledger.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-4 border-t border-surface-high flex items-center justify-between text-xs text-text-variant font-mono">
          <span>Showing {logs.length} entries</span>
          <div className="flex gap-1">
            <button className="w-8 h-8 flex items-center justify-center rounded bg-surface-high hover:bg-primary/20 hover:text-primary transition-colors disabled:opacity-50" disabled>
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded bg-primary/20 text-primary border border-primary/30">1</button>
            <button className="w-8 h-8 flex items-center justify-center rounded bg-surface-high hover:bg-primary/20 hover:text-primary transition-colors disabled:opacity-50" disabled>
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    // Simulate a brief auth delay for realism
    setTimeout(() => {
      const storedPassword = localStorage.getItem('dashboard_password') || 'admin123';
      if (username === 'admin' && password === storedPassword) {
        localStorage.setItem('auth', 'true');
        onLogin();
      } else {
        setError('Invalid credentials. Access denied.');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-bg-base flex items-center justify-center relative overflow-hidden">
      {/* Background glow blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm mx-4">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 mb-4 glow-primary">
            <span className="material-symbols-outlined text-3xl text-primary">security</span>
          </div>
          <h1 className="font-manrope text-3xl font-bold tracking-widest text-primary glow-primary-text uppercase">
            Aether Sentinel
          </h1>
          <p className="text-xs text-text-variant font-mono mt-1 tracking-widest uppercase">
            Secure Access Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-panel rounded-2xl p-8 border border-primary/20">
          <div className="mb-6">
            <p className="text-[10px] font-mono uppercase tracking-widest text-text-variant mb-1">Authentication Required</p>
            <h2 className="font-manrope text-xl font-bold tracking-wider text-text-primary">Admin Login</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-text-variant mb-2">
                Username
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-variant text-[18px]">person</span>
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  className="w-full bg-bg-base border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm font-mono text-text-primary focus:outline-none focus:border-primary/60 transition-colors placeholder:text-text-variant/40"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-text-variant mb-2">
                Password
              </label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-variant text-[18px]">lock</span>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full bg-bg-base border border-white/10 rounded-lg pl-10 pr-4 py-3 text-sm font-mono text-text-primary focus:outline-none focus:border-primary/60 transition-colors placeholder:text-text-variant/40"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-tertiary/10 border border-tertiary/30">
                <span className="material-symbols-outlined text-tertiary text-[16px]">error</span>
                <p className="text-xs font-mono text-tertiary">{error}</p>
              </div>
            )}

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-primary text-bg-base font-bold font-mono text-sm uppercase tracking-widest hover:bg-primary-fixed transition-colors shadow-[0_0_20px_rgba(129,236,255,0.3)] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  Authenticating...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">login</span>
                  Access System
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-[10px] text-text-variant font-mono mt-6 opacity-50">
          AETHER SENTINEL v3.0.0 — RESTRICTED ACCESS
        </p>
      </div>
    </div>
  );
}

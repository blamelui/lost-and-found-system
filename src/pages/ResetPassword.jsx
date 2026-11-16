import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not reset password');
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050B14] px-4 py-10 font-sans text-white antialiased">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[#2A5CFF]/25 blur-[120px]"></div>
      <section className="relative w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-10">
          <h2 className="text-2xl font-semibold tracking-tight">Set a new password</h2>

          {!token ? (
            <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              Missing reset token. Use the link from your email.
            </p>
          ) : done ? (
            <p className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              Password updated. Redirecting to sign in…
            </p>
          ) : (
            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              {error && (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                  {error}
                </p>
              )}
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#A0B0D0]">
                  New password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl border border-white/10 bg-[#0A1128]/60 px-4 py-3 text-sm text-white placeholder-[#A0B0D0]/50 outline-none transition duration-200 focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-[#1C3F95] px-4 py-3.5 text-sm font-semibold text-white transition duration-200 hover:bg-[#2A5CFF] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-sm text-[#A0B0D0]">
            <Link to="/login" className="font-semibold text-white transition hover:text-[#2A5CFF]">
              Back to sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
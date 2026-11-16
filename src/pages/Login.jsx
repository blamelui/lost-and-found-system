import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false,
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const user = await login(formData.email.trim(), formData.password);
      navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050B14] px-4 py-10 sm:px-6 font-sans text-white antialiased">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[#2A5CFF]/25 blur-[120px]"></div>
      <div className="pointer-events-none absolute -bottom-48 -right-24 h-[24rem] w-[24rem] rounded-full bg-[#1C3F95]/40 blur-[120px]"></div>

      <section className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Lewis<span className="text-[#2A5CFF] drop-shadow-[0_0_18px_rgba(42,92,255,0.7)]">Find</span>
          </h1>
          <p className="mt-3 text-sm text-[#A0B0D0]">The Lewis College Lost &amp; Found</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-10">
          <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
          <p className="mt-1.5 text-sm text-[#A0B0D0]">Sign in to report or claim an item.</p>

          {error && (
            <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#A0B0D0]">
                College email
              </label>
              <input
                id="email"
                name="email"
                type="text"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="you@lewiscollege.edu"
                className="w-full rounded-xl border border-white/10 bg-[#0A1128]/60 px-4 py-3 text-sm text-white placeholder-[#A0B0D0]/50 outline-none transition duration-200 focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40 focus:shadow-[0_0_24px_rgba(42,92,255,0.35)]"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-[#A0B0D0]">
                  Password
                </label>
                <Link to="/forgot-password" className="text-sm font-medium text-[#2A5CFF] transition hover:text-white">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-white/10 bg-[#0A1128]/60 px-4 py-3 text-sm text-white placeholder-[#A0B0D0]/50 outline-none transition duration-200 focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40 focus:shadow-[0_0_24px_rgba(42,92,255,0.35)]"
              />
            </div>

            <label htmlFor="remember" className="flex cursor-pointer items-center gap-3 text-sm text-[#A0B0D0]">
              <input
                id="remember"
                name="remember"
                type="checkbox"
                checked={formData.remember}
                onChange={handleChange}
                className="h-4 w-4 rounded border-white/20 bg-[#0A1128]/60 accent-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40"
              />
              Keep me signed in
            </label>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-[#1C3F95] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(42,92,255,0.45)] transition duration-200 hover:scale-[1.02] hover:bg-[#2A5CFF] hover:shadow-[0_0_44px_rgba(42,92,255,0.65)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-[#A0B0D0]">
            New to LewisFind?{' '}
            <Link to="/register" className="font-semibold text-white transition hover:text-[#2A5CFF]">
              Create an account
            </Link>
          </p>
        </div>
        <p className="mt-6 text-center text-xs text-[#A0B0D0]/70">&copy; The Lewis College.</p>
      </section>
    </main>
  );
}
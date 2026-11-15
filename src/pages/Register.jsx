import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    fullname: '',
    student_id: '',
    email: '',
    password: '',
    confirm_password: '',
    terms: false,
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

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match.');
      return;
    }
    if (!formData.terms) {
      setError('You must agree to the Terms of Use.');
      return;
    }

    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullname: formData.fullname,
          student_id: formData.student_id,
          email: formData.email,
          password: formData.password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      // Persist the returned token so the user is logged in immediately
      localStorage.setItem('token', data.token);

      // Send them to the right landing page based on role
      const dest = data.user.role === 'admin' ? '/admin' : '/dashboard';
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050B14] px-4 py-10 sm:px-6 font-sans text-white antialiased">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[#2A5CFF]/25 blur-[120px]"></div>
      <div className="pointer-events-none absolute -bottom-48 -left-24 h-[24rem] w-[24rem] rounded-full bg-[#1C3F95]/40 blur-[120px]"></div>

      <section className="relative w-full max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Lewis<span className="text-[#2A5CFF] drop-shadow-[0_0_18px_rgba(42,92,255,0.7)]">Find</span>
          </h1>
          <p className="mt-3 text-sm text-[#A0B0D0]">The Lewis College Lost &amp; Found</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-10">
          <h2 className="text-2xl font-semibold tracking-tight">Create your account</h2>
          <p className="mt-1.5 text-sm text-[#A0B0D0]">Use your college details so we can match you with your items.</p>

          {error && (
            <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="fullname" className="mb-2 block text-sm font-medium text-[#A0B0D0]">Full name</label>
                <input
                  id="fullname" name="fullname" type="text" required
                  value={formData.fullname} onChange={handleChange}
                  placeholder="Juan Dela Cruz"
                  className="w-full rounded-xl border border-white/10 bg-[#0A1128]/60 px-4 py-3 text-sm text-white placeholder-[#A0B0D0]/50 outline-none transition duration-200 focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40 focus:shadow-[0_0_24px_rgba(42,92,255,0.35)]"
                />
              </div>
              <div>
                <label htmlFor="student_id" className="mb-2 block text-sm font-medium text-[#A0B0D0]">Student ID</label>
                <input
                  id="student_id" name="student_id" type="text" required
                  value={formData.student_id} onChange={handleChange}
                  placeholder="C-2024-0000"
                  className="w-full rounded-xl border border-white/10 bg-[#0A1128]/60 px-4 py-3 text-sm text-white placeholder-[#A0B0D0]/50 outline-none transition duration-200 focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40 focus:shadow-[0_0_24px_rgba(42,92,255,0.35)]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#A0B0D0]">College email</label>
              <input
                id="email" name="email" type="email" required
                value={formData.email} onChange={handleChange}
                placeholder="you@lewiscollege.edu"
                className="w-full rounded-xl border border-white/10 bg-[#0A1128]/60 px-4 py-3 text-sm text-white placeholder-[#A0B0D0]/50 outline-none transition duration-200 focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40 focus:shadow-[0_0_24px_rgba(42,92,255,0.35)]"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#A0B0D0]">Password</label>
                <input
                  id="password" name="password" type="password" required minLength="8"
                  value={formData.password} onChange={handleChange}
                  placeholder="At least 8 characters"
                  className="w-full rounded-xl border border-white/10 bg-[#0A1128]/60 px-4 py-3 text-sm text-white placeholder-[#A0B0D0]/50 outline-none transition duration-200 focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40 focus:shadow-[0_0_24px_rgba(42,92,255,0.35)]"
                />
              </div>
              <div>
                <label htmlFor="confirm_password" className="mb-2 block text-sm font-medium text-[#A0B0D0]">Confirm password</label>
                <input
                  id="confirm_password" name="confirm_password" type="password" required minLength="8"
                  value={formData.confirm_password} onChange={handleChange}
                  placeholder="Re-enter password"
                  className="w-full rounded-xl border border-white/10 bg-[#0A1128]/60 px-4 py-3 text-sm text-white placeholder-[#A0B0D0]/50 outline-none transition duration-200 focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40 focus:shadow-[0_0_24px_rgba(42,92,255,0.35)]"
                />
              </div>
            </div>

            <label htmlFor="terms" className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-[#A0B0D0]">
              <input
                id="terms" name="terms" type="checkbox" required
                checked={formData.terms} onChange={handleChange}
                className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-[#0A1128]/60 accent-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40"
              />
              <span>I agree to the <a href="#" className="font-medium text-white transition hover:text-[#2A5CFF]">Terms of Use</a> and the <a href="#" className="font-medium text-white transition hover:text-[#2A5CFF]">Privacy Policy</a>.</span>
            </label>

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-[#1C3F95] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(42,92,255,0.45)] transition duration-200 hover:scale-[1.02] hover:bg-[#2A5CFF] hover:shadow-[0_0_44px_rgba(42,92,255,0.65)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-[#A0B0D0]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-white transition hover:text-[#2A5CFF]">
              Sign in
            </Link>
          </p>
        </div>
        <p className="mt-6 text-center text-xs text-[#A0B0D0]/70">&copy; The Lewis College.</p>
      </section>
    </main>
  );
}
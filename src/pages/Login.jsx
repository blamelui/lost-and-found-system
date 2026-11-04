import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // 1. Added useNavigate here

export default function Login() {
  const navigate = useNavigate(); // 2. Added it here, right at the top of the component

  // React State for form inputs
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    remember: false
  });

  // Event handler for typing in inputs
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Event handler for submitting the form
  const handleSubmit = (e) => {
    e.preventDefault(); // Stop page reload
    console.log('Login Data Submitted:', formData);
    
    // Simulate successful login and redirect to Dashboard
    navigate('/dashboard'); // 3. Added the redirect here
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050B14] px-4 py-10 sm:px-6 font-sans text-white antialiased">
      {/* Ambient glow */}
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

          <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#A0B0D0]">College email</label>
              <input
                id="email" name="email" type="email" required
                value={formData.email}
                onChange={handleChange}
                placeholder="you@lewiscollege.edu"
                className="w-full rounded-xl border border-white/10 bg-[#0A1128]/60 px-4 py-3 text-sm text-white placeholder-[#A0B0D0]/50 outline-none transition duration-200 focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40 focus:shadow-[0_0_24px_rgba(42,92,255,0.35)]"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-[#A0B0D0]">Password</label>
                <a href="#" className="text-sm font-medium text-[#2A5CFF] transition hover:text-white">Forgot password?</a>
              </div>
              <input
                id="password" name="password" type="password" required
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className="w-full rounded-xl border border-white/10 bg-[#0A1128]/60 px-4 py-3 text-sm text-white placeholder-[#A0B0D0]/50 outline-none transition duration-200 focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40 focus:shadow-[0_0_24px_rgba(42,92,255,0.35)]"
              />
            </div>

            <label htmlFor="remember" className="flex cursor-pointer items-center gap-3 text-sm text-[#A0B0D0]">
              <input
                id="remember" name="remember" type="checkbox"
                checked={formData.remember}
                onChange={handleChange}
                className="h-4 w-4 rounded border-white/20 bg-[#0A1128]/60 accent-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40"
              />
              Keep me signed in
            </label>

            <button
              type="submit"
              className="w-full rounded-xl bg-[#1C3F95] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(42,92,255,0.45)] transition duration-200 hover:scale-[1.02] hover:bg-[#2A5CFF] hover:shadow-[0_0_44px_rgba(42,92,255,0.65)] active:scale-[0.99]"
            >
              Sign in
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
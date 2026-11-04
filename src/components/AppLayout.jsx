import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

export default function AppLayout() {
  const location = useLocation();

  // Helper function to highlight the active link
  const getLinkClass = (path) => {
    const baseClass = "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition duration-200 ";
    if (location.pathname === path) {
      return baseClass + "bg-[#2A5CFF]/15 text-white shadow-[inset_0_0_0_1px_rgba(42,92,255,0.35),0_0_24px_rgba(42,92,255,0.18)]";
    }
    return baseClass + "text-[#A0B0D0] hover:bg-white/5 hover:text-white";
  };

  return (
    <div className="min-h-screen bg-[#050B14] font-['Inter',system-ui,sans-serif] text-white antialiased">
      
      {/* Ambient glow behind everything */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 right-0 h-[30rem] w-[30rem] rounded-full bg-[#2A5CFF]/15 blur-[130px]"></div>
        <div className="absolute bottom-0 left-1/3 h-[24rem] w-[24rem] rounded-full bg-[#1C3F95]/25 blur-[130px]"></div>
      </div>

      {/* Mobile menu toggle (CSS only) */}
      <input id="nav-toggle" type="checkbox" className="peer sr-only" />
      <label htmlFor="nav-toggle" className="fixed inset-0 z-30 hidden bg-black/60 backdrop-blur-sm peer-checked:block lg:!hidden" aria-label="Close menu"></label>

      {/* ============ SIDEBAR ============ */}
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[250px] -translate-x-full flex-col border-r border-white/10 bg-[#050B14]/80 backdrop-blur-xl transition-transform duration-300 ease-out peer-checked:translate-x-0 lg:translate-x-0">
        
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-6">
          <Link to="/dashboard" className="text-2xl font-bold tracking-tight">
            Lewis<span className="text-[#2A5CFF] drop-shadow-[0_0_14px_rgba(42,92,255,0.7)]">Find</span>
          </Link>
          <label htmlFor="nav-toggle" className="cursor-pointer rounded-lg p-2 text-[#A0B0D0] transition hover:bg-white/5 hover:text-white lg:hidden">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18"/></svg>
          </label>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 text-xs font-medium text-[#A0B0D0]/60">Menu</p>

          <Link to="/dashboard" className={getLinkClass('/dashboard')}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/></svg>
            Dashboard
          </Link>

          <Link to="/report-lost" className={getLinkClass('/report-lost')}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Report Lost
          </Link>

          <Link to="/report-found" className={getLinkClass('/report-found')}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            Report Found
          </Link>

          <Link to="/search" className={getLinkClass('/search')}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2m0 0A7.5 7.5 0 105.2 5.2a7.5 7.5 0 0010.6 10.6z"/></svg>
            Search
          </Link>

        
          <Link to="/admin" className={getLinkClass('/admin')}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            Admin Panel
          </Link>
        </nav>

        {/* Logout */}
        <div className="shrink-0 border-t border-white/10 p-4">
          <Link to="/" className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#A0B0D0] transition duration-200 hover:bg-red-500/10 hover:text-red-300">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"/></svg>
            Logout
          </Link>
        </div>
      </aside>

      {/* ============ RIGHT SIDE: HEADER + MAIN ============ */}
      <div className="flex min-h-screen flex-col lg:pl-[250px]">

        {/* Top navbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-white/10 bg-[#050B14]/70 px-4 backdrop-blur-xl sm:gap-4 sm:px-6 lg:px-8">
          
          <label htmlFor="nav-toggle" className="cursor-pointer rounded-lg p-2 text-[#A0B0D0] transition hover:bg-white/5 hover:text-white lg:hidden">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
          </label>

          <form className="relative min-w-0 flex-1 sm:max-w-md" role="search">
            <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A0B0D0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2m0 0A7.5 7.5 0 105.2 5.2a7.5 7.5 0 0010.6 10.6z"/></svg>
            <input type="search" placeholder="Search lost or found items" className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-[#A0B0D0]/60 outline-none transition duration-200 focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40 focus:shadow-[0_0_24px_rgba(42,92,255,0.3)]" />
          </form>

          <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
            <button type="button" className="relative rounded-xl border border-white/10 bg-white/5 p-2.5 text-[#A0B0D0] transition duration-200 hover:scale-105 hover:border-[#2A5CFF]/50 hover:text-white hover:shadow-[0_0_20px_rgba(42,92,255,0.35)]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8"><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"/></svg>
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#2A5CFF] shadow-[0_0_8px_rgba(42,92,255,1)] ring-2 ring-[#050B14]"></span>
            </button>

            <div className="flex items-center gap-3 rounded-xl py-1 pl-1 pr-1 sm:pr-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#2A5CFF] to-[#1C3F95] text-sm font-semibold shadow-[0_0_16px_rgba(42,92,255,0.5)] ring-1 ring-white/20">JD</span>
              <span className="hidden text-left leading-tight sm:block">
                <span className="block text-sm font-semibold">Juan Dela Cruz</span>
                <span className="block text-xs text-[#A0B0D0]">Student</span>
              </span>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {/* This is where the pages will render! */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
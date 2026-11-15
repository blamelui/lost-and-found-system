import React, { useEffect, useState } from 'react';
import { NavLink, Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Icon = {
  dashboard: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  ),
  search: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2m0 0A7.5 7.5 0 105.2 5.2a7.5 7.5 0 0010.6 10.6z" />
    </svg>
  ),
  lost: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  found: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  claims: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3-12h.75a2.25 2.25 0 012.25 2.25v12a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-12A2.25 2.25 0 016 5.25h.75m6 0V4.5a1.5 1.5 0 00-3 0v.75m6 0h-3M9 5.25h.75" />
    </svg>
  ),
  admin: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  signOut: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  ),
  bell: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </svg>
  ),
};

function NavItem({ to, icon, label, badge }) {
  return (
    <NavLink
      to={to}
      end={to === '/dashboard'}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition ${
          isActive
            ? 'bg-[#2A5CFF]/15 text-white shadow-[inset_0_0_0_1px_rgba(42,92,255,0.35),0_0_20px_rgba(42,92,255,0.15)]'
            : 'text-[#A0B0D0] hover:bg-white/[0.04] hover:text-white'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <span className={`absolute left-0 top-1/2 h-5 -translate-y-1/2 rounded-r-full transition-all duration-200 ${
            isActive ? 'w-0.5 bg-[#2A5CFF] shadow-[0_0_8px_rgba(42,92,255,0.9)]' : 'w-0'
          }`} />
          <span className={`shrink-0 transition ${isActive ? 'text-[#2A5CFF]' : 'opacity-70 group-hover:opacity-100'}`}>
            {icon}
          </span>
          <span className="flex-1 truncate">{label}</span>
          {badge != null && badge > 0 && (
            <span className="grid h-4 min-w-[1rem] shrink-0 place-items-center rounded-full bg-[#2A5CFF] px-1 text-[9px] font-semibold text-white shadow-[0_0_8px_rgba(42,92,255,0.8)]">
              {badge > 9 ? '9+' : badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="mb-1.5 mt-4 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#A0B0D0]/60 first:mt-0">
      {children}
    </p>
  );
}

/* ---------- Notification meta ---------- */
const notifMeta = {
  claim_approved:        { icon: '✓', color: 'text-emerald-300 bg-emerald-500/15' },
  claim_rejected:        { icon: '✕', color: 'text-red-300 bg-red-500/15' },
  claim_submitted:       { icon: '↗', color: 'text-[#2A5CFF] bg-[#2A5CFF]/15' },
  new_claim_pending:     { icon: '!', color: 'text-amber-300 bg-amber-500/15' },
  possible_match_found:  { icon: '🔍', color: 'text-[#A0B0D0] bg-white/[0.06]' },
  lost_report_received:  { icon: '↗', color: 'text-red-300 bg-red-500/15' },
  found_report_received: { icon: '↗', color: 'text-emerald-300 bg-emerald-500/15' },
  high_urgency_report:   { icon: '!', color: 'text-amber-300 bg-amber-500/15' },
};

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    setUserMenuOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function load() {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [listRes, countRes] = await Promise.all([
          fetch(`${API_BASE}/api/notifications?limit=15`, { headers }),
          fetch(`${API_BASE}/api/notifications/unread-count`, { headers }),
        ]);
        if (cancelled) return;
        if (listRes.ok) setNotifications(await listRes.json());
        if (countRes.ok) setUnreadCount((await countRes.json()).count);
      } catch {}
    }
    load();
    const t = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, [token]);

  async function openNotification(n) {
    try {
      if (!n.is_read) {
        await fetch(`${API_BASE}/api/notifications/${n.id}/read`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        setUnreadCount((c) => Math.max(0, c - 1));
        setNotifications((list) =>
          list.map((x) => (x.id === n.id ? { ...x, is_read: 1 } : x))
        );
      }
    } catch {}
    setNotifOpen(false);
    if (n.link) navigate(n.link);
  }

  async function markAllRead() {
    try {
      await fetch(`${API_BASE}/api/notifications/read-all`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnreadCount(0);
      setNotifications((list) => list.map((n) => ({ ...n, is_read: 1 })));
    } catch {}
  }

  const isAdmin = user?.role === 'admin';
  const displayName = user?.username || 'Guest';
  const initials = (user?.username || '?').slice(0, 2).toUpperCase();
  const roleLabel = isAdmin ? 'Admin' : 'Student';
  const roleBadgeClass = isAdmin
    ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
    : 'border-blue-500/40 bg-blue-500/10 text-blue-300';

  return (
    <div className="min-h-screen bg-[#050B14] font-['Inter',system-ui,sans-serif] text-white antialiased">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 right-0 h-[30rem] w-[30rem] rounded-full bg-[#2A5CFF]/10 blur-[130px]" />
        <div className="absolute bottom-0 left-1/3 h-[24rem] w-[24rem] rounded-full bg-[#1C3F95]/20 blur-[130px]" />
      </div>

      <div
        onClick={() => setMobileOpen(false)}
        className={`fixed inset-0 z-30 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden="true"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col border-r border-white/10 bg-[#050B14]/95 backdrop-blur-xl transition-transform duration-300 ease-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/10 px-5">
          <NavLink to="/dashboard" className="text-xl font-bold tracking-tight">
            Lewis<span className="text-[#2A5CFF] drop-shadow-[0_0_14px_rgba(42,92,255,0.7)]">Find</span>
          </NavLink>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-1.5 text-[#A0B0D0] transition hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <SectionLabel>Menu</SectionLabel>
          <div className="space-y-1">
            <NavItem to="/dashboard" icon={Icon.dashboard} label="Dashboard" />
            <NavItem to="/search" icon={Icon.search} label="Search" />
            <NavItem to="/claims" icon={Icon.claims} label="My Claims" />
          </div>

          <SectionLabel>Report an item</SectionLabel>
          <div className="space-y-1">
            <NavLink
              to="/report-lost"
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl border px-3 py-2 text-[13px] font-medium transition ${
                  isActive
                    ? 'border-red-500/50 bg-red-500/15 text-red-200 shadow-[0_0_18px_rgba(239,68,68,0.25)]'
                    : 'border-red-500/20 bg-red-500/[0.06] text-red-300 hover:border-red-500/40 hover:bg-red-500/[0.12]'
                }`
              }
            >
              <span className="shrink-0">{Icon.lost}</span>
              <span className="flex-1 truncate">Report Lost</span>
              <span className="text-[10px] text-red-300/60">+</span>
            </NavLink>
            <NavLink
              to="/report-found"
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl border px-3 py-2 text-[13px] font-medium transition ${
                  isActive
                    ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.25)]'
                    : 'border-emerald-500/20 bg-emerald-500/[0.06] text-emerald-300 hover:border-emerald-500/40 hover:bg-emerald-500/[0.12]'
                }`
              }
            >
              <span className="shrink-0">{Icon.found}</span>
              <span className="flex-1 truncate">Report Found</span>
              <span className="text-[10px] text-emerald-300/60">+</span>
            </NavLink>
          </div>

          {isAdmin && (
            <>
              <SectionLabel>Admin</SectionLabel>
              <div className="space-y-1">
                <NavItem to="/admin" icon={Icon.admin} label="Admin Panel" />
              </div>
            </>
          )}
        </nav>

        <div className="shrink-0 border-t border-white/10 p-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-2.5 py-2 text-left transition hover:bg-white/[0.06]"
            >
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#2A5CFF] to-[#1C3F95] text-[11px] font-semibold shadow-[0_0_14px_rgba(42,92,255,0.5)] ring-1 ring-white/20">
                {initials}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-white">{displayName}</span>
                <span className={`mt-0.5 inline-block rounded-full border px-1.5 py-0 text-[9px] uppercase tracking-wide ${roleBadgeClass}`}>
                  {roleLabel}
                </span>
              </span>
              <svg
                className={`h-3.5 w-3.5 shrink-0 text-[#A0B0D0] transition-transform ${userMenuOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 overflow-hidden rounded-xl border border-white/10 bg-[#0A1128] shadow-2xl backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => { logout(); navigate('/login', { replace: true }); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
                >
                  {Icon.signOut}
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:pl-[250px]">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-white/10 bg-[#050B14]/80 px-4 backdrop-blur-xl sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-1.5 text-[#A0B0D0] transition hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Open menu"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link
            to="/search"
            className="flex flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-[#A0B0D0] transition hover:bg-white/[0.06] hover:text-white sm:max-w-md"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2m0 0A7.5 7.5 0 105.2 5.2a7.5 7.5 0 0010.6 10.6z" />
            </svg>
            <span className="flex-1 truncate text-left">Search lost &amp; found items…</span>
            <span className="hidden rounded border border-white/10 bg-white/5 px-1 py-0 text-[9px] sm:inline">⌘K</span>
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen((v) => !v)}
              className="relative rounded-lg border border-white/10 bg-white/[0.03] p-2 text-[#A0B0D0] transition hover:bg-white/[0.06] hover:text-white"
              aria-label="Notifications"
            >
              {Icon.bell}
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[1rem] place-items-center rounded-full bg-[#2A5CFF] px-1 text-[9px] font-semibold text-white shadow-[0_0_8px_rgba(42,92,255,0.8)] ring-2 ring-[#050B14]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <>
                <div
                  onClick={() => setNotifOpen(false)}
                  className="fixed inset-0 z-40"
                  aria-hidden="true"
                />
                <div className="absolute right-0 top-full z-50 mt-2 w-[22rem] overflow-hidden rounded-xl border border-white/15 bg-[#0A1128] shadow-2xl backdrop-blur-xl">
                  <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
                    <p className="text-xs font-semibold text-white">Notifications</p>
                    {unreadCount > 0 && (
                      <button
                        onClick={markAllRead}
                        className="text-[10px] text-[#2A5CFF] hover:text-white"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-[26rem] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center">
                        <p className="text-xs text-[#A0B0D0]">No notifications yet.</p>
                      </div>
                    ) : (
                      <ul className="divide-y divide-white/5">
                        {notifications.map((n) => {
                          const meta = notifMeta[n.type] || { icon: '•', color: 'text-[#A0B0D0] bg-white/[0.06]' };
                          return (
                            <li key={n.id}>
                              <button
                                onClick={() => openNotification(n)}
                                className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition hover:bg-white/[0.04] ${
                                  !n.is_read ? 'bg-[#2A5CFF]/[0.06]' : ''
                                }`}
                              >
                                <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${meta.color}`}>
                                  {meta.icon}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-start gap-1.5">
                                    <span className={`flex-1 text-xs font-medium ${!n.is_read ? 'text-white' : 'text-[#A0B0D0]'}`}>
                                      {n.title}
                                    </span>
                                    {!n.is_read && (
                                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#2A5CFF] shadow-[0_0_6px_rgba(42,92,255,0.9)]" />
                                    )}
                                  </span>
                                  {n.body && (
                                    <span className="mt-0.5 block line-clamp-2 text-[11px] text-[#A0B0D0]">
                                      {n.body}
                                    </span>
                                  )}
                                  <span className="mt-0.5 block text-[10px] text-[#A0B0D0]/60">
                                    {fmtTime(n.created_at)}
                                  </span>
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>

                  <div className="border-t border-white/10 px-3 py-2 text-center">
                    <Link to="/claims" onClick={() => setNotifOpen(false)} className="text-[10px] text-[#A0B0D0] hover:text-white">
                      View all claims
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
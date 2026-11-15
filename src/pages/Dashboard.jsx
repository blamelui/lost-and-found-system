import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const POLL_MS = 15000;

const statusColor = {
  lost: 'bg-red-500/15 text-red-300 border-red-500/30',
  found: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  claimed: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  rejected: 'bg-red-500/15 text-red-300 border-red-500/30',
};

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
      <p className="text-xs uppercase tracking-wider text-[#A0B0D0]">{label}</p>
      <p className={`mt-2 text-3xl font-semibold ${accent || 'text-white'}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-[#A0B0D0]">{sub}</p>}
    </div>
  );
}

function StatusPill({ status }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${statusColor[status] || 'border-white/20 text-white/70'}`}>
      {status}
    </span>
  );
}

function ItemRow({ item, isNew, isLeaving }) {
  return (
    <li
      className={`flex items-start justify-between gap-3 py-3 transition-all duration-500 ${
        isNew ? 'bg-emerald-500/[0.08] -mx-2 px-2 rounded-lg' : ''
      } ${isLeaving ? 'opacity-0 -translate-x-2' : ''}`}
    >
      <div className="min-w-0 flex-1">
        <Link
          to={`/items/${item.id}`}
          className="truncate text-sm text-white transition hover:text-[#2A5CFF]"
        >
          {item.title}
        </Link>
        <p className="mt-0.5 text-xs text-[#A0B0D0]">
          by {item.reporter} · {new Date(item.created_at).toLocaleString()}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <StatusPill status={item.status} />
          {item.claim_status ? (
            <StatusPill status={item.claim_status} />
          ) : (
            <span className="text-[10px] uppercase tracking-wide text-[#A0B0D0]">Unclaimed</span>
          )}
          {item.claim_requires_proof && (
            <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-violet-300">
              Proof required
            </span>
          )}
          {isNew && (
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-emerald-300">
              ✦ New
            </span>
          )}
        </div>
      </div>
    </li>
  );
}

function ItemList({ items, emptyText, emptyCta, prevIds }) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-5 text-center">
        <p className="text-sm text-[#A0B0D0]">{emptyText}</p>
        {emptyCta && (
          <Link to={emptyCta.to} className={`mt-2 inline-block rounded-lg px-3 py-1.5 text-xs font-medium ${emptyCta.className}`}>
            {emptyCta.label}
          </Link>
        )}
      </div>
    );
  }
  return (
    <ul className="divide-y divide-white/5">
      {items.map((it) => (
        <ItemRow
          key={it.id}
          item={it}
          isNew={prevIds && !prevIds.has(it.id)}
        />
      ))}
    </ul>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const prevLostIds = useRef(new Set());
  const prevFoundIds = useRef(new Set());

  async function load(showSpinner = false) {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await fetch(`${API_BASE}/api/dashboard`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(() => load(false), POLL_MS);
    const onFocus = () => load(false);
    const onVisible = () => { if (document.visibilityState === 'visible') load(false); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(t);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 backdrop-blur-xl">
        <p className="text-sm text-[#A0B0D0]">Loading dashboard…</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="grid min-h-[60vh] place-items-center rounded-3xl border border-dashed border-red-500/30 bg-red-500/[0.05] p-8 text-center backdrop-blur-xl">
        <div>
          <h2 className="text-lg font-semibold text-red-300">Could not load dashboard</h2>
          <p className="mt-1 text-sm text-[#A0B0D0]">{error}</p>
          <p className="mt-3 text-xs text-[#A0B0D0]">Make sure the API is running: <code>npm run server</code></p>
        </div>
      </div>
    );
  }

  const { stats, recentItems, recentClaims } = data;

  // A lost item is "resolved" if a found report has been linked to it.
  // It appears in Recent Found as the current state and is hidden from Recent Lost.
  const resolvedLostIds = new Set(
    recentItems
      .filter((i) => Number(i.resolved_by_found_count) > 0)
      .map((i) => i.id)
  );

  const recentLost = recentItems
    .filter((i) => i.status === 'lost' && !resolvedLostIds.has(i.id))
    .slice(0, 5);

  const recentFound = recentItems
    .filter((i) => i.status === 'found')
    .slice(0, 5);

  const newLostIds = new Set(recentLost.map((i) => i.id));
  const newFoundIds = new Set(recentFound.map((i) => i.id));

  const lostChanged = [...newLostIds].some((id) => !prevLostIds.current.has(id));
  const foundChanged = [...newFoundIds].some((id) => !prevFoundIds.current.has(id));

  if (lostChanged || foundChanged) {
    prevLostIds.current = newLostIds;
    prevFoundIds.current = newFoundIds;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-[#A0B0D0]">
            Overview of lost &amp; found activity across the campus.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {lastUpdated && (
            <span className="text-[10px] uppercase tracking-wider text-[#A0B0D0]/60">
              Updated {lastUpdated.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white/80 transition hover:bg-white/[0.06] disabled:opacity-40"
            aria-label="Refresh"
          >
            <span className="flex items-center gap-1.5">
              <svg className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </span>
          </button>
          <Link
            to="/report-lost"
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-500/20"
          >
            + Report Lost
          </Link>
          <Link
            to="/report-found"
            className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/20"
          >
            + Report Found
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Items Reported"
          value={stats.items.total}
          sub={`${stats.items.lost} lost · ${stats.items.found} found · ${stats.items.claimed} claimed`}
        />
        <StatCard
          label="Claims"
          value={stats.claims.total}
          sub={`${stats.claims.pending} pending · ${stats.claims.approved} approved`}
          accent="text-amber-300"
        />
        <StatCard
          label="Pending Claims"
          value={stats.claims.pending}
          sub="Awaiting review"
          accent="text-amber-300"
        />
      </div>

      {/* Recent Lost + Recent Found */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              Recent Lost Items
            </h2>
            <Link to="/search" className="text-xs text-[#A0B0D0] transition hover:text-white">
              View all →
            </Link>
          </div>
          <ItemList
            items={recentLost}
            prevIds={prevLostIds.current}
            emptyText="No active lost items reported yet."
            emptyCta={{
              to: '/report-lost',
              label: '+ Report a Lost Item',
              className: 'bg-red-500/15 text-red-300 hover:bg-red-500/25',
            }}
          />
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Recent Found Items
            </h2>
            <Link to="/search" className="text-xs text-[#A0B0D0] transition hover:text-white">
              View all →
            </Link>
          </div>
          <ItemList
            items={recentFound}
            prevIds={prevFoundIds.current}
            emptyText="No found items reported yet."
            emptyCta={{
              to: '/report-found',
              label: '+ Report a Found Item',
              className: 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25',
            }}
          />
        </div>
      </div>

      {/* Recent Claims */}
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight">Recent Claims</h2>
          <Link to="/claims" className="text-xs text-[#A0B0D0] transition hover:text-white">
            View all →
          </Link>
        </div>
        {recentClaims.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-5 text-center">
            <p className="text-sm text-[#A0B0D0]">No claims yet.</p>
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {recentClaims.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">{c.item_title}</p>
                  <p className="text-xs text-[#A0B0D0]">
                    by {c.claimant} · {new Date(c.claim_date).toLocaleString()}
                  </p>
                </div>
                <StatusPill status={c.status} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
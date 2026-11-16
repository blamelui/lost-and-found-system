import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const statusMeta = {
  pending:  { label: 'Pending verification', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  approved: { label: 'Approved',             cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  rejected: { label: 'Rejected',             cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
};

const filters = [
  { value: 'all',      label: 'All' },
  { value: 'pending',  label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

function Pill({ text, className = '' }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${className}`}>
      {text}
    </span>
  );
}

export default function MyClaims() {
  const { token } = useAuth();

  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/claims/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setClaims(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) load();
  }, [token]);

  const filtered = useMemo(() => {
    if (filter === 'all') return claims;
    return claims.filter((c) => c.status === filter);
  }, [claims, filter]);

  const counts = useMemo(() => {
    return {
      all: claims.length,
      pending: claims.filter((c) => c.status === 'pending').length,
      approved: claims.filter((c) => c.status === 'approved').length,
      rejected: claims.filter((c) => c.status === 'rejected').length,
    };
  }, [claims]);

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 backdrop-blur-xl">
        <p className="text-sm text-[#A0B0D0]">Loading your claims…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid min-h-[40vh] place-items-center rounded-3xl border border-dashed border-red-500/30 bg-red-500/[0.05] p-8 text-center backdrop-blur-xl">
        <div>
          <h2 className="text-lg font-semibold text-red-300">Could not load your claims</h2>
          <p className="mt-1 text-sm text-[#A0B0D0]">{error}</p>
          <button
            onClick={load}
            className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/[0.06]"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full space-y-5">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        <div className="absolute -top-32 right-0 h-[22rem] w-[22rem] rounded-full bg-[#2A5CFF]/10 blur-[120px]" />
        <div className="absolute -bottom-32 -left-16 h-[20rem] w-[20rem] rounded-full bg-amber-500/10 blur-[120px]" />
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Claims</h1>
          <p className="mt-1 text-sm text-[#A0B0D0]">
            Track the status of items you've claimed.
          </p>
        </div>
        <button
          onClick={load}
          className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white/80 transition hover:bg-white/[0.06]"
        >
          Refresh
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {filters.map((f) => {
          const active = filter === f.value;
          const count = counts[f.value];
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? 'border-[#2A5CFF]/40 bg-[#2A5CFF]/15 text-white'
                  : 'border-white/10 bg-white/[0.02] text-[#A0B0D0] hover:bg-white/[0.05] hover:text-white'
              }`}
            >
              {f.label}
              {count > 0 && (
                <span
                  className={`rounded-full px-1.5 text-[10px] ${
                    active ? 'bg-white/15 text-white' : 'bg-white/[0.06] text-[#A0B0D0]'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Empty state */}
      {claims.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center backdrop-blur-xl">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/[0.04]">
            <svg className="h-6 w-6 text-[#A0B0D0]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3-12h.75a2.25 2.25 0 012.25 2.25v12a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-12A2.25 2.25 0 016 5.25h.75m6 0V4.5a1.5 1.5 0 00-3 0v.75m6 0h-3M9 5.25h.75" />
            </svg>
          </div>
          <p className="mt-3 text-base font-medium text-white">No claims yet</p>
          <p className="mt-1 text-sm text-[#A0B0D0]">
            When you claim a found item, it will show up here so you can track its status.
          </p>
          <Link
            to="/search"
            className="mt-4 inline-block rounded-lg bg-gradient-to-r from-[#2A5CFF] to-[#1C3F95] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(42,92,255,0.4)] transition hover:scale-[1.02]"
          >
            Browse found items
          </Link>
        </div>
      )}

      {/* Empty filtered view */}
      {claims.length > 0 && filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-6 text-center backdrop-blur-xl">
          <p className="text-sm text-[#A0B0D0]">
            No claims with status "{filter}".
          </p>
          <button
            onClick={() => setFilter('all')}
            className="mt-2 text-xs text-[#2A5CFF] transition hover:text-white"
          >
            Show all
          </button>
        </div>
      )}

      {/* Claim cards */}
      {filtered.length > 0 && (
        <ul className="space-y-3">
          {filtered.map((c) => {
            const s = statusMeta[c.status] || statusMeta.pending;
            const imageUrl = c.item_image_url ? `http://localhost:5000${c.item_image_url}` : null;
            const isOpen = expanded === c.id;

            return (
              <li key={c.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
                {/* Summary row */}
                <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start">
                  {/* Thumbnail */}
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/30">
                    {imageUrl ? (
                      <img src={imageUrl} alt={c.item_title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <svg className="h-5 w-5 text-[#A0B0D0]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Pill text={s.label} className={s.cls} />
                      <Pill
                        text={`Ref #${String(c.id).padStart(6, '0')}`}
                        className="border-white/15 bg-white/[0.04] text-[#A0B0D0]"
                      />
                    </div>
                    <Link
                      to={`/items/${c.item_id}/claim`}
                      className="mt-1 block truncate text-sm font-semibold text-white transition hover:text-[#2A5CFF]"
                    >
                      {c.item_title}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-[#A0B0D0]">
                      Submitted {new Date(c.claim_date).toLocaleString(undefined, {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: 'numeric', minute: '2-digit',
                      })}
                      {c.item_last_location && ` · 📍 ${c.item_last_location}`}
                    </p>
                  </div>

                  {/* Expand toggle */}
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : c.id)}
                    className="shrink-0 self-start rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-[#A0B0D0] transition hover:bg-white/[0.06] hover:text-white"
                  >
                    {isOpen ? 'Hide details' : 'View details'}
                  </button>
                </div>

                {/* Expanded details */}
                {isOpen && (
                  <div className="space-y-3 border-t border-white/5 bg-white/[0.01] px-4 py-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-[#A0B0D0]/70">
                        Your proof of ownership
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-white">
                        {c.proof || '—'}
                      </p>
                    </div>

                    {c.lost_context && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#A0B0D0]/70">
                          Where/when you lost it
                        </p>
                        <p className="mt-1 text-sm text-white">{c.lost_context}</p>
                      </div>
                    )}

                    {c.phone && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-[#A0B0D0]/70">
                          Contact phone
                        </p>
                        <p className="mt-1 text-sm text-white">{c.phone}</p>
                      </div>
                    )}

                    {c.supporting_image_url && (
                      <div>
                        <p className="mb-1 text-[10px] uppercase tracking-wider text-[#A0B0D0]/70">
                          Supporting image
                        </p>
                        <img
                          src={`http://localhost:5000${c.supporting_image_url}`}
                          alt="Supporting proof"
                          className="h-24 rounded-lg border border-white/10 object-cover"
                        />
                      </div>
                    )}

                    {c.status === 'pending' && (
                      <p className="rounded-lg border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2 text-xs text-amber-300/90">
                        ⏳ Waiting on staff review. You'll be notified once verified.
                      </p>
                    )}
                    {c.status === 'approved' && (
                      <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/[0.05] px-3 py-2 text-xs text-emerald-300/90">
                        ✓ Approved — staff will provide pickup instructions.
                      </p>
                    )}
                    {c.status === 'rejected' && (
                      <p className="rounded-lg border border-red-500/20 bg-red-500/[0.05] px-3 py-2 text-xs text-red-300/90">
                        ✕ Not approved. The verification didn't match. You can contact the office if you believe this is an error.
                      </p>
                    )}

                    <div className="pt-1">
                      <Link
                        to={`/items/${c.item_id}/claim`}
                        className="text-xs text-[#2A5CFF] transition hover:text-white"
                      >
                        Open item →
                      </Link>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
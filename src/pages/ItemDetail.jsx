import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const categoryLabel = {
  electronics: 'Electronics',
  clothing: 'Clothing',
  bottles: 'Water bottles / Lunchboxes',
  books: 'Books / Binders',
  keys_ids: 'Keys / IDs',
  sports: 'Sports Gear',
  other: 'Other',
};

export default function ItemDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`${API_BASE}/api/items/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setItem(data);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 backdrop-blur-xl">
        <p className="text-sm text-[#A0B0D0]">Loading item…</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="grid min-h-[40vh] place-items-center rounded-3xl border border-dashed border-red-500/30 bg-red-500/[0.05] p-8 text-center backdrop-blur-xl">
        <div>
          <h2 className="text-lg font-semibold text-red-300">Could not load item</h2>
          <p className="mt-1 text-sm text-[#A0B0D0]">{error || 'Item not found'}</p>
          <Link to="/dashboard" className="mt-4 inline-block text-xs text-[#A0B0D0] hover:text-white">
            ← Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const urgencyColor =
    item.urgency === 'high'   ? 'bg-red-500/15 text-red-300 border-red-500/30' :
    item.urgency === 'low'    ? 'bg-slate-500/15 text-slate-300 border-slate-500/30' :
                                'bg-amber-500/15 text-amber-300 border-amber-500/30';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/dashboard" className="text-xs text-[#A0B0D0] hover:text-white">
        ← Back to dashboard
      </Link>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{item.title}</h1>
            <p className="mt-1 text-sm text-[#A0B0D0]">
              Reported by {item.reporter} · {new Date(item.created_at).toLocaleString()}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wide ${
              item.status === 'lost' ? 'bg-red-500/15 text-red-300 border-red-500/30' :
              item.status === 'found' ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' :
              'bg-blue-500/15 text-blue-300 border-blue-500/30'
            }`}>
              {item.status}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wide ${urgencyColor}`}>
              {item.urgency} priority
            </span>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wider text-[#A0B0D0]/70">Category</dt>
            <dd className="mt-1 text-white">
              {categoryLabel[item.category] || item.category}
              {item.category === 'other' && item.category_other && (
                <span className="text-[#A0B0D0]"> · {item.category_other}</span>
              )}
            </dd>
          </div>
          {item.brand && (
            <div>
              <dt className="text-xs uppercase tracking-wider text-[#A0B0D0]/70">Brand</dt>
              <dd className="mt-1 text-white">{item.brand}</dd>
            </div>
          )}
          {item.color && (
            <div>
              <dt className="text-xs uppercase tracking-wider text-[#A0B0D0]/70">Color</dt>
              <dd className="mt-1 text-white">{item.color}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs uppercase tracking-wider text-[#A0B0D0]/70">Last known location</dt>
            <dd className="mt-1 text-white">{item.last_location}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-[#A0B0D0]/70">Time lost</dt>
            <dd className="mt-1 text-white">
              {item.lost_at ? new Date(item.lost_at).toLocaleString() : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-[#A0B0D0]/70">Reporter role</dt>
            <dd className="mt-1 capitalize text-white">{item.reporter_role}</dd>
          </div>
        </dl>

        <div className="mt-6">
          <dt className="text-xs uppercase tracking-wider text-[#A0B0D0]/70">Description</dt>
          <dd className="mt-1 whitespace-pre-wrap text-sm text-white">{item.description}</dd>
        </div>
      </div>
    </div>
  );
}
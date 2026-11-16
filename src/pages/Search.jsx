import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const PAGE_SIZE = 12;

const CATEGORIES = [
  { value: 'all',          label: 'All' },
  { value: 'electronics',  label: 'Electronics' },
  { value: 'drinkware',    label: 'Water Bottles' },
  { value: 'bottles',      label: 'Bottles' },
  { value: 'clothing',     label: 'Clothing' },
  { value: 'books',        label: 'Books' },
  { value: 'ids_cards',    label: 'IDs / Wallets' },
  { value: 'bags_wallets', label: 'Bags' },
  { value: 'keys',         label: 'Keys' },
  { value: 'keys_ids',     label: 'Keys / IDs' },
  { value: 'sports',       label: 'Sports' },
  { value: 'other',        label: 'Other' },
];

const LOCATIONS = [
  { value: 'all',         label: 'All locations' },
  { value: 'Canteen',     label: 'Cafeteria / Canteen' },
  { value: 'Library',     label: 'Library' },
  { value: 'Gym',         label: 'Gymnasium' },
  { value: 'Classroom',   label: 'Classrooms' },
  { value: 'School Gate', label: 'Grounds / Gate' },
];

const DATES = [
  { value: 'any',   label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: '3d',    label: 'Last 3 days' },
  { value: 'week',  label: 'This week' },
  { value: 'month', label: 'This month' },
];

const SORTS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
];

const statusMeta = {
  lost:    { label: 'Lost',     cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
  found:   { label: 'Found',    cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  claimed: { label: 'Returned', cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
};

const claimMeta = {
  pending:  { label: 'Pending claim', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  approved: { label: 'Returned',      cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  rejected: { label: 'Unclaimed',     cls: 'border-white/20 text-[#A0B0D0]' },
};

function Pill({ text, className = '' }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${className}`}>
      {text}
    </span>
  );
}

export default function Search() {
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const [q, setQ] = useState('');
  const [committedQ, setCommittedQ] = useState('');
  const [type, setType] = useState('found');
  const [category, setCategory] = useState('all');
  const [location, setLocation] = useState('all');
  const [date, setDate] = useState('any');
  const [status, setStatus] = useState('active');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(0);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);

  // Close modal on Escape
  useEffect(() => {
    if (!previewItem) return;
    function onKey(e) {
      if (e.key === 'Escape') setPreviewItem(null);
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [previewItem]);

  useEffect(() => {
    const t = setTimeout(() => {
      setCommittedQ(q);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => { setPage(0); }, [type, category, location, date, status, sort]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          q: committedQ,
          type,
          category,
          location,
          date,
          status,
          sort,
          limit: String(PAGE_SIZE + 1),
          offset: String(page * PAGE_SIZE),
        });
        const res = await fetch(`${API_BASE}/api/items/search?${params.toString()}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const fetched = data.items || [];
        setItems(fetched.slice(0, PAGE_SIZE));
        setHasMore(fetched.length > PAGE_SIZE);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [committedQ, type, category, location, date, status, sort, page]);

  const activeFilters = useMemo(() => {
    const f = [];
    if (committedQ) f.push({ key: 'q', label: `"${committedQ}"`, clear: () => { setQ(''); setCommittedQ(''); } });
    if (category !== 'all') f.push({ key: 'category', label: CATEGORIES.find(c => c.value === category)?.label || category, clear: () => setCategory('all') });
    if (location !== 'all') f.push({ key: 'location', label: location, clear: () => setLocation('all') });
    if (date !== 'any') f.push({ key: 'date', label: DATES.find(d => d.value === date)?.label || date, clear: () => setDate('any') });
    if (status !== 'active') f.push({ key: 'status', label: 'Include returned', clear: () => setStatus('active') });
    return f;
  }, [committedQ, category, location, date, status]);

  function clearAll() {
    setQ(''); setCommittedQ('');
    setCategory('all'); setLocation('all'); setDate('any'); setStatus('active'); setSort('newest');
    setPage(0);
    inputRef.current?.focus();
  }

  function reportWithKeyword(kind) {
    navigate(`/report-${kind}?q=${encodeURIComponent(committedQ || q)}`);
  }

  return (
    <div className="relative w-full space-y-5">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        <div className="absolute -top-32 right-0 h-[22rem] w-[22rem] rounded-full bg-[#2A5CFF]/10 blur-[120px]" />
        <div className="absolute -bottom-32 -left-16 h-[20rem] w-[20rem] rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Search</h1>
        <p className="mt-1 text-sm text-[#A0B0D0]">
          Find lost or found items before you file a report.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <svg className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A0B0D0]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.2-5.2m0 0A7.5 7.5 0 105.2 5.2a7.5 7.5 0 0010.6 10.6z" />
            </svg>
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder='Search by name, brand, color, or description — e.g., "Hydro Flask"'
              className="w-full rounded-xl border border-white/10 bg-[#0A1128]/60 py-2.5 pl-10 pr-3 text-sm text-white placeholder-[#A0B0D0]/50 outline-none transition focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40"
            />
          </div>

          <div className="inline-flex shrink-0 rounded-xl border border-white/10 bg-white/[0.02] p-1">
            <button
              type="button"
              onClick={() => setType('found')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                type === 'found' ? 'bg-emerald-500/15 text-emerald-300' : 'text-[#A0B0D0] hover:text-white'
              }`}
            >
              Found Items
            </button>
            <button
              type="button"
              onClick={() => setType('lost')}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                type === 'lost' ? 'bg-red-500/15 text-red-300' : 'text-[#A0B0D0] hover:text-white'
              }`}
            >
              Lost Reports
            </button>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#0A1128]/60 px-3 py-2 text-xs text-white outline-none focus:border-[#2A5CFF]">
            {CATEGORIES.map((c) => (<option key={c.value} value={c.value} className="text-black">{c.label}</option>))}
          </select>

          <select value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#0A1128]/60 px-3 py-2 text-xs text-white outline-none focus:border-[#2A5CFF]">
            {LOCATIONS.map((l) => (<option key={l.value} value={l.value} className="text-black">{l.label}</option>))}
          </select>

          <select value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#0A1128]/60 px-3 py-2 text-xs text-white outline-none focus:border-[#2A5CFF]">
            {DATES.map((d) => (<option key={d.value} value={d.value} className="text-black">{d.label}</option>))}
          </select>

          <select value={sort} onChange={(e) => setSort(e.target.value)} className="w-full rounded-lg border border-white/10 bg-[#0A1128]/60 px-3 py-2 text-xs text-white outline-none focus:border-[#2A5CFF]">
            {SORTS.map((s) => (<option key={s.value} value={s.value} className="text-black">{s.label}</option>))}
          </select>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
          <label className="flex cursor-pointer items-center gap-1.5 text-[#A0B0D0]">
            <input
              type="checkbox"
              checked={status === 'all'}
              onChange={(e) => setStatus(e.target.checked ? 'all' : 'active')}
              className="h-3.5 w-3.5 rounded border-white/20 accent-[#2A5CFF]"
            />
            Include returned items
          </label>
          <span className="text-[#A0B0D0]/40">·</span>
          <span className="text-[#A0B0D0]/70">
            Showing {type === 'found' ? 'found' : 'lost'} {status === 'all' ? 'and returned' : '(active only)'}
          </span>
        </div>
      </div>

      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeFilters.map((f) => (
            <button
              key={f.key}
              onClick={f.clear}
              className="group flex items-center gap-1.5 rounded-full border border-[#2A5CFF]/30 bg-[#2A5CFF]/10 px-2.5 py-1 text-[11px] text-[#A0B0D0] transition hover:text-white"
            >
              <span className="max-w-[12rem] truncate">{f.label}</span>
              <span className="text-[10px] opacity-60 group-hover:opacity-100">✕</span>
            </button>
          ))}
          <button onClick={clearAll} className="text-[11px] text-[#A0B0D0] transition hover:text-red-300">
            Clear all
          </button>
        </div>
      )}

      {loading && items.length === 0 && (
        <div className="grid min-h-[30vh] place-items-center rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 backdrop-blur-xl">
          <p className="text-sm text-[#A0B0D0]">Searching…</p>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.05] px-4 py-3 text-sm text-red-300 backdrop-blur-xl">
          Could not load items: {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center backdrop-blur-xl">
          <p className="text-base font-medium text-white">No {type === 'found' ? 'found' : 'lost'} items match your search</p>
          <p className="mt-1 text-sm text-[#A0B0D0]">
            {committedQ
              ? `Nothing found for "${committedQ}". Try different keywords, or file a report so others can help.`
              : 'Try different filters, or file a new report so others can help.'}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {type === 'found' && (
              <button
                onClick={() => reportWithKeyword('lost')}
                className="rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-sm font-medium text-white shadow-[0_0_20px_rgba(239,68,68,0.35)] transition hover:scale-[1.02]"
              >
                Report Lost Item
              </button>
            )}
            {type === 'lost' && (
              <button
                onClick={() => reportWithKeyword('found')}
                className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-[0_0_20px_rgba(16,185,129,0.35)] transition hover:scale-[1.02]"
              >
                Report Found Item
              </button>
            )}
            {activeFilters.length > 0 && (
              <button
                onClick={clearAll}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/80 transition hover:bg-white/[0.06]"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((it) => (
            <ResultCard key={it.id} item={it} onPreview={() => setPreviewItem(it)} />
          ))}
        </div>
      )}

      {(page > 0 || hasMore) && (
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-xl">
          <span className="text-[11px] text-[#A0B0D0]">Page {page + 1}</span>
          <div className="flex gap-2">
            <button
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
            >
              ← Previous
            </button>
            <button
              disabled={!hasMore || loading}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {previewItem && (
        <ItemPreviewModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
          onClaim={() => navigate(`/items/${previewItem.id}/claim`)}
          onFoundThis={() => navigate(`/report-found?linked_lost_id=${previewItem.id}`)}
        />
      )}
    </div>
  );
}

function ItemPreviewModal({ item, onClose, onClaim, onFoundThis }) {
  const s = statusMeta[item.status] || statusMeta.found;
  const c = item.claim_status ? claimMeta[item.claim_status] : null;
  const cat = item.category === 'other'
    ? (item.category_other || 'Other')
    : (CATEGORIES.find((x) => x.value === item.category)?.label || item.category || '');
  const when = item.lost_at || item.created_at;
  const whenLabel = when
    ? new Date(when).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })
    : '';
  const imgUrl = item.image_url ? `http://localhost:5000${item.image_url}` : null;
  const showImage = imgUrl && !item.photo_blur;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/15 bg-[#0A1128] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white/80 transition hover:bg-black/90 hover:text-white"
          aria-label="Close preview"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Image */}
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/40">
          {showImage ? (
            <img src={imgUrl} alt={item.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              {item.photo_blur ? (
                <div className="text-center text-[#A0B0D0]/60">
                  <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L9.88 9.88" />
                  </svg>
                  <p className="mt-1 text-xs">Photo hidden</p>
                </div>
              ) : (
                <svg className="h-8 w-8 text-[#A0B0D0]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
              )}
            </div>
          )}
          {/* Pills overlay */}
          <div className="absolute left-2 top-2 flex flex-wrap gap-1">
            <Pill text={s.label} className={s.cls} />
            {c && <Pill text={c.label} className={c.cls} />}
          </div>
        </div>

        {/* Body */}
        <div className="space-y-3 p-4">
          <div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Pill text={cat} className="border-white/15 bg-white/[0.04] text-[#A0B0D0]" />
              {item.urgency === 'high' && <Pill text="High priority" className="bg-red-500/15 text-red-300 border-red-500/30" />}
            </div>
            <h2 className="mt-1.5 text-base font-semibold text-white">{item.title}</h2>
            <p className="mt-1 text-xs text-[#A0B0D0]">
              {item.last_location && <span>📍 {item.last_location}</span>}
              {item.last_location && whenLabel && <span> · </span>}
              {whenLabel && <span>{item.status === 'lost' ? 'Lost' : 'Found'} {whenLabel}</span>}
            </p>
          </div>

          {item.description && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#A0B0D0]/70">Description</p>
              <p className="mt-1 text-sm text-white">{item.description}</p>
            </div>
          )}

          {item.brand && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#A0B0D0]/70">Brand</p>
              <p className="mt-1 text-sm text-white">{item.brand}</p>
            </div>
          )}

          {item.color && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#A0B0D0]/70">Color</p>
              <p className="mt-1 text-sm text-white">{item.color}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            {item.status === 'found' && !item.claim_status && (
              <button
                onClick={onClaim}
                className="flex-1 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/25"
              >
                Claim this item
              </button>
            )}
            {item.status === 'found' && item.claim_status === 'pending' && (
              <button disabled className="flex-1 cursor-not-allowed rounded-lg bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-300/60">
                Claim pending
              </button>
            )}
            {item.status === 'found' && item.claim_status === 'approved' && (
              <button disabled className="flex-1 cursor-not-allowed rounded-lg bg-white/[0.04] px-3 py-2 text-sm font-medium text-[#A0B0D0]/60">
                Returned
              </button>
            )}
            {item.status === 'lost' && (
              <button
                onClick={onFoundThis}
                className="flex-1 rounded-lg bg-[#2A5CFF]/15 px-3 py-2 text-sm font-medium text-[#A0B0D0] transition hover:bg-[#2A5CFF]/25 hover:text-white"
              >
                I Found This
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/80 transition hover:bg-white/[0.06]"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ item, onPreview }) {
  const navigate = useNavigate();
  const s = statusMeta[item.status] || statusMeta.found;
  const c = item.claim_status ? claimMeta[item.claim_status] : null;

  const title = item.title || 'Untitled';
  const cat = item.category === 'other'
    ? (item.category_other || 'Other')
    : (CATEGORIES.find((x) => x.value === item.category)?.label || item.category || '');

  const when = item.lost_at || item.created_at;
  const whenLabel = when ? new Date(when).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
  }) : '';

  const imgUrl = item.image_url ? `http://localhost:5000${item.image_url}` : null;
  const showImage = imgUrl && !item.photo_blur;

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl transition hover:border-white/20">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/30">
        {showImage ? (
          <img src={imgUrl} alt={title} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            {item.photo_blur ? (
              <div className="text-center text-[#A0B0D0]/60">
                <svg className="mx-auto h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L9.88 9.88" />
                </svg>
                <p className="mt-1 text-[10px]">Photo hidden</p>
              </div>
            ) : (
              <svg className="h-6 w-6 text-[#A0B0D0]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            )}
          </div>
        )}

        <div className="absolute left-2 top-2 flex flex-wrap gap-1">
          <Pill text={s.label} className={s.cls} />
          {c && <Pill text={c.label} className={c.cls} />}
          {item.urgency === 'high' && <Pill text="High priority" className="bg-red-500/15 text-red-300 border-red-500/30" />}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div>
          <h3 className="line-clamp-1 text-sm font-semibold text-white">{title}</h3>
          <p className="mt-0.5 text-[11px] text-[#A0B0D0]">{cat}</p>
        </div>

        <div className="text-[11px] text-[#A0B0D0]">
          {item.last_location && <span>📍 {item.last_location}</span>}
          {item.last_location && whenLabel && <span> · </span>}
          {whenLabel && <span>{item.status === 'lost' ? 'Lost' : 'Found'} {whenLabel}</span>}
        </div>

        {item.description && (
          <p className="line-clamp-2 text-[11px] text-[#A0B0D0]/80">{item.description}</p>
        )}

        <div className="mt-auto flex gap-2 pt-1">
          {item.status === 'found' && !item.claim_status && (
            <button
              onClick={() => navigate(`/items/${item.id}/claim`)}
              className="flex-1 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-500/25"
            >
              Claim this item
            </button>
          )}
          {item.status === 'found' && item.claim_status === 'pending' && (
            <button disabled className="flex-1 cursor-not-allowed rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300/60">
              Claim pending
            </button>
          )}
          {item.status === 'found' && item.claim_status === 'approved' && (
            <button disabled className="flex-1 cursor-not-allowed rounded-lg bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-[#A0B0D0]/60">
              Returned
            </button>
          )}
          {item.status === 'lost' && (
            <button
              onClick={() => navigate(`/report-found?linked_lost_id=${item.id}`)}
              className="flex-1 rounded-lg bg-[#2A5CFF]/15 px-3 py-1.5 text-xs font-medium text-[#A0B0D0] transition hover:bg-[#2A5CFF]/25 hover:text-white"
            >
              I Found This
            </button>
          )}
          <button
            onClick={onPreview}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-[#A0B0D0] transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Preview item"
          >
            View
          </button>
        </div>
      </div>
    </div>
  );
}
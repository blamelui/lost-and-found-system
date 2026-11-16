import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CATEGORIES = [
  { value: 'electronics',  label: 'Electronics' },
  { value: 'ids_cards',    label: 'IDs & Cards' },
  { value: 'bags_wallets', label: 'Bags & Wallets' },
  { value: 'clothing',     label: 'Clothing' },
  { value: 'drinkware',    label: 'Drinkware' },
  { value: 'books',        label: 'Books & Stationery' },
  { value: 'keys',         label: 'Keys' },
  { value: 'other',        label: 'Other' },
];

const COLOR_PILLS = [
  { value: 'black',  label: 'Black'  },
  { value: 'white',  label: 'White'  },
  { value: 'blue',   label: 'Blue'   },
  { value: 'green',  label: 'Green'  },
  { value: 'red',    label: 'Red'    },
  { value: 'yellow', label: 'Yellow' },
  { value: 'pink',   label: 'Pink'   },
  { value: 'gray',   label: 'Gray'   },
];

const COMMON_LOCATIONS = [
  'Canteen', 'Library', 'Gymnasium', 'Classroom',
  'Comfort Room', 'School Gate',
];

const DROPOFF_OFFICES = [
  'Main Security Desk', 'Guidance Office', 'Library Counter', 'Admin Office',
];

const TIME_PILLS = [
  { value: 'morning',     label: 'Morning',      hour: 8 },
  { value: 'lunch',       label: 'Lunch',        hour: 12 },
  { value: 'afternoon',   label: 'Afternoon',    hour: 14 },
  { value: 'afterschool', label: 'After school', hour: 16 },
];

export default function ReportFound() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const titleRef = useRef(null);
  const [searchParams] = useSearchParams();
  const prefillLostId = searchParams.get('linked_lost_id');

  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    title: '', category: '', category_other: '', color_pill: '',
    description: '', photo_blur: false,
    last_location_select: '', last_location_custom: '',
    found_date: today, found_time: '',
    custody: 'self', dropoff_location: '', tag_number: '',
    secret_detail: '', anonymous: false,
  });
  const [photos, setPhotos] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [showPhoto, setShowPhoto] = useState(false);
  const [linkedLostId, setLinkedLostId] = useState(null);
  const [linkedLost, setLinkedLost] = useState(null);
  const [liveMatches, setLiveMatches] = useState([]);
  const [searching, setSearching] = useState(false);

  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const categoryRequiresOther = form.category === 'other';
  const requiresDropoff = form.custody === 'office';

useEffect(() => { titleRef.current?.focus(); }, []);

// If a linked_lost_id was passed (e.g. from the Search page's "I Found This" button),
// fetch that lost item and auto-fill the title + category, and mark it as linked.
useEffect(() => {
  if (!prefillLostId) return;
  let cancelled = false;
  async function prefill() {
    try {
      const res = await fetch(`${API_BASE}/api/items/${prefillLostId}`);
      if (!res.ok) return;
      const lost = await res.json();
      if (cancelled) return;

      // Fill what we know
      setForm((f) => ({
        ...f,
        title: lost.title || f.title,
        category: lost.category || f.category,
        category_other: lost.category_other || f.category_other,
        color_pill: lost.color_pill || lost.color || f.color_pill,
        last_location_select: lost.last_location || f.last_location_select,
      }));

      // Mark as linked so the banner appears and the submit sends linked_lost_id
      setLinkedLostId(lost.id);
      setLinkedLost({
        id: lost.id,
        title: lost.title,
        reporter: lost.reporter || 'a student',
        last_location: lost.last_location,
      });
    } catch {
      // Silent — user can still fill the form manually
    }
  }
  prefill();
  return () => { cancelled = true; };
}, [prefillLostId]);

  useEffect(() => {
    if (linkedLostId) return;
    const q = form.title.trim();
    if (q.length < 2) { setLiveMatches([]); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/items/lost/search?q=${encodeURIComponent(q)}`);
        if (res.ok) setLiveMatches(await res.json());
      } catch {}
      setSearching(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [form.title, linkedLostId]);

  function onFilesChange(e) {
    const files = Array.from(e.target.files || []);
    const room = 3 - photos.length;
    const take = files.slice(0, room);
    const collected = [];
    let pending = take.length;

    take.forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        setError(`"${file.name}" is over 5 MB — skipped.`);
        if (--pending === 0) setPhotos((prev) => [...prev, ...collected]);
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        collected.push({ file, preview: ev.target.result });
        if (--pending === 0) setPhotos((prev) => [...prev, ...collected]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  }

  const removePhoto = (idx) => setPhotos((prev) => prev.filter((_, i) => i !== idx));
  const setTimePill = (pill) => setField('found_time', `${String(pill.hour).padStart(2, '0')}:00`);
  const combinedFoundAt = () => `${form.found_date}T${form.found_time || '00:00'}:00`;

  const resolvedLocation = useMemo(() => {
    if (form.last_location_select === '__custom__') return form.last_location_custom.trim();
    return form.last_location_select || form.last_location_custom.trim() || 'Not specified';
  }, [form.last_location_select, form.last_location_custom]);

  const progress = useMemo(() => {
    const checks = [
      !!form.title.trim(),
      !!form.category,
      !categoryRequiresOther || !!form.category_other.trim(),
      !!resolvedLocation && resolvedLocation !== 'Not specified',
      !!form.secret_detail.trim(),
      !requiresDropoff || !!form.dropoff_location,
    ];
    const done = checks.filter(Boolean).length;
    return { done, total: checks.length, pct: Math.round((done / checks.length) * 100) };
  }, [form, requiresDropoff, resolvedLocation, categoryRequiresOther]);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) return setError('Item title is required.');
    if (!form.category) return setError('Please choose a category.');
    if (categoryRequiresOther && !form.category_other.trim()) return setError('Specify the "Other" category.');
    if (!form.secret_detail.trim()) return setError('Please add the secret identifying detail.');
    if (requiresDropoff && !form.dropoff_location) return setError('Please pick a drop-off location.');

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('category', form.category);
      if (categoryRequiresOther) fd.append('category_other', form.category_other);
      if (form.color_pill) fd.append('color_pill', form.color_pill);
      if (form.description) fd.append('description', form.description);
      fd.append('photo_blur', form.photo_blur ? 'true' : 'false');
      fd.append('last_location', resolvedLocation);
      fd.append('lost_at', combinedFoundAt());
      fd.append('custody', form.custody);
      if (requiresDropoff) fd.append('dropoff_location', form.dropoff_location);
      if (form.tag_number) fd.append('tag_number', form.tag_number);
      fd.append('secret_detail', form.secret_detail);
      fd.append('anonymous', form.anonymous ? 'true' : 'false');
      if (linkedLostId) fd.append('linked_lost_id', String(linkedLostId));
      photos.forEach((p) => fd.append('photos', p.file));

      const res = await fetch(`${API_BASE}/api/items/found`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      let matches = [];
      try {
        const mRes = await fetch(`${API_BASE}/api/items/${data.id}/matches`);
        if (mRes.ok) matches = await mRes.json();
      } catch {}

      setResult({ item: data, matches });
    } catch (err) {
      setError(err.message || 'Failed to submit');
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    'w-full rounded-lg border border-white/10 bg-[#0A1128]/60 px-3.5 py-2.5 text-[13.5px] text-white placeholder-[#A0B0D0]/40 outline-none transition focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40 focus:shadow-[0_0_20px_rgba(42,92,255,0.3)]';
  const labelClass = 'mb-1 flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-[#A0B0D0]';
  const sectionTitle = 'mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-[#A0B0D0]/70';
  const sectionPad = 'rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl sm:p-6';
  const required = <span className="ml-0.5 text-red-400">*</span>;

  if (result) {
    const { item, matches } = result;
    return (
      <div className="relative w-full space-y-5">
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-5 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-300">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-emerald-300">Report submitted</h1>
              <p className="mt-0.5 text-sm text-[#A0B0D0]">Keep your reference below.</p>
            </div>
          </div>
        </div>

        <div className={sectionPad}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className={sectionTitle + ' mb-0'}>Reference receipt</h2>
            <span className="font-mono text-sm text-white">LF-FND-{String(item.id).padStart(6, '0')}</span>
          </div>
          <dl className="grid gap-2 text-xs sm:grid-cols-2">
            <div><dt className="text-[#A0B0D0]/70">Item</dt><dd className="text-white">{item.title}</dd></div>
            <div><dt className="text-[#A0B0D0]/70">Category</dt><dd className="text-white">{item.category}</dd></div>
            <div><dt className="text-[#A0B0D0]/70">Submitted</dt><dd className="text-white">{new Date(item.created_at).toLocaleString()}</dd></div>
            <div><dt className="text-[#A0B0D0]/70">Custody</dt><dd className="capitalize text-white">{item.custody}</dd></div>
          </dl>
        </div>

        <div className={sectionPad}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className={sectionTitle + ' mb-0'}>Potential owners</h2>
            <span className="rounded-full border border-[#2A5CFF]/30 bg-[#2A5CFF]/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#A0B0D0]">
              {matches.length}
            </span>
          </div>
          {matches.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-4 text-center">
              <p className="text-sm text-[#A0B0D0]">No matching lost-item reports yet.</p>
            </div>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {matches.map((m) => (
                <li key={m.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                  <p className="line-clamp-1 text-sm font-medium text-white">{m.title}</p>
                  <p className="mt-0.5 text-xs text-[#A0B0D0]">
                    by {m.reporter} · {new Date(m.lost_at || m.created_at).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button onClick={() => navigate('/dashboard')} className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/80 transition hover:bg-white/[0.06]">
            Back to dashboard
          </button>
          <button onClick={() => setResult(null)} className="rounded-lg bg-gradient-to-r from-[#2A5CFF] to-[#1C3F95] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(42,92,255,0.4)] transition hover:scale-[1.02]">
            Report another item
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Report a Found Item</h1>
          <p className="mt-0.5 text-sm text-[#A0B0D0]">
            Required fields marked<span className="mx-1 text-red-400">*</span>— optional fields are skippable
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-[#2A5CFF] to-emerald-400 transition-all duration-300" style={{ width: `${progress.pct}%` }} />
          </div>
          <span className="text-xs tabular-nums text-[#A0B0D0]">{progress.done}/{progress.total}</span>
        </div>
      </div>

      <form onSubmit={onSubmit}>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <section className={sectionPad}>
              <h2 className={sectionTitle}>
                <span className="grid h-5 w-5 place-items-center rounded-md bg-[#2A5CFF]/15 text-[10px] text-[#2A5CFF]">1</span>
                The item
              </h2>

              <div className="space-y-3">
                <div>
                  <label htmlFor="title" className={labelClass}>
                    <span>Title{required}</span>
                    <span className="text-[9px] text-[#A0B0D0]/50">{form.title.length}/100</span>
                  </label>
                  <input
                    id="title" ref={titleRef} type="text" required maxLength={100}
                    value={form.title}
                    onChange={(e) => setField('title', e.target.value)}
                    placeholder="e.g., Blue Insulated Tumbler"
                    className={inputClass}
                    disabled={!!linkedLostId}
                  />

                  {linkedLost && (
                    <div className="mt-2 rounded-lg border border-emerald-500/40 bg-emerald-500/[0.08] p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-wider text-emerald-300">
                            ✓ Linked to an existing lost report
                          </p>
                          <p className="mt-0.5 truncate text-sm font-medium text-white">{linkedLost.title}</p>
                          <p className="mt-0.5 text-[11px] text-[#A0B0D0]">
                            Reported by {linkedLost.reporter}
                            {linkedLost.last_location && ` · ${linkedLost.last_location}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setLinkedLostId(null); setLinkedLost(null); setLiveMatches([]); }}
                          className="shrink-0 text-[11px] text-red-300 hover:text-red-200"
                        >
                          Unlink
                        </button>
                      </div>
                    </div>
                  )}

                  {!linkedLostId && form.title.trim().length >= 2 && (
                    <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.02] p-2">
                      <div className="mb-1.5 flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-wider text-[#A0B0D0]">
                          {searching
                            ? 'Searching…'
                            : liveMatches.length > 0
                              ? 'Possible matches — click to link'
                              : 'No existing lost reports match yet'}
                        </p>
                        {liveMatches.length > 0 && (
                          <button type="button" onClick={() => setLiveMatches([])} className="text-[10px] text-[#A0B0D0] hover:text-white">
                            Dismiss
                          </button>
                        )}
                      </div>

                      {liveMatches.length > 0 && (
                        <ul className="space-y-1.5">
                          {liveMatches.map((m) => (
                            <li key={m.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setLinkedLostId(m.id);
                                  setLinkedLost(m);
                                  setField('title', m.title);
                                  if (m.category) setField('category', m.category);
                                  if (m.color) setField('color_pill', m.color);
                                  setLiveMatches([]);
                                }}
                                className="w-full rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-2 text-left transition hover:border-[#2A5CFF]/50 hover:bg-[#2A5CFF]/[0.08]"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-medium text-white">{m.title}</p>
                                    <p className="mt-0.5 text-[10px] text-[#A0B0D0]">
                                      by {m.reporter}
                                      {m.last_location && ` · ${m.last_location}`}
                                      {m.lost_at && ` · ${new Date(m.lost_at).toLocaleDateString()}`}
                                    </p>
                                  </div>
                                  <span className="shrink-0 text-[10px] text-[#2A5CFF]">Link →</span>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                      {liveMatches.length === 0 && !searching && (
                        <p className="text-[11px] text-[#A0B0D0]/70">
                          Keep typing or continue — if no match exists, this saves as a brand-new found item.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="category" className={labelClass}>
                      <span>Category{required}</span>
                    </label>
                    <select
                      id="category" required value={form.category}
                      onChange={(e) => setField('category', e.target.value)}
                      className={inputClass}
                    >
                      <option value="" className="text-black">Select</option>
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value} className="text-black">{c.label}</option>
                      ))}
                    </select>
                  </div>

                  {categoryRequiresOther ? (
                    <div>
                      <label htmlFor="category_other" className={labelClass}>
                        <span>Specify{required}</span>
                      </label>
                      <input
                        id="category_other" type="text" required maxLength={100}
                        value={form.category_other} onChange={(e) => setField('category_other', e.target.value)}
                        placeholder="e.g., Sports gear"
                        className={inputClass}
                      />
                    </div>
                  ) : (
                    <div>
                      <label htmlFor="color" className={labelClass}>
                        <span>Color <span className="normal-case text-[#A0B0D0]/50">(optional)</span></span>
                      </label>
                      <select
                        id="color" value={form.color_pill}
                        onChange={(e) => setField('color_pill', e.target.value)}
                        className={inputClass}
                      >
                        <option value="" className="text-black">No color</option>
                        {COLOR_PILLS.map((c) => (
                          <option key={c.value} value={c.value} className="text-black">{c.label}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="description" className={labelClass}>
                    <span>Public description <span className="normal-case text-[#A0B0D0]/50">(optional)</span></span>
                    <span className="text-[9px] text-[#A0B0D0]/50">{form.description.length}/400</span>
                  </label>
                  <textarea
                    id="description" rows={3} maxLength={400}
                    value={form.description} onChange={(e) => setField('description', e.target.value)}
                    placeholder="Appearance only — not secret details"
                    className={inputClass}
                  />
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                  {!showPhoto ? (
                    <button
                      type="button"
                      onClick={() => setShowPhoto(true)}
                      className="flex w-full items-center gap-2.5 text-left text-sm text-[#A0B0D0] transition hover:text-white"
                    >
                      <span className="grid h-8 w-8 place-items-center overflow-hidden rounded-md border border-white/10 bg-white/[0.03]">
                        {photos.length > 0 ? (
                          <img src={photos[0].preview} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V6a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 6v10.5M3 16.5A2.25 2.25 0 005.25 18.75h13.5A2.25 2.25 0 0021 16.5M3 16.5l4.5-4.5a2.25 2.25 0 013.182 0L15 16.5m-1.5-4.5a2.25 2.25 0 114.5 0" />
                          </svg>
                        )}
                      </span>
                      <span className="flex-1">
                        <span className="block text-xs font-medium text-white">
                          {photos.length === 0 ? 'Add photos' : `${photos.length} photo${photos.length > 1 ? 's' : ''} attached`}
                        </span>
                        <span className="block text-[10px]">
                          {photos.length === 0 ? 'Optional · up to 3' : 'Click to manage'}
                        </span>
                      </span>
                      <span className="text-[#A0B0D0]/60">{photos.length === 0 ? '+' : '✎'}</span>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-4 gap-2">
                        {photos.map((p, i) => (
                          <div key={i} className="group relative aspect-square overflow-hidden rounded-md border border-white/10">
                            <img src={p.preview} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                            <button
                              type="button" onClick={() => removePhoto(i)}
                              className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5 text-white/90 opacity-0 transition group-hover:opacity-100"
                              aria-label="Remove photo"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                        {photos.length < 3 && (
                          <label
                            htmlFor="photos"
                            className="flex aspect-square cursor-pointer items-center justify-center rounded-md border border-dashed border-white/20 bg-white/[0.02] transition hover:border-[#2A5CFF]/60"
                          >
                            <svg className="h-4 w-4 text-[#A0B0D0]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            <input
                              id="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple
                              onChange={onFilesChange} className="sr-only"
                            />
                          </label>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#A0B0D0]/60">
                        <span>{photos.length}/3 · JPG/PNG/WEBP · 5 MB</span>
                        <div className="flex items-center gap-3">
                          {photos.length > 0 && (
                            <button type="button" onClick={() => setPhotos([])} className="text-red-300 hover:text-red-200">
                              Remove all
                            </button>
                          )}
                          <button type="button" onClick={() => setShowPhoto(false)} className="text-[#A0B0D0] transition hover:text-white">
                            {photos.length === 0 ? 'Cancel' : 'Done'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <label className="mt-2 flex cursor-pointer items-start gap-2 text-[11px] leading-tight">
                    <input
                      type="checkbox" checked={form.photo_blur}
                      onChange={(e) => setField('photo_blur', e.target.checked)}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-white/20 bg-white/[0.02] accent-[#2A5CFF]"
                    />
                    <span className="text-[#A0B0D0]">
                      Blur photos on public feed
                      <span className="block text-[10px] text-[#A0B0D0]/60">For IDs, wallets, phones</span>
                    </span>
                  </label>
                </div>
              </div>
            </section>

            <section className={sectionPad}>
              <h2 className={sectionTitle}>
                <span className="grid h-5 w-5 place-items-center rounded-md bg-[#2A5CFF]/15 text-[10px] text-[#2A5CFF]">2</span>
                Custody
              </h2>

              <div className="grid gap-2 sm:grid-cols-2">
                <label className={`cursor-pointer rounded-lg border p-3 transition ${form.custody === 'self' ? 'border-[#2A5CFF] bg-[#2A5CFF]/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'}`}>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="custody" value="self" checked={form.custody === 'self'} onChange={() => setField('custody', 'self')} className="h-3.5 w-3.5 accent-[#2A5CFF]" />
                    <span className="text-xs font-medium text-white">With me</span>
                  </div>
                  <p className="mt-0.5 pl-5 text-[10px] text-[#A0B0D0]">Handover when verified</p>
                </label>

                <label className={`cursor-pointer rounded-lg border p-3 transition ${form.custody === 'office' ? 'border-[#2A5CFF] bg-[#2A5CFF]/10' : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'}`}>
                  <div className="flex items-center gap-2">
                    <input type="radio" name="custody" value="office" checked={form.custody === 'office'} onChange={() => setField('custody', 'office')} className="h-3.5 w-3.5 accent-[#2A5CFF]" />
                    <span className="text-xs font-medium text-white">Turned in</span>
                  </div>
                  <p className="mt-0.5 pl-5 text-[10px] text-[#A0B0D0]">Owner picks up at office</p>
                </label>
              </div>

              {requiresDropoff && (
                <div className="mt-2.5 grid gap-2.5 rounded-lg border border-white/5 bg-white/[0.01] p-2.5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="dropoff_location" className={labelClass}>
                      <span>Office{required}</span>
                    </label>
                    <select
                      id="dropoff_location" required value={form.dropoff_location}
                      onChange={(e) => setField('dropoff_location', e.target.value)}
                      className={inputClass}
                    >
                      <option value="" className="text-black">Choose</option>
                      {DROPOFF_OFFICES.map((o) => (
                        <option key={o} value={o} className="text-black">{o}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="tag_number" className={labelClass}>
                      <span>Tag # <span className="normal-case text-[#A0B0D0]/50">(optional)</span></span>
                    </label>
                    <input
                      id="tag_number" type="text" maxLength={50}
                      value={form.tag_number} onChange={(e) => setField('tag_number', e.target.value)}
                      placeholder="LOG-..."
                      className={inputClass}
                    />
                  </div>
                </div>
              )}
            </section>
          </div>

          <div className="flex flex-col gap-4">
            <section className={sectionPad}>
              <h2 className={sectionTitle}>
                <span className="grid h-5 w-5 place-items-center rounded-md bg-[#2A5CFF]/15 text-[10px] text-[#2A5CFF]">3</span>
                Where &amp; when
              </h2>

              <div className="space-y-3">
                <div>
                  <label htmlFor="location_select" className={labelClass}>
                    <span>Campus location{required}</span>
                  </label>
                  <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0A1128]/60 transition focus-within:border-[#2A5CFF] focus-within:ring-2 focus-within:ring-[#2A5CFF]/40">
                    <select
                      id="location_select" value={form.last_location_select}
                      onChange={(e) => setField('last_location_select', e.target.value)}
                      className="w-full border-b border-white/5 bg-transparent px-3.5 py-2 text-[13.5px] text-white outline-none"
                    >
                      <option value="" className="text-black">Choose zone</option>
                      {COMMON_LOCATIONS.map((loc) => (
                        <option key={loc} value={loc} className="text-black">{loc}</option>
                      ))}
                      <option value="__custom__" className="text-black">Other (specify)</option>
                    </select>
                    <input
                      type="text" value={form.last_location_custom}
                      onChange={(e) => setField('last_location_custom', e.target.value)}
                      placeholder="Optional: specific spot"
                      className="w-full bg-transparent px-3.5 py-2 text-[13.5px] text-white placeholder-[#A0B0D0]/50 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="found_date" className={labelClass}>
                      <span>Date</span>
                    </label>
                    <input
                      id="found_date" type="date" required max={today}
                      value={form.found_date} onChange={(e) => setField('found_date', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="found_time" className={labelClass}>
                      <span>Time</span>
                    </label>
                    <input
                      id="found_time" type="time"
                      value={form.found_time} onChange={(e) => setField('found_time', e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-[#A0B0D0]">
                    <span>Quick time</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {TIME_PILLS.map((p) => {
                      const active = form.found_time === `${String(p.hour).padStart(2, '0')}:00`;
                      return (
                        <button
                          key={p.value} type="button" onClick={() => setTimePill(p)}
                          className={`rounded-md border px-1.5 py-2 text-[11px] transition ${
                            active
                              ? 'border-[#2A5CFF] bg-[#2A5CFF]/10 text-white'
                              : 'border-white/10 bg-white/[0.02] text-[#A0B0D0] hover:bg-white/[0.05] hover:text-white'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>

            <section className={`${sectionPad} flex-1`}>
              <h2 className={sectionTitle}>
                <span className="grid h-5 w-5 place-items-center rounded-md bg-[#2A5CFF]/15 text-[10px] text-[#2A5CFF]">4</span>
                Verification
              </h2>

              <div>
                <label htmlFor="secret_detail" className={labelClass}>
                  <span className="flex items-center gap-1.5 normal-case tracking-normal">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    Secret detail
                  </span>
                  {required}
                </label>
                <input
                  id="secret_detail" type="text" required maxLength={255}
                  value={form.secret_detail} onChange={(e) => setField('secret_detail', e.target.value)}
                  placeholder="Only the owner would know"
                  className={inputClass}
                />
                <p className="mt-1 text-[10px] text-[#A0B0D0]/70">
                  Hidden publicly — used only to verify the owner
                </p>
              </div>

              <label className="mt-2.5 flex cursor-pointer items-start gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                <input
                  type="checkbox" checked={form.anonymous}
                  onChange={(e) => setField('anonymous', e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-white/20 bg-white/[0.02] accent-[#2A5CFF]"
                />
                <span className="text-xs text-white">
                  Hide my name publicly
                  <span className="block text-[10px] text-[#A0B0D0]">You'll still get notifications</span>
                </span>
              </label>
            </section>
          </div>
        </div>

        <div className="sticky bottom-3 z-10 mt-4 rounded-xl border border-white/10 bg-[#050B14]/85 px-3 py-2 backdrop-blur-xl">
          {error && (
            <div className="mb-2 flex items-start gap-1.5 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1.5 text-[11px] text-red-300">
              <svg className="mt-0.5 h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => navigate('/dashboard')} className="text-xs text-[#A0B0D0] transition hover:text-white">
              ← Cancel
            </button>
            <div className="flex items-center gap-2">
              <span className="hidden text-[10px] text-[#A0B0D0]/60 sm:block">
                {progress.done}/{progress.total} filled
              </span>
              <button
                type="submit" disabled={busy}
                className="rounded-lg bg-gradient-to-r from-[#2A5CFF] to-[#1C3F95] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(42,92,255,0.4)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? 'Sending…' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
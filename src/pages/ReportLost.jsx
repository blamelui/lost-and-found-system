import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CATEGORIES = [
  { value: 'electronics', label: 'Electronics' },
  { value: 'clothing',    label: 'Clothing' },
  { value: 'bottles',     label: 'Water bottles / Lunchboxes' },
  { value: 'books',       label: 'Books / Binders' },
  { value: 'keys_ids',    label: 'Keys / IDs' },
  { value: 'sports',      label: 'Sports Gear' },
  { value: 'other',       label: 'Other' },
];

const COMMON_LOCATIONS = [
  'Canteen', 'Library', 'Gymnasium', 'Classroom',
  'Comfort Room', 'School Gate',
];

const HIGH_PRIORITY_CATEGORIES = ['keys_ids', 'electronics'];

const urgencyMeta = {
  low:    { label: 'Low',           badge: 'border-slate-500/30 bg-slate-500/10 text-slate-300' },
  normal: { label: 'Normal',        badge: 'border-amber-500/30 bg-amber-500/10 text-amber-300' },
  high:   { label: 'High priority', badge: 'border-red-500/30 bg-red-500/10 text-red-300' },
};

const DESC_MAX = 500;

export default function ReportLost() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const titleRef = useRef(null);

  const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const [form, setForm] = useState({
    title: '',
    quantity: '1',
    brand: '',
    color: '',
    category: params.get('category') || '',
    category_other: '',
    description: '',
    last_location_select: '',
    last_location_custom: '',
    lost_at: nowLocal,
    urgency: 'normal',
    reporter_role: 'student',
    contact_pref: 'email',
  });
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [showMore, setShowMore] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const categoryRequiresOther = form.category === 'other';
  const autoHighUrgency = HIGH_PRIORITY_CATEGORIES.includes(form.category);

  useEffect(() => {
    if (autoHighUrgency && form.urgency === 'normal') {
      setForm((f) => ({ ...f, urgency: 'high' }));
    }
  }, [form.category]);

  const setField = (name, value) =>
    setForm((f) => ({ ...f, [name]: value }));

  const resolvedLocation = () => {
    if (form.last_location_select === '__custom__') return form.last_location_custom.trim();
    if (form.last_location_select) return form.last_location_select;
    return form.last_location_custom.trim();
  };

  function onPhotoChange(e) {
    const file = e.target.files?.[0] || null;
    if (!file) { setPhoto(null); setPhotoPreview(null); return; }
    if (file.size > 5 * 1024 * 1024) {
      setError('Photo must be under 5 MB.');
      return;
    }
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  function clearPhoto() {
    setPhoto(null);
    setPhotoPreview(null);
  }

  const summaryCategory = useMemo(() => {
    if (!form.category) return '—';
    if (form.category === 'other') return form.category_other || 'Other';
    const found = CATEGORIES.find((c) => c.value === form.category);
    return found ? found.label : form.category;
  }, [form.category, form.category_other]);

  const summaryLocation = useMemo(() => {
    if (form.last_location_select === '__custom__') return form.last_location_custom || '—';
    return form.last_location_select || form.last_location_custom || '—';
  }, [form.last_location_select, form.last_location_custom]);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);

    const last_location = resolvedLocation();
    if (!last_location) {
      setError('Please pick or enter a location.');
      return;
    }

    // Quantity validation
    const qty = Number(form.quantity);
    if (form.quantity !== '' && (!Number.isInteger(qty) || qty < 1 || qty > 999)) {
      setError('Quantity must be a whole number between 1 and 999.');
      return;
    }

    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('quantity', form.quantity || '1');
      if (form.brand) fd.append('brand', form.brand);
      if (form.color) fd.append('color', form.color);
      fd.append('category', form.category);
      if (categoryRequiresOther) fd.append('category_other', form.category_other);
      fd.append('description', form.description.trim() || 'No description provided.');
      fd.append('last_location', last_location);
      fd.append('lost_at', form.lost_at);
      fd.append('urgency', form.urgency);
      fd.append('reporter_role', form.reporter_role);
      fd.append('contact_pref', form.contact_pref);
      if (photo) fd.append('photo', photo);

      const res = await fetch(`${API_BASE}/api/items/lost`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      navigate(`/items/${data.id}`, { replace: true, state: { justReported: true } });
    } catch (err) {
      setError(err.message || 'Failed to submit');
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-white/10 bg-[#0A1128]/60 px-3.5 py-2.5 text-sm text-white placeholder-[#A0B0D0]/50 outline-none transition duration-200 focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40 focus:shadow-[0_0_24px_rgba(42,92,255,0.35)]';
  const labelClass = 'mb-1.5 flex items-center justify-between text-xs font-medium uppercase tracking-wider text-[#A0B0D0]';
  const sectionTitle = 'mb-4 text-xs uppercase tracking-[0.15em] text-[#A0B0D0]/60';
  const required = <span className="ml-1 text-red-400">*</span>;

  const u = urgencyMeta[form.urgency] || urgencyMeta.normal;
  const descLen = form.description.length;

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        <div className="absolute -top-32 right-0 h-[22rem] w-[22rem] rounded-full bg-[#2A5CFF]/15 blur-[120px]" />
        <div className="absolute -bottom-32 -left-16 h-[20rem] w-[20rem] rounded-full bg-violet-600/15 blur-[120px]" />
      </div>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Report a Lost Item</h1>
          <p className="mt-1 text-sm text-[#A0B0D0]">
            Fill what you know — you can add more later. Fields marked
            <span className="mx-1 text-red-400">*</span>are required.
          </p>
        </div>
      </div>

      <form onSubmit={onSubmit}>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl sm:p-6">
              <h2 className={sectionTitle}>What did you lose?</h2>

              <div className="space-y-4">
                {/* Title + Quantity — side by side */}
                <div className="grid gap-4 sm:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
                  <div>
                    <label htmlFor="title" className={labelClass}>
                      <span>Item name{required}</span>
                    </label>
                    <input
                      id="title"
                      ref={titleRef}
                      autoFocus
                      type="text"
                      required
                      maxLength={100}
                      value={form.title}
                      onChange={(e) => setField('title', e.target.value)}
                      placeholder="e.g., Blue Hydro Flask with a sticker"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label htmlFor="quantity" className={labelClass}>
                      <span>Qty <span className="normal-case text-[#A0B0D0]/50">(optional)</span></span>
                    </label>
                    <input
                      id="quantity"
                      type="number"
                      min={1}
                      max={999}
                      value={form.quantity}
                      onChange={(e) => setField('quantity', e.target.value)}
                      placeholder="1"
                      className={inputClass}
                    />
                  </div>
                </div>

                <p className="-mt-2 text-[10px] text-[#A0B0D0]/70">
                  Lost multiple identical items? Enter how many — e.g., 5 ballpens.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="category" className={labelClass}>
                      <span>Category{required}</span>
                    </label>
                    <select
                      id="category"
                      required
                      value={form.category}
                      onChange={(e) => setField('category', e.target.value)}
                      className={inputClass}
                    >
                      <option value="" className="text-black">Select category</option>
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value} className="text-black">
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="color" className={labelClass}>
                      <span>Color <span className="normal-case text-[#A0B0D0]/50">(optional)</span></span>
                    </label>
                    <input
                      id="color"
                      type="text"
                      maxLength={50}
                      value={form.color}
                      onChange={(e) => setField('color', e.target.value)}
                      placeholder="e.g., Navy blue"
                      className={inputClass}
                    />
                  </div>
                </div>

                {categoryRequiresOther && (
                  <div>
                    <label htmlFor="category_other" className={labelClass}>
                      <span>Specify category{required}</span>
                    </label>
                    <input
                      id="category_other"
                      type="text"
                      required
                      maxLength={100}
                      value={form.category_other}
                      onChange={(e) => setField('category_other', e.target.value)}
                      placeholder="e.g., Art supplies, Musical instrument…"
                      className={inputClass}
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setShowMore((v) => !v)}
                  className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5 text-xs font-medium text-[#A0B0D0] transition hover:bg-white/[0.05] hover:text-white"
                >
                  <span>{showMore ? 'Hide optional details' : 'Add optional details (brand, description)'}</span>
                  <svg
                    className={`h-4 w-4 transition-transform ${showMore ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showMore && (
                  <div className="space-y-4 rounded-xl border border-white/5 bg-white/[0.01] p-4">
                    <div>
                      <label htmlFor="brand" className={labelClass}>
                        <span>Brand <span className="normal-case text-[#A0B0D0]/50">(optional)</span></span>
                      </label>
                      <input
                        id="brand"
                        type="text"
                        maxLength={100}
                        value={form.brand}
                        onChange={(e) => setField('brand', e.target.value)}
                        placeholder="e.g., Hydro Flask"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label htmlFor="description" className={labelClass}>
                        <span>Description <span className="normal-case text-[#A0B0D0]/50">(optional)</span></span>
                        <span className={`text-[10px] tabular-nums ${descLen > DESC_MAX * 0.9 ? 'text-amber-300' : 'text-[#A0B0D0]/50'}`}>
                          {descLen} / {DESC_MAX}
                        </span>
                      </label>
                      <textarea
                        id="description"
                        rows={3}
                        maxLength={DESC_MAX}
                        value={form.description}
                        onChange={(e) => setField('description', e.target.value)}
                        placeholder="Distinguishing marks, contents, engravings…"
                        className={inputClass}
                      />
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  {!showPhoto && !photoPreview ? (
                    <button
                      type="button"
                      onClick={() => setShowPhoto(true)}
                      className="flex w-full items-center gap-3 text-left text-sm text-[#A0B0D0] transition hover:text-white"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/[0.03]">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V6a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 6v10.5M3 16.5A2.25 2.25 0 005.25 18.75h13.5A2.25 2.25 0 0021 16.5M3 16.5l4.5-4.5a2.25 2.25 0 013.182 0L15 16.5m-1.5-4.5a2.25 2.25 0 114.5 0" />
                        </svg>
                      </span>
                      <span className="flex-1">
                        <span className="block font-medium text-white">Add a photo</span>
                        <span className="block text-xs">Helps others recognize the item faster</span>
                      </span>
                      <span className="text-[#A0B0D0]/60">+</span>
                    </button>
                  ) : (
                    <>
                      {photoPreview && (
                        <div className="relative overflow-hidden rounded-lg border border-white/10">
                          <img
                            src={photoPreview}
                            alt="Item photo"
                            className="h-44 w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={clearPhoto}
                            className="absolute right-2 top-2 rounded-full border border-black/40 bg-black/60 p-1.5 text-white/90 transition hover:bg-black/80"
                            aria-label="Remove photo"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      )}

                      {showPhoto && !photoPreview && (
                        <label
                          htmlFor="photo"
                          className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-white/20 bg-white/[0.02] px-4 py-5 text-center transition hover:border-[#2A5CFF]/60 hover:bg-[#2A5CFF]/[0.05]"
                        >
                          <span className="text-sm font-medium text-white">Choose a photo</span>
                          <span className="text-xs text-[#A0B0D0]/70">JPG, PNG, or WEBP · up to 5 MB</span>
                        </label>
                      )}

                      <input
                        id="photo"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={onPhotoChange}
                        className="sr-only"
                      />

                      {photoPreview && (
                        <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[#A0B0D0]">
                          <span className="truncate">{photo?.name}</span>
                          <label
                            htmlFor="photo"
                            className="shrink-0 cursor-pointer text-[#2A5CFF] transition hover:text-white"
                          >
                            Change
                          </label>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl sm:p-6">
              <h2 className={sectionTitle}>About you</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="reporter_role" className={labelClass}>
                    <span>I am a…</span>
                  </label>
                  <select
                    id="reporter_role"
                    value={form.reporter_role}
                    onChange={(e) => setField('reporter_role', e.target.value)}
                    className={inputClass}
                  >
                    <option value="student" className="text-black">Student</option>
                    <option value="parent"  className="text-black">Parent / Guardian</option>
                    <option value="staff"   className="text-black">Staff member</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="contact_pref" className={labelClass}>
                    <span>Preferred contact</span>
                  </label>
                  <select
                    id="contact_pref"
                    value={form.contact_pref}
                    onChange={(e) => setField('contact_pref', e.target.value)}
                    className={inputClass}
                  >
                    <option value="email"      className="text-black">School email</option>
                    <option value="student_id" className="text-black">Student ID</option>
                  </select>
                </div>
              </div>
              <p className="mt-3 text-xs text-[#A0B0D0]/70">
                We&apos;ll notify you in the dashboard if someone claims this item.
              </p>
            </section>
          </div>

          <div className="space-y-5">
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl sm:p-6">
              <h2 className={sectionTitle}>Where &amp; when</h2>

              <div className="space-y-4">
                <div>
                  <label htmlFor="lost_at" className={labelClass}>
                    <span>Approximate time lost</span>
                  </label>
                  <input
                    id="lost_at"
                    type="datetime-local"
                    required
                    value={form.lost_at}
                    onChange={(e) => setField('lost_at', e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label htmlFor="location_select" className={labelClass}>
                    <span>Last known location{required}</span>
                  </label>
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-[#0A1128]/60 transition focus-within:border-[#2A5CFF] focus-within:ring-2 focus-within:ring-[#2A5CFF]/40">
                    <select
                      id="location_select"
                      value={form.last_location_select}
                      onChange={(e) => setField('last_location_select', e.target.value)}
                      className="w-full border-b border-white/5 bg-transparent px-3.5 py-2.5 text-sm text-white outline-none"
                    >
                      <option value="" className="text-black">Choose common location</option>
                      {COMMON_LOCATIONS.map((loc) => (
                        <option key={loc} value={loc} className="text-black">{loc}</option>
                      ))}
                      <option value="__custom__" className="text-black">Other (specify below)</option>
                    </select>
                    <input
                      type="text"
                      value={form.last_location_custom}
                      onChange={(e) => setField('last_location_custom', e.target.value)}
                      placeholder={
                        form.last_location_select === '__custom__'
                          ? 'e.g., Engineering Bldg, Room 204'
                          : 'Or type a specific location'
                      }
                      className="w-full bg-transparent px-3.5 py-2.5 text-sm text-white placeholder-[#A0B0D0]/50 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>
                    <span>Urgency</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['low', 'normal', 'high'].map((level) => {
                      const meta = urgencyMeta[level];
                      const active = form.urgency === level;
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setField('urgency', level)}
                          className={`relative rounded-xl border px-2 py-2.5 text-xs font-medium transition ${
                            active
                              ? `${meta.badge} ring-2 ring-current/30`
                              : 'border-white/10 bg-white/[0.02] text-[#A0B0D0] hover:bg-white/[0.05] hover:text-white'
                          }`}
                        >
                          {meta.label}
                          {active && (
                            <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-current text-[10px] text-[#050B14]">
                              ✓
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {autoHighUrgency && (
                    <p className="mt-1.5 text-xs text-amber-300/90">
                      This category defaults to <strong>High priority</strong>. You can lower it.
                    </p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl sm:p-6">
              <h2 className={sectionTitle}>Live preview</h2>

              {photoPreview && (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="mb-3 h-28 w-full rounded-lg border border-white/10 object-cover"
                />
              )}

              <div className="space-y-2.5 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="shrink-0 text-[#A0B0D0]">Title</span>
                  <span className="line-clamp-2 text-right font-medium text-white">
                    {form.title || <span className="text-[#A0B0D0]/50">—</span>}
                    {Number(form.quantity) > 1 && (
                      <span className="ml-2 rounded-full bg-white/[0.08] px-2 py-0.5 text-[10px] font-normal text-[#A0B0D0]">
                        ×{form.quantity}
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#A0B0D0]">Category</span>
                  <span className="truncate text-right text-white">{summaryCategory}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#A0B0D0]">Location</span>
                  <span className="truncate text-right text-white">{summaryLocation}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[#A0B0D0]">Reported at</span>
                  <span className="text-right text-white">
                    {form.lost_at ? new Date(form.lost_at).toLocaleString(undefined, {
                      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                    }) : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-white/5 pt-2.5">
                  <span className="text-[#A0B0D0]">Urgency</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${u.badge}`}>
                    {u.label}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="sticky bottom-4 z-10 mt-5 rounded-2xl border border-white/10 bg-[#050B14]/80 p-3 backdrop-blur-xl sm:bottom-6">
          {error && (
            <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="text-sm text-[#A0B0D0] transition hover:text-white"
            >
              ← Cancel
            </button>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-[#A0B0D0]/60 sm:block">
                Your report saves immediately
              </span>
              <button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-gradient-to-r from-[#2A5CFF] to-[#1C3F95] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_24px_rgba(42,92,255,0.45)] transition duration-200 hover:scale-[1.02] hover:shadow-[0_0_44px_rgba(42,92,255,0.65)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? 'Submitting…' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
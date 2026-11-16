import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const statusMeta = {
  lost:     { label: 'Lost',       cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
  found:    { label: 'Unclaimed',  cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  claimed:  { label: 'Approved',   cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  pending:  { label: 'Pending',    cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  approved: { label: 'Approved',   cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  rejected: { label: 'Rejected',   cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
  returned: { label: 'Returned',   cls: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
};

const TABS = [
  { id: 'overview',  label: 'Overview & Pending Claims' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'matching',  label: 'Lost ↔ Found' },
  { id: 'aging',     label: 'Aging & Retention' },
  { id: 'claimslog', label: 'Claims Log' },
];

const CATEGORIES = [
  { value: 'electronics',  label: 'Electronics' },
  { value: 'bottles',      label: 'Bottles' },
  { value: 'drinkware',    label: 'Drinkware' },
  { value: 'clothing',     label: 'Clothing' },
  { value: 'books',        label: 'Books' },
  { value: 'ids_cards',    label: 'IDs / Wallets' },
  { value: 'bags_wallets', label: 'Bags' },
  { value: 'keys',         label: 'Keys' },
  { value: 'keys_ids',     label: 'Keys / IDs' },
  { value: 'sports',       label: 'Sports' },
  { value: 'other',        label: 'Other' },
];

function Pill({ text, className = '' }) {
  return (
    <span className={`whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${className}`}>
      {text}
    </span>
  );
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  if (!toast) return null;
  const cls = toast.kind === 'success'
    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
    : toast.kind === 'error'
      ? 'border-red-500/40 bg-red-500/10 text-red-300'
      : 'border-[#2A5CFF]/40 bg-[#2A5CFF]/10 text-[#A0B0D0]';
  return (
    <div className={`fixed bottom-4 right-4 z-[70] max-w-sm rounded-xl border px-4 py-2.5 text-sm shadow-2xl backdrop-blur-xl ${cls}`}>
      <div className="flex items-start gap-2">
        <span className="flex-1">{toast.message}</span>
        <button onClick={onClose} className="opacity-60 hover:opacity-100">✕</button>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, accent }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
      <p className="text-[10px] uppercase tracking-wider text-[#A0B0D0]">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${accent || 'text-white'}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-[#A0B0D0]">{sub}</p>}
    </div>
  );
}

/* ---------------- Quick Log Modal ---------------- */
function QuickLogModal({ onClose, onCreated, token }) {
  const [form, setForm] = useState({
    title: '', category: '', category_other: '', color: '',
    description: '', last_location: '', storage_location: '', private_notes: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (!form.title.trim()) return setError('Title is required');
    if (!form.category) return setError('Category is required');
    if (!form.storage_location.trim()) return setError('Storage location is required');
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/items/quick-log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      onCreated(data.id);
    } catch (err) {
      setError(err.message || 'Failed to log item');
    } finally {
      setBusy(false);
    }
  }

  const inputCls = 'w-full rounded-lg border border-white/10 bg-[#0A1128]/60 px-3 py-2 text-sm text-white placeholder-[#A0B0D0]/40 outline-none transition focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/15 bg-[#0A1128]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h2 className="text-sm font-semibold text-white">Quick Log Found Item</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-[#A0B0D0] hover:bg-white/5 hover:text-white">✕</button>
        </div>
        <form onSubmit={submit} className="space-y-3 p-5">
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#A0B0D0]">Title *</label>
            <input value={form.title} onChange={(e) => setField('title', e.target.value)} className={inputCls} placeholder="Black Hydro Flask" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#A0B0D0]">Category *</label>
              <select value={form.category} onChange={(e) => setField('category', e.target.value)} className={inputCls}>
                <option value="" className="text-black">Select</option>
                {CATEGORIES.map((c) => (<option key={c.value} value={c.value} className="text-black">{c.label}</option>))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#A0B0D0]">Color</label>
              <input value={form.color} onChange={(e) => setField('color', e.target.value)} className={inputCls} placeholder="Blue" />
            </div>
          </div>
          {form.category === 'other' && (
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#A0B0D0]">Specify category</label>
              <input value={form.category_other} onChange={(e) => setField('category_other', e.target.value)} className={inputCls} />
            </div>
          )}
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#A0B0D0]">Public description</label>
            <textarea rows={2} value={form.description} onChange={(e) => setField('description', e.target.value)} className={inputCls} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#A0B0D0]">Found at</label>
              <input value={form.last_location} onChange={(e) => setField('last_location', e.target.value)} className={inputCls} placeholder="Library" />
            </div>
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#A0B0D0]">Storage location *</label>
              <input value={form.storage_location} onChange={(e) => setField('storage_location', e.target.value)} className={inputCls} placeholder="Main Office Safe · Bin A3" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#A0B0D0]">Private verification notes</label>
            <textarea rows={2} value={form.private_notes} onChange={(e) => setField('private_notes', e.target.value)} className={inputCls} placeholder="Never shown publicly" />
          </div>
          {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/80 hover:bg-white/[0.06]">Cancel</button>
            <button type="submit" disabled={busy} className="rounded-lg bg-gradient-to-r from-[#2A5CFF] to-[#1C3F95] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
              {busy ? 'Saving…' : 'Log item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------- Edit Item Modal ---------------- */
function EditItemModal({ token, itemId, onClose, onSaved }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    title: '', brand: '', color: '', category: '', category_other: '',
    description: '', storage_location: '', private_notes: '',
    last_location: '', urgency: 'normal', status: 'found',
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/admin/items/${itemId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) {
          setForm({
            title: data.title || '',
            brand: data.brand || '',
            color: data.color || '',
            category: data.category || '',
            category_other: data.category_other || '',
            description: data.description || '',
            storage_location: data.storage_location || '',
            private_notes: data.private_notes || '',
            last_location: data.last_location || '',
            urgency: data.urgency || 'normal',
            status: data.status || 'found',
          });
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (itemId) load();
    return () => { cancelled = true; };
  }, [itemId, token]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      onSaved(data.item);
    } catch (err) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full rounded-lg border border-white/10 bg-[#0A1128]/60 px-3 py-2 text-sm text-white placeholder-[#A0B0D0]/40 outline-none transition focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/15 bg-[#0A1128]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h2 className="text-sm font-semibold text-white">Edit Item #{itemId}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-[#A0B0D0] hover:bg-white/5 hover:text-white">✕</button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-[#A0B0D0]">Loading item…</div>
        ) : (
          <form onSubmit={save} className="max-h-[75vh] space-y-3 overflow-y-auto p-5">
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#A0B0D0]">Title *</label>
              <input required value={form.title} onChange={(e) => setField('title', e.target.value)} className={inputCls} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#A0B0D0]">Category</label>
                <select value={form.category} onChange={(e) => setField('category', e.target.value)} className={inputCls}>
                  <option value="" className="text-black">None</option>
                  {CATEGORIES.map((c) => (<option key={c.value} value={c.value} className="text-black">{c.label}</option>))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#A0B0D0]">Brand</label>
                <input value={form.brand} onChange={(e) => setField('brand', e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#A0B0D0]">Color</label>
                <input value={form.color} onChange={(e) => setField('color', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#A0B0D0]">Status</label>
                <select value={form.status} onChange={(e) => setField('status', e.target.value)} className={inputCls}>
                  <option value="found" className="text-black">Unclaimed</option>
                  <option value="claimed" className="text-black">Approved</option>
                  <option value="lost" className="text-black">Lost</option>
                </select>
              </div>
            </div>

            {form.category === 'other' && (
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#A0B0D0]">Specify category</label>
                <input value={form.category_other} onChange={(e) => setField('category_other', e.target.value)} className={inputCls} />
              </div>
            )}

            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#A0B0D0]">Public description</label>
              <textarea rows={2} value={form.description} onChange={(e) => setField('description', e.target.value)} className={inputCls} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#A0B0D0]">Found at</label>
                <input value={form.last_location} onChange={(e) => setField('last_location', e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#A0B0D0]">Storage location</label>
                <input value={form.storage_location} onChange={(e) => setField('storage_location', e.target.value)} className={inputCls} />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#A0B0D0]">Urgency</label>
              <select value={form.urgency} onChange={(e) => setField('urgency', e.target.value)} className={inputCls}>
                <option value="low" className="text-black">Low</option>
                <option value="normal" className="text-black">Normal</option>
                <option value="high" className="text-black">High</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-wider text-[#A0B0D0]">Private verification notes</label>
              <textarea rows={2} value={form.private_notes} onChange={(e) => setField('private_notes', e.target.value)} className={inputCls} />
            </div>

            {error && <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={onClose} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/80 hover:bg-white/[0.06]">Cancel</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-gradient-to-r from-[#2A5CFF] to-[#1C3F95] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

/* ---------------- Verification Panel ---------------- */
function VerificationPanel({ token, itemId, onClose, onToast, onChanged }) {
  const [claims, setClaims] = useState([]);
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [pickup, setPickup] = useState('');
  const [rejectReason, setRejectReason] = useState({});
  const [showReject, setShowReject] = useState({});

  async function load() {
    setLoading(true);
    try {
      const [itemRes, claimsRes] = await Promise.all([
        fetch(`${API_BASE}/api/items/${itemId}`),
        fetch(`${API_BASE}/api/admin/claims/by-item/${itemId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (itemRes.ok) setItem(await itemRes.json());
      if (claimsRes.ok) setClaims(await claimsRes.json());
    } catch {}
    setLoading(false);
  }

  useEffect(() => { if (itemId) load(); }, [itemId]);

  async function approve(claimId) {
    setBusyId(claimId);
    try {
      const res = await fetch(`${API_BASE}/api/admin/claims/${claimId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pickup_instructions: pickup || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      onToast({ kind: 'success', message: `Claim #${claimId} approved. Competing claims auto-rejected.` });
      onChanged();
      await load();
    } catch (err) {
      onToast({ kind: 'error', message: err.message });
    } finally { setBusyId(null); }
  }

  async function reject(claimId) {
    setBusyId(claimId);
    try {
      const res = await fetch(`${API_BASE}/api/admin/claims/${claimId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: rejectReason[claimId] || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      onToast({ kind: 'success', message: `Claim #${claimId} rejected.` });
      setShowReject((s) => ({ ...s, [claimId]: false }));
      onChanged();
      await load();
    } catch (err) {
      onToast({ kind: 'error', message: err.message });
    } finally { setBusyId(null); }
  }

  async function markReturned() {
    setBusyId('returned');
    try {
      const res = await fetch(`${API_BASE}/api/admin/items/${itemId}/returned`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      onToast({ kind: 'success', message: 'Item marked as physically returned.' });
      onChanged();
      onClose();
    } catch (err) {
      onToast({ kind: 'error', message: err.message });
    } finally { setBusyId(null); }
  }

  const imageUrl = item?.image_url ? `http://localhost:5000${item.image_url}` : null;
  const approvedClaim = claims.find((c) => c.status === 'approved');
  const pendingClaims = claims.filter((c) => c.status === 'pending');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 backdrop-blur-sm" onClick={onClose}>
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0A1128]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Claim Verification · {item?.title || `Item #${itemId}`}</h2>
            <p className="text-[11px] text-[#A0B0D0]">Review custody record against each claimant's proof.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-[#A0B0D0] hover:bg-white/5 hover:text-white">✕</button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center"><p className="text-sm text-[#A0B0D0]">Loading…</p></div>
        ) : (
          <div className="grid flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[1fr_1.3fr]">
            <div className="border-white/10 p-4 lg:border-r">
              <h3 className="mb-2 text-[10px] uppercase tracking-wider text-[#A0B0D0]/70">Custody record</h3>
              <div className="overflow-hidden rounded-lg border border-white/10 bg-black/30">
                {imageUrl ? (
                  <img src={imageUrl} alt={item?.title} className="aspect-[4/3] w-full object-cover" />
                ) : (
                  <div className="flex aspect-[4/3] w-full items-center justify-center text-[#A0B0D0]/40">
                    <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5z" />
                    </svg>
                  </div>
                )}
              </div>
              <p className="mt-3 text-sm font-semibold text-white">{item?.title}</p>
              <p className="text-[11px] capitalize text-[#A0B0D0]">{(item?.category || '').replace(/_/g, ' ')}</p>

              <dl className="mt-3 space-y-2 text-xs">
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-[#A0B0D0]/70">Storage location</dt>
                  <dd className="mt-0.5 text-white">{item?.storage_location || <em className="text-[#A0B0D0]/60">Not specified</em>}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-[#A0B0D0]/70">Private verification notes</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-white">{item?.private_notes || <em className="text-[#A0B0D0]/60">No notes</em>}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wider text-[#A0B0D0]/70">Public description</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-[#A0B0D0]">{item?.description || '—'}</dd>
                </div>
              </dl>

              {approvedClaim && (
                <div className="mt-4 rounded-lg border border-blue-500/30 bg-blue-500/[0.06] p-3">
                  <p className="text-[10px] uppercase tracking-wider text-blue-300">Approved for pickup</p>
                  <p className="mt-1 text-xs text-white">{approvedClaim.claimant} · #{approvedClaim.claimant_student_id || '—'}</p>
                  <button
                    onClick={markReturned}
                    disabled={busyId === 'returned'}
                    className="mt-2 w-full rounded-lg bg-blue-500/20 px-3 py-2 text-xs font-medium text-blue-300 hover:bg-blue-500/30 disabled:opacity-40"
                  >
                    {busyId === 'returned' ? 'Marking…' : 'Mark as returned (handover complete)'}
                  </button>
                </div>
              )}
            </div>

            <div className="p-4">
              <h3 className="mb-2 text-[10px] uppercase tracking-wider text-[#A0B0D0]/70">
                Claimant submissions ({pendingClaims.length} pending{approvedClaim ? ' · 1 approved' : ''})
              </h3>

              {pendingClaims.length === 0 && !approvedClaim && (
                <p className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-4 text-center text-xs text-[#A0B0D0]">
                  No pending claims on this item.
                </p>
              )}

              <div className="space-y-3">
                {claims.map((c) => {
                  const s = statusMeta[c.status] || statusMeta.pending;
                  const proofUrl = c.supporting_image_url ? `http://localhost:5000${c.supporting_image_url}` : null;
                  return (
                    <div key={c.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white">{c.claimant}</p>
                          <p className="text-[11px] text-[#A0B0D0]">ID: {c.claimant_student_id || '—'} · {c.claimant_email || '—'}</p>
                          <p className="mt-0.5 text-[11px] text-[#A0B0D0]/70">Submitted {new Date(c.claim_date).toLocaleString()}</p>
                        </div>
                        <Pill text={s.label} className={s.cls} />
                      </div>

                      <div className="mt-2 rounded-lg border border-white/5 bg-white/[0.01] p-2">
                        <p className="text-[10px] uppercase tracking-wider text-[#A0B0D0]/70">Proof</p>
                        <p className="mt-1 whitespace-pre-wrap text-xs text-white">{c.proof}</p>
                        {c.lost_context && (
                          <p className="mt-1 text-[11px] text-[#A0B0D0]"><strong className="text-white">Where lost:</strong> {c.lost_context}</p>
                        )}
                        {c.phone && (
                          <p className="mt-1 text-[11px] text-[#A0B0D0]"><strong className="text-white">Phone:</strong> {c.phone}</p>
                        )}
                        {proofUrl && (
                          <img src={proofUrl} alt="proof" className="mt-2 h-20 rounded-md border border-white/10 object-cover" />
                        )}
                      </div>

                      {c.status === 'pending' && (
                        <>
                          <input
                            type="text"
                            value={pickup}
                            onChange={(e) => setPickup(e.target.value)}
                            placeholder="Optional: pickup instructions for the approved claimant"
                            className="mt-2 w-full rounded-lg border border-white/10 bg-[#0A1128]/60 px-3 py-1.5 text-xs text-white placeholder-[#A0B0D0]/40 outline-none focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40"
                          />

                          {showReject[c.id] && (
                            <input
                              type="text"
                              value={rejectReason[c.id] || ''}
                              onChange={(e) => setRejectReason((r) => ({ ...r, [c.id]: e.target.value }))}
                              placeholder="Reject reason (optional)"
                              className="mt-2 w-full rounded-lg border border-white/10 bg-[#0A1128]/60 px-3 py-1.5 text-xs text-white placeholder-[#A0B0D0]/40 outline-none focus:border-red-500/50"
                            />
                          )}

                          <div className="mt-2 flex flex-wrap gap-2">
                            <button
                              onClick={() => approve(c.id)}
                              disabled={busyId === c.id}
                              className="rounded-lg bg-green-500/15 px-3 py-1.5 text-xs font-medium text-green-400 hover:bg-green-500/25 disabled:opacity-40"
                            >
                              {busyId === c.id ? 'Approving…' : 'Approve claim'}
                            </button>
                            {!showReject[c.id] ? (
                              <button
                                onClick={() => setShowReject((s) => ({ ...s, [c.id]: true }))}
                                className="rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/25"
                              >
                                Reject claim
                              </button>
                            ) : (
                              <button
                                onClick={() => reject(c.id)}
                                disabled={busyId === c.id}
                                className="rounded-lg bg-red-500/30 px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-500/40 disabled:opacity-40"
                              >
                                Confirm reject
                              </button>
                            )}
                          </div>
                        </>
                      )}

                      {c.status !== 'pending' && c.reject_reason && (
                        <p className="mt-2 text-[11px] text-red-300/80">Reason: {c.reject_reason}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================ */
/* Main AdminDashboard                                              */
/* ================================================================ */
export default function AdminDashboard() {
  const { token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Derive tab from URL: /admin/overview -> 'overview'
  const pathTab = location.pathname.split('/')[2] || 'overview';
  const tab = ['overview', 'inventory', 'matching', 'aging', 'claimslog'].includes(pathTab)
    ? pathTab
    : 'overview';

  function setTab(id) {
    navigate(`/admin/${id}`);
  }
  const [stats, setStats] = useState(null);
  const [pendingClaims, setPendingClaims] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [invFilters, setInvFilters] = useState({ status: 'all', category: 'all', q: '' });
  const [lostReports, setLostReports] = useState([]);
  const [aging, setAging] = useState([]);
  const [agingSelected, setAgingSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [previewItemId, setPreviewItemId] = useState(null);
  const [showQuickLog, setShowQuickLog] = useState(false);
  const [editItemId, setEditItemId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [claimsLog, setClaimsLog] = useState([]);
  const [claimsLogFilters, setClaimsLogFilters] = useState({ status: 'all', q: '' });
  const [claimsLogLoading, setClaimsLogLoading] = useState(false);

  function notify(kind, message) { setToast({ kind, message }); }
  function fireChanged() { refreshAll(); }

  async function refreshAll() {
    setLoading(true);
    setError(null);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [s, p, inv, lost, age] = await Promise.all([
        fetch(`${API_BASE}/api/admin/stats`, { headers }),
        fetch(`${API_BASE}/api/admin/claims/pending`, { headers }),
        fetch(`${API_BASE}/api/admin/inventory?limit=200`, { headers }),
        fetch(`${API_BASE}/api/admin/lost-reports`, { headers }),
        fetch(`${API_BASE}/api/admin/aging`, { headers }),
      ]);
      if (s.ok) setStats((await s.json()).stats);
      if (p.ok) setPendingClaims(await p.json());
      if (inv.ok) setInventory(await inv.json());
      if (lost.ok) setLostReports(await lost.json());
      if (age.ok) setAging(await age.json());
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  }

  async function loadClaimsLog() {
    setClaimsLogLoading(true);
    try {
      const params = new URLSearchParams();
      if (claimsLogFilters.status !== 'all') params.set('status', claimsLogFilters.status);
      if (claimsLogFilters.q.trim()) params.set('q', claimsLogFilters.q.trim());
      const res = await fetch(`${API_BASE}/api/admin/claims/log?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setClaimsLog(await res.json());
    } catch {}
    setClaimsLogLoading(false);
  }

  useEffect(() => { if (token) refreshAll(); }, [token]);

  useEffect(() => {
    if (token && tab === 'claimslog') loadClaimsLog();
  }, [token, tab, claimsLogFilters]);

  const filteredInventory = useMemo(() => {
    return inventory.filter((it) => {
      if (invFilters.status !== 'all') {
        if (invFilters.status === 'returned') {
          if (!it.returned_at) return false;
        } else if (invFilters.status === 'unclaimed') {
          if (it.status !== 'found' || it.returned_at) return false;
        } else if (it.status !== invFilters.status) {
          return false;
        }
      }
      if (invFilters.category !== 'all' && it.category !== invFilters.category) return false;
      if (invFilters.q.trim()) {
        const q = invFilters.q.toLowerCase();
        if (!(it.title || '').toLowerCase().includes(q) &&
            !(it.description || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [inventory, invFilters]);

  async function linkManual(lostId, foundId) {
    try {
      const res = await fetch(`${API_BASE}/api/admin/link-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lost_id: lostId, found_id: foundId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      notify('success', 'Lost report and found item linked. Reporter was notified.');
      refreshAll();
    } catch (err) {
      notify('error', err.message);
    }
  }

  async function archiveSelected() {
    if (agingSelected.length === 0) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/items/bulk-archive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ids: agingSelected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      notify('success', `Archived ${data.archived} item${data.archived === 1 ? '' : 's'}.`);
      setAgingSelected([]);
      refreshAll();
    } catch (err) {
      notify('error', err.message);
    }
  }

  function toggleAgingSelected(id) {
    setAgingSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  }

  async function handleDeleteItem(id) {
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/api/admin/items/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      notify('success', `Deleted "${data.title}".`);
      setDeleteConfirmId(null);
      refreshAll();
    } catch (err) {
      notify('error', err.message);
    } finally {
      setDeleting(false);
    }
  }

  function handleSaveEdit(updated) {
    notify('success', `Saved changes to "${updated.title}".`);
    setEditItemId(null);
    refreshAll();
  }

  async function quickSetStatus(item, status, returned) {
    try {
      const res = await fetch(`${API_BASE}/api/admin/items/${item.id}/set-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status, returned }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const parts = [];
      if (status) parts.push(`status = ${status}`);
      if (returned === true) parts.push('marked as returned');
      if (returned === false) parts.push('un-marked as returned');
      notify('success', `"${item.title}" — ${parts.join(' · ')}.`);
      refreshAll();
    } catch (err) {
      notify('error', err.message);
    }
  }

  return (
    <div className="relative space-y-4">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        <div className="absolute -top-32 right-0 h-[22rem] w-[22rem] rounded-full bg-[#2A5CFF]/10 blur-[120px]" />
        <div className="absolute -bottom-32 -left-16 h-[20rem] w-[20rem] rounded-full bg-amber-500/10 blur-[120px]" />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Admin &amp; Staff Dashboard</h1>
          <p className="mt-0.5 text-sm text-[#A0B0D0]">
            Verify claims, manage inventory, match lost &amp; found, and clean up aging items.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={refreshAll}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/80 hover:bg-white/[0.06]"
          >
            Refresh
          </button>
          <button
            onClick={() => setShowQuickLog(true)}
            className="rounded-lg bg-gradient-to-r from-[#2A5CFF] to-[#1C3F95] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_0_18px_rgba(42,92,255,0.4)] hover:scale-[1.02]"
          >
            + Quick Log Found Item
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              tab === t.id
                ? 'bg-[#2A5CFF]/15 text-white ring-1 ring-[#2A5CFF]/30'
                : 'text-[#A0B0D0] hover:bg-white/[0.04] hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="grid min-h-[30vh] place-items-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-6 backdrop-blur-xl">
          <p className="text-sm text-[#A0B0D0]">Loading admin data…</p>
        </div>
      )}

      {error && !loading && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.05] p-4 text-sm text-red-300 backdrop-blur-xl">
          Could not load admin data: {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Unclaimed Items"      value={stats?.items.found ?? 0}    sub="Found items awaiting a claim" />
            <KpiCard label="Pending Claims"       value={stats?.claims.pending ?? 0} sub="Needs review" accent="text-amber-300" />
            <KpiCard label="Open Lost Reports"    value={stats?.items.lost ?? 0}     sub="Not yet matched" />
            <KpiCard label="Returned This Month"  value={stats?.returnedThisMonth ?? 0} sub="Handovers complete" accent="text-emerald-300" />
          </div>

          {tab === 'overview' && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Claim verification queue</h2>
                <Pill text={`${pendingClaims.length} pending`} className="bg-amber-500/15 text-amber-300 border-amber-500/30" />
              </div>
              {pendingClaims.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-6 text-center">
                  <p className="text-sm text-[#A0B0D0]">No pending claims right now. 🎉</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-white/10 text-[10px] uppercase tracking-wider text-[#A0B0D0]">
                      <tr>
                        <th className="px-2 py-2 font-medium">Item</th>
                        <th className="px-2 py-2 font-medium">Claimant</th>
                        <th className="px-2 py-2 font-medium">Submitted</th>
                        <th className="px-2 py-2 font-medium">Competing</th>
                        <th className="px-2 py-2 font-medium text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {pendingClaims.map((c) => (
                        <tr key={c.id} className="hover:bg-white/[0.02]">
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/30">
                                {c.item_image_url ? (
                                  <img src={`http://localhost:5000${c.item_image_url}`} alt="" className="h-full w-full object-cover" />
                                ) : null}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-xs font-medium text-white">{c.item}</p>
                                <p className="truncate text-[10px] text-[#A0B0D0]">{c.storage_location || '—'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <p className="text-xs text-white">{c.claimant}</p>
                            <p className="text-[10px] text-[#A0B0D0]">{c.claimant_student_id || '—'}</p>
                          </td>
                          <td className="px-2 py-2 text-[11px] text-[#A0B0D0]">
                            {new Date(c.claim_date).toLocaleDateString()}
                          </td>
                          <td className="px-2 py-2">
                            {Number(c.competing_claims) > 1 ? (
                              <Pill text={`${c.competing_claims} claims`} className="bg-red-500/15 text-red-300 border-red-500/30" />
                            ) : (
                              <span className="text-[10px] text-[#A0B0D0]">Only</span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-right">
                            <button
                              onClick={() => setPreviewItemId(c.item_id)}
                              className="rounded-md border border-[#2A5CFF]/30 bg-[#2A5CFF]/10 px-2.5 py-1 text-[11px] text-[#A0B0D0] hover:bg-[#2A5CFF]/20 hover:text-white"
                            >
                              Verify
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'inventory' && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-xl">
                <input
                  value={invFilters.q}
                  onChange={(e) => setInvFilters((f) => ({ ...f, q: e.target.value }))}
                  placeholder="Search inventory…"
                  className="flex-1 rounded-lg border border-white/10 bg-[#0A1128]/60 px-3 py-1.5 text-xs text-white placeholder-[#A0B0D0]/50 outline-none focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40"
                />
                <select
                  value={invFilters.status}
                  onChange={(e) => setInvFilters((f) => ({ ...f, status: e.target.value }))}
                  className="rounded-lg border border-white/10 bg-[#0A1128]/60 px-3 py-1.5 text-xs text-white outline-none focus:border-[#2A5CFF]"
                >
                  <option value="all" className="text-black">All statuses</option>
                  <option value="unclaimed" className="text-black">Unclaimed</option>
                  <option value="claimed" className="text-black">Approved</option>
                  <option value="returned" className="text-black">Returned</option>
                </select>
                <select
                  value={invFilters.category}
                  onChange={(e) => setInvFilters((f) => ({ ...f, category: e.target.value }))}
                  className="rounded-lg border border-white/10 bg-[#0A1128]/60 px-3 py-1.5 text-xs text-white outline-none focus:border-[#2A5CFF]"
                >
                  <option value="all" className="text-black">All categories</option>
                  {CATEGORIES.map((c) => (<option key={c.value} value={c.value} className="text-black">{c.label}</option>))}
                </select>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-white/10 text-[10px] uppercase tracking-wider text-[#A0B0D0]">
                    <tr>
                      <th className="px-3 py-2">ID</th>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2">Storage</th>
                      <th className="px-3 py-2">Days</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredInventory.map((it) => {
                      const statusKey = it.returned_at ? 'returned' : it.status;
                      const s = statusMeta[statusKey] || statusMeta.found;
                      return (
                        <tr key={it.id} className="hover:bg-white/[0.02]">
                          <td className="px-3 py-2 text-[11px] text-[#A0B0D0]">{it.id}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/30">
                                {it.image_url ? (
                                  <img src={`http://localhost:5000${it.image_url}`} alt="" className="h-full w-full object-cover" />
                                ) : null}
                              </div>
                              <p className="truncate text-xs text-white">{it.title}</p>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-[11px] text-[#A0B0D0]">{it.storage_location || '—'}</td>
                          <td className="px-3 py-2 text-[11px] text-[#A0B0D0]">{it.days_in_custody}d</td>
                          <td className="px-3 py-2"><Pill text={s.label} className={s.cls} /></td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              <select
                                value={it.status}
                                onChange={(e) => quickSetStatus(it, e.target.value, undefined)}
                                className="rounded-md border border-white/10 bg-[#0A1128]/60 px-1.5 py-1 text-[11px] text-white outline-none focus:border-[#2A5CFF]"
                                title="Change status"
                              >
                                <option value="found" className="text-black">Unclaimed</option>
                                <option value="claimed" className="text-black">Approved</option>
                                <option value="lost" className="text-black">Lost</option>
                              </select>

                              {it.returned_at ? (
                                <button
                                  onClick={() => quickSetStatus(it, undefined, false)}
                                  className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-300 hover:bg-amber-500/20"
                                  title="Undo returned"
                                >
                                  Undo returned
                                </button>
                              ) : (
                                <button
                                  onClick={() => quickSetStatus(it, undefined, true)}
                                  className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300 hover:bg-emerald-500/20"
                                  title="Mark as physically returned"
                                >
                                  Mark returned
                                </button>
                              )}

                              <button
                                onClick={() => setPreviewItemId(it.id)}
                                className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[11px] text-[#A0B0D0] hover:bg-white/[0.06] hover:text-white"
                              >
                                View
                              </button>
                              <button
                                onClick={() => setEditItemId(it.id)}
                                className="rounded-md border border-[#2A5CFF]/30 bg-[#2A5CFF]/10 px-2 py-1 text-[11px] text-[#A0B0D0] hover:bg-[#2A5CFF]/20 hover:text-white"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId({ id: it.id, title: it.title })}
                                className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/20 hover:text-red-200"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'matching' && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
                <h2 className="mb-3 text-sm font-semibold text-white">Open lost reports</h2>
                {lostReports.length === 0 ? (
                  <p className="text-sm text-[#A0B0D0]">No open lost reports.</p>
                ) : (
                  <div className="space-y-2">
                    {lostReports.map((l) => (
                      <div key={l.id} className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-3 sm:flex-row sm:items-center">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white">{l.title}</p>
                          <p className="text-[11px] text-[#A0B0D0]">
                            {l.reporter} · {l.last_location || '—'} · {l.days_open}d ago
                          </p>
                        </div>
                        <select
                          onChange={(e) => e.target.value && linkManual(l.id, Number(e.target.value))}
                          defaultValue=""
                          className="rounded-lg border border-white/10 bg-[#0A1128]/60 px-2.5 py-1.5 text-xs text-white"
                        >
                          <option value="" className="text-black">Link to found item…</option>
                          {inventory
                            .filter((it) => it.status === 'found' && !it.returned_at)
                            .map((it) => (
                              <option key={it.id} value={it.id} className="text-black">
                                {it.title} (#{it.id})
                              </option>
                            ))}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'aging' && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Items in custody 30+ days</h2>
                {agingSelected.length > 0 && (
                  <button
                    onClick={archiveSelected}
                    className="rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/25"
                  >
                    Archive {agingSelected.length} selected
                  </button>
                )}
              </div>
              {aging.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-6 text-center">
                  <p className="text-sm text-[#A0B0D0]">No items aged 30+ days.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {aging.map((it) => (
                    <label key={it.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-white/[0.02] p-3">
                      <input
                        type="checkbox"
                        checked={agingSelected.includes(it.id)}
                        onChange={() => toggleAgingSelected(it.id)}
                        className="h-4 w-4 rounded border-white/20 accent-[#2A5CFF]"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-white">{it.title}</p>
                        <p className="text-[11px] text-[#A0B0D0]">
                          {it.storage_location || '—'} · {it.days_in_custody} days · reported by {it.reporter || '—'}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'claimslog' && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-xl">
                <input
                  value={claimsLogFilters.q}
                  onChange={(e) => setClaimsLogFilters((f) => ({ ...f, q: e.target.value }))}
                  placeholder="Search by username, student ID, email, or item title…"
                  className="flex-1 rounded-lg border border-white/10 bg-[#0A1128]/60 px-3 py-1.5 text-xs text-white placeholder-[#A0B0D0]/50 outline-none focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40"
                />
                <select
                  value={claimsLogFilters.status}
                  onChange={(e) => setClaimsLogFilters((f) => ({ ...f, status: e.target.value }))}
                  className="rounded-lg border border-white/10 bg-[#0A1128]/60 px-3 py-1.5 text-xs text-white outline-none focus:border-[#2A5CFF]"
                >
                  <option value="all" className="text-black">All statuses</option>
                  <option value="pending" className="text-black">Pending</option>
                  <option value="approved" className="text-black">Approved</option>
                  <option value="rejected" className="text-black">Rejected</option>
                </select>
                <button
                  onClick={loadClaimsLog}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/80 hover:bg-white/[0.06]"
                >
                  Refresh
                </button>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-white/10 text-[10px] uppercase tracking-wider text-[#A0B0D0]">
                    <tr>
                      <th className="px-3 py-2">ID</th>
                      <th className="px-3 py-2">Claimant</th>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2">Submitted</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">History</th>
                      <th className="px-3 py-2 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {claimsLogLoading && claimsLog.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-xs text-[#A0B0D0]">
                          Loading claims…
                        </td>
                      </tr>
                    )}
                    {!claimsLogLoading && claimsLog.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-6 text-center text-xs text-[#A0B0D0]">
                          No claims match these filters.
                        </td>
                      </tr>
                    )}
                    {claimsLog.map((c) => {
                      const s = statusMeta[c.status] || statusMeta.pending;
                      const pendingCount =
                        Number(c.claimant_total_claims) -
                        Number(c.claimant_approved_claims) -
                        Number(c.claimant_rejected_claims);
                      return (
                        <tr key={c.id} className="hover:bg-white/[0.02]">
                          <td className="px-3 py-2 text-[11px] text-[#A0B0D0]">{c.id}</td>
                          <td className="px-3 py-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-white">
                                {c.claimant_full_name || c.claimant}
                              </p>
                              <p className="truncate text-[10px] text-[#A0B0D0]">
                                {c.claimant_student_id || '—'} · @{c.claimant}
                              </p>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <div className="h-7 w-7 shrink-0 overflow-hidden rounded-md border border-white/10 bg-black/30">
                                {c.item_image_url ? (
                                  <img src={`http://localhost:5000${c.item_image_url}`} alt="" className="h-full w-full object-cover" />
                                ) : null}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-xs text-white">{c.item_title}</p>
                                <p className="truncate text-[10px] text-[#A0B0D0]">{c.item_storage || '—'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-[11px] text-[#A0B0D0]">
                            {new Date(c.claim_date).toLocaleString()}
                          </td>
                          <td className="px-3 py-2">
                            <Pill text={s.label} className={s.cls} />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap items-center gap-1 text-[10px]">
                              <span
                                className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-emerald-300"
                                title="Approved claims by this user"
                              >
                                ✓ {c.claimant_approved_claims}
                              </span>
                              <span
                                className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-amber-300"
                                title="Pending claims by this user"
                              >
                                ⏳ {pendingCount}
                              </span>
                              <span
                                className="rounded-full border border-red-500/30 bg-red-500/10 px-1.5 py-0.5 text-red-300"
                                title="Rejected claims by this user"
                              >
                                ✕ {c.claimant_rejected_claims}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => setPreviewItemId(c.item_id)}
                              className="rounded-md border border-[#2A5CFF]/30 bg-[#2A5CFF]/10 px-2 py-1 text-[11px] text-[#A0B0D0] hover:bg-[#2A5CFF]/20 hover:text-white"
                            >
                              View item
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {previewItemId && (
        <VerificationPanel
          token={token}
          itemId={previewItemId}
          onClose={() => setPreviewItemId(null)}
          onToast={({ kind, message }) => notify(kind, message)}
          onChanged={fireChanged}
        />
      )}
      {showQuickLog && (
        <QuickLogModal
          token={token}
          onClose={() => setShowQuickLog(false)}
          onCreated={(id) => {
            setShowQuickLog(false);
            notify('success', `Logged item #${id}.`);
            refreshAll();
          }}
        />
      )}
      {editItemId && (
        <EditItemModal
          token={token}
          itemId={editItemId}
          onClose={() => setEditItemId(null)}
          onSaved={handleSaveEdit}
        />
      )}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setDeleteConfirmId(null)}>
          <div className="w-full max-w-sm rounded-2xl border border-red-500/30 bg-[#0A1128] p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-sm font-semibold text-white">Delete this item?</h2>
            <p className="mt-2 text-xs text-[#A0B0D0]">
              You're about to permanently delete <strong className="text-white">"{deleteConfirmId.title}"</strong>.
              This removes the item, its photos, and any claims linked to it. This cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                disabled={deleting}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/80 hover:bg-white/[0.06] disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteItem(deleteConfirmId.id)}
                disabled={deleting}
                className="rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/30 disabled:opacity-40"
              >
                {deleting ? 'Deleting…' : 'Yes, delete permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
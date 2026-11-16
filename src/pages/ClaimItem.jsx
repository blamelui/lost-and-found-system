import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const statusMeta = {
  lost:    { label: 'Lost',     cls: 'bg-red-500/15 text-red-300 border-red-500/30' },
  found:   { label: 'Found',    cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  claimed: { label: 'Returned', cls: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  pending: { label: 'Pending verification', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
};

const PROOF_TEMPLATES = [
  'Has a specific sticker',
  'Scratches or dents',
  'Engraved name or initials',
  'Contents inside',
  'Lock-screen wallpaper',
];

function Pill({ text, className = '' }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${className}`}>
      {text}
    </span>
  );
}

function ReadOnlyRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.02] px-2.5 py-1.5">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/[0.04] text-[#A0B0D0]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[9px] uppercase tracking-wider text-[#A0B0D0]/70">{label}</p>
        <p className="truncate text-xs text-white">{value || '—'}</p>
      </div>
      <svg className="h-2.5 w-2.5 shrink-0 text-[#A0B0D0]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    </div>
  );
}

function StepDot({ index, state, label }) {
  const isDone = state === 'done';
  const isActive = state === 'active';
  return (
    <div className="flex flex-1 items-center gap-2">
      <div
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-[10px] font-semibold transition ${
          isDone
            ? 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300'
            : isActive
              ? 'border-[#2A5CFF] bg-[#2A5CFF]/20 text-white shadow-[0_0_12px_rgba(42,92,255,0.5)]'
              : 'border-white/15 bg-white/[0.02] text-[#A0B0D0]/60'
        }`}
      >
        {isDone ? '✓' : index}
      </div>
      <span className={`truncate text-[11px] ${isActive ? 'text-white' : 'text-[#A0B0D0]/70'}`}>
        {label}
      </span>
    </div>
  );
}

export default function ClaimItem() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [proof, setProof] = useState('');
  const [lostContext, setLostContext] = useState('');
  const [phone, setPhone] = useState('');
  const [declared, setDeclared] = useState(false);
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedClaim, setSubmittedClaim] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [proofError, setProofError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`${API_BASE}/api/items/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setItem(data);
      } catch (e) {
        if (!cancelled) setLoadError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (id) load();
    return () => { cancelled = true; };
  }, [id]);

  function onFileChange(e) {
    const file = e.target.files?.[0] || null;
    if (!file) { setProofFile(null); setProofPreview(null); return; }
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError('Image is over 5 MB — please pick a smaller file.');
      return;
    }
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setProofPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  function clearFile() {
    setProofFile(null);
    setProofPreview(null);
  }

  function addTemplate(text) {
    setProof((p) => {
      const prefix = p && !p.endsWith(' ') && !p.endsWith('\n') ? ' ' : '';
      return `${p}${prefix}${text}.`;
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitError(null);
    setProofError(null);

    // ---- Validation: show specific errors, never fail silently ----
    if (!proof.trim()) {
      setProofError('Please describe the unique details of this item — proof of ownership is required.');
      return;
    }
    if (proof.trim().length < 20) {
      setProofError('Please describe the item in more detail (at least 20 characters).');
      return;
    }
    if (!declared) {
      setSubmitError('You must check the honesty declaration before submitting.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('item_id', String(id));
      fd.append('proof', proof.trim());
      if (lostContext) fd.append('lost_context', lostContext.trim());
      if (phone) fd.append('phone', phone.trim());
      if (proofFile) fd.append('supporting_image', proofFile);

      const res = await fetch(`${API_BASE}/api/claims`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      setSubmittedClaim(data);
      setIsSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit claim');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 backdrop-blur-xl">
        <p className="text-sm text-[#A0B0D0]">Loading item…</p>
      </div>
    );
  }

  if (loadError || !item) {
    return (
      <div className="grid min-h-[40vh] place-items-center rounded-3xl border border-dashed border-red-500/30 bg-red-500/[0.05] p-8 text-center backdrop-blur-xl">
        <div>
          <h2 className="text-lg font-semibold text-red-300">Could not load item</h2>
          <p className="mt-1 text-sm text-[#A0B0D0]">{loadError || 'Item not found'}</p>
          <Link to="/search" className="mt-4 inline-block text-xs text-[#A0B0D0] hover:text-white">
            ← Back to search
          </Link>
        </div>
      </div>
    );
  }

  const itemStatus = item.status === 'found' ? 'found' : (item.status === 'claimed' ? 'claimed' : item.status);
  const catLabel = item.category === 'other' ? item.category_other || 'Other' : (item.category || '').replace(/_/g, ' ');
  const imageUrl = item.image_url ? `http://localhost:5000${item.image_url}` : null;
  const alreadyClaimed = itemStatus === 'claimed';
  const isOwnItem = Number(item.user_id) === Number(user?.id);

  /* Confirmation view */
  if (isSubmitted && submittedClaim) {
    return (
      <div className="relative mx-auto max-w-2xl space-y-5">
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl">
          <div className="absolute -top-32 right-0 h-[22rem] w-[22rem] rounded-full bg-emerald-500/15 blur-[120px]" />
          <div className="absolute -bottom-32 -left-16 h-[20rem] w-[20rem] rounded-full bg-[#2A5CFF]/15 blur-[120px]" />
        </div>

        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-6 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-semibold tracking-tight text-emerald-300">Claim submitted!</h1>
              <p className="mt-1 text-sm text-[#A0B0D0]">
                School staff will review your proof of ownership and notify you with pickup
                instructions once verified.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Pill text="Pending verification" className={statusMeta.pending.cls} />
                <Pill
                  text={`Ref #${String(submittedClaim.id).padStart(6, '0')}`}
                  className="border-white/15 bg-white/[0.04] text-[#A0B0D0]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <StepDot index="1" state="done" label="Submitted" />
            <span className="h-px flex-shrink-0 bg-white/10" style={{ width: 16 }} />
            <StepDot index="2" state="active" label="Under review" />
            <span className="h-px flex-shrink-0 bg-white/10" style={{ width: 16 }} />
            <StepDot index="3" state="todo" label="Ready for pickup" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl">
          <div className="flex items-start gap-3">
            {imageUrl && (
              <img
                src={imageUrl}
                alt={item.title}
                className="h-16 w-16 shrink-0 rounded-lg border border-white/10 object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{item.title}</p>
              <p className="mt-0.5 text-xs capitalize text-[#A0B0D0]">{catLabel}</p>
              {item.last_location && (
                <p className="mt-1 text-[11px] text-[#A0B0D0]">📍 Found at {item.last_location}</p>
              )}
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.01] p-3">
            <p className="text-[10px] uppercase tracking-wider text-[#A0B0D0]/70">
              Your submitted proof
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-white">
              {submittedClaim.proof}
            </p>
            {submittedClaim.supporting_image_url && (
              <div className="mt-2">
                <p className="mb-1 text-[10px] uppercase tracking-wider text-[#A0B0D0]/70">
                  Supporting image
                </p>
                <img
                  src={`http://localhost:5000${submittedClaim.supporting_image_url}`}
                  alt="Supporting proof"
                  className="h-24 rounded-lg border border-white/10 object-cover"
                />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate('/claims')}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-white/80 transition hover:bg-white/[0.06]"
          >
            View my claims
          </button>
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="rounded-lg bg-gradient-to-r from-[#2A5CFF] to-[#1C3F95] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(42,92,255,0.4)] transition hover:scale-[1.02]"
          >
            Back to search
          </button>
        </div>
      </div>
    );
  }

  /* Form view */
  const proofTrimmed = proof.trim();
  const proofValid = proofTrimmed.length >= 20;

  return (
    <div className="relative mx-auto max-w-3xl">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        <div className="absolute -top-32 right-0 h-[22rem] w-[22rem] rounded-full bg-[#2A5CFF]/10 blur-[120px]" />
        <div className="absolute -bottom-32 -left-16 h-[20rem] w-[20rem] rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      <div className="mb-4">
        <Link to="/search" className="text-[11px] text-[#A0B0D0] transition hover:text-white">
          ← Back to search
        </Link>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Claim this item</h1>
            <p className="text-xs text-[#A0B0D0]">
              <strong className="text-white">Your proof is private.</strong> Only school staff will review it.
            </p>
          </div>
          <Pill
            text={isOwnItem ? 'Your report' : proofValid && declared ? 'Ready to submit' : `${[proofValid, declared].filter(Boolean).length}/2 required`}
            className={
              isOwnItem
                ? 'bg-red-500/15 text-red-300 border-red-500/30'
                : proofValid && declared
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-white/[0.04] text-[#A0B0D0] border-white/15'
            }
          />
        </div>
      </div>

      {/* Item summary */}
      <div className="mb-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-black/30">
            {imageUrl ? (
              <img src={imageUrl} alt={item.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <svg className="h-5 w-5 text-[#A0B0D0]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <Pill text={statusMeta[itemStatus]?.label || itemStatus} className={statusMeta[itemStatus]?.cls || 'border-white/20 text-[#A0B0D0]'} />
              <Pill text={catLabel} className="border-white/15 bg-white/[0.04] text-[#A0B0D0]" />
            </div>
            <h2 className="mt-1 truncate text-sm font-semibold text-white">{item.title}</h2>
            <p className="mt-0.5 text-[11px] text-[#A0B0D0]">
              {item.last_location && <span>📍 {item.last_location}</span>}
              {item.last_location && (item.lost_at || item.created_at) && <span> · </span>}
              {(item.lost_at || item.created_at) && (
                <span>
                  {new Date(item.lost_at || item.created_at).toLocaleDateString(undefined, {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {alreadyClaimed && (
        <div className="mb-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-300">
          This item has already been returned to its owner. You can no longer submit a claim.
        </div>
      )}

      {isOwnItem && (
        <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/[0.06] px-3 py-2 text-xs text-red-300">
          <strong>You reported this item.</strong> You can&apos;t claim an item you found and reported yourself.
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
          <h2 className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#A0B0D0]/70">
            <span className="grid h-4 w-4 place-items-center rounded-md bg-[#2A5CFF]/15 text-[9px] text-[#2A5CFF]">1</span>
            Your details
          </h2>

          <div className="space-y-1.5">
            <ReadOnlyRow
              icon={
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              }
              label="Full name"
              value={user?.full_name || user?.username}
            />
            <ReadOnlyRow
              icon={
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
                </svg>
              }
              label="Student ID"
              value={user?.student_id}
            />
            <ReadOnlyRow
              icon={
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              }
              label="School email"
              value={user?.email}
            />

            <div>
              <label htmlFor="phone" className="mb-0.5 block text-[9px] font-medium uppercase tracking-wider text-[#A0B0D0]">
                Contact phone <span className="normal-case text-[#A0B0D0]/50">(optional)</span>
              </label>
              <input
                id="phone" type="tel" maxLength={30}
                value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="0917 000 0000"
                className="w-full rounded-lg border border-white/10 bg-[#0A1128]/60 px-2.5 py-1.5 text-xs text-white placeholder-[#A0B0D0]/40 outline-none transition focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#A0B0D0]/70">
              <span className="grid h-4 w-4 place-items-center rounded-md bg-[#2A5CFF]/15 text-[9px] text-[#2A5CFF]">2</span>
              Proof of ownership
            </h2>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] ${proofValid ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-white/15 bg-white/[0.04] text-[#A0B0D0]'}`}>
              {proofValid ? '✓ Good' : `${proofTrimmed.length}/20 min`}
            </span>
          </div>

          <div className="space-y-2.5">
            <div>
              <textarea
                id="proof" required rows={3} maxLength={500}
                value={proof} onChange={(e) => setProof(e.target.value)}
                placeholder="e.g., A large Naruto sticker on the back, a small scratch on the lid, and my initials 'JD' written inside…"
                className={`w-full rounded-lg border bg-[#0A1128]/60 px-3 py-2 text-sm text-white placeholder-[#A0B0D0]/40 outline-none transition focus:ring-2 focus:ring-[#2A5CFF]/40 ${
                  proofError ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-[#2A5CFF]'
                }`}
              />
              <div className="mt-1 flex items-start justify-between gap-2">
                {proofError ? (
                  <p className="flex items-start gap-1.5 text-[10px] text-red-300">
                    <svg className="mt-0.5 h-2.5 w-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    {proofError}
                  </p>
                ) : (
                  <p className="text-[10px] text-[#A0B0D0]/60">Add at least 20 characters.</p>
                )}
                <span className="shrink-0 text-[10px] tabular-nums text-[#A0B0D0]/60">{proof.length}/500</span>
              </div>

              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <span className="text-[10px] text-[#A0B0D0]/60">Quick insert:</span>
                {PROOF_TEMPLATES.map((t) => (
                  <button
                    key={t} type="button"
                    onClick={() => addTemplate(t)}
                    className="rounded-full border border-white/10 bg-white/[0.02] px-2 py-0.5 text-[10px] text-[#A0B0D0] transition hover:border-[#2A5CFF]/40 hover:bg-[#2A5CFF]/10 hover:text-white"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <div>
                <label htmlFor="lostContext" className="mb-0.5 block text-[9px] font-medium uppercase tracking-wider text-[#A0B0D0]">
                  Where/when you lost it <span className="normal-case text-[#A0B0D0]/50">(optional)</span>
                </label>
                <input
                  id="lostContext" type="text" maxLength={255}
                  value={lostContext} onChange={(e) => setLostContext(e.target.value)}
                  placeholder="e.g., Library, last Tuesday afternoon"
                  className="w-full rounded-lg border border-white/10 bg-[#0A1128]/60 px-2.5 py-1.5 text-xs text-white placeholder-[#A0B0D0]/40 outline-none transition focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40"
                />
              </div>

              <div>
                <label className="mb-0.5 block text-[9px] font-medium uppercase tracking-wider text-[#A0B0D0]">
                  Supporting image <span className="normal-case text-[#A0B0D0]/50">(optional)</span>
                </label>
                {proofPreview ? (
                  <div className="flex items-center gap-2">
                    <div className="relative inline-block shrink-0">
                      <img src={proofPreview} alt="Preview" className="h-10 w-10 rounded-md border border-white/10 object-cover" />
                      <button
                        type="button" onClick={clearFile}
                        className="absolute -right-1 -top-1 rounded-full bg-black/80 p-0.5 text-white/90 shadow-lg transition hover:bg-black"
                        aria-label="Remove image"
                      >
                        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="min-w-0 flex-1 text-[10px] text-[#A0B0D0]">
                      <p className="truncate text-white">{proofFile?.name}</p>
                      <p>{proofFile && (proofFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="supporting_image"
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-white/20 bg-white/[0.02] px-2.5 py-1.5 text-xs text-[#A0B0D0] transition hover:border-[#2A5CFF]/60 hover:bg-[#2A5CFF]/[0.05]"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5V6a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 6v10.5M3 16.5A2.25 2.25 0 005.25 18.75h13.5A2.25 2.25 0 0021 16.5M3 16.5l4.5-4.5a2.25 2.25 0 013.182 0L15 16.5m-1.5-4.5a2.25 2.25 0 114.5 0" />
                    </svg>
                    <span className="flex-1 truncate">Upload (JPG/PNG · 5 MB)</span>
                    <input
                      id="supporting_image" type="file" accept="image/*"
                      onChange={onFileChange} className="sr-only"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </section>

        <section
          className={`rounded-2xl border p-4 backdrop-blur-xl transition ${
            declared
              ? 'border-emerald-500/40 bg-emerald-500/[0.05]'
              : 'border-white/10 bg-white/[0.03]'
          }`}
        >
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox" required
              checked={declared} onChange={(e) => setDeclared(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-white/[0.02] accent-[#2A5CFF]"
            />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-xs font-semibold text-white">
                <svg className="h-3 w-3 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                Honesty declaration
              </p>
              <p className="mt-1 text-[11px] leading-snug text-white">
                I confirm this item belongs to me and understand that false claims violate school policy.
              </p>
            </div>
          </label>

          {declared && (
            <p className="mt-2 flex items-center gap-1 text-[10px] text-emerald-300">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Confirmed — you can submit
            </p>
          )}
        </section>

        {submitError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/[0.06] px-3 py-2 text-xs text-red-300 backdrop-blur-xl">
            {submitError}
          </div>
        )}

        <div className="sticky bottom-3 z-10 rounded-xl border border-white/10 bg-[#050B14]/85 px-3 py-2 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button" onClick={() => navigate('/search')}
              className="text-xs text-[#A0B0D0] transition hover:text-white"
            >
              ← Cancel
            </button>
            <div className="flex items-center gap-2">
              <span className="hidden text-[10px] text-[#A0B0D0]/60 sm:block">
                {isOwnItem
                  ? 'Cannot claim your own item'
                  : proofValid && declared
                    ? 'Ready'
                    : 'Complete required fields'}
              </span>
              <button
                type="submit"
                disabled={isSubmitting || isOwnItem || alreadyClaimed}
                className="rounded-lg bg-gradient-to-r from-[#2A5CFF] to-[#1C3F95] px-4 py-2 text-sm font-semibold text-white shadow-[0_0_20px_rgba(42,92,255,0.4)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-1.5">
                    <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Submitting…
                  </span>
                ) : 'Submit Claim Request'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
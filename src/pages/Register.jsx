import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─────────── Allowed email domain ───────────
const ALLOWED_EMAIL_DOMAIN = 'thelewiscollege.edu.ph';
const emailRe = new RegExp(`^[^\\s@]+@${ALLOWED_EMAIL_DOMAIN.replace('.', '\\.')}$`, 'i');
// ────────────────────────────────────────────

const studentIdRe = /^[A-Z]-\d{4}-\d{3,4}$/i;
const nameRe = /^[a-zA-Z\s.'-]+$/;

const LIMITS = {
  nameMin: 3,
  nameMax: 50,
  studentIdMaxLength: 15,
  passwordMinLength: 8,
};

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    fullname: '',
    student_id: '',
    email: '',
    password: '',
    confirm_password: '',
    terms: false,
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [globalError, setGlobalError] = useState(null);
  const [busy, setBusy] = useState(false);

  function setField(name, value) {
    setFormData((f) => ({ ...f, [name]: value }));
    setFieldErrors((e) => {
      if (!e[name]) return e;
      const next = { ...e };
      delete next[name];
      return next;
    });
    setGlobalError(null);
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    let finalValue = type === 'checkbox' ? checked : value;

    if (name === 'student_id' && typeof finalValue === 'string') {
      finalValue = finalValue.trim().toUpperCase().slice(0, LIMITS.studentIdMaxLength);
    }
    if (name === 'fullname' && typeof finalValue === 'string') {
      finalValue = finalValue.slice(0, LIMITS.nameMax);
    }
    if ((name === 'password' || name === 'confirm_password') && typeof finalValue === 'string') {
      finalValue = finalValue.replace(/[\u200B-\u200D\uFEFF]/g, '');
    }

    setField(name, finalValue);
  }

  const pw = formData.password;
  const passwordChecks = {
    length: pw.length >= LIMITS.passwordMinLength,
    upper: /[A-Z]/.test(pw),
    number: /\d/.test(pw),
    noSpace: !/\s/.test(pw),
  };

  function validate() {
    const errors = {};

    const name = formData.fullname.trim();
    if (!name) {
      errors.fullname = 'Full name is required.';
    } else if (name.length < LIMITS.nameMin) {
      errors.fullname = `Full name must be at least ${LIMITS.nameMin} characters.`;
    } else if (name.length > LIMITS.nameMax) {
      errors.fullname = `Full name must be ${LIMITS.nameMax} characters or fewer.`;
    } else if (!nameRe.test(name)) {
      errors.fullname = 'Name can only contain letters, spaces, hyphens, and periods.';
    }

    const studentId = formData.student_id.trim();
    if (!studentId) {
      errors.student_id = 'Student ID is required.';
    } else if (studentId.length > LIMITS.studentIdMaxLength) {
      errors.student_id = `Student ID must be ${LIMITS.studentIdMaxLength} characters or fewer.`;
    } else if (!studentIdRe.test(studentId)) {
      errors.student_id = 'Format should look like C-2024-0001 (no spaces).';
    }

    if (!formData.email.trim()) {
      errors.email = 'College email is required.';
    } else if (!emailRe.test(formData.email.trim())) {
      errors.email = `Email must end with @${ALLOWED_EMAIL_DOMAIN}`;
    }

    if (!formData.password) {
      errors.password = 'Password is required.';
    } else if (!passwordChecks.length) {
      errors.password = `Password must be at least ${LIMITS.passwordMinLength} characters.`;
    } else if (!passwordChecks.upper) {
      errors.password = 'Password must contain at least 1 uppercase letter (A-Z).';
    } else if (!passwordChecks.number) {
      errors.password = 'Password must contain at least 1 number (0-9).';
    } else if (!passwordChecks.noSpace) {
      errors.password = 'Password cannot contain spaces.';
    }

    if (!formData.confirm_password) {
      errors.confirm_password = 'Please confirm your password.';
    } else if (formData.password !== formData.confirm_password) {
      errors.confirm_password = 'Passwords do not match.';
    }

    if (!formData.terms) {
      errors.terms = 'You must agree to the Terms of Use.';
    }

    return errors;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setGlobalError(null);

    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setGlobalError('Please fix the highlighted fields before continuing.');
      return;
    }
    setFieldErrors({});

    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullname: formData.fullname.trim(),
          student_id: formData.student_id.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(
          res.status === 404
            ? 'The backend could not be reached at /api/auth/register. Make sure the server is running.'
            : `Unexpected response from server (HTTP ${res.status}).`
        );
      }

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          const msg = (data.error || '').toLowerCase();
          if (msg.includes('email')) {
            setFieldErrors({ email: 'This email is already registered.' });
          } else if (msg.includes('student')) {
            setFieldErrors({ student_id: 'This Student ID is already in use.' });
          } else if (msg.includes('name')) {
            setFieldErrors({ fullname: 'An account with this name already exists.' });
          } else {
            setGlobalError(data.error || 'An account with these details already exists.');
          }
          return;
        }
        if (res.status === 400) {
          throw new Error(data.error || 'Some of the information you provided is invalid.');
        }
        if (res.status >= 500) {
          throw new Error('The server ran into a problem creating your account. Please try again in a moment.');
        }
        throw new Error(data.error || `Registration failed (HTTP ${res.status}).`);
      }

      try {
        await login(formData.email.trim().toLowerCase(), formData.password);
      } catch {
        localStorage.setItem('token', data.token);
      }

      const dest = data.user?.role === 'admin' ? '/admin' : '/dashboard';
      navigate(dest, { replace: true });
    } catch (err) {
      if (err.name === 'TypeError' && /fetch|network/i.test(err.message)) {
        setGlobalError('Cannot reach the server. Make sure the backend is running on http://localhost:5000.');
      } else {
        setGlobalError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  }

  const inputBase =
    'w-full rounded-xl border bg-[#0A1128]/60 px-4 py-3 text-sm text-white placeholder-[#A0B0D0]/50 outline-none transition duration-200';
  const inputGood =
    'border-white/10 focus:border-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40 focus:shadow-[0_0_24px_rgba(42,92,255,0.35)]';
  const inputBad = 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/30';

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050B14] px-4 py-10 sm:px-6 font-sans text-white antialiased">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[#2A5CFF]/25 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-48 -left-24 h-[24rem] w-[24rem] rounded-full bg-[#1C3F95]/40 blur-[120px]" />

      <section className="relative w-full max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Lewis<span className="text-[#2A5CFF] drop-shadow-[0_0_18px_rgba(42,92,255,0.7)]">Find</span>
          </h1>
          <p className="mt-3 text-sm text-[#A0B0D0]">The Lewis College Lost &amp; Found</p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:p-10">
          <h2 className="text-2xl font-semibold tracking-tight">Create your account</h2>
          <p className="mt-1.5 text-sm text-[#A0B0D0]">Use your college details so we can match you with your items.</p>

          {globalError && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
            >
              <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span>{globalError}</span>
            </div>
          )}

          <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="fullname" className="mb-2 block text-sm font-medium text-[#A0B0D0]">Full name</label>
                <input
                  id="fullname" name="fullname" type="text"
                  value={formData.fullname} onChange={handleChange}
                  placeholder="Juan Dela Cruz"
                  autoComplete="name"
                  maxLength={LIMITS.nameMax}
                  aria-invalid={!!fieldErrors.fullname}
                  aria-describedby={fieldErrors.fullname ? 'err-fullname' : undefined}
                  className={`${inputBase} ${fieldErrors.fullname ? inputBad : inputGood}`}
                />
                {fieldErrors.fullname && (
                  <p id="err-fullname" className="mt-1 text-xs text-red-300">{fieldErrors.fullname}</p>
                )}
              </div>
              <div>
                <label htmlFor="student_id" className="mb-2 block text-sm font-medium text-[#A0B0D0]">Student ID</label>
                <input
                  id="student_id" name="student_id" type="text"
                  value={formData.student_id} onChange={handleChange}
                  placeholder="C-2024-0000"
                  maxLength={LIMITS.studentIdMaxLength}
                  aria-invalid={!!fieldErrors.student_id}
                  aria-describedby={fieldErrors.student_id ? 'err-student_id' : undefined}
                  className={`${inputBase} ${fieldErrors.student_id ? inputBad : inputGood}`}
                />
                {fieldErrors.student_id && (
                  <p id="err-student_id" className="mt-1 text-xs text-red-300">{fieldErrors.student_id}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#A0B0D0]">College email</label>
              <input
                id="email" name="email" type="email"
                value={formData.email} onChange={handleChange}
                placeholder={`you@${ALLOWED_EMAIL_DOMAIN}`}
                autoComplete="email"
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'err-email' : 'email-hint'}
                className={`${inputBase} ${fieldErrors.email ? inputBad : inputGood}`}
              />
              {fieldErrors.email ? (
                <p id="err-email" className="mt-1 text-xs text-red-300">{fieldErrors.email}</p>
              ) : (
                <p id="email-hint" className="mt-1 text-xs text-[#A0B0D0]/60">
                  Must end with @{ALLOWED_EMAIL_DOMAIN}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#A0B0D0]">Password</label>
                <input
                  id="password" name="password" type="password"
                  value={formData.password} onChange={handleChange}
                  placeholder={`At least ${LIMITS.passwordMinLength} characters`}
                  autoComplete="new-password"
                  aria-invalid={!!fieldErrors.password}
                  aria-describedby="pw-hints"
                  className={`${inputBase} ${fieldErrors.password ? inputBad : inputGood}`}
                />
                <ul id="pw-hints" className="mt-1.5 space-y-0.5">
                  <li className={`text-xs ${passwordChecks.length ? 'text-emerald-300' : 'text-[#A0B0D0]/70'}`}>
                    {passwordChecks.length ? '✓' : '○'} At least {LIMITS.passwordMinLength} characters
                  </li>
                  <li className={`text-xs ${passwordChecks.upper ? 'text-emerald-300' : 'text-[#A0B0D0]/70'}`}>
                    {passwordChecks.upper ? '✓' : '○'} Contains 1 uppercase letter
                  </li>
                  <li className={`text-xs ${passwordChecks.number ? 'text-emerald-300' : 'text-[#A0B0D0]/70'}`}>
                    {passwordChecks.number ? '✓' : '○'} Contains 1 number
                  </li>
                  <li className={`text-xs ${passwordChecks.noSpace ? 'text-emerald-300' : 'text-red-300'}`}>
                    {passwordChecks.noSpace ? '✓' : '✕'} No spaces allowed
                  </li>
                </ul>
                {fieldErrors.password && (
                  <p className="mt-1 text-xs text-red-300">{fieldErrors.password}</p>
                )}
              </div>
              <div>
                <label htmlFor="confirm_password" className="mb-2 block text-sm font-medium text-[#A0B0D0]">Confirm password</label>
                <input
                  id="confirm_password" name="confirm_password" type="password"
                  value={formData.confirm_password} onChange={handleChange}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  aria-invalid={!!fieldErrors.confirm_password}
                  aria-describedby={fieldErrors.confirm_password ? 'err-confirm' : undefined}
                  className={`${inputBase} ${fieldErrors.confirm_password ? inputBad : inputGood}`}
                />
                {fieldErrors.confirm_password && (
                  <p id="err-confirm" className="mt-1 text-xs text-red-300">{fieldErrors.confirm_password}</p>
                )}
              </div>
            </div>

            <label
              htmlFor="terms"
              className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm leading-relaxed transition ${
                fieldErrors.terms
                  ? 'border-red-500/40 bg-red-500/[0.05] text-red-200'
                  : 'border-white/10 bg-white/[0.02] text-[#A0B0D0]'
              }`}
            >
              <input
                id="terms" name="terms" type="checkbox"
                checked={formData.terms} onChange={handleChange}
                className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-[#0A1128]/60 accent-[#2A5CFF] focus:ring-2 focus:ring-[#2A5CFF]/40"
              />
              <span>
                I agree to the{' '}
                <a href="#" className="font-medium text-white transition hover:text-[#2A5CFF]">Terms of Use</a>{' '}
                and the{' '}
                <a href="#" className="font-medium text-white transition hover:text-[#2A5CFF]">Privacy Policy</a>.
              </span>
            </label>
            {fieldErrors.terms && (
              <p className="text-xs text-red-300">{fieldErrors.terms}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl bg-[#1C3F95] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_0_30px_rgba(42,92,255,0.45)] transition duration-200 hover:scale-[1.02] hover:bg-[#2A5CFF] hover:shadow-[0_0_44px_rgba(42,92,255,0.65)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-[#A0B0D0]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-white transition hover:text-[#2A5CFF]">
              Sign in
            </Link>
          </p>
        </div>
        <p className="mt-6 text-center text-xs text-[#A0B0D0]/70">&copy; The Lewis College.</p>
      </section>
    </main>
  );
}
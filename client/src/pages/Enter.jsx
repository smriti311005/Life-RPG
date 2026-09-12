import { useId, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TextField, LoadingVeil } from '../components/Primitives';
import { signInWithGoogle, resetPassword, describeAuthError } from '../lib/firebase';
import { CinemaBackdrop } from '../components/CinemaBackdrop';
import { Crest } from '../components/Enchant';

/**
 * Sign in and sign up.
 *
 * Primary path is email + password against this app's own API, which stores a
 * bcrypt hash in MongoDB. Google is offered only when Firebase is configured.
 *
 * Free of Framer Motion on purpose: this is the only way into the app, and its
 * visibility must not depend on an animation frame ever running.
 */

const MIN_PASSWORD = 10;

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

/** A four-segment strength meter. Advisory only — the server enforces length. */
function PasswordMeter({ value, id }) {
  const checks = [
    value.length >= MIN_PASSWORD,
    value.length >= 16,
    /[^A-Za-z0-9]/.test(value) || /\d/.test(value),
    new Set(value).size >= 8,
  ];
  const score = checks.filter(Boolean).length;
  const labels = ['Too short', 'Workable', 'Good', 'Strong', 'Excellent'];
  const tones = ['bg-danger', 'bg-danger', 'bg-accent', 'bg-success', 'bg-success'];

  return (
    <div className="mt-2" aria-hidden={value.length === 0}>
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              value.length && i < score ? tones[score] : 'bg-line'
            }`}
          />
        ))}
      </div>
      <p id={id} className="mt-1.5 text-2xs text-faint">
        {value.length === 0
          ? `At least ${MIN_PASSWORD} characters. Length beats symbols.`
          : `${labels[score]} — a passphrase of a few words is ideal.`}
      </p>
    </div>
  );
}

export default function Enter() {
  const id = useId();
  const { user, checking, signInLocal, signUpLocal, adoptFirebaseUser, googleAvailable } =
    useAuth();
  const toast = useToast();
  const location = useLocation();

  const [mode, setMode] = useState('signin'); // signin | signup
  const [form, setForm] = useState({ email: '', password: '', displayName: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [busy, setBusy] = useState(null); // 'email' | 'google' | 'reset'

  if (checking) return <LoadingVeil label="Checking your session" />;
  if (user) return <Navigate to={location.state?.from ?? '/play'} replace />;

  const set = (key) => (event) => {
    setForm((f) => ({ ...f, [key]: event.target.value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setFormError(null);
  };

  const validate = () => {
    const next = {};
    if (!form.email.trim()) next.email = 'An email address is required.';
    else if (!/^\S+@\S+\.\S+$/.test(form.email.trim()))
      next.email = 'That does not look like an email address.';

    if (!form.password) next.password = 'A password is required.';
    else if (mode === 'signup' && form.password.length < MIN_PASSWORD)
      next.password = `Use at least ${MIN_PASSWORD} characters.`;

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    setBusy('email');
    setFormError(null);

    try {
      if (mode === 'signup') {
        await signUpLocal({
          email: form.email.trim(),
          password: form.password,
          displayName: form.displayName.trim() || undefined,
        });
      } else {
        await signInLocal({ email: form.email.trim(), password: form.password });
      }
      // The `user` guard above redirects once state lands.
    } catch (error) {
      // Field-level messages from the API land under the right input; anything
      // else becomes a form-level banner rather than vanishing into a toast.
      if (error.details) setErrors(error.details);
      else setFormError(error.message);
      setBusy(null);
    }
  };

  const google = async () => {
    setBusy('google');
    setFormError(null);
    try {
      const fbUser = await signInWithGoogle();
      if (fbUser) adoptFirebaseUser(fbUser);
    } catch (error) {
      setFormError(describeAuthError(error));
    } finally {
      setBusy(null);
    }
  };

  const forgot = async () => {
    if (!form.email.trim()) {
      setErrors({ email: 'Enter your email first, then ask for a reset.' });
      document.getElementById(`${id}-email`)?.focus();
      return;
    }

    if (!googleAvailable) {
      // Password reset needs a mail sender, which this deployment has not been
      // given. Saying so plainly beats a button that quietly does nothing.
      toast.info(
        'Password reset by email is not enabled on this deployment. Contact the administrator to reset it.',
        { duration: 7000 },
      );
      return;
    }

    setBusy('reset');
    try {
      await resetPassword(form.email.trim());
    } catch (error) {
      if (error?.code === 'auth/invalid-email') setErrors({ email: 'That email is malformed.' });
    } finally {
      // Always the same message: whether an address has an account is not
      // something this form should confirm.
      toast.success('If that address has a Google-linked account, a reset link is on its way.');
      setBusy(null);
    }
  };

  return (
    <>
      {/* The gate to the castle gets the castle. */}
      <CinemaBackdrop variant="wide" />

      <div className="above-film stage grid min-h-[100dvh] place-items-center px-4 py-10">
        <div className="gate-in relative w-full max-w-md">
          <Link
            to="/"
            className="mb-6 flex items-center justify-center gap-2.5 text-ink"
            aria-label="Life RPG home"
          >
            <Crest id="enter-crest" className="h-8 w-8" />
            <span className="spellcast text-lg font-bold tracking-wide">Life RPG</span>
          </Link>

          <div className="glass p-6 sm:p-7">
            <h1 className="text-xl font-semibold text-ink">
              {mode === 'signin' ? 'Return to your keep' : 'Roll a new character'}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {mode === 'signin'
                ? 'Your progress is waiting exactly where you left it.'
                : 'Level one starts at 55 XP. That is about two real things done today.'}
            </p>

            {googleAvailable ? (
              <>
                <button
                  type="button"
                  onClick={google}
                  disabled={Boolean(busy)}
                  className="btn-ghost mt-6 w-full py-3"
                >
                  {busy === 'google' ? (
                    'Opening Google…'
                  ) : (
                    <>
                      <GoogleMark />
                      Continue with Google
                    </>
                  )}
                </button>

                <div className="my-5 flex items-center gap-3">
                  <span className="hairline" />
                  <span className="shrink-0 text-2xs uppercase tracking-wider text-faint">or</span>
                  <span className="hairline" />
                </div>
              </>
            ) : (
              <div className="mt-6" />
            )}

            <form onSubmit={submit} noValidate className="space-y-4">
              {formError ? (
                <p
                  role="alert"
                  className="rounded-xl border border-danger/40 bg-danger/10 px-3.5 py-2.5 text-sm text-danger"
                >
                  {formError}
                </p>
              ) : null}

              {mode === 'signup' ? (
                <TextField
                  id={`${id}-name`}
                  label="Character name"
                  placeholder="What should we call you?"
                  value={form.displayName}
                  onChange={set('displayName')}
                  error={errors.displayName}
                  maxLength={40}
                  autoComplete="nickname"
                />
              ) : null}

              <TextField
                id={`${id}-email`}
                type="email"
                label="Email"
                placeholder="you@example.com"
                value={form.email}
                onChange={set('email')}
                error={errors.email}
                autoComplete="email"
                required
              />

              <div>
                <TextField
                  id={`${id}-password`}
                  type="password"
                  label="Password"
                  placeholder={mode === 'signup' ? 'A memorable passphrase' : '••••••••'}
                  value={form.password}
                  onChange={set('password')}
                  error={errors.password}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  aria-describedby={mode === 'signup' ? `${id}-meter` : undefined}
                  required
                />

                {mode === 'signup' ? (
                  <PasswordMeter value={form.password} id={`${id}-meter`} />
                ) : (
                  <button
                    type="button"
                    onClick={forgot}
                    disabled={busy === 'reset'}
                    className="mt-2 text-2xs font-medium text-primary hover:underline"
                  >
                    {busy === 'reset' ? 'Sending…' : 'Forgotten your password?'}
                  </button>
                )}
              </div>

              <button type="submit" className="btn-primary w-full py-3" disabled={Boolean(busy)}>
                {busy === 'email'
                  ? 'Just a moment…'
                  : mode === 'signin'
                    ? 'Enter'
                    : 'Create my character'}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-muted">
              {mode === 'signin' ? "Haven't played before? " : 'Already have a character? '}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === 'signin' ? 'signup' : 'signin');
                  setErrors({});
                  setFormError(null);
                }}
                className="font-semibold text-primary hover:underline"
              >
                {mode === 'signin' ? 'Roll one now' : 'Sign in'}
              </button>
            </p>
        </div>

        <p className="mt-5 text-center text-2xs text-faint">
          <Link to="/" className="hover:text-muted">
            ← Back to the front page
          </Link>
        </p>
        </div>
      </div>
    </>
  );
}

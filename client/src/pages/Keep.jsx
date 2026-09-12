import { useEffect, useId, useState } from 'react';

import { useAuth } from '../context/AuthContext';
import { useGame } from '../context/GameContext';
import { useToast } from '../context/ToastContext';
import { TextField } from '../components/Primitives';
import { ModeSegmented } from '../components/ModeToggle';
import { fmt } from '../lib/game';

const THEME_LABELS = {
  obsidian: 'Obsidian Veil',
  emberfall: 'Emberfall',
  tidewatch: 'Tidewatch',
  verdant: 'Verdant Hollow',
  goldleaf: 'Goldleaf Archive',
};

function Row({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="numeric text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

export default function Keep() {
  const id = useId();
  const { user, signOut, provider, changePassword } = useAuth();
  const { character, updateProfile } = useGame();
  const toast = useToast();

  const [name, setName] = useState('');
  const [nameError, setNameError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    if (character) setName(character.displayName);
  }, [character?.displayName]);

  if (!character) return null;

  const dirty = name.trim() !== character.displayName;

  const saveName = async (event) => {
    event.preventDefault();
    const trimmed = name.trim();

    if (!trimmed) {
      setNameError('A name is required.');
      return;
    }

    setSaving(true);
    setNameError(null);
    try {
      await updateProfile({ displayName: trimmed });
      toast.success('Your name is recorded.');
    } catch (error) {
      setNameError(error.details?.displayName ?? error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleMotion = async () => {
    const next = !character.settings.reducedMotion;
    try {
      await updateProfile({ reducedMotion: next });
      toast.info(next ? 'Animations dialled down.' : 'Animations restored.');
    } catch (error) {
      toast.error(error.message);
    }
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    setPwErrors({});

    if (pw.newPassword.length < 10) {
      setPwErrors({ newPassword: 'Use at least 10 characters.' });
      return;
    }

    setPwBusy(true);
    try {
      const result = await changePassword(pw);
      setPw({ currentPassword: '', newPassword: '' });
      toast.success(result.message ?? 'Password changed.');
    } catch (error) {
      if (error.details) setPwErrors(error.details);
      else setPwErrors({ currentPassword: error.message });
    } finally {
      setPwBusy(false);
    }
  };

  const ownedThemes = Object.keys(THEME_LABELS).filter(
    (theme) =>
      theme === 'obsidian' ||
      character.ownedItemIds.some((itemId) => itemId === `theme-${theme}`),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <header>
        <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-faint">
          Your account and your record
        </p>
        <h1 className="mt-0.5 text-2xl font-semibold text-ink">The Keep</h1>
      </header>

      {/* Identity */}
      <section aria-labelledby="identity-heading" className="panel p-5">
        <h2 id="identity-heading" className="mb-4 text-base font-semibold text-ink">
          Identity
        </h2>

        <form onSubmit={saveName} noValidate className="space-y-4">
          <TextField
            id={`${id}-name`}
            label="Display name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError(null);
            }}
            error={nameError}
            maxLength={40}
            hint="Shown on your character sheet."
            autoComplete="nickname"
          />

          <button type="submit" className="btn-primary" disabled={!dirty || saving}>
            {saving ? 'Saving…' : 'Save name'}
          </button>
        </form>

        <div className="hairline my-5" />

        <dl>
          <Row label="Signed in as" value={user?.email ?? '—'} />
          <Row label="Rank" value={character.rank} />
          <Row
            label="Title"
            value={character.equipped.title ?? 'None equipped'}
          />
          <Row label="Badge" value={character.equipped.badge ?? 'None equipped'} />
        </dl>
      </section>

      {/* Password — local accounts only */}
      {provider === 'local' ? (
        <section aria-labelledby="password-heading" className="panel p-5">
          <h2 id="password-heading" className="text-base font-semibold text-ink">
            Password
          </h2>
          <p className="mt-0.5 text-xs text-muted">
            Changing it signs out every other device you are signed in on.
          </p>

          <form onSubmit={submitPassword} noValidate className="mt-4 space-y-4">
            <TextField
              id={`${id}-current`}
              type="password"
              label="Current password"
              value={pw.currentPassword}
              onChange={(e) => setPw((v) => ({ ...v, currentPassword: e.target.value }))}
              error={pwErrors.currentPassword}
              autoComplete="current-password"
            />
            <TextField
              id={`${id}-new`}
              type="password"
              label="New password"
              value={pw.newPassword}
              onChange={(e) => setPw((v) => ({ ...v, newPassword: e.target.value }))}
              error={pwErrors.newPassword}
              hint="At least 10 characters. A few words beats a symbol."
              autoComplete="new-password"
            />
            <button
              type="submit"
              className="btn-primary"
              disabled={pwBusy || !pw.currentPassword || !pw.newPassword}
            >
              {pwBusy ? 'Changing…' : 'Change password'}
            </button>
          </form>
        </section>
      ) : null}

      {/* Appearance */}
      <section aria-labelledby="appearance-heading" className="panel p-5">
        <h2 id="appearance-heading" className="text-base font-semibold text-ink">
          Appearance
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          Every palette comes in both light and dark. <strong className="text-ink">System</strong>{' '}
          follows your device and changes with it.
        </p>
        <div className="mt-4">
          <ModeSegmented />
        </div>
      </section>

      {/* Palette */}
      <section aria-labelledby="palette-heading" className="panel p-5">
        <h2 id="palette-heading" className="text-base font-semibold text-ink">
          Palette
        </h2>
        <p className="mt-0.5 text-xs text-muted">
          Buy more in the Emporium. Your choice follows you to every device.
        </p>

        <div role="group" aria-label="Choose a palette" className="mt-4 flex flex-wrap gap-2">
          {ownedThemes.map((theme) => (
            <button
              key={theme}
              type="button"
              aria-pressed={character.equipped.theme === theme}
              onClick={async () => {
                try {
                  await updateProfile({ equip: { theme } });
                } catch (error) {
                  toast.error(error.message);
                }
              }}
              className={`chip transition-colors ${
                character.equipped.theme === theme
                  ? 'border-primary/60 bg-primary/12 text-primary'
                  : 'hover:text-ink'
              }`}
            >
              {THEME_LABELS[theme]}
            </button>
          ))}
        </div>
      </section>

      {/* Accessibility */}
      <section aria-labelledby="access-heading" className="panel p-5">
        <h2 id="access-heading" className="mb-1 text-base font-semibold text-ink">
          Comfort
        </h2>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-ink">Reduce motion</p>
            <p className="mt-0.5 text-xs text-muted">
              Turns off celebrations, springs and drifting particles. Your system setting is
              always respected on top of this.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={character.settings.reducedMotion}
            aria-label="Reduce motion"
            onClick={toggleMotion}
            className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${
              character.settings.reducedMotion
                ? 'border-primary bg-primary/30'
                : 'border-line bg-void'
            }`}
          >
            <span
              aria-hidden="true"
              className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-all ${
                character.settings.reducedMotion
                  ? 'left-[calc(100%-1.4rem)] bg-primary'
                  : 'left-1 bg-faint'
              }`}
            />
          </button>
        </div>
      </section>

      {/* Record */}
      <section aria-labelledby="record-heading" className="panel p-5">
        <h2 id="record-heading" className="mb-2 text-base font-semibold text-ink">
          Record
        </h2>
        <dl className="divide-y divide-line">
          <Row label="Level" value={character.level} />
          <Row label="Lifetime XP" value={fmt(character.totalXp)} />
          <Row label="Quests completed" value={fmt(character.lifetime.tasksCompleted)} />
          <Row label="Gold earned" value={fmt(character.lifetime.goldEarned)} />
          <Row label="Gold spent" value={fmt(character.lifetime.goldSpent)} />
          <Row label="Longest streak" value={`${character.streak.longest} days`} />
          <Row
            label="Adventuring since"
            value={new Date(character.createdAt).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          />
        </dl>
      </section>

      <section className="panel p-5">
        <button
          type="button"
          onClick={signOut}
          className="btn border border-danger/40 bg-danger/10 text-danger hover:bg-danger/20"
        >
          Sign out
        </button>
        <p className="mt-2.5 text-xs text-muted">
          Your character is stored on the server, not in this browser. Sign back in anywhere
          and everything is exactly where you left it.
        </p>
      </section>
    </div>
  );
}

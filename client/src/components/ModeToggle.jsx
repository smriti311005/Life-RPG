import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { useGame } from '../context/GameContext';
import { useToast } from '../context/ToastContext';

export const MODES = [
  { id: 'light', label: 'Light', glyph: '☀' },
  { id: 'dark', label: 'Dark', glyph: '☾' },
  { id: 'system', label: 'System', glyph: '◑' },
];

/** What "system" currently resolves to, for the header icon. */
function resolveSystem() {
  if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/* -------------------------------------------------------------------------- */
/* Header control                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The header's light/dark control.
 *
 * Three states rather than two, because "system" is a real answer: most people
 * made this choice once at the OS level and do not want to make it again here.
 * The icon shows what is *currently rendering*, not the stored preference, so
 * a player on "system" still sees a sun in the morning.
 */
export function ModeToggle() {
  const { character, updateProfile } = useGame();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [systemIs, setSystemIs] = useState(resolveSystem);
  const wrapRef = useRef(null);

  const mode = character?.settings?.mode ?? 'dark';
  const effective = mode === 'system' ? systemIs : mode;

  // Follow the OS live: someone on "system" with a scheduled theme change
  // should see the app turn over with everything else.
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const query = window.matchMedia('(prefers-color-scheme: light)');
    const onChange = (event) => setSystemIs(event.matches ? 'light' : 'dark');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const choose = async (next) => {
    setOpen(false);
    if (next === mode) return;
    try {
      await updateProfile({ mode: next });
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Appearance: ${MODES.find((m) => m.id === mode)?.label}. Change it.`}
        className="grid h-10 w-10 place-items-center rounded-full border border-line bg-raised/60 text-sm text-muted transition-colors hover:border-primary/60 hover:text-ink sm:h-9 sm:w-9"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={effective}
            aria-hidden="true"
            initial={{ opacity: 0, rotate: -60, scale: 0.6 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, rotate: 60, scale: 0.6 }}
            transition={{ duration: 0.2 }}
          >
            {effective === 'light' ? '☀' : '☾'}
          </motion.span>
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="panel absolute right-0 top-12 z-50 w-44 p-1.5"
          >
            <p className="px-2.5 pb-1 pt-1.5 text-2xs font-semibold uppercase tracking-wider text-faint">
              Appearance
            </p>
            {MODES.map((option) => {
              const active = mode === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => choose(option.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                    active ? 'bg-primary/12 text-primary' : 'text-ink hover:bg-raised'
                  }`}
                >
                  <span aria-hidden="true" className="w-4 text-center">
                    {option.glyph}
                  </span>
                  <span className="flex-1">{option.label}</span>
                  {option.id === 'system' ? (
                    <span className="text-2xs text-faint">{systemIs}</span>
                  ) : null}
                  {active ? (
                    <span aria-hidden="true" className="text-xs">
                      ✓
                    </span>
                  ) : null}
                </button>
              );
            })}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Settings control                                                           */
/* -------------------------------------------------------------------------- */

/** The same choice as a segmented control, for the Keep. */
export function ModeSegmented() {
  const { character, updateProfile } = useGame();
  const toast = useToast();
  const mode = character?.settings?.mode ?? 'dark';

  return (
    <div role="radiogroup" aria-label="Appearance" className="grid grid-cols-3 gap-1.5">
      {MODES.map((option) => {
        const active = mode === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={async () => {
              if (active) return;
              try {
                await updateProfile({ mode: option.id });
              } catch (error) {
                toast.error(error.message);
              }
            }}
            className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-xs font-semibold transition-all ${
              active
                ? 'border-primary/60 bg-primary/12 text-primary'
                : 'border-line bg-void/40 text-muted hover:border-primary/40 hover:text-ink'
            }`}
          >
            <span aria-hidden="true" className="text-base">
              {option.glyph}
            </span>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

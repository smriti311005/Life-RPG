import { forwardRef, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/* -------------------------------------------------------------------------- */
/* XP bar                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A progress bar that springs to its new value.
 *
 * It is also a real `progressbar` for assistive tech, with the same numbers a
 * sighted player reads off the label.
 */
export function XpBar({ value, max, color, label, height = 'h-2.5', showSheen = true }) {
  const percent = max > 0 ? Math.min(100, (value / max) * 100) : 0;

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-label={label}
      className={`relative w-full overflow-hidden rounded-full bg-void/80 ring-1 ring-inset ring-line ${height}`}
    >
      <motion.div
        className="h-full rounded-full"
        style={{
          // color-mix keeps this valid whatever syntax `color` arrives in;
          // concatenating a hex alpha onto an hsl() string does not.
          background: color
            ? `linear-gradient(90deg, ${color}, color-mix(in srgb, ${color} 72%, transparent))`
            : 'linear-gradient(90deg, rgb(var(--c-primary)), rgb(var(--c-accent)))',
        }}
        initial={false}
        animate={{ width: `${percent}%` }}
        transition={{ type: 'spring', stiffness: 160, damping: 24, mass: 0.7 }}
      >
        {showSheen && percent > 4 ? (
          <span className="absolute inset-0 overflow-hidden rounded-full">
            <span className="absolute inset-0 -translate-x-full bg-sheen animate-shimmer" />
          </span>
        ) : null}
      </motion.div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Level ring                                                                 */
/* -------------------------------------------------------------------------- */

/** The circular XP dial around the avatar. */
export function LevelRing({ level, progress, size = 92, stroke = 5 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-primary))" />
          <stop offset="100%" stopColor="rgb(var(--c-accent))" />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgb(var(--c-line))"
        strokeWidth={stroke}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="url(#ring-grad)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={false}
        animate={{ strokeDashoffset: offset }}
        transition={{ type: 'spring', stiffness: 140, damping: 22 }}
      />
      <title>{`Level ${level}, ${Math.round(progress * 100)} percent to the next`}</title>
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/* Modal                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * An accessible dialog: focus moves in on open, is trapped while open, Escape
 * closes, the page behind cannot scroll, and focus returns to whatever opened
 * it on close.
 */
export function Modal({ open, onClose, title, description, children, size = 'max-w-lg' }) {
  const panelRef = useRef(null);
  const returnFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    returnFocusRef.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const focusables = () =>
      panelRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      ) ?? [];

    // Let the entry animation start before stealing focus.
    const timer = setTimeout(() => {
      const first = focusables()[0];
      (first ?? panelRef.current)?.focus();
    }, 40);

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const list = Array.from(focusables());
      if (!list.length) return;

      const first = list[0];
      const last = list[list.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      returnFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-void/85"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            aria-hidden="true"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={{ opacity: 0, y: 28, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={`panel relative w-full ${size} max-h-[92dvh] overflow-y-auto rounded-b-none rounded-t-3xl p-5 sm:rounded-card sm:p-6`}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">{title}</h2>
                {description ? (
                  <p className="mt-1 text-sm text-muted">{description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="btn-quiet -mr-1 -mt-1 h-8 w-8 rounded-lg p-0 text-lg"
              >
                ×
              </button>
            </div>

            {children}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

/* -------------------------------------------------------------------------- */
/* Form field                                                                 */
/* -------------------------------------------------------------------------- */

export const TextField = forwardRef(function TextField(
  { label, error, hint, id, as = 'input', ...props },
  ref,
) {
  const Element = as;
  const describedBy = [error ? `${id}-error` : null, hint ? `${id}-hint` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <Element
        ref={ref}
        id={id}
        className={`field ${error ? 'border-danger/70' : ''} ${as === 'textarea' ? 'min-h-[76px] resize-y' : ''}`}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy || undefined}
        {...props}
      />
      {hint && !error ? (
        <p id={`${id}-hint`} className="mt-1.5 text-2xs text-faint">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-2xs font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
});

/* -------------------------------------------------------------------------- */
/* Empty + loading states                                                     */
/* -------------------------------------------------------------------------- */

export function EmptyState({ glyph = '✦', title, children, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line px-6 py-14 text-center">
      <div
        aria-hidden="true"
        className="mb-4 grid h-14 w-14 place-items-center rounded-2xl border border-line bg-raised/60 text-2xl text-primary"
      >
        {glyph}
      </div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      <div className="mt-1.5 max-w-sm text-sm text-muted">{children}</div>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

/** Page-level loading state, announced so it is not silence for a screen reader. */
export function LoadingVeil({ label = 'Loading' }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col items-center gap-4 py-24">
      <div className="relative h-12 w-12">
        <span className="absolute inset-0 rounded-full border-2 border-line" />
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary" />
      </div>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

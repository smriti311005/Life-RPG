import { useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { ATTRIBUTE_MAP, attrColor } from '../lib/game';

/* -------------------------------------------------------------------------- */
/* Particles                                                                  */
/* -------------------------------------------------------------------------- */

/**
 * A one-shot burst of sparks.
 *
 * Deliberately CSS-transform only (no layout properties) so it composites on
 * the GPU and cannot cause a frame drop on a mid-range phone.
 */
function Sparks({ count = 26, colors }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
        const distance = 90 + Math.random() * 160;
        return {
          id: i,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance,
          size: 3 + Math.random() * 5,
          delay: Math.random() * 0.18,
          duration: 0.9 + Math.random() * 0.7,
          color: colors[i % colors.length],
        };
      }),
    [count, colors],
  );

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{ width: p.size, height: p.size, background: p.color }}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
            x: p.x,
            y: [0, p.y * 0.55, p.y],
            scale: [0, 1.2, 0.9, 0.2],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: [0.16, 1, 0.3, 1],
            times: [0, 0.2, 0.6, 1],
          }}
        />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Overlay                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * The level-up / milestone moment.
 *
 * Auto-dismisses, but is also a real dialog: Escape and a button close it, and
 * the headline is announced assertively so the achievement is not silent.
 */
export function Celebration({ event, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!event) return undefined;

    const timer = setTimeout(onClose, 4600);
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    const focusTimer = setTimeout(() => closeRef.current?.focus(), 500);

    return () => {
      clearTimeout(timer);
      clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [event, onClose]);

  if (!event) return null;

  const isLevel = event.leveledUp;
  const attribute = ATTRIBUTE_MAP[event.attribute];
  const accent = isLevel ? 'rgb(var(--c-accent))' : attrColor(event.attribute);

  const headline = isLevel
    ? `Level ${event.toLevel}`
    : `${event.streak.milestone}-day streak`;

  const subline = isLevel
    ? event.newRank
      ? `You are now ${event.newRank}.`
      : event.levelsGained > 1
        ? `${event.levelsGained} levels in one stroke.`
        : 'The next stretch of road opens up.'
    : `The chain holds. +${event.streak.milestoneGold} gold for the discipline.`;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[95] grid place-items-center p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
      >
        <motion.div
          className="absolute inset-0 bg-void/85 backdrop-blur-md"
          onClick={onClose}
          aria-hidden="true"
        />

        <motion.div
          role="alertdialog"
          aria-modal="true"
          aria-label={headline}
          initial={{ opacity: 0, scale: 0.8, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className="panel relative w-full max-w-sm overflow-visible px-6 py-9 text-center"
        >
          <Sparks
            colors={[accent, 'rgb(var(--c-primary))', 'rgb(var(--c-accent))', 'rgb(var(--c-ink))']}
          />

          {/* Halo */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background: `radial-gradient(circle, color-mix(in srgb, ${accent} 27%, transparent), transparent 70%)`,
            }}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: [0.4, 1.4, 1.15], opacity: [0, 0.9, 0.55] }}
            transition={{ duration: 1.1, ease: 'easeOut' }}
          />

          <div className="relative">
            <motion.div
              className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-2xl border font-display text-3xl"
              style={{ borderColor: accent, color: accent }}
              initial={{ rotate: -14, scale: 0.6 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 14, delay: 0.08 }}
            >
              {isLevel ? '★' : '🔥'}
            </motion.div>

            <p className="text-2xs font-semibold uppercase tracking-[0.2em] text-primary">
              {isLevel ? 'Ascension' : 'Milestone'}
            </p>

            <h2
              className="mt-1.5 font-display text-4xl font-bold text-glow"
              style={{ color: accent }}
            >
              {headline}
            </h2>

            <p className="mx-auto mt-2.5 max-w-[26ch] text-sm text-muted">{subline}</p>

            <div className="mt-5 flex items-center justify-center gap-2.5 text-sm">
              <span className="numeric chip border-primary/40 text-primary">
                +{event.xp} XP
              </span>
              <span className="numeric chip border-accent/40 text-accent">
                +{event.gold} ◉
              </span>
              {event.attributeLeveledUp && attribute ? (
                <span
                  className="chip"
                  style={{
                    borderColor: `color-mix(in srgb, ${attrColor(event.attribute)} 40%, transparent)`,
                    color: attrColor(event.attribute),
                  }}
                >
                  {attribute.glyph} {attribute.name} {event.attributeLevel}
                </span>
              ) : null}
            </div>

            <button ref={closeRef} type="button" onClick={onClose} className="btn-ghost mt-7">
              Onward
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

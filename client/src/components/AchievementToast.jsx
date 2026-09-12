import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { useGame } from '../context/GameContext';
import { TIER_STYLE } from '../lib/game';

/**
 * The achievement banner.
 *
 * Deliberately *not* the full-screen level-up overlay: a completion can level
 * you up and unlock two badges at once, and three modal takeovers in a row
 * would bury the thing the player actually did. This slides in under the
 * header instead, one at a time, and gets out of the way.
 */
export function AchievementToast() {
  const { unlockedQueue, shiftUnlocked } = useGame();
  const current = unlockedQueue[0] ?? null;

  useEffect(() => {
    if (!current) return undefined;
    const timer = setTimeout(shiftUnlocked, 4200);
    return () => clearTimeout(timer);
  }, [current, shiftUnlocked]);

  const tier = current ? (TIER_STYLE[current.tier] ?? TIER_STYLE.bronze) : null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-16 z-[70] flex justify-center px-4"
    >
      <AnimatePresence mode="wait">
        {current ? (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: -24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="panel pointer-events-auto flex w-full max-w-sm items-center gap-3.5 p-3.5"
            style={{ borderColor: `color-mix(in srgb, ${tier.color} 55%, transparent)` }}
          >
            <motion.span
              aria-hidden="true"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl"
              style={{
                background: `color-mix(in srgb, ${tier.color} 16%, transparent)`,
                boxShadow: `inset 0 0 0 1px ${tier.color}`,
              }}
              initial={{ rotate: -18, scale: 0.6 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 14, delay: 0.06 }}
            >
              {current.glyph}
            </motion.span>

            <div className="min-w-0 flex-1">
              <p
                className="text-[0.62rem] font-semibold uppercase tracking-[0.16em]"
                style={{ color: tier.color }}
              >
                Achievement unlocked
              </p>
              <p className="truncate text-sm font-semibold text-ink">{current.name}</p>
              <p className="numeric text-2xs text-accent">+{current.reward} Galleons</p>
            </div>

            <button
              type="button"
              onClick={shiftUnlocked}
              aria-label="Dismiss achievement"
              className="btn-quiet h-7 w-7 shrink-0 rounded-lg p-0 text-base"
            >
              ×
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

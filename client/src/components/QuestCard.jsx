import { memo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import { ATTRIBUTE_MAP, DIFFICULTY_MAP, attrColor } from '../lib/game';
import { Tilt3D } from './Enchant';

/* -------------------------------------------------------------------------- */
/* Completion control                                                         */
/* -------------------------------------------------------------------------- */

/**
 * The checkbox — the single most-pressed control in the app, so it gets the
 * most attention: a spring on press, an expanding ring on success, and a real
 * `aria-checked` state underneath.
 */
function QuestCheck({ done, pending, disabled, color, onToggle, label }) {
  const [burst, setBurst] = useState(0);

  const handle = () => {
    if (disabled || pending) return;
    if (!done) setBurst((n) => n + 1);
    onToggle();
  };

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={label}
      disabled={disabled || pending}
      onClick={handle}
      className="group/check relative grid h-11 w-11 shrink-0 place-items-center rounded-xl border transition-colors disabled:cursor-not-allowed"
      style={{
        borderColor: done ? color : 'rgb(var(--c-line))',
        background: done ? `color-mix(in srgb, ${color} 18%, transparent)` : 'transparent',
      }}
    >
      {/* Expanding ring on the moment of completion */}
      <AnimatePresence>
        {burst > 0 && done ? (
          <motion.span
            key={burst}
            className="pointer-events-none absolute inset-0 rounded-xl"
            style={{ border: `2px solid ${color}` }}
            initial={{ opacity: 0.7, scale: 0.9 }}
            animate={{ opacity: 0, scale: 1.65 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          />
        ) : null}
      </AnimatePresence>

      {pending ? (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-transparent"
          style={{ borderTopColor: color }}
        />
      ) : (
        <motion.svg
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="none"
          stroke={done ? color : 'rgb(var(--c-faint))'}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          initial={false}
          animate={{ scale: done ? 1 : 0.82, opacity: done ? 1 : 0.5 }}
          transition={{ type: 'spring', stiffness: 600, damping: 18 }}
        >
          <motion.path
            d="M4.5 12.5l5 5 10-11"
            initial={false}
            animate={{ pathLength: done ? 1 : 0.001 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
          />
        </motion.svg>
      )}

      {!done && !pending ? (
        <span
          className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity group-hover/check:opacity-100"
          style={{
            boxShadow: `0 0 0 1px color-mix(in srgb, ${color} 40%, transparent), 0 0 22px -6px ${color}`,
          }}
        />
      ) : null}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Floating reward                                                            */
/* -------------------------------------------------------------------------- */

function Floater({ xp, gold, color, onDone }) {
  return (
    <motion.div
      className="pointer-events-none absolute left-1/2 top-2 z-20 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-line bg-void/95 px-3 py-1.5 text-xs font-bold shadow-rune"
      initial={{ opacity: 0, y: 6, scale: 0.85 }}
      animate={{ opacity: [0, 1, 1, 0], y: [6, -10, -22, -52], scale: [0.85, 1.1, 1, 0.95] }}
      transition={{ duration: 1.5, times: [0, 0.16, 0.55, 1], ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={onDone}
    >
      <span className="numeric" style={{ color }}>
        +{xp} XP
      </span>
      <span aria-hidden="true" className="text-faint">
        ·
      </span>
      <span className="numeric text-accent">+{gold} ◉</span>
    </motion.div>
  );
}

/* -------------------------------------------------------------------------- */
/* Card                                                                       */
/* -------------------------------------------------------------------------- */

export const QuestCard = memo(function QuestCard({
  task,
  today,
  floater,
  onComplete,
  onUndo,
  onEdit,
  onDelete,
  onFloaterDone,
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const attribute = ATTRIBUTE_MAP[task.attribute] ?? ATTRIBUTE_MAP.intelligence;
  const difficulty = DIFFICULTY_MAP[task.difficulty] ?? DIFFICULTY_MAP.normal;
  const color = attrColor(task.attribute);

  const done = task.cadence === 'daily' ? task.lastCompletedDay === today : task.status === 'done';

  return (
    // Two elements, not one: Framer owns the <li>'s transform for the layout
    // and exit animations, and the tilt owns the inner card's. Sharing one
    // element would mean one of them silently overwriting the other.
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 380, damping: 34 }}
      className="stage-near"
    >
      <Tilt3D
        max={5}
        lift={-3}
        flat
        className={`panel-raised group flex items-start gap-3.5 p-3.5 transition-[border-color,opacity] sm:p-4 ${
          done ? 'opacity-65' : 'hover:border-primary/40'
        }`}
      >
        {/* Attribute spine — the colour cue that survives being scanned quickly */}
        <span
          aria-hidden="true"
          className="absolute inset-y-3 left-0 w-[3px] rounded-full transition-opacity"
          style={{ background: color, opacity: done ? 0.3 : 0.85 }}
        />

        <AnimatePresence>
          {floater ? (
            <Floater
              key={floater.key}
              xp={floater.xp}
              gold={floater.gold}
              color={color}
              onDone={() => onFloaterDone(floater.key)}
            />
          ) : null}
        </AnimatePresence>

        <div className="pl-1.5">
          <QuestCheck
            done={done}
            pending={task.pending}
            color={color}
            label={done ? `Undo: ${task.title}` : `Complete quest: ${task.title}`}
            onToggle={() => (done ? onUndo(task) : onComplete(task))}
          />
        </div>

        <div className="min-w-0 flex-1 pt-0.5">
          <p
            className={`break-words text-[0.95rem] font-medium leading-snug transition-colors ${
              done ? 'text-muted line-through decoration-line' : 'text-ink'
            }`}
          >
            {task.title}
          </p>

          {task.notes ? (
            <p className="mt-1 break-words text-xs leading-relaxed text-muted">{task.notes}</p>
          ) : null}

          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span
              className="chip border-transparent"
              style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
            >
              <span aria-hidden="true">{attribute.glyph}</span>
              {attribute.name}
            </span>

            <span className="chip">{difficulty.name}</span>

            <span className="chip">
              <span aria-hidden="true">{task.cadence === 'daily' ? '↻' : '◆'}</span>
              {task.cadence === 'daily' ? 'Daily' : 'One-off'}
            </span>

            <span className="numeric chip border-transparent bg-transparent text-faint">
              +{difficulty.xp} XP · +{difficulty.gold} ◉
            </span>

            {task.completionCount > 0 ? (
              <span className="numeric chip border-transparent bg-transparent text-faint">
                ×{task.completionCount} done
              </span>
            ) : null}
          </div>
        </div>

        {/* Actions. Always in the DOM and reachable by Tab — hover-only controls
            strand keyboard and touch users. */}
        <div className="relative shrink-0">
          <button
            type="button"
            aria-label={`Actions for ${task.title}`}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            onClick={() => setMenuOpen((open) => !open)}
            onBlur={(event) => {
              if (!event.currentTarget.parentElement.contains(event.relatedTarget)) {
                setMenuOpen(false);
              }
            }}
            className="btn-quiet h-9 w-9 rounded-lg p-0 text-lg leading-none opacity-60 focus-visible:opacity-100 group-hover:opacity-100"
          >
            <span aria-hidden="true">⋯</span>
          </button>

          <AnimatePresence>
            {menuOpen ? (
              <motion.div
                role="menu"
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.97 }}
                transition={{ duration: 0.14 }}
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false);
                }}
                className="panel absolute right-0 top-10 z-30 w-40 overflow-hidden p-1"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onEdit(task);
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink hover:bg-raised"
                >
                  Edit quest
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(task);
                  }}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger/10"
                >
                  Delete
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </Tilt3D>
    </motion.li>
  );
});

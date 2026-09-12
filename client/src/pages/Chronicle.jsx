import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import { api } from '../lib/api';
import { useGame } from '../context/GameContext';
import { EmptyState, Skeleton } from '../components/Primitives';
import { ATTRIBUTE_MAP, attrColor, fmt } from '../lib/game';

/* -------------------------------------------------------------------------- */
/* Heatmap                                                                    */
/* -------------------------------------------------------------------------- */

const WEEKDAYS = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun'];

/** Five buckets, so a busy day is visibly different from a merely active one. */
function intensity(count, busiest) {
  if (count === 0) return 0;
  const ratio = count / Math.max(busiest, 1);
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  return 1;
}

const LEVEL_ALPHA = [0, 0.22, 0.42, 0.68, 1];

/* Fixed cell geometry. Deterministic beats flexible here: the weekday labels
 * on the left have to line up with the rows exactly, and a cell that grows to
 * fill a wide panel stops reading as a calendar somewhere around 20px. */
const CELL = 15;
const GAP = 4;

function Heatmap({ heatmap, busiest }) {
  // Pad the front so the first column starts on a Monday.
  const columns = useMemo(() => {
    if (!heatmap.length) return [];
    const firstDate = new Date(`${heatmap[0].day}T00:00:00Z`);
    const weekday = (firstDate.getUTCDay() + 6) % 7; // 0 = Monday
    const padded = [...Array.from({ length: weekday }, () => null), ...heatmap];

    const weeks = [];
    for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));
    return weeks;
  }, [heatmap]);

  const box = { width: CELL, height: CELL };

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex w-max" style={{ gap: GAP }}>
        <div className="flex flex-col pr-1.5" style={{ gap: GAP }}>
          {WEEKDAYS.map((label, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="text-[0.62rem] leading-none text-faint"
              style={{ height: CELL, lineHeight: `${CELL}px` }}
            >
              {label}
            </span>
          ))}
        </div>

        {columns.map((week, wi) => (
          <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
            {week.map((day, di) =>
              day === null ? (
                <span key={di} style={box} />
              ) : (
                <motion.span
                  key={day.day}
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(0.5, wi * 0.006), duration: 0.2 }}
                  tabIndex={0}
                  role="img"
                  aria-label={`${day.day}: ${day.count} ${day.count === 1 ? 'quest' : 'quests'}, ${day.xp} XP`}
                  title={`${day.day} — ${day.count} completed, ${day.xp} XP`}
                  className="rounded-[3px] ring-1 ring-inset ring-line/60 transition-transform hover:scale-125 focus-visible:scale-125"
                  style={{
                    ...box,
                    background:
                      day.count === 0
                        ? 'rgb(var(--c-void))'
                        : `rgb(var(--c-primary) / ${LEVEL_ALPHA[intensity(day.count, busiest)]})`,
                  }}
                />
              ),
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[0.6rem] text-faint">
        <span>Quieter</span>
        {LEVEL_ALPHA.map((alpha, i) => (
          <span
            key={i}
            aria-hidden="true"
            className="h-[11px] w-[11px] rounded-[3px] ring-1 ring-inset ring-line/60"
            style={{
              background: i === 0 ? 'rgb(var(--c-void))' : `rgb(var(--c-primary) / ${alpha})`,
            }}
          />
        ))}
        <span>Busier</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Attribute split                                                            */
/* -------------------------------------------------------------------------- */

function AttributeSplit({ split }) {
  const total = split.reduce((sum, a) => sum + a.xp, 0);

  if (total === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted">
        Complete a few quests and your character&rsquo;s shape will show up here.
      </p>
    );
  }

  return (
    <>
      {/* One stacked bar reads the balance faster than five separate ones */}
      <div className="flex h-3 w-full overflow-hidden rounded-full ring-1 ring-inset ring-line">
        {split.map((a) =>
          a.xp === 0 ? null : (
            <motion.span
              key={a.id}
              initial={{ width: 0 }}
              animate={{ width: `${(a.xp / total) * 100}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              style={{ background: attrColor(a.id) }}
              title={`${a.name}: ${Math.round((a.xp / total) * 100)}%`}
            />
          ),
        )}
      </div>

      <ul className="mt-4 space-y-2.5">
        {[...split]
          .sort((a, b) => b.xp - a.xp)
          .map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-ink">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: attrColor(a.id) }}
                />
                {a.name}
              </span>
              <span className="numeric text-xs text-muted">
                {fmt(a.xp)} XP
                <span className="mx-1.5 text-faint">·</span>
                {a.count} {a.count === 1 ? 'quest' : 'quests'}
                <span className="ml-2 text-faint">
                  {total ? Math.round((a.xp / total) * 100) : 0}%
                </span>
              </span>
            </li>
          ))}
      </ul>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

function Stat({ label, value, sub }) {
  return (
    <div className="panel p-4">
      <p className="label mb-1">{label}</p>
      <p className="numeric text-2xl font-semibold text-ink">{value}</p>
      {sub ? <p className="mt-0.5 text-2xs text-faint">{sub}</p> : null}
    </div>
  );
}

export default function Chronicle() {
  const { character } = useGame();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    api
      .stats(182)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  if (error) {
    return (
      <EmptyState glyph="⚠" title="The chronicle is unreadable">
        {error}
      </EmptyState>
    );
  }

  if (!data) {
    return (
      <div className="space-y-5" aria-busy="true">
        <Skeleton className="h-9 w-48" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[92px] rounded-card" />
          ))}
        </div>
        <Skeleton className="h-[220px] rounded-card" />
        <Skeleton className="h-[280px] rounded-card" />
      </div>
    );
  }

  const { totals, heatmap, attributeSplit, history } = data;

  return (
    <div className="space-y-5">
      <header>
        <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-faint">
          The record so far
        </p>
        <h1 className="mt-0.5 text-2xl font-semibold text-ink">Chronicle</h1>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Current streak"
          value={`${character?.streak.current ?? 0}d`}
          sub={`Longest: ${character?.streak.longest ?? 0} days`}
        />
        <Stat
          label="XP this week"
          value={fmt(totals.xpLast7)}
          sub={`${totals.completionsLast7} quests completed`}
        />
        <Stat
          label="Active days"
          value={`${totals.activeDaysLast28}/28`}
          sub="Days you showed up, last four weeks"
        />
        <Stat
          label="Lifetime XP"
          value={fmt(character?.totalXp ?? 0)}
          sub={`${fmt(character?.lifetime.tasksCompleted ?? 0)} quests, all time`}
        />
      </div>

      <section aria-labelledby="heatmap-heading" className="panel p-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="heatmap-heading" className="text-base font-semibold text-ink">
            Twenty-six weeks
          </h2>
          <p className="numeric text-2xs text-faint">
            {totals.completionsWindow} quests · {fmt(totals.xpWindow)} XP
          </p>
        </div>
        <Heatmap heatmap={heatmap} busiest={totals.busiestDay.count} />
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section aria-labelledby="split-heading" className="panel p-5">
          <h2 id="split-heading" className="mb-4 text-base font-semibold text-ink">
            Where the effort went
          </h2>
          <AttributeSplit split={attributeSplit} />
        </section>

        <section aria-labelledby="history-heading" className="panel p-5">
          <h2 id="history-heading" className="mb-4 text-base font-semibold text-ink">
            Recent deeds
          </h2>

          {history.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Nothing recorded yet. Complete a quest and it will appear here.
            </p>
          ) : (
            <ol className="-my-1 max-h-[340px] space-y-0.5 overflow-y-auto pr-1">
              {history.map((entry) => {
                const attribute = ATTRIBUTE_MAP[entry.attribute];
                return (
                  <li
                    key={entry.id}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-raised/50"
                  >
                    <span
                      aria-hidden="true"
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs"
                      style={{
                        color: attrColor(entry.attribute),
                        background: `color-mix(in srgb, ${attrColor(entry.attribute)} 14%, transparent)`,
                      }}
                    >
                      {attribute?.glyph ?? '✦'}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">{entry.title}</span>
                      <span className="numeric text-2xs text-faint">
                        {entry.day}
                        {entry.multiplier > 1 ? ` · ×${entry.multiplier.toFixed(2)}` : ''}
                        {entry.leveledTo ? ` · reached level ${entry.leveledTo}` : ''}
                      </span>
                    </span>

                    <span className="numeric shrink-0 text-right text-2xs">
                      <span className="block text-primary">+{entry.xp} XP</span>
                      <span className="block text-accent">+{entry.gold} ◉</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

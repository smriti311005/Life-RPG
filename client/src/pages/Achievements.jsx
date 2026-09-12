import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

import { api } from '../lib/api';
import { useGame } from '../context/GameContext';
import { useToast } from '../context/ToastContext';
import { EmptyState, Skeleton, XpBar } from '../components/Primitives';
import { TIER_STYLE, fmt } from '../lib/game';

/* -------------------------------------------------------------------------- */
/* Card                                                                       */
/* -------------------------------------------------------------------------- */

function AchievementCard({ item }) {
  const tier = TIER_STYLE[item.tier] ?? TIER_STYLE.bronze;
  const locked = !item.unlocked;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
      className={`panel-raised flex gap-3.5 p-4 transition-colors ${
        locked ? 'opacity-70' : ''
      }`}
      style={locked ? undefined : { borderColor: `color-mix(in srgb, ${tier.color} 45%, transparent)` }}
    >
      <span
        aria-hidden="true"
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-xl ${
          locked ? 'grayscale' : ''
        }`}
        style={{
          background: locked
            ? 'rgb(var(--c-void) / 0.6)'
            : `color-mix(in srgb, ${tier.color} 16%, transparent)`,
          boxShadow: locked ? 'inset 0 0 0 1px rgb(var(--c-line))' : `inset 0 0 0 1px ${tier.color}`,
        }}
      >
        {locked ? '🔒' : item.glyph}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h3 className={`text-sm font-semibold ${locked ? 'text-muted' : 'text-ink'}`}>
            {item.name}
          </h3>
          <span
            className="text-[0.62rem] font-semibold uppercase tracking-wider"
            style={{ color: locked ? 'rgb(var(--c-faint))' : tier.color }}
          >
            {tier.name}
          </span>
        </div>

        <p className="mt-0.5 text-xs leading-relaxed text-muted">{item.description}</p>

        {item.unlocked ? (
          <p className="numeric mt-2 text-2xs" style={{ color: tier.color }}>
            ✓ Unlocked{' '}
            {item.unlockedAt
              ? new Date(item.unlockedAt).toLocaleDateString(undefined, {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : ''}
            {item.reward ? ` · +${item.reward} Galleons` : ''}
          </p>
        ) : (
          <div className="mt-2.5">
            <XpBar
              value={item.current}
              max={item.target}
              color={tier.color}
              height="h-1.5"
              showSheen={false}
              label={`${item.name}: ${item.current} of ${item.target}`}
            />
            <p className="numeric mt-1.5 flex flex-wrap items-baseline gap-x-2 text-2xs text-faint">
              <span>
                {fmt(item.current)} / {fmt(item.target)}
              </span>
              <span aria-hidden="true">·</span>
              <span>+{item.reward} Galleons on unlock</span>
            </p>
          </div>
        )}
      </div>
    </motion.li>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'unlocked', label: 'Unlocked' },
  { id: 'locked', label: 'In progress' },
];

export default function Achievements() {
  const { setCharacter } = useGame();
  const toast = useToast();

  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;

    api
      .achievements()
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setCharacter(result.character);

        /* The endpoint re-evaluates on read, so arriving here can itself
         * unlock something — a palette bought a moment ago, say. */
        for (const unlocked of result.justUnlocked ?? []) {
          toast.gold(`${unlocked.glyph} ${unlocked.name} unlocked — +${unlocked.reward} gold.`, {
            duration: 5000,
          });
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
    // Intentionally once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const groups = useMemo(() => {
    if (!data) return [];
    const visible = data.items.filter((i) =>
      filter === 'unlocked' ? i.unlocked : filter === 'locked' ? !i.unlocked : true,
    );

    const byGroup = new Map();
    for (const item of visible) {
      if (!byGroup.has(item.group)) byGroup.set(item.group, []);
      byGroup.get(item.group).push(item);
    }
    return [...byGroup.entries()];
  }, [data, filter]);

  if (error) {
    return (
      <EmptyState glyph="⚠" title="The hall of records is shut">
        {error}
      </EmptyState>
    );
  }

  if (!data) {
    return (
      <div className="space-y-5" aria-busy="true">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-[92px] rounded-card" />
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-card" />
          ))}
        </div>
      </div>
    );
  }

  const percent = data.total ? (data.unlockedCount / data.total) * 100 : 0;

  return (
    <div className="space-y-5">
      <header>
        <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-faint">
          What you have proven
        </p>
        <h1 className="mt-0.5 text-2xl font-semibold text-ink">Achievements</h1>
      </header>

      {/* Overall progress */}
      <section aria-label="Overall progress" className="panel bg-aurora p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="numeric text-3xl font-semibold text-ink">
              {data.unlockedCount}
              <span className="text-lg text-faint"> / {data.total}</span>
            </p>
            <p className="mt-0.5 text-sm text-muted">
              {data.total - data.unlockedCount} still to earn
            </p>
          </div>
          <p className="numeric chip border-accent/40 text-accent">
            ◉ {fmt(data.goldFromAchievements)} earned from these
          </p>
        </div>

        <div className="mt-4">
          <XpBar
            value={data.unlockedCount}
            max={data.total}
            label={`${Math.round(percent)} percent of achievements unlocked`}
          />
        </div>
      </section>

      <div role="group" aria-label="Filter achievements" className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            aria-pressed={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`chip transition-colors ${
              filter === f.id ? 'border-primary/60 bg-primary/12 text-primary' : 'hover:text-ink'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <EmptyState glyph="◌" title="Nothing here yet">
          {filter === 'unlocked'
            ? 'Complete a quest and your first achievement is moments away.'
            : 'You have unlocked every achievement in this list.'}
        </EmptyState>
      ) : (
        groups.map(([group, items]) => (
          <section key={group} aria-labelledby={`group-${group}`}>
            <h2
              id={`group-${group}`}
              className="mb-3 text-2xs font-semibold uppercase tracking-[0.14em] text-faint"
            >
              {group}
            </h2>
            <ul className="grid gap-3 md:grid-cols-2">
              {items.map((item) => (
                <AchievementCard key={item.id} item={item} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

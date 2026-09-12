import { motion } from 'framer-motion';

import { XpBar, LevelRing, Skeleton } from './Primitives';
import { attrColor, fmt, pct } from '../lib/game';

/* -------------------------------------------------------------------------- */
/* Avatar                                                                     */
/* -------------------------------------------------------------------------- */

function Avatar({ character }) {
  const initial = (character.displayName || 'W').trim().charAt(0).toUpperCase();
  const progress = character.xpToNext > 0 ? character.xp / character.xpToNext : 0;

  return (
    <div className="relative shrink-0">
      <LevelRing level={character.level} progress={progress} size={92} />

      <div className="absolute inset-[9px] overflow-hidden rounded-full border border-line bg-raised">
        {character.photoURL ? (
          <img
            src={character.photoURL}
            alt=""
            width="74"
            height="74"
            loading="lazy"
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary/25 to-accent/15 font-display text-2xl font-semibold text-ink">
            {initial}
          </div>
        )}
      </div>

      {/* Level badge, anchored to the ring */}
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2">
        <motion.span
          key={character.level}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 18 }}
          className="numeric block rounded-full border border-accent/40 bg-void px-2.5 py-0.5 text-2xs font-bold text-accent shadow-rune"
        >
          {character.level}
        </motion.span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Stat pill                                                                  */
/* -------------------------------------------------------------------------- */

function StatPill({ glyph, value, label, tone = 'text-ink', title }) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl border border-line bg-void/50 px-3 py-2"
      title={title}
    >
      <span aria-hidden="true" className={`text-sm ${tone}`}>
        {glyph}
      </span>
      <div className="min-w-0">
        <p className={`numeric text-sm font-semibold leading-none ${tone}`}>{value}</p>
        <p className="mt-1 truncate text-2xs uppercase tracking-wider text-faint">{label}</p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Attribute row                                                              */
/* -------------------------------------------------------------------------- */

function AttributeRow({ attribute }) {
  const color = attrColor(attribute.id);
  const progress = pct(attribute.xp, attribute.xpToNext);

  return (
    <li className="group">
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          <span aria-hidden="true" style={{ color }} className="text-xs">
            {attribute.glyph}
          </span>
          {attribute.name}
        </span>
        <span className="numeric text-2xs text-muted">
          <span className="font-semibold text-ink">Lv {attribute.level}</span>
          <span className="mx-1.5 text-faint">·</span>
          {fmt(attribute.xp)}/{fmt(attribute.xpToNext)}
        </span>
      </div>

      <XpBar
        value={attribute.xp}
        max={attribute.xpToNext}
        color={color}
        height="h-1.5"
        showSheen={false}
        label={`${attribute.name}: level ${attribute.level}, ${Math.round(progress)} percent to level ${attribute.level + 1}`}
      />
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Panel                                                                      */
/* -------------------------------------------------------------------------- */

export function HeroPanel({ character, loading }) {
  if (loading || !character) return <HeroPanelSkeleton />;

  const { streak } = character;
  const xpProgress = pct(character.xp, character.xpToNext);
  const remaining = Math.max(0, character.xpToNext - character.xp);

  return (
    <section
      aria-labelledby="hero-heading"
      className="panel overflow-hidden bg-aurora p-5 sm:p-6"
    >
      <div className="flex items-start gap-4 sm:gap-5">
        <Avatar character={character} />

        <div className="min-w-0 flex-1">
          <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-primary">
            {character.rank}
          </p>

          <h1
            id="hero-heading"
            className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xl font-semibold leading-tight text-ink sm:text-2xl"
          >
            <span className="truncate">{character.displayName}</span>
            {character.equipped.badge ? (
              <span aria-label="Equipped badge" className="text-base">
                {character.equipped.badge}
              </span>
            ) : null}
          </h1>

          {character.equipped.title ? (
            <p className="mt-0.5 font-display text-sm italic text-accent">
              {character.equipped.title}
            </p>
          ) : null}

          <div className="mt-3">
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="text-2xs font-semibold uppercase tracking-wider text-faint">
                Level {character.level}
              </span>
              <span className="numeric text-2xs text-muted">
                {fmt(character.xp)} / {fmt(character.xpToNext)} XP
              </span>
            </div>

            <XpBar
              value={character.xp}
              max={character.xpToNext}
              label={`Experience: ${Math.round(xpProgress)} percent toward level ${character.level + 1}`}
            />

            <p className="mt-1.5 text-2xs text-faint">
              {remaining === 0
                ? 'Ready to ascend.'
                : `${fmt(remaining)} XP to level ${character.level + 1}`}
            </p>
          </div>
        </div>
      </div>

      {/* Two columns at every width: this panel sits in a ~340px sidebar on
          desktop, where four columns clipped every label to a single letter. */}
      <div className="mt-5 grid grid-cols-2 gap-2">
        <StatPill
          glyph="◉"
          tone="text-accent"
          value={fmt(character.gold)}
          label="Gold"
          title={`${character.gold.toLocaleString()} gold earned and unspent`}
        />
        <StatPill
          glyph="🔥"
          tone={streak.current > 0 ? 'text-ink' : 'text-faint'}
          value={`${streak.current}d`}
          label="Streak"
          title={`Longest streak: ${streak.longest} days`}
        />
        <StatPill
          glyph="✕"
          tone={streak.multiplier > 1 ? 'text-primary' : 'text-muted'}
          value={streak.multiplier.toFixed(2)}
          label="Multiplier"
          title="Every completion is multiplied by this while your streak holds"
        />
        <StatPill
          glyph="✓"
          value={fmt(character.lifetime.tasksCompleted)}
          label="Completed"
          title="Quests completed, all time"
        />
      </div>

      {character.effects.xpElixirCharges > 0 || streak.shields > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {character.effects.xpElixirCharges > 0 ? (
            <span className="chip border-primary/40 text-primary">
              ⚗ Focus ×{character.effects.xpElixirCharges}
            </span>
          ) : null}
          {streak.shields > 0 ? (
            <span className="chip border-accent/40 text-accent">
              ⛨ Ward ×{streak.shields}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="hairline my-5" />

      <h2 className="label mb-3">Attributes</h2>
      <ul className="space-y-3.5">
        {character.attributes.map((attribute) => (
          <AttributeRow key={attribute.id} attribute={attribute} />
        ))}
      </ul>
    </section>
  );
}

function HeroPanelSkeleton() {
  return (
    <section className="panel p-5 sm:p-6" aria-hidden="true">
      <div className="flex items-start gap-4">
        <Skeleton className="h-[92px] w-[92px] rounded-full" />
        <div className="flex-1 space-y-2.5 pt-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-2.5 w-full rounded-full" />
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[52px] rounded-xl" />
        ))}
      </div>
      <div className="hairline my-5" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
    </section>
  );
}

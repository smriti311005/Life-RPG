import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import { api } from '../lib/api';
import { EmptyState, Skeleton, XpBar, LevelRing } from '../components/Primitives';
import { attrColor, fmt, pct, CLASS_MAP } from '../lib/game';

/* -------------------------------------------------------------------------- */
/* Attribute row                                                              */
/* -------------------------------------------------------------------------- */

function AttributeRow({ attribute, total }) {
  const color = attrColor(attribute.id);
  // Share of all lifetime XP, so the six rows add up to 100%.
  const share = total > 0 ? (attribute.totalXp / total) * 100 : 0;

  return (
    <li className="panel-raised p-4">
      <div className="flex items-start gap-3.5">
        <span
          aria-hidden="true"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg"
          style={{ color, background: `color-mix(in srgb, ${color} 14%, transparent)` }}
        >
          {attribute.glyph}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              {attribute.name}
              <span className="numeric text-2xs font-normal text-faint">{attribute.short}</span>
              {attribute.isFocus ? (
                <span
                  className="chip border-transparent px-2 py-0.5"
                  style={{
                    background: `color-mix(in srgb, ${color} 16%, transparent)`,
                    color,
                  }}
                >
                  Affinity +25%
                </span>
              ) : null}
            </h3>

            <span className="numeric text-2xs text-muted">
              <span className="text-base font-semibold text-ink">{attribute.level}</span>
              <span className="ml-1.5 text-faint">
                · {fmt(attribute.xp)}/{fmt(attribute.xpToNext)}
              </span>
            </span>
          </div>

          <div className="mt-2.5">
            <XpBar
              value={attribute.xp}
              max={attribute.xpToNext}
              color={color}
              height="h-2"
              showSheen={false}
              label={`${attribute.name}: level ${attribute.level}, ${Math.round(
                pct(attribute.xp, attribute.xpToNext),
              )} percent to level ${attribute.level + 1}`}
            />
          </div>

          <p className="mt-2 text-2xs text-faint">
            {attribute.example}
          </p>

          <dl className="numeric mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-2xs text-muted">
            <div className="flex gap-1.5">
              <dt className="text-faint">Lifetime</dt>
              <dd>{fmt(attribute.totalXp)} XP</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-faint">Quests</dt>
              <dd>{fmt(attribute.quests)}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-faint">Share</dt>
              <dd>{share < 1 && share > 0 ? '<1' : Math.round(share)}%</dd>
            </div>
          </dl>
        </div>
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function Character() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .character()
      .then((result) => !cancelled && setData(result))
      .catch((err) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <EmptyState glyph="⚠" title="The character sheet is unreadable">
        {error}
      </EmptyState>
    );
  }

  if (!data) {
    return (
      <div className="space-y-5" aria-busy="true">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-[220px] rounded-card" />
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[168px] rounded-card" />
          ))}
        </div>
      </div>
    );
  }

  const { character, attributes, strongest, weakest } = data;
  const klass = CLASS_MAP[character.characterClass] ?? null;
  const focusColor = klass ? attrColor(klass.focus) : 'rgb(var(--c-primary))';
  const totalXp = attributes.reduce((sum, a) => sum + a.totalXp, 0);
  const progress = character.xpToNext > 0 ? character.xp / character.xpToNext : 0;

  return (
    <div className="space-y-5">
      <header>
        <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-faint">
          Who you have become
        </p>
        <h1 className="mt-0.5 text-2xl font-semibold text-ink">Character</h1>
      </header>

      {/* ------------------------------ the sheet ----------------------------- */}
      <section aria-labelledby="sheet-heading" className="panel bg-aurora p-6">
        <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
          <div className="relative shrink-0">
            <LevelRing level={character.level} progress={progress} size={116} stroke={6} />
            <div className="absolute inset-[11px] grid place-items-center overflow-hidden rounded-full border border-line bg-raised">
              {character.photoURL ? (
                <img
                  src={character.photoURL}
                  alt=""
                  width="94"
                  height="94"
                  className="h-full w-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="font-display text-3xl"
                  style={{ color: focusColor }}
                >
                  {klass?.glyph ?? character.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p
              className="text-2xs font-semibold uppercase tracking-[0.18em]"
              style={{ color: focusColor }}
            >
              {klass ? `${klass.name} · ${character.rank}` : character.rank}
            </p>

            <h2
              id="sheet-heading"
              className="mt-1 flex flex-wrap items-center justify-center gap-2 font-display text-2xl font-bold text-ink sm:justify-start sm:text-3xl"
            >
              {character.displayName}
              {character.equipped.badge ? (
                <span aria-label="Equipped badge">{character.equipped.badge}</span>
              ) : null}
            </h2>

            {character.equipped.title ? (
              <p className="mt-0.5 font-display text-sm italic text-accent">
                {character.equipped.title}
              </p>
            ) : null}

            <div className="mt-4">
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
                label={`Experience: ${Math.round(progress * 100)} percent toward level ${
                  character.level + 1
                }`}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Lifetime XP', fmt(character.totalXp)],
            ['Quests', fmt(character.lifetime.tasksCompleted)],
            ['Longest streak', `${character.streak.longest}d`],
            ['Achievements', fmt(character.achievementCount ?? 0)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-line bg-void/50 px-3 py-2.5">
              <p className="numeric text-lg font-semibold text-ink">{value}</p>
              <p className="mt-0.5 text-2xs uppercase tracking-wider text-faint">{label}</p>
            </div>
          ))}
        </div>

        {klass ? (
          <p className="mt-4 text-center text-xs text-muted sm:text-left">
            <span style={{ color: focusColor }}>{klass.tagline}</span>{' '}
            Every quest that trains {klass.focus} earns this character 25% more toward that
            attribute.
          </p>
        ) : null}
      </section>

      {/* ----------------------------- the reading ---------------------------- */}
      {strongest && weakest && strongest.id !== weakest.id ? (
        <section className="panel flex flex-wrap items-center justify-between gap-3 p-4">
          <p className="text-sm text-muted">
            Strongest in{' '}
            <strong style={{ color: attrColor(strongest.id) }}>{strongest.name}</strong>, thinnest
            in <strong style={{ color: attrColor(weakest.id) }}>{weakest.name}</strong>.
          </p>
          <p className="text-2xs text-faint">
            A character sheet is a record, not a judgement.
          </p>
        </section>
      ) : null}

      {/* ----------------------------- attributes ----------------------------- */}
      <section aria-labelledby="attrs-heading">
        <h2 id="attrs-heading" className="mb-3 text-base font-semibold text-ink">
          Attributes
        </h2>
        <motion.ul layout className="grid gap-3 md:grid-cols-2">
          {attributes.map((attribute) => (
            <AttributeRow key={attribute.id} attribute={attribute} total={totalXp} />
          ))}
        </motion.ul>
      </section>
    </div>
  );
}

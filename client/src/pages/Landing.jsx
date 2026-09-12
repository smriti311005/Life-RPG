import { Link } from 'react-router-dom';

import { ATTRIBUTES, attrColor } from '../lib/game';

/**
 * The public landing page.
 *
 * Deliberately free of Framer Motion. This is the SEO-critical, first-paint
 * route, and every reveal here is a CSS `.rise` whose *resting* state is the
 * finished state — so the copy is on screen even if the animation never runs
 * (reduced motion, a throttled tab, a JS failure). It also keeps the motion
 * library off this route's critical path entirely.
 */

const FEATURES = [
  {
    glyph: '★',
    title: 'A curve that keeps its shape',
    body: 'Level two costs 55 XP. Level twenty-six costs nearly three thousand. Progress stays meaningful because it never stops getting harder.',
  },
  {
    glyph: '🔥',
    title: 'Streaks that actually pay',
    body: 'Every consecutive day multiplies what you earn, up to 1.6×. Miss a day and the chain breaks — unless you have spent gold on a ward.',
  },
  {
    glyph: '⚔',
    title: 'Five attributes, one life',
    body: 'The gym levels Might. The books level Mind. Doing the dishes levels Vitality. Your character sheet ends up shaped like your actual habits.',
  },
  {
    glyph: '◉',
    title: 'Gold worth saving for',
    body: 'Completions pay gold. Gold buys palettes that re-skin the whole app, titles worn under your name, and provisions that bend the rules.',
  },
  {
    glyph: '⛨',
    title: 'Numbers you cannot fake',
    body: 'Every reward is computed on the server from data the server already trusts. The client only ever says which quest you finished.',
  },
  {
    glyph: '⇄',
    title: 'The same character everywhere',
    body: 'Sign in on your phone, your laptop, a borrowed machine. Your progress lives in the database, not in a browser tab.',
  },
];

function Mark({ className = 'h-7 w-7', id }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgb(var(--c-primary))" />
          <stop offset="100%" stopColor="rgb(var(--c-accent))" />
        </linearGradient>
      </defs>
      <path d="M16 3l2.9 8.1L27 14l-8.1 2.9L16 25l-2.9-8.1L5 14l8.1-2.9z" fill={`url(#${id})`} />
    </svg>
  );
}

function Constellation() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 bg-aurora" />
      {ATTRIBUTES.map((attribute, i) => (
        <span
          key={attribute.id}
          className="drift absolute text-xl"
          style={{
            color: attrColor(attribute.id),
            left: `${12 + i * 19}%`,
            top: `${18 + (i % 3) * 22}%`,
            '--drift-duration': `${7 + i}s`,
            '--drift-delay': `${i * 500}ms`,
          }}
        >
          {attribute.glyph}
        </span>
      ))}
    </div>
  );
}

/** A static, non-interactive mock of the real quest card — the product, shown. */
function QuestPreview() {
  return (
    <div className="panel w-full max-w-sm p-4" aria-hidden="true">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-xl border border-accent/60 bg-accent/15 text-accent">
          ✓
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">Read ten pages</p>
          <div className="mt-2 flex gap-1.5">
            <span className="chip border-transparent bg-primary/12 text-primary">✦ Mind</span>
            <span className="chip">Easy</span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-2xs text-faint">
          <span>Level 7</span>
          <span className="numeric">412 / 615 XP</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-void ring-1 ring-inset ring-line">
          <div className="h-full w-[67%] rounded-full bg-gradient-to-r from-primary to-accent" />
        </div>
      </div>

      <p className="numeric drift mt-3 text-center text-xs font-bold text-accent">
        +25 XP · +9 ◉
      </p>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-[100dvh]">
      <a href="#content" className="sr-only-focusable btn-primary fixed left-4 top-4 z-50">
        Skip to content
      </a>

      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <span className="flex items-center gap-2.5">
          <Mark id="landing-mark" />
          <span className="font-display text-base font-bold tracking-wide">
            LIFE<span className="text-primary">RPG</span>
          </span>
        </span>

        <nav aria-label="Account">
          <Link to="/enter" className="btn-ghost">
            Sign in
          </Link>
        </nav>
      </header>

      <main id="content">
        {/* ------------------------------- hero ------------------------------- */}
        <section className="relative overflow-hidden px-4 pb-20 pt-12 sm:px-6 sm:pt-20">
          <Constellation />

          <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="rise chip border-primary/40 text-primary">
                A role-playing game where the quests are real
              </p>

              <h1
                className="rise mt-5 text-4xl font-bold leading-[1.08] text-ink sm:text-5xl lg:text-6xl"
                style={{ '--rise-delay': '60ms' }}
              >
                Your habits already have{' '}
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  a character sheet
                </span>
                . This one just shows it to you.
              </h1>

              <p
                className="rise mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg"
                style={{ '--rise-delay': '120ms' }}
              >
                The gym pays off in months. A to-do list pays off in a grey checkmark. Life RPG
                pays immediately — experience, gold, a level that costs more than the last one —
                so the boring part of building a life has a feedback loop that actually lands.
              </p>

              <div
                className="rise mt-8 flex flex-col gap-3 sm:flex-row"
                style={{ '--rise-delay': '180ms' }}
              >
                <Link to="/enter" className="btn-primary px-6 py-3 text-base">
                  Roll a character — free
                </Link>
                <a href="#how" className="btn-ghost px-6 py-3 text-base">
                  See how it works
                </a>
              </div>

              <p className="mt-4 text-2xs text-faint">
                No credit card. Sign in with Google or an email address.
              </p>
            </div>

            <div
              className="rise flex justify-center lg:justify-end"
              style={{ '--rise-delay': '220ms' }}
            >
              <QuestPreview />
            </div>
          </div>
        </section>

        {/* ----------------------------- attributes ---------------------------- */}
        <section aria-labelledby="attrs-heading" className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 id="attrs-heading" className="text-center text-2xl font-semibold sm:text-3xl">
              Five attributes. Every one of them earned.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-center text-muted">
              Each quest names what it trains. Complete enough of them and the shape of your
              character stops being aspirational and starts being a record.
            </p>

            <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {ATTRIBUTES.map((attribute, i) => (
                <li
                  key={attribute.id}
                  className="rise panel-raised p-4 text-center"
                  style={{ '--rise-delay': `${i * 60}ms` }}
                >
                  <span
                    aria-hidden="true"
                    className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl text-lg"
                    style={{
                      color: attrColor(attribute.id),
                      background: `color-mix(in srgb, ${attrColor(attribute.id)} 14%, transparent)`,
                    }}
                  >
                    {attribute.glyph}
                  </span>
                  <h3 className="text-sm font-semibold text-ink">{attribute.name}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{attribute.blurb}</p>
                  <p className="mt-2 text-2xs text-faint">{attribute.example}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ------------------------------ features ----------------------------- */}
        <section id="how" aria-labelledby="how-heading" className="px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-6xl">
            <h2 id="how-heading" className="text-center text-2xl font-semibold sm:text-3xl">
              How it holds together
            </h2>

            <ul className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature, i) => (
                <li
                  key={feature.title}
                  className="rise panel-raised p-5"
                  style={{ '--rise-delay': `${(i % 3) * 80}ms` }}
                >
                  <span aria-hidden="true" className="text-lg text-primary">
                    {feature.glyph}
                  </span>
                  <h3 className="mt-3 text-base font-semibold text-ink">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{feature.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* -------------------------------- CTA -------------------------------- */}
        <section className="px-4 pb-24 pt-8 sm:px-6">
          <div className="panel mx-auto max-w-3xl bg-aurora px-6 py-14 text-center">
            <h2 className="text-2xl font-semibold sm:text-3xl">
              Level one starts at fifty-five XP
            </h2>
            <p className="mx-auto mt-3 max-w-md text-muted">
              That is roughly two real things done today. You could be level two before you
              finish your coffee.
            </p>
            <Link to="/enter" className="btn-primary mt-8 px-6 py-3 text-base">
              Begin
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line px-4 py-8 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-2xs text-faint sm:flex-row">
          <p>Life RPG — a habit tracker that respects the dopamine loop.</p>
          <p>Built with React, Express, MongoDB and Firebase Auth.</p>
        </div>
      </footer>
    </div>
  );
}

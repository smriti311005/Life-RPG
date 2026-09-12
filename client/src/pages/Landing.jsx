import { Link } from 'react-router-dom';

import { ATTRIBUTES, attrColor } from '../lib/game';
import { CinemaBackdrop } from '../components/CinemaBackdrop';
import { Tilt3D, Crest, RuneRule } from '../components/Enchant';

/**
 * The public landing page.
 *
 * Deliberately free of Framer Motion. This is the SEO-critical, first-paint
 * route, and every reveal here is a CSS `.rise` whose *resting* state is the
 * finished state — so the copy is on screen even if the animation never runs
 * (reduced motion, a throttled tab, a JS failure). It also keeps the motion
 * library off this route's critical path entirely.
 *
 * The depth is CSS 3D for the same reason: perspective and `translateZ` cost
 * nothing to parse and are composited off the main thread, so the hero can
 * carry a video plate and still paint fast.
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

/** A static, non-interactive mock of the real quest card — the product, shown. */
function QuestPreview() {
  return (
    <Tilt3D
      max={11}
      lift={-8}
      surface="glass"
      className="w-full max-w-sm p-4"
      aria-hidden="true"
    >
      <div className="flex items-center gap-3 pop-1">
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

      <div className="mt-4 pop-2">
        <div className="mb-1.5 flex justify-between text-2xs text-faint">
          <span>Level 7</span>
          <span className="numeric">412 / 615 XP</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-void ring-1 ring-inset ring-line">
          <div className="h-full w-[67%] rounded-full bg-gradient-to-r from-primary to-accent" />
        </div>
      </div>

      <p className="numeric drift mt-3 pop-3 text-center text-xs font-bold text-accent">
        +25 XP · +9 ◉
      </p>
    </Tilt3D>
  );
}

export default function Landing() {
  return (
    <>
      {/* The hero cut, sharp: on this route the castle *is* the product shot. */}
      <CinemaBackdrop variant="wide" candles />

      <div className="above-film min-h-[100dvh]">
        <a href="#content" className="sr-only-focusable btn-primary fixed left-4 top-4 z-50">
          Skip to content
        </a>

        <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <span className="flex items-center gap-2.5">
            <Crest id="landing-crest" />
            <span className="spellcast text-base font-bold tracking-wide">Life RPG</span>
          </span>

          <nav aria-label="Account">
            <Link to="/enter" className="btn-ghost">
              Sign in
            </Link>
          </nav>
        </header>

        <main id="content">
          {/* ------------------------------- hero ------------------------------ */}
          <section className="stage relative flex min-h-[86dvh] items-center overflow-hidden px-4 pb-20 pt-10 sm:px-6">
            <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[1.15fr_1fr]">
              {/* The title block tilts as one plane, with the lines set at
                  different depths — the reference's trick for making flat type
                  read as carved rather than printed. */}
              <Tilt3D max={5} glare={false} className="preserve-3d">
                <p className="rise chip pop-1 border-primary/40 text-primary">
                  A role-playing game where the quests are real
                </p>

                <h1 className="rise mt-6 pop-3" style={{ '--rise-delay': '60ms' }}>
                  <span className="spellcast block text-[2.6rem] leading-[1.02] sm:text-6xl lg:text-7xl">
                    Life RPG
                  </span>
                  <span className="incantation mt-3 block text-accent/90">
                    and the habits that level you
                  </span>
                </h1>

                <p
                  className="rise mt-6 max-w-xl pop-2 text-base leading-relaxed text-muted sm:text-lg"
                  style={{ '--rise-delay': '120ms' }}
                >
                  Your habits already have a character sheet. This one just shows it to you. The
                  gym pays off in months; a to-do list pays off in a grey checkmark. Life RPG pays
                  immediately — experience, gold, a level that costs more than the last one.
                </p>

                <div
                  className="rise mt-8 flex flex-col gap-3 pop-2 sm:flex-row"
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
              </Tilt3D>

              <div
                className="rise flex justify-center lg:justify-end"
                style={{ '--rise-delay': '220ms' }}
              >
                <QuestPreview />
              </div>
            </div>
          </section>

          {/* ----------------------------- attributes --------------------------- */}
          <section aria-labelledby="attrs-heading" className="stage px-4 py-16 sm:px-6">
            <div className="mx-auto max-w-6xl">
              <h2
                id="attrs-heading"
                className="spellcast text-center text-2xl sm:text-3xl"
              >
                Five attributes
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-center text-muted">
                Each quest names what it trains. Complete enough of them and the shape of your
                character stops being aspirational and starts being a record.
              </p>

              <RuneRule className="mx-auto mt-8 max-w-xs" />

              <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {ATTRIBUTES.map((attribute, i) => (
                  <Tilt3D
                    as="li"
                    key={attribute.id}
                    max={10}
                    lift={-6}
                    surface="glass"
                    className="rise p-4 text-center"
                    style={{ '--rise-delay': `${i * 60}ms` }}
                  >
                    <span
                      aria-hidden="true"
                      className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl text-lg pop-2"
                      style={{
                        color: attrColor(attribute.id),
                        background: `color-mix(in srgb, ${attrColor(attribute.id)} 14%, transparent)`,
                        boxShadow: `0 0 24px -6px ${attrColor(attribute.id)}`,
                      }}
                    >
                      {attribute.glyph}
                    </span>
                    <h3 className="text-sm font-semibold text-ink pop-1">{attribute.name}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{attribute.blurb}</p>
                    <p className="mt-2 text-2xs text-faint">{attribute.example}</p>
                  </Tilt3D>
                ))}
              </ul>
            </div>
          </section>

          {/* ------------------------------ features ---------------------------- */}
          <section id="how" aria-labelledby="how-heading" className="stage px-4 py-16 sm:px-6">
            <div className="mx-auto max-w-6xl">
              <h2 id="how-heading" className="spellcast text-center text-2xl sm:text-3xl">
                How it holds together
              </h2>

              <RuneRule className="mx-auto mt-8 max-w-xs" />

              <ul className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {FEATURES.map((feature, i) => (
                  <Tilt3D
                    as="li"
                    key={feature.title}
                    max={7}
                    lift={-5}
                    surface="glass"
                    className="rise p-5"
                    style={{ '--rise-delay': `${(i % 3) * 80}ms` }}
                  >
                    <span aria-hidden="true" className="text-lg text-accent pop-1">
                      {feature.glyph}
                    </span>
                    <h3 className="mt-3 text-base font-semibold text-ink pop-1">
                      {feature.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{feature.body}</p>
                  </Tilt3D>
                ))}
              </ul>
            </div>
          </section>

          {/* -------------------------------- CTA ------------------------------- */}
          <section className="stage px-4 pb-24 pt-8 sm:px-6">
            <Tilt3D
              max={4}
              lift={-6}
              surface="glass"
              className="mx-auto max-w-3xl px-6 py-14 text-center"
            >
              <h2 className="spellcast text-2xl sm:text-3xl pop-2">
                Level one starts at fifty-five XP
              </h2>
              <p className="mx-auto mt-3 max-w-md text-muted pop-1">
                That is roughly two real things done today. You could be level two before you
                finish your coffee.
              </p>
              <Link to="/enter" className="btn-primary mt-8 px-6 py-3 text-base pop-2">
                Begin
              </Link>
            </Tilt3D>
          </section>
        </main>

        <footer className="border-t border-line px-4 py-8 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-2xs text-faint sm:flex-row">
            <p>Life RPG — a habit tracker that respects the dopamine loop.</p>
            <p>Built with React, Express, MongoDB and Firebase Auth.</p>
          </div>
        </footer>
      </div>
    </>
  );
}

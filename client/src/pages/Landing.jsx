import { Link } from 'react-router-dom';

import { ATTRIBUTES, attrColor } from '../lib/game';
import { DayPlate } from '../components/DayPlate';
import { Tilt3D, RuneRule } from '../components/Enchant';
import { HouseCrest, HOUSE_COLORS } from '../components/Crests';

/**
 * Hogwarts Home — the front page.
 *
 * Free of Framer Motion on purpose. This is the SEO-critical, first-paint
 * route, and every reveal is a CSS `.rise` whose *resting* state is the
 * finished state, so the copy is on screen even if the animation never runs.
 * The depth is CSS 3D for the same reason: it is composited off the main
 * thread, so the hero can carry a full-bleed painting and still paint fast.
 */

/* The one place the site's name lives. */
const MARK = { the: 'The', name: 'Wizarding Archives' };

/** Real-world work, in the language of the castle. */
const SUBJECTS = [
  {
    place: 'Hogwarts Library',
    real: 'Study & reading',
    body: 'Every chapter read and every hour revised is logged in the Restricted Section. Ancient Runes levels with you.',
    glyph: '📖',
  },
  {
    place: 'Charms & Arithmancy',
    real: 'Coding & deep work',
    body: 'A shipped commit is a cast spell. Arithmancy rewards the long, precise problems nobody sees you solve.',
    glyph: '✦',
  },
  {
    place: 'Quidditch Pitch',
    real: 'Fitness & training',
    body: 'Laps, lifts and long runs are pitch practice. Turn up enough and the House team is not a metaphor.',
    glyph: '🧹',
  },
  {
    place: 'Herbology',
    real: 'Wellness & rest',
    body: 'Sleep, water, a walk outside. Greenhouse Three does not care how impressive it sounds — only that you tended it.',
    glyph: '🌿',
  },
  {
    place: 'Transfiguration',
    real: 'Creative work',
    body: 'Writing, drawing, building. Turning one thing into a better thing is the whole subject.',
    glyph: '🦋',
  },
  {
    place: 'Defence Against the Dark Arts',
    real: 'The hard, avoided task',
    body: 'The chore you have rescheduled four times. Face it and the Boggart pays out more than anything else on the board.',
    glyph: '⚡',
  },
];

const HOUSES = ['gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff'];
const HOUSE_NAMES = {
  gryffindor: 'Gryffindor',
  slytherin: 'Slytherin',
  ravenclaw: 'Ravenclaw',
  hufflepuff: 'Hufflepuff',
};

function Star({ className = 'h-5 w-5' }) {
  return (
    <svg viewBox="0 0 24 24" className={`archive__star ${className}`} aria-hidden="true">
      <path
        d="M12 0.5l1.5 8.2 8.2 1.5-8.2 1.5-1.5 8.2-1.5-8.2L2.3 10.2l8.2-1.5z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function Landing() {
  return (
    <>
      <DayPlate />

      <div className="archive">
        <a href="#gate" className="sr-only-focusable btn-primary fixed left-4 top-4 z-50">
          Skip to content
        </a>

        {/* ------------------------------- bar ------------------------------- */}
        <header className="archive__bar">
          <span className="flex items-center gap-3">
            <span className="archive__sigil">9¾</span>
            <span aria-hidden="true" className="text-[0.6rem] text-[rgb(216_178_110)]">
              ◆
            </span>
            <span className="archive__eyebrow hidden sm:inline">{`${MARK.the} ${MARK.name}`}</span>
          </span>

          <nav aria-label="Account" className="flex items-center gap-3 sm:gap-5">
            <a href="#subjects" className="archive__eyebrow hidden items-center gap-2 sm:flex">
              <Star className="h-3 w-3" />
              Explore
            </a>
            <span
              aria-hidden="true"
              className="hidden h-5 w-px bg-[rgb(248_240_224_/_0.25)] sm:block"
            />
            <Link to="/enter" className="archive__pill">
              <span aria-hidden="true">⚡</span>
              Sign In
            </Link>
          </nav>
        </header>

        <main>
          {/* ------------------------------ hero ----------------------------- */}
          {/* Hero and gate share one viewport, as on the reference: the
              wordmark takes the optical centre and the gate sits on the lower
              third, so the whole invitation is visible without scrolling. */}
          <div className="flex min-h-[calc(100dvh-5.2rem)] flex-col">
          <section className="stage flex flex-1 flex-col items-center justify-center px-4 text-center">
            <Star className="rise mx-auto h-6 w-6" />

            <p className="rise archive__the mt-5" style={{ '--rise-delay': '60ms' }}>
              {MARK.the}
            </p>

            <h1
              className="rise archive__title mt-2 max-w-[15ch]"
              style={{ '--rise-delay': '110ms' }}
            >
              {MARK.name}
            </h1>

            <p className="rise archive__tagline mt-5" style={{ '--rise-delay': '170ms' }}>
              Discover the magic within.
            </p>

            <div className="rise archive__rule mt-6" style={{ '--rise-delay': '210ms' }}>
              <Star className="h-3 w-3" />
            </div>
          </section>

          {/* ------------------------------ gate ----------------------------- */}
          <section id="gate" className="stage-near px-4 pb-10">
            <Tilt3D
              max={6}
              lift={-5}
              surface="archive__gate"
              radius="rounded-[1.1rem]"
              className="mx-auto w-full max-w-md px-7 py-7 text-center"
            >
              <Star className="mx-auto h-4 w-4 pop-1" />

              <h2 className="archive__gate-title mt-3 pop-2">Enter the Archives</h2>

              <p className="archive__gate-sub mt-2 pop-1">
                Discover &middot; Explore &middot; Belong
              </p>

              <div
                aria-hidden="true"
                className="mx-auto mt-5 h-px w-full bg-[linear-gradient(to_right,transparent,rgb(248_240_224_/_0.35),transparent)]"
              />

              <Link
                to="/enter"
                aria-label="Enter the Archives — create your character"
                className="archive__enter mx-auto mt-5 pop-2"
              >
                <span aria-hidden="true">→</span>
              </Link>
            </Tilt3D>

            <p className="mt-4 text-center text-2xs text-[rgb(248_240_224_/_0.65)]">
              Free. No credit card. Sorted in under a minute.
            </p>
          </section>
          </div>

          {/* ---------------------------- subjects --------------------------- */}
          <section
            id="subjects"
            aria-labelledby="subjects-heading"
            className="stage bg-void px-4 py-20 sm:px-6"
          >
            <div className="mx-auto max-w-6xl">
              <p className="text-center text-2xs font-semibold uppercase tracking-[0.28em] text-accent">
                The Curriculum
              </p>
              <h2 id="subjects-heading" className="spellcast mt-3 text-center text-2xl sm:text-3xl">
                Your week, on the timetable
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-center text-muted">
                Nothing here asks you to invent new habits. It takes the ones you already have and
                files them under the subject that fits — so the gym is Quidditch practice and the
                thing you have been avoiding is a Boggart worth real Galleons.
              </p>

              <RuneRule className="mx-auto mt-8 max-w-xs" />

              <ul className="mt-10 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {SUBJECTS.map((subject, i) => (
                  <Tilt3D
                    as="li"
                    key={subject.place}
                    max={8}
                    lift={-6}
                    surface="glass"
                    className="rise p-5"
                    style={{ '--rise-delay': `${(i % 3) * 80}ms` }}
                  >
                    <span aria-hidden="true" className="pop-2 text-2xl">
                      {subject.glyph}
                    </span>
                    <h3 className="pop-1 mt-3 font-display text-base font-semibold text-ink">
                      {subject.place}
                    </h3>
                    <p className="mt-0.5 text-2xs font-semibold uppercase tracking-[0.14em] text-accent">
                      {subject.real}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{subject.body}</p>
                  </Tilt3D>
                ))}
              </ul>
            </div>
          </section>

          {/* ----------------------------- houses ---------------------------- */}
          <section
            aria-labelledby="houses-heading"
            className="stage bg-void px-4 py-20 sm:px-6"
          >
            <div className="mx-auto max-w-5xl">
              <p className="text-center text-2xs font-semibold uppercase tracking-[0.28em] text-accent">
                The Sorting
              </p>
              <h2 id="houses-heading" className="spellcast mt-3 text-center text-2xl sm:text-3xl">
                Four houses, one point board
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-center text-muted">
                Every quest you clear awards House Points as well as experience. Your house standing
                is the one number you do not earn alone.
              </p>

              <ul className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-4">
                {HOUSES.map((house, i) => (
                  <Tilt3D
                    as="li"
                    key={house}
                    max={11}
                    lift={-7}
                    surface="glass"
                    className="rise p-5 text-center"
                    style={{ '--rise-delay': `${i * 70}ms` }}
                  >
                    <span className="pop-3 mx-auto block w-14">
                      <HouseCrest
                        house={house}
                        id={`land-${house}`}
                        field={HOUSE_COLORS[house].field}
                        charge={HOUSE_COLORS[house].charge}
                        className="h-auto w-full"
                      />
                    </span>
                    <h3 className="pop-1 mt-3 font-display text-sm font-semibold text-ink">
                      {HOUSE_NAMES[house]}
                    </h3>
                  </Tilt3D>
                ))}
              </ul>
            </div>
          </section>

          {/* --------------------------- attributes -------------------------- */}
          <section
            aria-labelledby="attrs-heading"
            className="stage bg-void px-4 pb-20 sm:px-6"
          >
            <div className="mx-auto max-w-6xl">
              <h2 id="attrs-heading" className="spellcast text-center text-2xl sm:text-3xl">
                Six disciplines
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-center text-muted">
                Each quest names what it trains. Complete enough of them and your character sheet
                stops being aspirational and starts being a record.
              </p>

              <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ATTRIBUTES.map((attribute, i) => (
                  <Tilt3D
                    as="li"
                    key={attribute.id}
                    max={9}
                    lift={-5}
                    surface="glass"
                    className="rise flex items-start gap-3.5 p-4"
                    style={{ '--rise-delay': `${(i % 3) * 60}ms` }}
                  >
                    <span
                      aria-hidden="true"
                      className="pop-2 grid h-11 w-11 shrink-0 place-items-center rounded-xl text-lg"
                      style={{
                        color: attrColor(attribute.id),
                        background: `color-mix(in srgb, ${attrColor(attribute.id)} 14%, transparent)`,
                        boxShadow: `0 0 24px -6px ${attrColor(attribute.id)}`,
                      }}
                    >
                      {attribute.glyph}
                    </span>
                    <div className="min-w-0">
                      <h3 className="pop-1 text-sm font-semibold text-ink">{attribute.name}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-muted">{attribute.blurb}</p>
                    </div>
                  </Tilt3D>
                ))}
              </ul>
            </div>
          </section>

          {/* ------------------------------- CTA ----------------------------- */}
          <section className="stage bg-void px-4 pb-24 sm:px-6">
            <Tilt3D
              max={4}
              lift={-6}
              surface="glass"
              className="mx-auto max-w-3xl px-6 py-14 text-center"
            >
              <h2 className="spellcast pop-2 text-2xl sm:text-3xl">The Sorting Hat is waiting</h2>
              <p className="pop-1 mx-auto mt-3 max-w-md text-muted">
                Level one costs fifty-five experience — about two real things done today. You could
                be level two before your tea goes cold.
              </p>
              <Link to="/enter" className="btn-primary pop-2 mt-8 px-6 py-3 text-base">
                Begin
              </Link>
            </Tilt3D>
          </section>
        </main>

        <footer className="border-t border-line bg-void px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-6xl space-y-3 text-center text-2xs text-faint">
            <p>
              A fan-made project, unaffiliated with and unendorsed by Warner Bros. or J.K. Rowling.
              All artwork here is original; no official assets are reproduced.
            </p>
            <p>Built with React, Express, MongoDB and Firebase Auth.</p>
          </div>
        </footer>
      </div>
    </>
  );
}

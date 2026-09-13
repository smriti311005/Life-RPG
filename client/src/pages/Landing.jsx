import { Link } from 'react-router-dom';

import { CinemaBackdrop } from '../components/CinemaBackdrop';
import { Tilt3D, RuneRule } from '../components/Enchant';
import { ArchiveBar } from '../components/ArchiveBar';
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
  },
  {
    place: 'Charms & Arithmancy',
    real: 'Coding & deep work',
    body: 'A shipped commit is a cast spell. Arithmancy rewards the long, precise problems nobody sees you solve.',
  },
  {
    place: 'Quidditch Pitch',
    real: 'Fitness & training',
    body: 'Laps, lifts and long runs are pitch practice. Turn up enough and the House team is not a metaphor.',
  },
  {
    place: 'Herbology',
    real: 'Wellness & rest',
    body: 'Sleep, water, a walk outside. Greenhouse Three does not care how impressive it sounds — only that you tended it.',
  },
  {
    place: 'Transfiguration',
    real: 'Creative work',
    body: 'Writing, drawing, building. Turning one thing into a better thing is the whole subject.',
  },
  {
    place: 'Defence Against the Dark Arts',
    real: 'The hard, avoided task',
    body: 'The chore you have rescheduled four times. Face it and the Boggart pays out more than anything else on the board.',
  },
];

const HOUSES = ['gryffindor', 'slytherin', 'ravenclaw', 'hufflepuff'];
const HOUSE_NAMES = {
  gryffindor: 'Gryffindor',
  slytherin: 'Slytherin',
  ravenclaw: 'Ravenclaw',
  hufflepuff: 'Hufflepuff',
};

export default function Landing() {
  return (
    <>
      {/* The sharp cut: on the front page the castle is the product shot. */}
      <CinemaBackdrop variant="wide" />

      <div className="archive">
        <a href="#gate" className="sr-only-focusable btn-primary fixed left-4 top-4 z-50">
          Skip to content
        </a>

        <ArchiveBar name={MARK.name} tagline="Discover the magic within." />

        <main>
          {/* ------------------------------ hero ----------------------------- */}
          <div className="flex min-h-[calc(100dvh-7.5rem)] flex-col items-center justify-center">
            <section className="stage flex flex-col items-center justify-center px-4 text-center my-auto">
              <p className="rise archive__the" style={{ '--rise-delay': '60ms' }}>
                {MARK.the}
              </p>

              <h1
                className="rise archive__title mt-3 max-w-[14ch]"
                style={{ '--rise-delay': '110ms' }}
              >
                {MARK.name}
              </h1>

              <p className="rise archive__tagline mt-5" style={{ '--rise-delay': '170ms' }}>
                Discover the magic within.
              </p>

              <div className="rise archive__rule mt-7" style={{ '--rise-delay': '210ms' }} />
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
                    <h3 className="pop-1 font-display text-base font-semibold text-ink">
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

          {/* ------------------------------- CTA ----------------------------- */}
          <section className="stage bg-void px-4 pb-24 sm:px-6">
            <Tilt3D
              max={4}
              lift={-6}
              surface="glass"
              className="relative mx-auto max-w-4xl overflow-hidden px-8 py-16 text-center sm:px-12 sm:py-20"
            >
              <div
                className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-15 mix-blend-luminosity"
                style={{ backgroundImage: "url('/media/hogwarts-crest-wood.png')" }}
                aria-hidden="true"
              />
              <div className="relative z-10">
                <h2 className="spellcast pop-2 text-2xl sm:text-3xl lg:text-4xl">The Sorting Hat is waiting</h2>
                <p className="pop-1 mx-auto mt-4 max-w-lg text-sm text-muted sm:text-base">
                  Level one costs fifty-five experience — about two real things done today. You could
                  be level two before your tea goes cold.
                </p>
                <Link to="/enter" className="btn-primary pop-2 mt-8 inline-block px-8 py-3.5 text-base shadow-lg shadow-amber-950/30">
                  Begin
                </Link>
              </div>
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

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

import { HouseCrest, HOUSE_COLORS } from '../Crests';
import { Icon } from './DashboardShell';
import {
  ACHIEVEMENTS,
  ACTIVITY,
  CURRENT_LESSON,
  HOUSE_STANDINGS,
  OWL_POST,
  STUDY_STATS,
  SUBJECTS,
} from '../../lib/dashboardData';

/**
 * The dashboard's panels.
 *
 * Each takes the data it renders as a prop where that data is real, and
 * imports it from `dashboardData` where it is not yet — so the boundary
 * between "wired up" and "waiting for an endpoint" is visible at a glance.
 */

/* A single entrance, staggered by index, rather than a per-panel animation.
 * The page should assemble itself once, not perform. */
export const enter = (i = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay: Math.min(i * 0.06, 0.42), ease: [0.22, 1, 0.36, 1] },
});

function Panel({ title, action, children, className = '', id, index = 0 }) {
  return (
    <motion.section
      id={id}
      className={`dash-panel ${className}`}
      aria-labelledby={title ? `${id}-h` : undefined}
      {...enter(index)}
    >
      {title ? (
        <header className="dash-panel__head">
          <h2 id={`${id}-h`} className="dash-panel__title">
            {title}
          </h2>
          {action}
        </header>
      ) : null}
      {children}
    </motion.section>
  );
}

/* -------------------------------------------------------------------------- */
/* Welcome                                                                    */
/* -------------------------------------------------------------------------- */

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Still awake';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function WelcomeSection({ name, rank, level }) {
  return (
    <motion.section className="dash-welcome" {...enter(0)}>
      <p className="dash-welcome__eyebrow">
        {greeting()} · {rank ?? 'Adept'}
      </p>
      <h1 className="dash-welcome__title">
        Welcome back, <span>{name}</span>
      </h1>
      <p className="dash-welcome__sub">Your magical journey continues…</p>
      {level ? <p className="dash-welcome__level">Year {Math.min(7, Math.ceil(level / 3))} · Level {level}</p> : null}
    </motion.section>
  );
}

/* -------------------------------------------------------------------------- */
/* Continue your journey                                                      */
/* -------------------------------------------------------------------------- */

export function ContinueJourney({ lesson = CURRENT_LESSON, onContinue }) {
  return (
    <Panel id="continue" index={1} className="dash-continue">
      <div className="dash-continue__body">
        <p className="dash-panel__eyebrow">Continue your journey</p>
        <h2 className="dash-continue__subject">{lesson.subject}</h2>
        <p className="dash-continue__chapter">
          {lesson.chapter} — {lesson.title}
        </p>

        <div className="dash-continue__meter">
          <div className="dash-bar" role="progressbar" aria-valuenow={lesson.percent} aria-valuemin={0} aria-valuemax={100} aria-label={`${lesson.subject} progress`}>
            <motion.span
              className="dash-bar__fill"
              initial={{ width: 0 }}
              animate={{ width: `${lesson.percent}%` }}
              transition={{ duration: 1.1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <span className="dash-continue__pct numeric">{lesson.percent}%</span>
        </div>

        <p className="dash-continue__meta">
          Last opened {lesson.lastAccessed} · about {lesson.minutesLeft} minutes left
        </p>
      </div>

      <button type="button" className="dash-cta" onClick={onContinue}>
        Continue <span aria-hidden="true">→</span>
      </button>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/* Magical progress                                                           */
/* -------------------------------------------------------------------------- */

/** The overall dial. SVG, so it stays crisp and animates on the compositor. */
function Dial({ percent, label, sub }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="dash-dial">
      <svg viewBox="0 0 120 120" className="h-32 w-32">
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgb(var(--dash-line))" strokeWidth="8" />
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="url(#dash-dial-grad)"
          strokeWidth="8"
          strokeLinecap="round"
          transform="rotate(-90 60 60)"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - percent / 100) }}
          transition={{ duration: 1.3, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
        />
        <defs>
          <linearGradient id="dash-dial-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgb(var(--dash-gold))" />
            <stop offset="100%" stopColor="rgb(var(--dash-accent))" />
          </linearGradient>
        </defs>
      </svg>
      <div className="dash-dial__centre">
        <span className="numeric">{percent}%</span>
        <small>{label}</small>
      </div>
      {sub ? <p className="dash-dial__sub">{sub}</p> : null}
    </div>
  );
}

function Stat({ value, label, tone }) {
  return (
    <div className="dash-stat" data-tone={tone}>
      <span className="dash-stat__value numeric">{value}</span>
      <span className="dash-stat__label">{label}</span>
    </div>
  );
}

export function MagicalProgress({ character, housePoints }) {
  const lessons = STUDY_STATS;
  const overall = Math.round((lessons.lessonsCompleted / lessons.lessonsTotal) * 100);

  return (
    <Panel id="progress" title="Magical Progress" index={2}>
      <div className="dash-progress">
        <Dial
          percent={overall}
          label="overall"
          sub={`${lessons.lessonsCompleted} of ${lessons.lessonsTotal} lessons`}
        />

        <div className="dash-progress__stats">
          <Stat value={lessons.lessonsCompleted} label="Lessons completed" tone="gold" />
          <Stat value={(character?.xp ?? 0).toLocaleString()} label="Magical XP" tone="lilac" />
          <Stat value={character?.level ?? 1} label="Current level" tone="azure" />
          <Stat value={`${character?.streak?.current ?? 0}d`} label="Learning streak" tone="crimson" />
          <Stat value={housePoints.toLocaleString()} label="House points" tone="emerald" />
          <Stat value={(character?.gold ?? 0).toLocaleString()} label="Galleons" tone="amber" />
        </div>
      </div>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/* House                                                                      */
/* -------------------------------------------------------------------------- */

export function HouseCard({ house }) {
  const tincture = HOUSE_COLORS[house.key] ?? HOUSE_COLORS.hogwarts;

  return (
    <Panel id="house" title="Your House" index={3}>
      <div className="dash-house">
        <span className="dash-house__crest">
          <HouseCrest
            house={house.key}
            id={`dash-${house.key}`}
            field={tincture.field}
            charge={tincture.charge}
            className="h-auto w-full"
          />
        </span>

        <div className="min-w-0">
          <h3 className="dash-house__name">{house.name}</h3>
          <p className="dash-house__blurb">{house.blurb}</p>

          <dl className="dash-house__figures">
            <div>
              <dt>House points</dt>
              <dd className="numeric">{house.points.toLocaleString()}</dd>
            </div>
            <div>
              <dt>Standing</dt>
              <dd className="numeric">
                {house.rank}
                <span className="dash-house__of"> of 4</span>
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <ol className="dash-standings">
        {HOUSE_STANDINGS.map((row, i) => {
          const lead = HOUSE_STANDINGS[0].points;
          return (
            <li key={row.key} data-mine={row.key === house.key}>
              <span className="dash-standings__rank numeric">{i + 1}</span>
              <span className="dash-standings__name">{row.name}</span>
              <span className="dash-standings__bar">
                <motion.i
                  initial={{ width: 0 }}
                  animate={{ width: `${(row.points / lead) * 100}%` }}
                  transition={{ duration: 0.9, delay: 0.4 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  style={{ background: HOUSE_COLORS[row.key]?.charge }}
                />
              </span>
              <span className="dash-standings__pts numeric">{row.points}</span>
            </li>
          );
        })}
      </ol>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/* Subjects                                                                   */
/* -------------------------------------------------------------------------- */

export function SubjectsGrid({ onOpen }) {
  return (
    <Panel
      id="subjects"
      title="Your Subjects"
      index={4}
      action={<span className="dash-panel__count numeric">{SUBJECTS.length}</span>}
    >
      <ul className="dash-subjects">
        {SUBJECTS.map((subject) => (
          <li key={subject.id}>
            <button
              type="button"
              onClick={() => onOpen(subject)}
              className="dash-subject"
              data-tone={subject.tone}
            >
              <span className="dash-subject__top">
                <span className="dash-subject__name">{subject.name}</span>
                <span className="dash-subject__pct numeric">
                  {subject.started ? `${subject.percent}%` : 'New'}
                </span>
              </span>
              <span className="dash-subject__blurb">{subject.blurb}</span>
              <span className="dash-bar dash-bar--thin">
                <motion.span
                  className="dash-bar__fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${subject.percent}%` }}
                  transition={{ duration: 0.9, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
                />
              </span>
              <span className="dash-subject__go">
                {subject.started ? 'Continue' : 'Explore'} <span aria-hidden="true">→</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/* Achievements                                                               */
/* -------------------------------------------------------------------------- */

const SIGILS = {
  wand: 'M5 19L17 7M15 5l4 4',
  book: 'M5 5h6v14H5zM13 5h6v14h-6z',
  flask: 'M10 3v6l-4 8a2 2 0 0 0 2 3h8a2 2 0 0 0 2-3l-4-8V3M9 3h6',
  flame: 'M12 21c3.3 0 6-2.4 6-5.5 0-4-4-5.5-3-10.5-3 1-6 4.5-6 8 0-1.5-1-2.5-1-2.5-1 1.5-2 3-2 5C6 18.6 8.7 21 12 21z',
  shield: 'M12 3l8 2.5v6c0 4.6-3.4 8-8 9.5-4.6-1.5-8-4.9-8-9.5v-6z',
  key: 'M15 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM14 11l6 6-2 2-1.5-1.5M17.5 16.5L16 18',
};

export function AchievementsPanel({ onOpen }) {
  const unlocked = ACHIEVEMENTS.filter((a) => a.unlocked).length;

  return (
    <Panel
      id="achievements"
      title="Magical Achievements"
      index={5}
      action={
        <span className="dash-panel__count numeric">
          {unlocked}/{ACHIEVEMENTS.length}
        </span>
      }
    >
      <ul className="dash-awards">
        {ACHIEVEMENTS.map((award) => (
          <li key={award.id}>
            <button
              type="button"
              onClick={() => onOpen(award)}
              className="dash-award"
              data-unlocked={award.unlocked}
              aria-label={`${award.name}${award.unlocked ? '' : ' — locked'}. ${award.hint}`}
            >
              <span className="dash-award__seal">
                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
                  <path
                    d={SIGILS[award.sigil]}
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="dash-award__name">{award.name}</span>
              {!award.unlocked ? <span className="dash-award__lock">Locked</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/* Activity                                                                   */
/* -------------------------------------------------------------------------- */

const ACTIVITY_ICON = { lesson: 'book', points: 'crest', award: 'medal', profile: 'user' };

export function ActivityTimeline() {
  return (
    <Panel id="activity" title="Recent Magical Activity" index={6}>
      <ol className="dash-timeline">
        {ACTIVITY.map((entry) => (
          <li key={entry.id}>
            <span className="dash-timeline__node" aria-hidden="true">
              <Icon name={ACTIVITY_ICON[entry.kind] ?? 'book'} className="h-3.5 w-3.5" />
            </span>
            <span className="dash-timeline__text">{entry.text}</span>
            <span className="dash-timeline__when">{entry.when}</span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

/* -------------------------------------------------------------------------- */
/* Owl Post                                                                   */
/* -------------------------------------------------------------------------- */

export function OwlPostPanel() {
  const [letters, setLetters] = useState(OWL_POST);

  return (
    <Panel
      id="owl"
      title="Owl Post"
      index={7}
      action={
        <Link to="/chronicle" className="dash-panel__more">
          View all →
        </Link>
      }
    >
      <ul className="dash-post">
        {letters.map((letter) => (
          <li key={letter.id}>
            <button
              type="button"
              className="dash-post__item"
              data-unread={letter.unread}
              onClick={() =>
                setLetters((list) =>
                  list.map((l) => (l.id === letter.id ? { ...l, unread: false } : l)),
                )
              }
            >
              <span className="dash-post__seal" aria-hidden="true">
                <Icon name="owl" className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="dash-post__from">{letter.from}</span>
                <span className="dash-post__text">{letter.text}</span>
              </span>
              <span className="dash-post__when">{letter.when}</span>
            </button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

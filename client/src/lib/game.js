/**
 * Presentation metadata for the game's fixed vocabulary.
 *
 * The server owns the rules; this file owns only how they are *worded and
 * coloured*. Ids here must match the server enums in `server/src/game/`.
 */

export const ATTRIBUTES = [
  {
    id: 'strength',
    name: 'Strength',
    short: 'STR',
    glyph: '⚔',
    blurb: 'The gym, heavy work, effort.',
    example: 'e.g. a heavy set, a hard session',
    hue: 4,
  },
  {
    id: 'intelligence',
    name: 'Intelligence',
    short: 'INT',
    glyph: '✦',
    blurb: 'Code, study, problems solved.',
    example: 'e.g. a lesson, a bug fixed',
    hue: 265,
  },
  {
    id: 'agility',
    name: 'Agility',
    short: 'AGI',
    glyph: '➤',
    blurb: 'Running, moving, distance.',
    example: 'e.g. a 5k, a swim, the stairs',
    hue: 175,
  },
  {
    id: 'vitality',
    name: 'Vitality',
    short: 'VIT',
    glyph: '❦',
    blurb: 'Sleep, food, upkeep.',
    example: 'e.g. an early night, a real meal',
    hue: 145,
  },
  {
    id: 'wisdom',
    name: 'Wisdom',
    short: 'WIS',
    glyph: '☾',
    blurb: 'Reading, reflection, judgement.',
    example: 'e.g. ten pages, journalling',
    hue: 215,
  },
  {
    id: 'charisma',
    name: 'Charisma',
    short: 'CHA',
    glyph: '✧',
    blurb: 'People and bridges kept.',
    example: 'e.g. a call home, a reply owed',
    hue: 38,
  },
];

export const ATTRIBUTE_MAP = Object.fromEntries(ATTRIBUTES.map((a) => [a.id, a]));

export const CLASSES = [
  {
    id: 'warrior',
    name: 'Warrior',
    glyph: '⚔',
    focus: 'strength',
    tagline: 'Strength through repetition.',
    blurb:
      'You show up when it is cold and you do not feel like it. Training, lifting, the work that leaves marks.',
  },
  {
    id: 'scholar',
    name: 'Scholar',
    glyph: '✦',
    focus: 'intelligence',
    tagline: 'The long problem, held.',
    blurb:
      'You would rather understand a thing than finish it quickly. Code, study, the hours that leave no visible trace.',
  },
  {
    id: 'explorer',
    name: 'Explorer',
    glyph: '➤',
    focus: 'agility',
    tagline: 'Movement, distance, air.',
    blurb:
      'You measure a good day in ground covered. Running, swimming, the restlessness that needs somewhere to go.',
  },
  {
    id: 'guardian',
    name: 'Guardian',
    glyph: '❦',
    focus: 'vitality',
    tagline: 'The quiet upkeep of a life.',
    blurb:
      'You know that sleep, food and a tidy room are not small things. The work that holds everything else up.',
  },
];

export const CLASS_MAP = Object.fromEntries(CLASSES.map((c) => [c.id, c]));

export const DIFFICULTIES = [
  { id: 'trivial', name: 'Trivial', xp: 12, gold: 4, hint: 'Two minutes.' },
  { id: 'easy', name: 'Easy', xp: 25, gold: 9, hint: 'A quarter hour.' },
  { id: 'normal', name: 'Normal', xp: 45, gold: 18, hint: 'Real effort.' },
  { id: 'hard', name: 'Hard', xp: 80, gold: 34, hint: 'You will feel it.' },
  { id: 'epic', name: 'Epic', xp: 140, gold: 62, hint: 'The big one.' },
];

export const DIFFICULTY_MAP = Object.fromEntries(DIFFICULTIES.map((d) => [d.id, d]));

export const TIER_STYLE = {
  bronze: { name: 'Bronze', color: 'hsl(28 62% 58%)' },
  silver: { name: 'Silver', color: 'hsl(210 14% 74%)' },
  gold: { name: 'Gold', color: 'hsl(42 82% 62%)' },
  mythic: { name: 'Mythic', color: 'hsl(280 78% 72%)' },
};

/**
 * CSS colour for an attribute.
 *
 * Returns a custom property rather than a literal, so the colour flips with
 * light/dark mode. A pastel that reads well on near-black is unreadable on
 * white, and these carry meaning — they are how a quest's attribute is
 * identified at a glance.
 */
export const attrColor = (id) =>
  `var(--attr-${ATTRIBUTE_MAP[id] ? id : 'intelligence'})`;

export const CADENCES = [
  {
    id: 'once',
    name: 'One-off',
    hint: 'A single quest. Completing it retires it for good.',
  },
  {
    id: 'daily',
    name: 'Daily',
    hint: 'Returns every morning and feeds your streak.',
  },
];

/** Used for the quest composer's suggestion chips on an empty board. */
export const STARTER_QUESTS = [
  { title: 'Walk for twenty minutes', attribute: 'agility', difficulty: 'easy', cadence: 'daily' },
  { title: 'Read ten pages', attribute: 'wisdom', difficulty: 'easy', cadence: 'daily' },
  { title: 'Drink a glass of water on waking', attribute: 'vitality', difficulty: 'trivial', cadence: 'daily' },
  { title: 'Train for forty minutes', attribute: 'strength', difficulty: 'hard', cadence: 'daily' },
  { title: 'Ship one real commit', attribute: 'intelligence', difficulty: 'normal', cadence: 'daily' },
  { title: 'Message someone you have been meaning to', attribute: 'charisma', difficulty: 'normal', cadence: 'once' },
];

/** Compact number formatting: 1,240 stays, 12,400 becomes 12.4k. */
export const fmt = (n) => {
  const value = Number(n) || 0;
  if (value < 10_000) return value.toLocaleString();
  if (value < 1_000_000) return `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}m`;
};

export const pct = (value, total) =>
  total <= 0 ? 0 : Math.min(100, Math.max(0, (value / total) * 100));

/**
 * Dashboard content.
 *
 * Everything the dashboard shows that the server does not yet know about
 * lives here, in the shape an API would return it. Each export is a plain
 * array or object with stable ids, so swapping a constant for a fetch later
 * is a one-line change in the component that reads it — no re-shaping.
 *
 * What is NOT here, because it is real: the player's name, level, experience,
 * streak, Galleons and house all come from `useGame().character`.
 */

/* -------------------------------------------------------------------------- */
/* Lessons                                                                    */
/* -------------------------------------------------------------------------- */

/** The one the dashboard opens on. Would be `GET /api/lessons/current`. */
export const CURRENT_LESSON = {
  id: 'dada-3',
  subject: 'Defence Against the Dark Arts',
  chapter: 'Chapter III',
  title: 'The Protective Charm',
  percent: 72,
  lastAccessed: 'Yesterday, 9:40 pm',
  minutesLeft: 14,
};

/* -------------------------------------------------------------------------- */
/* Subjects                                                                   */
/* -------------------------------------------------------------------------- */

/** `GET /api/subjects`. `tone` keys into the palette in the stylesheet. */
export const SUBJECTS = [
  {
    id: 'charms',
    name: 'Charms',
    blurb: 'Precision work. The wand movement matters more than the words.',
    percent: 64,
    tone: 'lilac',
    started: true,
  },
  {
    id: 'potions',
    name: 'Potions',
    blurb: 'Patience, measured in stirs. Nothing here rewards hurry.',
    percent: 38,
    tone: 'emerald',
    started: true,
  },
  {
    id: 'dada',
    name: 'Defence Against the Dark Arts',
    blurb: 'The subject that assumes something is coming for you.',
    percent: 72,
    tone: 'crimson',
    started: true,
  },
  {
    id: 'transfiguration',
    name: 'Transfiguration',
    blurb: 'Turning one true thing into another without losing either.',
    percent: 21,
    tone: 'azure',
    started: true,
  },
  {
    id: 'herbology',
    name: 'Herbology',
    blurb: 'Greenhouse Three. Gloves on, and mind the Mandrakes.',
    percent: 55,
    tone: 'moss',
    started: true,
  },
  {
    id: 'astronomy',
    name: 'Astronomy',
    blurb: 'Midnight on the tower, charting what was already there.',
    percent: 0,
    tone: 'indigo',
    started: false,
  },
  {
    id: 'history',
    name: 'History of Magic',
    blurb: 'Goblin rebellions, in order. Stay awake for this one.',
    percent: 12,
    tone: 'amber',
    started: true,
  },
];

/* -------------------------------------------------------------------------- */
/* Achievements                                                               */
/* -------------------------------------------------------------------------- */

/** `GET /api/achievements`. `sigil` is drawn, not an image asset. */
export const ACHIEVEMENTS = [
  { id: 'first-spell', name: 'First Spell', hint: 'Complete your first lesson.', sigil: 'wand', unlocked: true },
  { id: 'knowledge-seeker', name: 'Knowledge Seeker', hint: 'Finish ten chapters.', sigil: 'book', unlocked: true },
  { id: 'potion-apprentice', name: 'Potion Apprentice', hint: 'Reach 30% in Potions.', sigil: 'flask', unlocked: true },
  { id: 'streak-7', name: '7-Day Streak', hint: 'Study seven days running.', sigil: 'flame', unlocked: true },
  { id: 'dark-arts-defender', name: 'Dark Arts Defender', hint: 'Complete Defence Against the Dark Arts.', sigil: 'shield', unlocked: false },
  { id: 'archive-explorer', name: 'Archive Explorer', hint: 'Open fifty archive entries.', sigil: 'key', unlocked: false },
];

/* -------------------------------------------------------------------------- */
/* Activity                                                                   */
/* -------------------------------------------------------------------------- */

/** `GET /api/activity?limit=5`. Newest first. */
export const ACTIVITY = [
  { id: 'a1', kind: 'lesson', text: 'Completed Charms — Chapter II', when: '2 hours ago' },
  { id: 'a2', kind: 'points', text: 'Earned 50 House Points', when: '5 hours ago' },
  { id: 'a3', kind: 'award', text: 'Unlocked “Potion Apprentice”', when: 'Yesterday' },
  { id: 'a4', kind: 'lesson', text: 'Started Defence Against the Dark Arts', when: 'Yesterday' },
  { id: 'a5', kind: 'profile', text: 'Updated Wizard Profile', when: '3 days ago' },
];

/* -------------------------------------------------------------------------- */
/* Owl Post                                                                   */
/* -------------------------------------------------------------------------- */

/** `GET /api/owl-post`. `unread` drives the dot on the navbar button. */
export const OWL_POST = [
  { id: 'o1', from: 'Professor McGonagall', text: 'A new Transfiguration lesson is waiting for you.', when: '20m', unread: true },
  { id: 'o2', from: 'Head of House', text: 'You earned 20 House Points for Charms.', when: '3h', unread: true },
  { id: 'o3', from: 'Astronomy Tower', text: 'Your Astronomy lesson begins at midnight.', when: '1d', unread: false },
];

/* -------------------------------------------------------------------------- */
/* Houses                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * The house a character belongs to is real — it is their chosen class — so
 * this only supplies the description and standings the server has no field
 * for. Keyed by the class id already stored on every character.
 */
export const HOUSE_BY_CLASS = {
  warrior: {
    key: 'gryffindor',
    name: 'Gryffindor',
    blurb: 'Known for courage, determination and a certain disregard for the rules.',
    points: 742,
    rank: 2,
  },
  scholar: {
    key: 'ravenclaw',
    name: 'Ravenclaw',
    blurb: 'Wit, curiosity, and the patience to sit with a hard problem.',
    points: 806,
    rank: 1,
  },
  explorer: {
    key: 'slytherin',
    name: 'Slytherin',
    blurb: 'Ambition, resourcefulness, and the will to see a thing through.',
    points: 689,
    rank: 3,
  },
  guardian: {
    key: 'hufflepuff',
    name: 'Hufflepuff',
    blurb: 'Patience, loyalty, and an honest appetite for unglamorous work.',
    points: 634,
    rank: 4,
  },
};

/** Standings for the house panel. Would be `GET /api/houses/standings`. */
export const HOUSE_STANDINGS = [
  { key: 'ravenclaw', name: 'Ravenclaw', points: 806 },
  { key: 'gryffindor', name: 'Gryffindor', points: 742 },
  { key: 'slytherin', name: 'Slytherin', points: 689 },
  { key: 'hufflepuff', name: 'Hufflepuff', points: 634 },
];

/* -------------------------------------------------------------------------- */
/* Progress                                                                   */
/* -------------------------------------------------------------------------- */

/** The counts the character record has no column for, yet. */
export const STUDY_STATS = {
  lessonsCompleted: 34,
  lessonsTotal: 61,
  archiveEntriesRead: 128,
};

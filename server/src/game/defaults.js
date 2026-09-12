/**
 * The shipped game content.
 *
 * This file is a *seed source*, not a runtime source. `npm run seed:game`
 * upserts it into MongoDB, and everything at runtime reads from the database
 * via `services/gameData.js`. Editing a value here changes what a fresh
 * install gets; editing the document in Mongo changes a running one.
 *
 * Achievements name a `metric` rather than carrying a function — see the note
 * at the top of `models/GameData.js` for why.
 */

export const ATTRIBUTES = [
  {
    id: 'strength',
    name: 'Quidditch',
    short: 'QUI',
    blurb: 'The pitch, the gym, anything that asks the body for effort.',
    example: 'e.g. a heavy set, a long carry, a hard session',
    glyph: '\u26a1',
    hue: 4,
    order: 0,
  },
  {
    id: 'intelligence',
    name: 'Arithmancy',
    short: 'ARI',
    blurb: 'Code, numbers, problems held until they give way.',
    example: 'e.g. a lesson, a bug fixed, a chapter of theory',
    glyph: '\u2726',
    hue: 265,
    order: 1,
  },
  {
    id: 'agility',
    name: 'Flying',
    short: 'FLY',
    blurb: 'Running, moving, the quick and repeated.',
    example: 'e.g. a 5k, a swim, stairs instead of the lift',
    glyph: '\u27a4',
    hue: 175,
    order: 2,
  },
  {
    id: 'vitality',
    name: 'Herbology',
    short: 'HRB',
    blurb: 'Sleep, food, water, the upkeep of a living thing.',
    example: 'e.g. an early night, a real meal, the dishes',
    glyph: '\u2766',
    hue: 145,
    order: 3,
  },
  {
    id: 'wisdom',
    name: 'Ancient Runes',
    short: 'RUN',
    blurb: 'Reading, reflection, the slow accumulation of judgement.',
    example: 'e.g. ten pages, journalling, sitting quietly',
    glyph: '\u263e',
    hue: 215,
    order: 4,
  },
  {
    id: 'charisma',
    name: 'Care of Magical Creatures',
    short: 'CMC',
    blurb: 'People, messages kept, bridges built and not burned.',
    example: 'e.g. a call home, a reply owed, an introduction made',
    glyph: '\u2727',
    hue: 38,
    order: 5,
  },
];

export const DIFFICULTIES = [
  { id: 'trivial', name: 'Trivial', xp: 12, gold: 4, rank: 0, hint: 'Two minutes.', order: 0 },
  { id: 'easy', name: 'Easy', xp: 25, gold: 9, rank: 1, hint: 'A quarter hour.', order: 1 },
  { id: 'normal', name: 'Standard', xp: 45, gold: 18, rank: 2, hint: 'Real effort.', order: 2 },
  { id: 'hard', name: 'N.E.W.T.', xp: 80, gold: 34, rank: 3, hint: 'You will feel it.', order: 3 },
  { id: 'epic', name: 'Triwizard', xp: 140, gold: 62, rank: 4, hint: 'The big one.', order: 4 },
];

export const CLASSES = [
  {
    id: 'warrior',
    name: 'Gryffindor',
    glyph: '\ud83e\udd81',
    focus: 'strength',
    tagline: 'Nerve, and a certain disregard for the rules.',
    blurb:
      'You show up when it is cold and you do not feel like it. Daring, hard training, and the work that leaves marks.',
    startingBonus: { strength: 2 },
    order: 0,
  },
  {
    id: 'scholar',
    name: 'Ravenclaw',
    glyph: '\ud83e\udd85',
    focus: 'intelligence',
    tagline: 'Wit beyond measure is a wizard\u2019s greatest treasure.',
    blurb:
      'You would rather understand a thing than finish it quickly. Study, code, and the hours that leave no visible trace.',
    startingBonus: { intelligence: 2 },
    order: 1,
  },
  {
    id: 'explorer',
    name: 'Slytherin',
    glyph: '\ud83d\udc0d',
    focus: 'agility',
    tagline: 'Ambition, and the patience to see it through.',
    blurb:
      'You measure a good day in ground covered. Resourceful, quick, and unembarrassed about wanting more.',
    startingBonus: { agility: 2 },
    order: 2,
  },
  {
    id: 'guardian',
    name: 'Hufflepuff',
    glyph: '\ud83e\udda1',
    focus: 'vitality',
    tagline: 'Patient, loyal, and unafraid of toil.',
    blurb:
      'You know that sleep, food and a tidy room are not small things. The unglamorous work that holds everything else up.',
    startingBonus: { vitality: 2 },
    order: 3,
  },
];

export const FOCUS_AREAS = [
  {
    id: 'coding',
    name: 'Coding',
    glyph: '⌨',
    attribute: 'intelligence',
    order: 0,
    quests: [
      { title: 'Ship one real commit', difficulty: 'normal', cadence: 'daily' },
      { title: 'Read the docs before guessing', difficulty: 'easy', cadence: 'daily' },
    ],
  },
  {
    id: 'fitness',
    name: 'Fitness',
    glyph: '⚔',
    attribute: 'strength',
    order: 1,
    quests: [
      { title: 'Train for forty minutes', difficulty: 'hard', cadence: 'daily' },
      { title: 'Stretch before bed', difficulty: 'trivial', cadence: 'daily' },
    ],
  },
  {
    id: 'running',
    name: 'Running',
    glyph: '➤',
    attribute: 'agility',
    order: 2,
    quests: [
      { title: 'Run before the day starts', difficulty: 'hard', cadence: 'daily' },
      { title: 'Walk twenty minutes', difficulty: 'easy', cadence: 'daily' },
    ],
  },
  {
    id: 'reading',
    name: 'Reading',
    glyph: '☾',
    attribute: 'wisdom',
    order: 3,
    quests: [
      { title: 'Read ten pages', difficulty: 'easy', cadence: 'daily' },
      { title: 'Write down one thing you learned', difficulty: 'trivial', cadence: 'daily' },
    ],
  },
  {
    id: 'study',
    name: 'Study',
    glyph: '✦',
    attribute: 'intelligence',
    order: 4,
    quests: [
      { title: 'One focused hour, no phone', difficulty: 'hard', cadence: 'daily' },
      { title: 'Review yesterday’s notes', difficulty: 'easy', cadence: 'daily' },
    ],
  },
  {
    id: 'upkeep',
    name: 'Upkeep',
    glyph: '❦',
    attribute: 'vitality',
    order: 5,
    quests: [
      { title: 'In bed before midnight', difficulty: 'easy', cadence: 'daily' },
      { title: 'Cook instead of ordering in', difficulty: 'normal', cadence: 'daily' },
    ],
  },
  {
    id: 'mindfulness',
    name: 'Mindfulness',
    glyph: '◯',
    attribute: 'wisdom',
    order: 6,
    quests: [{ title: 'Sit quietly for ten minutes', difficulty: 'trivial', cadence: 'daily' }],
  },
  {
    id: 'people',
    name: 'People',
    glyph: '✧',
    attribute: 'charisma',
    order: 7,
    quests: [
      {
        title: 'Call someone who would like to hear from you',
        difficulty: 'normal',
        cadence: 'daily',
      },
      { title: 'Answer the message you have been avoiding', difficulty: 'easy', cadence: 'once' },
    ],
  },
];

/**
 * `metric` must be a key in ACHIEVEMENT_METRICS (services/achievements.js).
 * Adding an achievement that uses an existing metric needs no code at all.
 */
export const ACHIEVEMENTS = [
  { id: 'first-quest', name: 'First Blood', description: 'Complete your very first quest.', tier: 'bronze', group: 'Questing', metric: 'tasksCompleted', target: 1, order: 0 },
  { id: 'quests-25', name: 'Getting Somewhere', description: 'Complete 25 quests.', tier: 'bronze', group: 'Questing', metric: 'tasksCompleted', target: 25, order: 1 },
  { id: 'quests-100', name: 'Quest Master', description: 'Complete 100 quests.', tier: 'silver', group: 'Questing', metric: 'tasksCompleted', target: 100, order: 2 },
  { id: 'quests-500', name: 'The Long Campaign', description: 'Complete 500 quests.', tier: 'gold', group: 'Questing', metric: 'tasksCompleted', target: 500, order: 3 },
  { id: 'epic-slayer', name: 'Epic Slayer', description: 'Complete 10 quests rated Epic.', tier: 'silver', group: 'Questing', metric: 'epicCompletions', target: 10, order: 4 },

  { id: 'streak-3', name: 'Momentum', description: 'Hold a 3-day streak.', tier: 'bronze', group: 'Streaks', metric: 'longestStreak', target: 3, order: 10 },
  { id: 'streak-7', name: 'Week Warrior', description: 'Hold a 7-day streak.', tier: 'bronze', group: 'Streaks', metric: 'longestStreak', target: 7, order: 11 },
  { id: 'streak-30', name: 'The Unbroken', description: 'Hold a 30-day streak.', tier: 'gold', group: 'Streaks', metric: 'longestStreak', target: 30, order: 12 },
  { id: 'streak-100', name: 'Hundred Days', description: 'Hold a 100-day streak.', tier: 'mythic', group: 'Streaks', metric: 'longestStreak', target: 100, order: 13 },

  { id: 'level-5', name: 'Apprentice', description: 'Reach level 5.', tier: 'bronze', group: 'Progression', metric: 'level', target: 5, order: 20 },
  { id: 'level-15', name: 'Adept', description: 'Reach level 15.', tier: 'silver', group: 'Progression', metric: 'level', target: 15, order: 21 },
  { id: 'level-30', name: 'Warden', description: 'Reach level 30.', tier: 'gold', group: 'Progression', metric: 'level', target: 30, order: 22 },
  { id: 'level-50', name: 'Ascendant', description: 'Reach level 50.', tier: 'mythic', group: 'Progression', metric: 'level', target: 50, order: 23 },

  { id: 'attr-10', name: 'Specialist', description: 'Take any attribute to level 10.', tier: 'silver', group: 'Attributes', metric: 'highestAttributeLevel', target: 10, order: 30 },
  { id: 'well-rounded', name: 'Well Rounded', description: 'Take every attribute to level 5.', tier: 'gold', group: 'Attributes', metric: 'attributesAtLevel5', target: 6, order: 31 },
  { id: 'polymath', name: 'Polymath', description: 'Earn XP in all six attributes.', tier: 'bronze', group: 'Attributes', metric: 'attributesTouched', target: 6, order: 32 },

  { id: 'first-purchase', name: 'Patron', description: 'Buy anything from the Emporium.', tier: 'bronze', group: 'Economy', metric: 'hasPurchased', target: 1, order: 40 },
  { id: 'gold-5000', name: 'Full Purse', description: 'Earn 5,000 gold in total.', tier: 'silver', group: 'Economy', metric: 'goldEarned', target: 5000, order: 41 },
  { id: 'collector', name: 'Collector', description: 'Own five palettes.', tier: 'gold', group: 'Economy', metric: 'themesOwned', target: 5, order: 42 },

  { id: 'early-bird', name: 'Before the World Wakes', description: 'Complete a quest before 7am, ten times.', tier: 'silver', group: 'Devotion', metric: 'earlyCompletions', target: 10, order: 50 },
  { id: 'big-day', name: 'Tear Through It', description: 'Complete 10 quests in a single day.', tier: 'silver', group: 'Devotion', metric: 'busiestDayCount', target: 10, order: 51 },
];

export const SHOP_ITEMS = [
  { id: 'theme-hogwarts', kind: 'theme', name: 'Midnight Castle', description: 'The lake at midnight, one moon and a thousand lit windows. The default.', price: 0, requiresLevel: 1, payload: { theme: 'hogwarts' }, order: 0 },
  { id: 'theme-obsidian', kind: 'theme', name: 'Obsidian Veil', description: 'The old dark of a quiet hall. Violet light on black glass.', price: 0, requiresLevel: 1, payload: { theme: 'obsidian' }, order: 1 },

  /* The four houses. Priced as a set — none is better than another, so none
   * costs more than another, and the level gates are the same on all four. */
  { id: 'theme-gryffindor', kind: 'theme', name: 'Gryffindor', description: 'Scarlet and gold. Nerve, and a certain disregard for the rules.', price: 500, requiresLevel: 4, payload: { theme: 'gryffindor' }, order: 2 },
  { id: 'theme-slytherin', kind: 'theme', name: 'Slytherin', description: 'Emerald and silver. Ambition, and the patience to see it through.', price: 500, requiresLevel: 4, payload: { theme: 'slytherin' }, order: 3 },
  { id: 'theme-ravenclaw', kind: 'theme', name: 'Ravenclaw', description: 'Blue and bronze. Wit beyond measure is a wizard’s greatest treasure.', price: 500, requiresLevel: 4, payload: { theme: 'ravenclaw' }, order: 4 },
  { id: 'theme-hufflepuff', kind: 'theme', name: 'Hufflepuff', description: 'Gold and black. Patient, and unafraid of the boring parts.', price: 500, requiresLevel: 4, payload: { theme: 'hufflepuff' }, order: 5 },

  { id: 'theme-emberfall', kind: 'theme', name: 'Emberfall', description: 'Banked coals and copper. For the ones who train before sunrise.', price: 450, requiresLevel: 3, payload: { theme: 'emberfall' }, order: 6 },
  { id: 'theme-tidewatch', kind: 'theme', name: 'Tidewatch', description: 'Deep water, pale foam, a lantern on a long pier.', price: 600, requiresLevel: 5, payload: { theme: 'tidewatch' }, order: 7 },
  { id: 'theme-verdant', kind: 'theme', name: 'Verdant Hollow', description: 'Moss over stone. Growth measured in seasons, not hours.', price: 750, requiresLevel: 8, payload: { theme: 'verdant' }, order: 8 },
  { id: 'theme-goldleaf', kind: 'theme', name: 'Goldleaf Archive', description: 'Parchment by day, lamplight by night. The warm one, either way.', price: 1400, requiresLevel: 12, payload: { theme: 'goldleaf' }, order: 9 },

  { id: 'title-earlyriser', kind: 'title', name: 'Prefect', description: 'Worn by those who meet the morning before it meets them.', price: 300, requiresLevel: 2, payload: { title: 'Prefect' }, order: 10 },
  { id: 'title-unbroken', kind: 'title', name: 'Keeper of the Flame', description: 'For a chain of days that never once slipped.', price: 900, requiresLevel: 6, payload: { title: 'Keeper of the Flame' }, order: 11 },
  { id: 'title-scholar', kind: 'title', name: 'Master of the Restricted Section', description: 'Granted to a mind that outgrew its library.', price: 1100, requiresLevel: 10, payload: { title: 'Master of the Restricted Section' }, order: 12 },
  { id: 'title-ascendant', kind: 'title', name: 'Order of Merlin, First Class', description: 'Reserved. Most never buy it; fewer still earn the level for it.', price: 4000, requiresLevel: 20, payload: { title: 'Order of Merlin, First Class' }, order: 13 },

  { id: 'elixir-xp', kind: 'consumable', name: 'Felix Felicis', description: '+50% XP on your next 5 completions. Stacks with your streak.', price: 220, requiresLevel: 1, stackable: true, payload: { effect: 'xpElixir', charges: 5 }, order: 20 },
  { id: 'shield-streak', kind: 'consumable', name: 'Time-Turner', description: 'Absorbs one missed day so a long chain survives a bad night.', price: 380, requiresLevel: 3, stackable: true, payload: { effect: 'streakShield', charges: 1 }, order: 21 },

  { id: 'badge-lantern', kind: 'badge', name: 'The Lantern', description: 'A small light, carried anyway. Shown beside your name.', price: 250, requiresLevel: 2, payload: { badge: '🏮' }, order: 30 },
  { id: 'badge-crown', kind: 'badge', name: 'Thorn Crown', description: 'Earned the hard way, worn without comment.', price: 1600, requiresLevel: 14, payload: { badge: '👑' }, order: 31 },
  { id: 'badge-comet', kind: 'badge', name: 'Long Comet', description: 'For streaks measured in months.', price: 2200, requiresLevel: 18, payload: { badge: '☄️' }, order: 32 },
];

export const CONFIG = {
  key: 'default',
  heroCurve: { base: 30, exponent: 1.35, linear: 25 },
  attributeCurve: { base: 20, exponent: 1.25, linear: 15 },
  streak: { step: 0.04, maxDays: 15, milestones: [3, 7, 14, 30, 60, 100], milestoneGoldPerDay: 12 },
  rewards: { firstOfDayMultiplier: 1.15, elixirMultiplier: 1.5, affinityBonus: 0.25 },
  achievementTiers: {
    bronze: { name: 'Bronze', glyph: '🥉', gold: 60 },
    silver: { name: 'Silver', glyph: '🥈', gold: 150 },
    gold: { name: 'Gold', glyph: '🥇', gold: 400 },
    mythic: { name: 'Mythic', glyph: '👑', gold: 1200 },
  },
  ranks: [
    { level: 1, title: 'Wanderer' },
    { level: 5, title: 'Apprentice' },
    { level: 10, title: 'Journeyer' },
    { level: 15, title: 'Adept' },
    { level: 22, title: 'Champion' },
    { level: 30, title: 'Warden' },
    { level: 40, title: 'Archon' },
    { level: 50, title: 'Ascendant' },
  ],
  startingGold: 60,
  defaultOwnedItemIds: ['theme-hogwarts'],
};

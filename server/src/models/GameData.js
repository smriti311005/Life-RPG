import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Game definitions, stored in MongoDB rather than hardcoded.
 *
 * These are *content*: attributes, difficulty tiers, classes, achievements and
 * shop stock. An admin can retune a price or add an achievement by writing a
 * document, with no deploy.
 *
 * What is deliberately NOT stored here is *behaviour*. An achievement row names
 * a `metric` — a key into a registry of extractor functions in
 * `services/achievements.js` — rather than carrying code. Storing executable
 * rules in the database and evaluating them later is remote code execution with
 * extra steps; naming a known metric is not.
 *
 * `server/src/game/defaults.js` holds the shipped values, and
 * `npm run seed:game` upserts them. Every schema is keyed by a stable string
 * `id` that the rest of the app refers to.
 */

const base = { timestamps: true, versionKey: false };

/* -------------------------------------------------------------------------- */
/* Attributes                                                                 */
/* -------------------------------------------------------------------------- */

const attributeSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    short: { type: String, required: true },
    blurb: { type: String, default: '' },
    example: { type: String, default: '' },
    glyph: { type: String, default: '✦' },
    hue: { type: Number, required: true, min: 0, max: 360 },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  base,
);

/* -------------------------------------------------------------------------- */
/* Difficulty tiers                                                           */
/* -------------------------------------------------------------------------- */

const difficultySchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    xp: { type: Number, required: true, min: 1 },
    gold: { type: Number, required: true, min: 0 },
    hint: { type: String, default: '' },
    rank: { type: Number, default: 0 },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  base,
);

/* -------------------------------------------------------------------------- */
/* Classes and focus areas                                                    */
/* -------------------------------------------------------------------------- */

const characterClassSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    glyph: { type: String, default: '✦' },
    focus: { type: String, required: true }, // an attribute id
    tagline: { type: String, default: '' },
    blurb: { type: String, default: '' },
    // { attributeId: levelsGranted }
    startingBonus: { type: Map, of: Number, default: () => ({}) },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  base,
);

const focusAreaSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    glyph: { type: String, default: '✦' },
    attribute: { type: String, required: true },
    quests: {
      type: [
        new Schema(
          {
            title: { type: String, required: true },
            difficulty: { type: String, required: true },
            cadence: { type: String, enum: ['once', 'daily'], default: 'daily' },
          },
          { _id: false },
        ),
      ],
      default: () => [],
    },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  base,
);

/* -------------------------------------------------------------------------- */
/* Achievements                                                               */
/* -------------------------------------------------------------------------- */

const achievementDefSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    tier: { type: String, required: true }, // bronze | silver | gold | mythic
    group: { type: String, default: 'General' },
    /**
     * The name of a counter the engine knows how to read. Never code — see the
     * note at the top of this file.
     */
    metric: { type: String, required: true },
    target: { type: Number, required: true, min: 1 },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  base,
);

/* -------------------------------------------------------------------------- */
/* Shop stock                                                                 */
/* -------------------------------------------------------------------------- */

const shopItemSchema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    kind: { type: String, required: true, enum: ['theme', 'title', 'consumable', 'badge'] },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    requiresLevel: { type: Number, default: 1, min: 1 },
    stackable: { type: Boolean, default: false },
    payload: { type: Schema.Types.Mixed, default: () => ({}) },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  base,
);

/* -------------------------------------------------------------------------- */
/* Tunable numbers                                                            */
/* -------------------------------------------------------------------------- */

/**
 * A single document holding every tunable constant. Curves are stored as
 * coefficients, not formulas — `round(base * level^exponent + linear * level)` —
 * so the shape can be retuned without shipping code.
 */
const gameConfigSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },

    heroCurve: {
      base: { type: Number, default: 30 },
      exponent: { type: Number, default: 1.35 },
      linear: { type: Number, default: 25 },
    },
    attributeCurve: {
      base: { type: Number, default: 20 },
      exponent: { type: Number, default: 1.25 },
      linear: { type: Number, default: 15 },
    },

    streak: {
      step: { type: Number, default: 0.04 },
      maxDays: { type: Number, default: 15 },
      milestones: { type: [Number], default: () => [3, 7, 14, 30, 60, 100] },
      milestoneGoldPerDay: { type: Number, default: 12 },
    },

    rewards: {
      firstOfDayMultiplier: { type: Number, default: 1.15 },
      elixirMultiplier: { type: Number, default: 1.5 },
      affinityBonus: { type: Number, default: 0.25 },
    },

    achievementTiers: {
      type: Map,
      of: new Schema(
        {
          name: { type: String, required: true },
          glyph: { type: String, default: '🏅' },
          gold: { type: Number, default: 0 },
        },
        { _id: false },
      ),
      default: () => ({}),
    },

    ranks: {
      type: [
        new Schema(
          { level: { type: Number, required: true }, title: { type: String, required: true } },
          { _id: false },
        ),
      ],
      default: () => [],
    },

    startingGold: { type: Number, default: 60 },
    defaultOwnedItemIds: { type: [String], default: () => ['theme-hogwarts'] },
  },
  base,
);

export const AttributeDef = model('AttributeDef', attributeSchema, 'attributes');
export const DifficultyDef = model('DifficultyDef', difficultySchema, 'difficulties');
export const CharacterClassDef = model('CharacterClassDef', characterClassSchema, 'characterclasses');
export const FocusAreaDef = model('FocusAreaDef', focusAreaSchema, 'focusareas');
export const AchievementDef = model('AchievementDef', achievementDefSchema, 'achievementdefs');
export const ShopItemDef = model('ShopItemDef', shopItemSchema, 'shopitems');
export const GameConfig = model('GameConfig', gameConfigSchema, 'gameconfigs');

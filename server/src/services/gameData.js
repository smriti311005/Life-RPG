import {
  AttributeDef,
  DifficultyDef,
  CharacterClassDef,
  FocusAreaDef,
  AchievementDef,
  ShopItemDef,
  GameConfig,
} from '../models/GameData.js';
import * as defaults from '../game/defaults.js';

/**
 * In-memory cache of the game definitions held in MongoDB.
 *
 * Every request needs the attribute list, the difficulty tiers and the XP
 * curve; hitting the database for those on each one would be a lot of round
 * trips for content that changes roughly never. So it is loaded once at boot
 * and re-read on demand via `reload()`.
 *
 * If the collections are empty — a fresh clone — the shipped defaults are
 * seeded automatically, so `npm run dev` works without a separate step.
 */

const cache = {
  loaded: false,
  attributes: [],
  attributeMap: new Map(),
  difficulties: [],
  difficultyMap: new Map(),
  classes: [],
  classMap: new Map(),
  focusAreas: [],
  focusAreaMap: new Map(),
  achievements: [],
  achievementMap: new Map(),
  shopItems: [],
  shopItemMap: new Map(),
  config: null,
};

const byOrder = (a, b) => (a.order ?? 0) - (b.order ?? 0);
const plain = (doc) => (doc?.toObject ? doc.toObject({ flattenMaps: true }) : doc);

/* -------------------------------------------------------------------------- */
/* Seeding                                                                    */
/* -------------------------------------------------------------------------- */

async function upsertAll(Model, rows) {
  if (!rows.length) return;
  await Model.bulkWrite(
    rows.map((row) => ({
      updateOne: { filter: { id: row.id }, update: { $set: row }, upsert: true },
    })),
    { ordered: false },
  );
}

/**
 * Write the shipped defaults into MongoDB.
 *
 * `force` overwrites existing documents — use it to reset after retuning
 * `game/defaults.js`. Without it, only missing collections are filled, so a
 * price edited in the database is never clobbered by a redeploy.
 */
export async function seedGameData({ force = false } = {}) {
  const counts = await Promise.all([
    AttributeDef.estimatedDocumentCount(),
    DifficultyDef.estimatedDocumentCount(),
    CharacterClassDef.estimatedDocumentCount(),
    FocusAreaDef.estimatedDocumentCount(),
    AchievementDef.estimatedDocumentCount(),
    ShopItemDef.estimatedDocumentCount(),
    GameConfig.estimatedDocumentCount(),
  ]);

  const [attrs, diffs, classes, areas, achievements, items, configs] = counts;
  const written = [];

  if (force || attrs === 0) {
    await upsertAll(AttributeDef, defaults.ATTRIBUTES);
    written.push(`attributes(${defaults.ATTRIBUTES.length})`);
  }
  if (force || diffs === 0) {
    await upsertAll(DifficultyDef, defaults.DIFFICULTIES);
    written.push(`difficulties(${defaults.DIFFICULTIES.length})`);
  }
  if (force || classes === 0) {
    await upsertAll(CharacterClassDef, defaults.CLASSES);
    written.push(`classes(${defaults.CLASSES.length})`);
  }
  if (force || areas === 0) {
    await upsertAll(FocusAreaDef, defaults.FOCUS_AREAS);
    written.push(`focusAreas(${defaults.FOCUS_AREAS.length})`);
  }
  if (force || achievements === 0) {
    await upsertAll(AchievementDef, defaults.ACHIEVEMENTS);
    written.push(`achievements(${defaults.ACHIEVEMENTS.length})`);
  }
  if (force || items === 0) {
    await upsertAll(ShopItemDef, defaults.SHOP_ITEMS);
    written.push(`shopItems(${defaults.SHOP_ITEMS.length})`);
  }
  if (force || configs === 0) {
    await GameConfig.updateOne(
      { key: 'default' },
      { $set: defaults.CONFIG },
      { upsert: true },
    );
    written.push('config');
  }

  return written;
}

/* -------------------------------------------------------------------------- */
/* Loading                                                                    */
/* -------------------------------------------------------------------------- */

export async function loadGameData({ seedIfEmpty = true } = {}) {
  if (seedIfEmpty) {
    const written = await seedGameData();
    if (written.length) {
      console.log(`[game] seeded defaults: ${written.join(', ')}`);
    }
  }

  const [attributes, difficulties, classes, focusAreas, achievements, shopItems, config] =
    await Promise.all([
      AttributeDef.find({ active: true }).lean(),
      DifficultyDef.find({ active: true }).lean(),
      CharacterClassDef.find({ active: true }).lean(),
      FocusAreaDef.find({ active: true }).lean(),
      AchievementDef.find({ active: true }).lean(),
      ShopItemDef.find({ active: true }).lean(),
      GameConfig.findOne({ key: 'default' }).lean(),
    ]);

  cache.attributes = attributes.sort(byOrder);
  cache.attributeMap = new Map(cache.attributes.map((a) => [a.id, a]));

  cache.difficulties = difficulties.sort(byOrder);
  cache.difficultyMap = new Map(cache.difficulties.map((d) => [d.id, d]));

  cache.classes = classes.sort(byOrder);
  cache.classMap = new Map(cache.classes.map((c) => [c.id, c]));

  cache.focusAreas = focusAreas.sort(byOrder);
  cache.focusAreaMap = new Map(cache.focusAreas.map((f) => [f.id, f]));

  cache.achievements = achievements.sort(byOrder);
  cache.achievementMap = new Map(cache.achievements.map((a) => [a.id, a]));

  cache.shopItems = shopItems.sort(byOrder);
  cache.shopItemMap = new Map(cache.shopItems.map((i) => [i.id, i]));

  cache.config = plain(config) ?? defaults.CONFIG;
  cache.loaded = true;

  console.log(
    `[game] loaded ${cache.attributes.length} attributes, ${cache.difficulties.length} tiers, ` +
      `${cache.classes.length} classes, ${cache.achievements.length} achievements, ` +
      `${cache.shopItems.length} shop items`,
  );

  return cache;
}

export const reloadGameData = () => loadGameData({ seedIfEmpty: false });

/** Guards against a route running before boot finished. */
function ready() {
  if (!cache.loaded) {
    throw new Error('Game data has not been loaded. Call loadGameData() during boot.');
  }
  return cache;
}

/* -------------------------------------------------------------------------- */
/* Accessors                                                                  */
/* -------------------------------------------------------------------------- */

export const getAttributes = () => ready().attributes;
export const getAttributeIds = () => ready().attributes.map((a) => a.id);
export const getAttribute = (id) => ready().attributeMap.get(id) ?? null;
export const isAttribute = (id) => ready().attributeMap.has(id);

export const getDifficulties = () => ready().difficulties;
export const getDifficultyIds = () => ready().difficulties.map((d) => d.id);
export const getDifficulty = (id) => ready().difficultyMap.get(id) ?? null;
export const isDifficulty = (id) => ready().difficultyMap.has(id);

export const getClasses = () => ready().classes;
export const getClassIds = () => ready().classes.map((c) => c.id);
export const getClass = (id) => ready().classMap.get(id) ?? null;
export const isClass = (id) => ready().classMap.has(id);

export const getFocusAreas = () => ready().focusAreas;
export const getFocusArea = (id) => ready().focusAreaMap.get(id) ?? null;

export const getAchievementDefs = () => ready().achievements;
export const getAchievementDef = (id) => ready().achievementMap.get(id) ?? null;

export const getShopItems = () => ready().shopItems;
export const getShopItem = (id) => ready().shopItemMap.get(id) ?? null;

export const getConfig = () => ready().config;
export const getTiers = () => ready().config.achievementTiers ?? {};
export const getTier = (id) => getTiers()[id] ?? { name: id, glyph: '🏅', gold: 0 };
export const getDefaultOwnedItemIds = () => ready().config.defaultOwnedItemIds ?? [];

/**
 * Mongoose and Zod both need to validate ids at *runtime*, not at module load —
 * the definitions do not exist until the database has answered. These are the
 * validators the schemas and request parsers use.
 */
export const attributeValidator = {
  validator: (value) => cache.loaded && cache.attributeMap.has(value),
  message: (props) => `"${props.value}" is not a known attribute.`,
};

export const difficultyValidator = {
  validator: (value) => cache.loaded && cache.difficultyMap.has(value),
  message: (props) => `"${props.value}" is not a known difficulty.`,
};

export const classValidator = {
  validator: (value) => value == null || (cache.loaded && cache.classMap.has(value)),
  message: (props) => `"${props.value}" is not a known class.`,
};

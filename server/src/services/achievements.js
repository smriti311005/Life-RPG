import { Completion } from '../models/Completion.js';
import {
  getAchievementDefs,
  getAttributeIds,
  getShopItem,
  getTier,
} from './gameData.js';

/**
 * The achievement engine.
 *
 * Definitions live in MongoDB and name a **metric** — a key into the registry
 * below — rather than carrying a function. That split is deliberate: content in
 * the database, behaviour in code. Storing an executable rule and evaluating it
 * later would be remote code execution with extra steps, and it would mean an
 * achievement could be crafted to read anything.
 *
 * Adding an achievement that uses an existing metric needs no deploy at all.
 * Adding a new *kind* of achievement means adding one entry here.
 */

export const ACHIEVEMENT_METRICS = {
  tasksCompleted: (ctx) => ctx.user.lifetime.tasksCompleted,
  goldEarned: (ctx) => ctx.user.lifetime.goldEarned,
  hasPurchased: (ctx) => (ctx.user.lifetime.goldSpent > 0 ? 1 : 0),
  level: (ctx) => ctx.user.level,
  longestStreak: (ctx) => ctx.user.streak.longest,
  currentStreak: (ctx) => ctx.user.streak.current,
  epicCompletions: (ctx) => ctx.byDifficulty.epic ?? 0,
  hardCompletions: (ctx) => ctx.byDifficulty.hard ?? 0,
  earlyCompletions: (ctx) => ctx.earlyCompletions,
  busiestDayCount: (ctx) => ctx.busiestDayCount,
  highestAttributeLevel: (ctx) => ctx.highestAttributeLevel,
  attributesAtLevel5: (ctx) => ctx.attributes.filter((a) => a.level >= 5).length,
  attributesTouched: (ctx) => ctx.attributes.filter((a) => a.totalXp > 0).length,
  themesOwned: (ctx) => ctx.themesOwned,
  activeDays: (ctx) => ctx.activeDays,
};

export const KNOWN_METRICS = Object.keys(ACHIEVEMENT_METRICS);

/**
 * Assemble everything the metrics need.
 *
 * Most read counters already on the user document. The handful that need
 * history come from aggregates run in parallel.
 */
export async function buildContext(user) {
  const [byDifficultyRows, earlyRow, busiestRow, activeDaysRow] = await Promise.all([
    Completion.aggregate([
      { $match: { user: user._id } },
      { $group: { _id: '$difficulty', count: { $sum: 1 } } },
    ]),
    Completion.aggregate([
      { $match: { user: user._id } },
      {
        $project: {
          // The stored offset is minutes *behind* UTC, so subtracting it
          // converts the instant to the hour the player actually saw.
          localHour: {
            $hour: {
              $subtract: ['$createdAt', (user.settings?.timezoneOffset ?? 0) * 60 * 1000],
            },
          },
        },
      },
      { $match: { localHour: { $lt: 7 } } },
      { $count: 'count' },
    ]),
    Completion.aggregate([
      { $match: { user: user._id } },
      { $group: { _id: '$day', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]),
    Completion.aggregate([
      { $match: { user: user._id } },
      { $group: { _id: '$day' } },
      { $count: 'count' },
    ]),
  ]);

  const attributes = getAttributeIds().map(
    (id) => user.attributes?.get?.(id) ?? { level: 1, xp: 0, totalXp: 0 },
  );

  return {
    user,
    attributes,
    byDifficulty: Object.fromEntries(byDifficultyRows.map((r) => [r._id, r.count])),
    earlyCompletions: earlyRow[0]?.count ?? 0,
    busiestDayCount: busiestRow[0]?.count ?? 0,
    activeDays: activeDaysRow[0]?.count ?? 0,
    highestAttributeLevel: attributes.length
      ? Math.max(...attributes.map((a) => a.level))
      : 1,
    themesOwned: user.ownedItemIds.filter((id) => getShopItem(id)?.kind === 'theme').length,
  };
}

/** Evaluate every definition against a context. */
export function evaluateAll(ctx) {
  return getAchievementDefs()
    .map((def) => {
      const read = ACHIEVEMENT_METRICS[def.metric];

      // A definition naming a metric this build does not know is skipped
      // rather than crashing the page — the database can be ahead of the code.
      if (!read) {
        console.warn(`[achievements] "${def.id}" uses unknown metric "${def.metric}" — skipped`);
        return null;
      }

      const tier = getTier(def.tier);
      const current = Math.min(Number(read(ctx)) || 0, def.target);

      return {
        id: def.id,
        name: def.name,
        description: def.description,
        tier: def.tier,
        group: def.group,
        glyph: tier.glyph,
        reward: tier.gold,
        metric: def.metric,
        current,
        target: def.target,
        complete: current >= def.target,
      };
    })
    .filter(Boolean);
}

/**
 * Recompute every achievement and grant any that have newly completed.
 *
 * Mutates `user` (adding unlock records and paying the gold reward) but does
 * not save — the caller owns the write, so a completion stays a single update.
 *
 * @returns {Promise<Array>} the achievements unlocked by *this* call.
 */
export async function syncAchievements(user) {
  const ctx = await buildContext(user);
  const evaluated = evaluateAll(ctx);

  const already = new Set(user.achievements.map((a) => a.achievementId));
  const freshlyUnlocked = [];

  for (const entry of evaluated) {
    if (!entry.complete || already.has(entry.id)) continue;

    user.achievements.push({
      achievementId: entry.id,
      tier: entry.tier,
      unlockedAt: new Date(),
      goldAwarded: entry.reward,
    });

    user.gold += entry.reward;
    user.lifetime.goldEarned += entry.reward;

    freshlyUnlocked.push({
      id: entry.id,
      name: entry.name,
      description: entry.description,
      tier: entry.tier,
      glyph: entry.glyph,
      reward: entry.reward,
    });
  }

  return freshlyUnlocked;
}

/** The full list for the Achievements page: progress plus unlock dates. */
export async function listForUser(user) {
  const ctx = await buildContext(user);
  const evaluated = evaluateAll(ctx);
  const unlocked = new Map(user.achievements.map((a) => [a.achievementId, a]));

  const items = evaluated.map((entry) => {
    const record = unlocked.get(entry.id);
    return {
      ...entry,
      unlocked: Boolean(record),
      unlockedAt: record?.unlockedAt ?? null,
      // A locked entry still shows its progress bar, which is most of the pull.
      percent: entry.target > 0 ? Math.min(100, (entry.current / entry.target) * 100) : 0,
    };
  });

  return {
    items,
    unlockedCount: items.filter((i) => i.unlocked).length,
    total: items.length,
    goldFromAchievements: user.achievements.reduce((sum, a) => sum + (a.goldAwarded ?? 0), 0),
  };
}

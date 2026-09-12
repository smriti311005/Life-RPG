import { getAttributes, getClass } from './gameData.js';
import {
  xpForNextLevel,
  xpForNextAttributeLevel,
  rankForLevel,
  streakMultiplier,
} from '../game/rules.js';

/**
 * Shape a User document into the character payload the client renders.
 *
 * Derived values (XP thresholds, rank, streak multiplier) are computed here so
 * the client never re-implements the curve and the two cannot drift apart.
 */
export function serializeCharacter(user) {
  const attributes = getAttributes().map((def) => {
    const id = def.id;
    const raw = user.attributes?.get?.(id) ?? { level: 1, xp: 0, totalXp: 0 };
    return {
      id,
      name: def.name,
      short: def.short,
      blurb: def.blurb,
      glyph: def.glyph,
      hue: def.hue,
      level: raw.level,
      xp: raw.xp,
      totalXp: raw.totalXp,
      xpToNext: xpForNextAttributeLevel(raw.level),
    };
  });

  return {
    id: user._id.toString(),
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,

    characterClass: user.characterClass,
    className: getClass(user.characterClass)?.name ?? null,
    classGlyph: getClass(user.characterClass)?.glyph ?? null,
    classFocus: getClass(user.characterClass)?.focus ?? null,
    focusAreas: user.focusAreas,

    level: user.level,
    xp: user.xp,
    xpToNext: xpForNextLevel(user.level),
    totalXp: user.totalXp,
    rank: rankForLevel(user.level),
    gold: user.gold,

    attributes,

    streak: {
      current: user.streak.current,
      longest: user.streak.longest,
      lastActiveDay: user.streak.lastActiveDay,
      shields: user.streak.shields,
      multiplier: streakMultiplier(user.streak.current),
    },

    equipped: {
      theme: user.equipped.theme,
      title: user.equipped.title,
      badge: user.equipped.badge,
    },

    achievements: user.achievements,
    achievementCount: user.achievements.length,

    effects: { xpElixirCharges: user.effects.xpElixirCharges },
    ownedItemIds: user.ownedItemIds,
    inventory: user.inventory,
    lifetime: user.lifetime,
    settings: user.settings,
    onboardedAt: user.onboardedAt,
    createdAt: user.createdAt,
  };
}

export function serializeTask(task) {
  return {
    id: task._id.toString(),
    title: task.title,
    notes: task.notes,
    attribute: task.attribute,
    difficulty: task.difficulty,
    cadence: task.cadence,
    status: task.status,
    lastCompletedDay: task.lastCompletedDay,
    completedAt: task.completedAt,
    completionCount: task.completionCount,
    order: task.order,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

export function serializeCompletion(entry) {
  return {
    id: entry._id.toString(),
    taskId: entry.task ? entry.task.toString() : null,
    title: entry.title,
    attribute: entry.attribute,
    difficulty: entry.difficulty,
    xp: entry.xpAwarded,
    gold: entry.goldAwarded,
    multiplier: entry.multiplier,
    day: entry.day,
    leveledTo: entry.leveledTo,
    at: entry.createdAt,
  };
}

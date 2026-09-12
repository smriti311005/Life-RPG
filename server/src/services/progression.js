import { daysBetween } from '../utils/day.js';
import {
  applyHeroXp,
  applyAttributeXp,
  resolveReward,
  streakMilestoneBonus,
  rankForLevel,
} from '../game/rules.js';
import { affinityBonus } from '../game/rules.js';
import { getClass } from './gameData.js';

/**
 * Advance a user's streak to account for activity on `today`.
 *
 * Runs once per day, on that day's first completion. A Streak Ward held in the
 * inventory absorbs exactly one missed day before the chain breaks.
 *
 * @returns {{firstOfDay: boolean, milestone: number, shieldUsed: boolean, broke: boolean}}
 */
export function touchStreak(user, today) {
  const last = user.streak.lastActiveDay;

  if (last === today) {
    return { firstOfDay: false, milestone: 0, shieldUsed: false, broke: false };
  }

  const gap = daysBetween(last, today);
  let shieldUsed = false;
  let broke = false;

  if (last === null) {
    user.streak.current = 1; // first day ever
  } else if (gap === 1) {
    user.streak.current += 1; // unbroken
  } else if (gap === 2 && user.streak.shields > 0) {
    user.streak.shields -= 1; // one missed day, absorbed
    user.streak.current += 1;
    shieldUsed = true;
  } else {
    user.streak.current = 1; // chain broken, start again from today
    broke = true;
  }

  user.streak.lastActiveDay = today;
  user.streak.longest = Math.max(user.streak.longest, user.streak.current);

  return {
    firstOfDay: true,
    milestone: streakMilestoneBonus(user.streak.current),
    shieldUsed,
    broke,
  };
}

/**
 * Apply one completion to a user document, mutating it in place. The caller
 * saves.
 *
 * This function owns every number the player gains. The only thing it reads
 * from the task is the difficulty tier already stored on that task, so a client
 * cannot propose its own reward.
 *
 * @returns a summary the client uses to drive its celebration.
 */
export function applyCompletion(user, task, today) {
  const streakEvent = touchStreak(user, today);

  const elixirActive = user.effects.xpElixirCharges > 0;
  if (elixirActive) user.effects.xpElixirCharges -= 1;

  const reward = resolveReward({
    difficulty: task.difficulty,
    streakDays: user.streak.current,
    elixirActive,
    firstOfDay: streakEvent.firstOfDay,
  });

  const goldGained = reward.gold + streakEvent.milestone;

  /* ---------------------------------- hero --------------------------------- */
  const beforeLevel = user.level;
  const hero = applyHeroXp({ level: user.level, xp: user.xp }, reward.xp);
  user.level = hero.level;
  user.xp = hero.xp;
  user.totalXp += reward.xp;
  user.gold += goldGained;

  /* -------------------------------- attribute ------------------------------ */
  /* A class grants affinity in exactly one attribute. It lifts the attribute
   * track only — hero XP and gold are untouched — so a coherent build is
   * rewarded without making the other five attributes feel like a mistake. */
  const heroClass = getClass(user.characterClass);
  const affinity = heroClass && heroClass.focus === task.attribute;
  const attrXp = affinity ? Math.round(reward.xp * (1 + affinityBonus())) : reward.xp;

  const before = user.attributes.get(task.attribute) ?? { level: 1, xp: 0, totalXp: 0 };
  const attr = applyAttributeXp({ level: before.level, xp: before.xp }, attrXp);
  user.attributes.set(task.attribute, {
    level: attr.level,
    xp: attr.xp,
    totalXp: before.totalXp + attrXp,
  });

  /* --------------------------------- lifetime ------------------------------ */
  user.lifetime.tasksCompleted += 1;
  user.lifetime.goldEarned += goldGained;

  const rankChanged =
    hero.levelsGained > 0 && rankForLevel(user.level) !== rankForLevel(beforeLevel);

  return {
    xp: reward.xp,
    gold: goldGained,
    multiplier: reward.multiplier,
    breakdown: reward.breakdown,
    elixirUsed: elixirActive,

    leveledUp: hero.levelsGained > 0,
    levelsGained: hero.levelsGained,
    fromLevel: beforeLevel,
    toLevel: user.level,
    newRank: rankChanged ? rankForLevel(user.level) : null,

    attribute: task.attribute,
    attributeXp: attrXp,
    affinity,
    attributeLeveledUp: attr.levelsGained > 0,
    attributeLevel: attr.level,
    attributeFromLevel: before.level,

    streak: {
      current: user.streak.current,
      longest: user.streak.longest,
      isNewDay: streakEvent.firstOfDay,
      milestone: streakEvent.milestone > 0 ? user.streak.current : 0,
      milestoneGold: streakEvent.milestone,
      shieldUsed: streakEvent.shieldUsed,
      broke: streakEvent.broke,
    },
  };
}

/**
 * Reverse a completion (the undo button), mutating `user` in place.
 *
 * Deliberately conservative: XP and gold are taken back and levels recomputed
 * downward, but a spent Elixir charge and a consumed streak day are not
 * restored. Undo is a correction for a misclick, not a way to farm effects.
 */
export function revertCompletion(user, completion, curves) {
  const { xpForNextLevel, xpForNextAttributeLevel } = curves;

  const rollBack = (level, xp, amount, curve) => {
    let lvl = level;
    let pool = xp - amount;
    while (pool < 0 && lvl > 1) {
      lvl -= 1;
      pool += curve(lvl);
    }
    return { level: lvl, xp: Math.max(0, pool) };
  };

  const hero = rollBack(user.level, user.xp, completion.xpAwarded, xpForNextLevel);
  user.level = hero.level;
  user.xp = hero.xp;
  user.totalXp = Math.max(0, user.totalXp - completion.xpAwarded);
  user.gold = Math.max(0, user.gold - completion.goldAwarded);

  const before = user.attributes.get(completion.attribute) ?? { level: 1, xp: 0, totalXp: 0 };
  const attr = rollBack(
    before.level,
    before.xp,
    completion.xpAwarded,
    xpForNextAttributeLevel,
  );
  user.attributes.set(completion.attribute, {
    level: attr.level,
    xp: attr.xp,
    totalXp: Math.max(0, before.totalXp - completion.xpAwarded),
  });

  user.lifetime.tasksCompleted = Math.max(0, user.lifetime.tasksCompleted - 1);
  user.lifetime.goldEarned = Math.max(0, user.lifetime.goldEarned - completion.goldAwarded);
}

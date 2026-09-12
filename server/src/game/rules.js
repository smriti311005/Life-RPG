import { getConfig, getDifficulty } from '../services/gameData.js';

/**
 * The progression engine.
 *
 * Every number a player can earn is derived here, on the server, from data the
 * server already trusts: the difficulty tier stored on a task, the streak
 * stored on the user, and the tuning constants stored in the `gameconfigs`
 * collection. The client never proposes an XP or gold amount — it only names a
 * task id.
 *
 * The curve *shapes* live in the database as coefficients rather than as code,
 * so the game can be retuned without a deploy. The arithmetic that applies them
 * stays here.
 */

/* -------------------------------------------------------------------------- */
/* Level curves                                                                */
/* -------------------------------------------------------------------------- */

const curve = ({ base, exponent, linear }, level) =>
  Math.round(base * Math.pow(Math.max(1, Math.floor(level)), exponent) + linear * level);

/**
 * XP required to advance *from* `level` to `level + 1`.
 *
 * Superlinear, so each level costs meaningfully more than the last and the
 * curve never flattens into a grind-free treadmill. With the shipped
 * coefficients: L1→2 is 55, L10→11 is 922, L50→51 is 7,148.
 */
export function xpForNextLevel(level) {
  return curve(getConfig().heroCurve, level);
}

/** The same idea for a single attribute, on a gentler curve. */
export function xpForNextAttributeLevel(level) {
  return curve(getConfig().attributeCurve, level);
}

/**
 * Pour `amount` XP into a `{ level, xp }` pair, rolling over as many levels as
 * the amount covers. Returns a new pair plus how many levels were gained.
 */
function applyXp({ level, xp }, amount, next) {
  let nextLevel = level;
  let pool = xp + amount;
  let gained = 0;

  // Guard against a pathological loop if a curve is ever misconfigured.
  while (gained < 500) {
    const needed = next(nextLevel);
    if (!Number.isFinite(needed) || needed <= 0) break;
    if (pool < needed) break;
    pool -= needed;
    nextLevel += 1;
    gained += 1;
  }

  return { level: nextLevel, xp: pool, levelsGained: gained };
}

export const applyHeroXp = (state, amount) => applyXp(state, amount, xpForNextLevel);
export const applyAttributeXp = (state, amount) =>
  applyXp(state, amount, xpForNextAttributeLevel);

/* -------------------------------------------------------------------------- */
/* Titles                                                                      */
/* -------------------------------------------------------------------------- */

/** Free rank title, derived purely from hero level. */
export function rankForLevel(level) {
  const ranks = [...(getConfig().ranks ?? [])].sort((a, b) => b.level - a.level);
  return ranks.find((rank) => level >= rank.level)?.title ?? 'Wanderer';
}

/* -------------------------------------------------------------------------- */
/* Streaks                                                                     */
/* -------------------------------------------------------------------------- */

/** Reward multiplier earned by a streak of `days` consecutive active days. */
export function streakMultiplier(days) {
  const { step, maxDays } = getConfig().streak;
  const effective = Math.min(Math.max(days, 0), maxDays);
  return Number((1 + effective * step).toFixed(2));
}

export const streakMilestones = () => getConfig().streak.milestones ?? [];

export function streakMilestoneBonus(days) {
  const { milestones = [], milestoneGoldPerDay = 0 } = getConfig().streak;
  return milestones.includes(days) ? days * milestoneGoldPerDay : 0;
}

/* -------------------------------------------------------------------------- */
/* Reward resolution                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Resolve the reward for completing one task.
 *
 * @param {object}  opts
 * @param {string}  opts.difficulty   difficulty id stored on the task
 * @param {number}  opts.streakDays   streak *after* today is counted
 * @param {boolean} opts.elixirActive whether an XP Elixir charge is being spent
 * @param {boolean} opts.firstOfDay   is this the day's first completion?
 */
export function resolveReward({
  difficulty,
  streakDays = 0,
  elixirActive = false,
  firstOfDay = false,
}) {
  const { rewards } = getConfig();
  const tier = getDifficulty(difficulty) ?? getDifficulty('normal');

  if (!tier) throw new Error('No difficulty tiers are configured.');

  const streakMult = streakMultiplier(streakDays);
  const elixirMult = elixirActive ? rewards.elixirMultiplier : 1;
  const dailyMult = firstOfDay ? rewards.firstOfDayMultiplier : 1;

  const multiplier = Number((streakMult * elixirMult * dailyMult).toFixed(3));

  return {
    baseXp: tier.xp,
    baseGold: tier.gold,
    xp: Math.max(1, Math.round(tier.xp * multiplier)),
    gold: Math.max(1, Math.round(tier.gold * multiplier)),
    multiplier,
    breakdown: { streak: streakMult, elixir: elixirMult, firstOfDay: dailyMult },
  };
}

/** The class affinity bonus, as a fraction (0.25 = +25%). */
export const affinityBonus = () => getConfig().rewards.affinityBonus ?? 0;

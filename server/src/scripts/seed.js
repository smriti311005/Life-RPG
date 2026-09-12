import 'dotenv/config';
import mongoose from 'mongoose';

import { connectDatabase } from '../config/db.js';
import { User } from '../models/User.js';
import { Task } from '../models/Task.js';
import { Completion } from '../models/Completion.js';
import { applyHeroXp, applyAttributeXp } from '../game/rules.js';
import {
  loadGameData,
  getAttributeIds,
  getDifficulty,
  getConfig,
  getShopItems,
} from '../services/gameData.js';
import { dayKey } from '../utils/day.js';
import { syncAchievements } from '../services/achievements.js';

/**
 * Backfill a demo character with ninety days of plausible history.
 *
 * Useful for screenshots and for seeing the Chronicle heatmap with something in
 * it. Targets one user by Firebase uid and is safe to re-run — it clears that
 * user's existing quests and ledger first.
 *
 *   node src/scripts/seed.js <firebase-uid>
 *
 * With no uid it seeds the `dev-user` account that AUTH_DEV_BYPASS creates.
 */

/**
 * Target either a local account (an email) or a Firebase one (a uid).
 *
 *   npm run seed                          -> demo@liferpg.local / demo-password-123
 *   npm run seed -- you@example.com       -> that local account, created if absent
 *   npm run seed -- <firebase-uid>        -> that Firebase account
 */
const TARGET = process.argv[2] ?? 'demo@liferpg.local';
const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'demo-password-123';
const isEmail = TARGET.includes('@');
const DAYS = 90;

const QUESTS = [
  { title: 'Run before sunrise', attribute: 'agility', difficulty: 'hard', cadence: 'daily', odds: 0.55 },
  { title: 'Read ten pages', attribute: 'wisdom', difficulty: 'easy', cadence: 'daily', odds: 0.78 },
  { title: 'Ship one real commit', attribute: 'intelligence', difficulty: 'normal', cadence: 'daily', odds: 0.62 },
  { title: 'Train for forty minutes', attribute: 'strength', difficulty: 'hard', cadence: 'daily', odds: 0.5 },
  { title: 'Sit quietly for ten minutes', attribute: 'wisdom', difficulty: 'trivial', cadence: 'daily', odds: 0.7 },
  { title: 'Cook instead of ordering in', attribute: 'vitality', difficulty: 'normal', cadence: 'daily', odds: 0.5 },
  { title: 'In bed before midnight', attribute: 'vitality', difficulty: 'easy', cadence: 'daily', odds: 0.66 },
  { title: 'Call someone who would like to hear from you', attribute: 'charisma', difficulty: 'normal', cadence: 'daily', odds: 0.3 },
  { title: 'Finish the tax paperwork', attribute: 'intelligence', difficulty: 'epic', cadence: 'once', odds: 0 },
  { title: 'Fix the squeaking door', attribute: 'vitality', difficulty: 'trivial', cadence: 'once', odds: 0 },
];

async function seed() {
  await connectDatabase(process.env.MONGODB_URI);
  // The definitions have to be in memory before any of the curves can run.
  await loadGameData();

  let user = await User.findOne(isEmail ? { email: TARGET } : { firebaseUid: TARGET });
  let created = false;

  if (!user) {
    user = new User(
      isEmail
        ? { authProvider: 'local', email: TARGET, displayName: 'Demo Wanderer' }
        : { authProvider: 'firebase', firebaseUid: TARGET, displayName: 'Demo Wanderer' },
    );
    if (isEmail) await user.setPassword(DEMO_PASSWORD);
    created = true;
  }

  console.log(`[seed] seeding "${user.displayName}" (${TARGET})${created ? ' — new account' : ''}`);

  await Promise.all([
    Task.deleteMany({ user: user._id }),
    Completion.deleteMany({ user: user._id }),
  ]);

  // Reset the character so a re-run is not cumulative.
  user.level = 1;
  user.xp = 0;
  user.totalXp = 0;
  user.gold = getConfig().startingGold;
  user.attributes = Object.fromEntries(
    getAttributeIds().map((id) => [id, { level: 1, xp: 0, totalXp: 0 }]),
  );
  user.streak = { current: 0, longest: 0, lastActiveDay: null, shields: 0 };
  user.lifetime = { tasksCompleted: 0, goldEarned: 0, goldSpent: 0 };
  user.achievements = [];
  user.ownedItemIds = getShopItems()
    .filter((item) => item.kind === 'theme')
    .map((item) => item.id);
  user.characterClass = user.characterClass ?? 'scholar';
  user.focusAreas = ['coding', 'reading', 'fitness'];

  const tasks = await Task.insertMany(
    QUESTS.map((q, order) => ({
      user: user._id,
      title: q.title,
      attribute: q.attribute,
      difficulty: q.difficulty,
      cadence: q.cadence,
      order,
    })),
  );

  const offset = user.settings.timezoneOffset ?? 0;
  const ledger = [];
  let streak = 0;
  let longest = 0;
  let lastDay = null;

  for (let back = DAYS; back >= 0; back -= 1) {
    const date = new Date(Date.now() - back * 86_400_000);
    const day = dayKey(date, offset);

    // A believable rhythm: a slow ramp into the habit, plus lighter weekends.
    const ramp = 0.35 + 0.65 * ((DAYS - back) / DAYS);
    const weekend = [0, 6].includes(date.getUTCDay()) ? 0.6 : 1;

    let firstOfDay = true;

    for (const [i, quest] of QUESTS.entries()) {
      if (quest.cadence !== 'daily') continue;
      if (Math.random() > quest.odds * ramp * weekend) continue;

      const tier = getDifficulty(quest.difficulty);
      const { step, maxDays } = getConfig().streak;
      const streakMult = 1 + Math.min(streak, maxDays) * step;
      const multiplier = Number((streakMult * (firstOfDay ? 1.15 : 1)).toFixed(3));
      const xp = Math.max(1, Math.round(tier.xp * multiplier));
      const gold = Math.max(1, Math.round(tier.gold * multiplier));

      if (firstOfDay) {
        streak = lastDay === null ? 1 : streak + 1;
        longest = Math.max(longest, streak);
        lastDay = day;
        firstOfDay = false;
      }

      const hero = applyHeroXp({ level: user.level, xp: user.xp }, xp);
      user.level = hero.level;
      user.xp = hero.xp;
      user.totalXp += xp;
      user.gold += gold;
      user.lifetime.tasksCompleted += 1;
      user.lifetime.goldEarned += gold;

      const before = user.attributes.get(quest.attribute);
      const attr = applyAttributeXp({ level: before.level, xp: before.xp }, xp);
      user.attributes.set(quest.attribute, {
        level: attr.level,
        xp: attr.xp,
        totalXp: before.totalXp + xp,
      });

      ledger.push({
        user: user._id,
        task: tasks[i]._id,
        title: quest.title,
        attribute: quest.attribute,
        difficulty: quest.difficulty,
        xpAwarded: xp,
        goldAwarded: gold,
        multiplier,
        day,
        leveledTo: hero.levelsGained > 0 ? hero.level : null,
        createdAt: date,
        updatedAt: date,
      });

      if (day === dayKey(new Date(), offset)) {
        await Task.updateOne(
          { _id: tasks[i]._id },
          { $set: { lastCompletedDay: day, completedAt: date }, $inc: { completionCount: 1 } },
        );
      } else {
        await Task.updateOne({ _id: tasks[i]._id }, { $inc: { completionCount: 1 } });
      }
    }

    // A day with nothing done ends the chain.
    if (firstOfDay && lastDay !== null && lastDay !== day) streak = 0;
  }

  user.streak.current = streak;
  user.streak.longest = longest;
  user.streak.lastActiveDay = lastDay;

  await Completion.insertMany(ledger);
  // The ledger has to exist before achievements can be evaluated against it.
  const unlocked = await syncAchievements(user);
  await user.save();

  if (created && isEmail) {
    console.log(`[seed] sign in with  ${TARGET}  /  ${DEMO_PASSWORD}`);
  }

  console.log(
    `[seed] done — level ${user.level}, ${user.totalXp.toLocaleString()} lifetime XP, ` +
      `${user.gold.toLocaleString()} gold, ${ledger.length} completions, ` +
      `streak ${streak} (longest ${longest}), ${unlocked.length} achievements`,
  );

  await mongoose.connection.close();
}

seed().catch(async (error) => {
  console.error('[seed] failed:', error);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});

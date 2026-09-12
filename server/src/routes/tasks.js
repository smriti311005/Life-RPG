import { Router } from 'express';
import { z } from 'zod';

import { Task } from '../models/Task.js';
import { Completion } from '../models/Completion.js';
import { ApiError, asyncRoute } from '../middleware/error.js';
import { xpForNextLevel, xpForNextAttributeLevel } from '../game/rules.js';
import { isAttribute, isDifficulty } from '../services/gameData.js';
import { applyCompletion, revertCompletion } from '../services/progression.js';
import { serializeCharacter, serializeTask, serializeCompletion } from '../services/character.js';
import { syncAchievements } from '../services/achievements.js';
import { dayKey } from '../utils/day.js';

const router = Router();

const taskInput = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Give the quest a name.')
    .max(120, 'Keep the name under 120 characters.'),
  notes: z.string().trim().max(500, 'Notes are capped at 500 characters.').optional(),
  // Checked against the definitions loaded from the database, not a literal
  // enum frozen at module load.
  attribute: z.string().refine(isAttribute, 'That is not a known attribute.'),
  difficulty: z
    .string()
    .refine(isDifficulty, 'That is not a known difficulty.')
    .optional(),
  cadence: z.enum(['once', 'daily']).optional(),
});

const taskPatch = taskInput.partial().extend({
  status: z.enum(['active', 'archived']).optional(),
  order: z.number().int().min(0).max(10_000).optional(),
});

/** Turn a Zod failure into a 422 with per-field messages. */
function parseOrThrow(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const details = {};
    for (const issue of result.error.issues) {
      details[issue.path.join('.') || 'form'] = issue.message;
    }
    throw new ApiError(422, 'Please check the highlighted fields.', details);
  }
  return result.data;
}

/** The user-local day, from the offset their browser reported at sync. */
const todayFor = (user) => dayKey(new Date(), user.settings?.timezoneOffset ?? 0);

/* -------------------------------------------------------------------------- */
/* GET /api/tasks                                                             */
/* -------------------------------------------------------------------------- */

router.get(
  '/',
  asyncRoute(async (req, res) => {
    const status = ['active', 'archived'].includes(req.query.status)
      ? req.query.status
      : 'active';

    const tasks = await Task.find({ user: req.user._id, status })
      .sort({ order: 1, createdAt: -1 })
      .limit(400)
      .lean({ virtuals: false });

    res.json({
      today: todayFor(req.user),
      tasks: tasks.map((t) => serializeTask({ ...t, _id: t._id })),
    });
  }),
);

/* -------------------------------------------------------------------------- */
/* POST /api/tasks                                                            */
/* -------------------------------------------------------------------------- */

router.post(
  '/',
  asyncRoute(async (req, res) => {
    const data = parseOrThrow(taskInput, req.body);

    const count = await Task.countDocuments({ user: req.user._id, status: 'active' });
    if (count >= 200) {
      throw new ApiError(429, 'Your quest log is full (200 active quests). Archive a few first.');
    }

    const task = await Task.create({
      ...data,
      notes: data.notes ?? '',
      user: req.user._id,
      order: count,
    });

    res.status(201).json({ task: serializeTask(task) });
  }),
);

/* -------------------------------------------------------------------------- */
/* PATCH /api/tasks/:id                                                       */
/* -------------------------------------------------------------------------- */

router.patch(
  '/:id',
  asyncRoute(async (req, res) => {
    const data = parseOrThrow(taskPatch, req.body);

    // Scoped by user, so an id belonging to someone else simply 404s.
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: data },
      { new: true, runValidators: true },
    );

    if (!task) throw new ApiError(404, 'That quest is no longer in your log.');
    res.json({ task: serializeTask(task) });
  }),
);

/* -------------------------------------------------------------------------- */
/* DELETE /api/tasks/:id                                                      */
/* -------------------------------------------------------------------------- */

router.delete(
  '/:id',
  asyncRoute(async (req, res) => {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!task) throw new ApiError(404, 'That quest is no longer in your log.');

    // The ledger survives: history keeps its snapshot, just unlinked.
    await Completion.updateMany({ user: req.user._id, task: task._id }, { $set: { task: null } });

    res.json({ ok: true, id: task._id.toString() });
  }),
);

/* -------------------------------------------------------------------------- */
/* POST /api/tasks/:id/complete                                               */
/* -------------------------------------------------------------------------- */

router.post(
  '/:id/complete',
  asyncRoute(async (req, res) => {
    const user = req.user;
    const today = todayFor(user);

    const task = await Task.findOne({ _id: req.params.id, user: user._id });
    if (!task) throw new ApiError(404, 'That quest is no longer in your log.');

    if (!task.isCompletableOn(today)) {
      const reason =
        task.cadence === 'daily'
          ? 'You have already finished this one today. It returns tomorrow.'
          : 'That quest is already complete.';
      throw new ApiError(409, reason);
    }

    const result = applyCompletion(user, task, today);

    task.completionCount += 1;
    task.lastCompletedDay = today;
    task.completedAt = new Date();
    if (task.cadence === 'once') task.status = 'done';

    const entry = await Completion.create({
      user: user._id,
      task: task._id,
      title: task.title,
      attribute: task.attribute,
      difficulty: task.difficulty,
      xpAwarded: result.xp,
      goldAwarded: result.gold,
      multiplier: result.multiplier,
      day: today,
      leveledTo: result.leveledUp ? result.toLevel : null,
    });

    const unlocked = await syncAchievements(user);

    await Promise.all([user.save(), task.save()]);

    res.json({
      task: serializeTask(task),
      character: serializeCharacter(user),
      reward: result,
      completion: serializeCompletion(entry),
      achievementsUnlocked: unlocked,
    });
  }),
);

/* -------------------------------------------------------------------------- */
/* POST /api/tasks/:id/undo                                                   */
/* -------------------------------------------------------------------------- */

router.post(
  '/:id/undo',
  asyncRoute(async (req, res) => {
    const user = req.user;
    const today = todayFor(user);

    const task = await Task.findOne({ _id: req.params.id, user: user._id });
    if (!task) throw new ApiError(404, 'That quest is no longer in your log.');

    // Only today's completion can be undone — history further back is settled.
    const entry = await Completion.findOne({
      user: user._id,
      task: task._id,
      day: today,
    }).sort({ createdAt: -1 });

    if (!entry) throw new ApiError(409, 'There is nothing to undo for today.');

    revertCompletion(user, entry, { xpForNextLevel, xpForNextAttributeLevel });

    task.completionCount = Math.max(0, task.completionCount - 1);
    task.lastCompletedDay = null;
    task.completedAt = null;
    if (task.cadence === 'once') task.status = 'active';

    await Promise.all([user.save(), task.save(), entry.deleteOne()]);

    res.json({ task: serializeTask(task), character: serializeCharacter(user) });
  }),
);

export default router;

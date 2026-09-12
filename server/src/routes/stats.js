import { Router } from 'express';

import { Completion } from '../models/Completion.js';
import { Task } from '../models/Task.js';
import { asyncRoute } from '../middleware/error.js';
import { serializeCompletion } from '../services/character.js';
import { dayKey, recentDays } from '../utils/day.js';
import { getAttributes } from '../services/gameData.js';

const router = Router();

/* -------------------------------------------------------------------------- */
/* GET /api/stats                                                             */
/* Heatmap, attribute split and recent history for the Chronicle page.        */
/* -------------------------------------------------------------------------- */

router.get(
  '/',
  asyncRoute(async (req, res) => {
    const userId = req.user._id;
    const offset = req.user.settings?.timezoneOffset ?? 0;
    const today = dayKey(new Date(), offset);
    const window = Math.min(Number(req.query.days) || 91, 182); // 26 weeks
    const days = recentDays(today, window);
    const since = days[0];

    const [perDay, perAttribute, recent, taskCounts] = await Promise.all([
      // Activity heatmap.
      Completion.aggregate([
        { $match: { user: userId, day: { $gte: since } } },
        {
          $group: {
            _id: '$day',
            count: { $sum: 1 },
            xp: { $sum: '$xpAwarded' },
            gold: { $sum: '$goldAwarded' },
          },
        },
      ]),

      // Lifetime split across the five attributes.
      Completion.aggregate([
        { $match: { user: userId } },
        { $group: { _id: '$attribute', count: { $sum: 1 }, xp: { $sum: '$xpAwarded' } } },
      ]),

      Completion.find({ user: userId }).sort({ createdAt: -1 }).limit(40),

      Task.aggregate([
        { $match: { user: userId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const byDay = new Map(perDay.map((row) => [row._id, row]));
    const heatmap = days.map((day) => {
      const row = byDay.get(day);
      return { day, count: row?.count ?? 0, xp: row?.xp ?? 0, gold: row?.gold ?? 0 };
    });

    const attrRows = new Map(perAttribute.map((row) => [row._id, row]));
    const attributeSplit = getAttributes().map((def) => ({
      id: def.id,
      name: def.name,
      glyph: def.glyph,
      hue: def.hue,
      count: attrRows.get(def.id)?.count ?? 0,
      xp: attrRows.get(def.id)?.xp ?? 0,
    }));

    const statusRows = Object.fromEntries(taskCounts.map((row) => [row._id, row.count]));

    const last7 = heatmap.slice(-7);
    const last28 = heatmap.slice(-28);

    res.json({
      today,
      heatmap,
      attributeSplit,
      history: recent.map(serializeCompletion),
      totals: {
        xpWindow: heatmap.reduce((sum, d) => sum + d.xp, 0),
        completionsWindow: heatmap.reduce((sum, d) => sum + d.count, 0),
        xpLast7: last7.reduce((sum, d) => sum + d.xp, 0),
        completionsLast7: last7.reduce((sum, d) => sum + d.count, 0),
        activeDaysLast28: last28.filter((d) => d.count > 0).length,
        busiestDay: heatmap.reduce(
          (best, d) => (d.count > best.count ? d : best),
          { day: today, count: 0, xp: 0, gold: 0 },
        ),
      },
      tasks: {
        active: statusRows.active ?? 0,
        done: statusRows.done ?? 0,
        archived: statusRows.archived ?? 0,
      },
    });
  }),
);

export default router;

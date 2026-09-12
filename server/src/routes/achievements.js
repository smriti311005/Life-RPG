import { Router } from 'express';

import { asyncRoute } from '../middleware/error.js';
import { listForUser, syncAchievements } from '../services/achievements.js';
import { serializeCharacter } from '../services/character.js';

const router = Router();

/* -------------------------------------------------------------------------- */
/* GET /api/achievements                                                      */
/* -------------------------------------------------------------------------- */

router.get(
  '/',
  asyncRoute(async (req, res) => {
    /* Sync on read as well as on completion. Achievements that depend on
     * something other than a completion — buying the fifth palette, say —
     * would otherwise sit unlocked-but-unpaid until the next quest. */
    const unlocked = await syncAchievements(req.user);
    if (unlocked.length) await req.user.save();

    const data = await listForUser(req.user);

    res.json({
      ...data,
      character: serializeCharacter(req.user),
      justUnlocked: unlocked,
    });
  }),
);

export default router;

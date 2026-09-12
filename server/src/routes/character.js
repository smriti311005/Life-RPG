import { Router } from 'express';

import { asyncRoute } from '../middleware/error.js';
import { serializeCharacter } from '../services/character.js';
import { xpForNextAttributeLevel } from '../game/rules.js';
import { getAttributes, getClass } from '../services/gameData.js';
import { Completion } from '../models/Completion.js';

const router = Router();

/* -------------------------------------------------------------------------- */
/* GET /api/character                                                         */
/* The character sheet: the serialized character plus per-attribute history    */
/* the sidebar panel does not need but the Character page does.               */
/* -------------------------------------------------------------------------- */

router.get(
  '/',
  asyncRoute(async (req, res) => {
    const user = req.user;

    const rows = await Completion.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: '$attribute',
          quests: { $sum: 1 },
          xp: { $sum: '$xpAwarded' },
          last: { $max: '$createdAt' },
        },
      },
    ]);

    const byAttribute = new Map(rows.map((r) => [r._id, r]));
    const heroClass = getClass(user.characterClass);

    const attributes = getAttributes().map((def) => {
      const id = def.id;
      const state = user.attributes?.get?.(id) ?? { level: 1, xp: 0, totalXp: 0 };
      const row = byAttribute.get(id);
      return {
        id,
        name: def.name,
        short: def.short,
        blurb: def.blurb,
        example: def.example,
        glyph: def.glyph,
        hue: def.hue,
        level: state.level,
        xp: state.xp,
        totalXp: state.totalXp,
        xpToNext: xpForNextAttributeLevel(state.level),
        quests: row?.quests ?? 0,
        lastTrained: row?.last ?? null,
        isFocus: heroClass?.focus === id,
      };
    });

    const strongest = [...attributes].sort((a, b) => b.totalXp - a.totalXp)[0] ?? null;
    const weakest = [...attributes].sort((a, b) => a.totalXp - b.totalXp)[0] ?? null;

    res.json({
      character: serializeCharacter(user),
      attributes,
      heroClass,
      strongest: strongest ? { id: strongest.id, name: strongest.name } : null,
      weakest: weakest ? { id: weakest.id, name: weakest.name } : null,
    });
  }),
);

export default router;

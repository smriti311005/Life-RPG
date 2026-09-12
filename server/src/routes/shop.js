import { Router } from 'express';

import { getShopItems, getShopItem } from '../services/gameData.js';
import { ApiError, asyncRoute } from '../middleware/error.js';
import { serializeCharacter } from '../services/character.js';

const router = Router();

/** Project the static catalog through one user's ownership and level. */
function projectForUser(user) {
  return getShopItems().map((item) => {
    const owned = user.ownedItemIds.includes(item.id);
    const held = user.inventory.find((entry) => entry.itemId === item.id);

    return {
      id: item.id,
      kind: item.kind,
      name: item.name,
      description: item.description,
      price: item.price,
      requiresLevel: item.requiresLevel,
      stackable: Boolean(item.stackable),
      payload: item.payload,

      owned,
      charges: held?.charges ?? null,
      locked: user.level < item.requiresLevel,
      affordable: user.gold >= item.price,
      // Cosmetics are a one-time purchase; consumables can be restocked.
      purchasable:
        (item.stackable || !owned) &&
        user.level >= item.requiresLevel &&
        user.gold >= item.price,
    };
  });
}

/* -------------------------------------------------------------------------- */
/* GET /api/shop                                                              */
/* -------------------------------------------------------------------------- */

router.get(
  '/',
  asyncRoute(async (req, res) => {
    res.json({ items: projectForUser(req.user), gold: req.user.gold });
  }),
);

/* -------------------------------------------------------------------------- */
/* POST /api/shop/:itemId/buy                                                 */
/* -------------------------------------------------------------------------- */

router.post(
  '/:itemId/buy',
  asyncRoute(async (req, res) => {
    const user = req.user;
    const item = getShopItem(req.params.itemId);

    if (!item) throw new ApiError(404, 'No such item is for sale.');

    // Every gate is re-checked here. The shop list the client rendered is a
    // hint, not an authorisation.
    if (user.level < item.requiresLevel) {
      throw new ApiError(403, `That unlocks at level ${item.requiresLevel}.`);
    }
    if (!item.stackable && user.ownedItemIds.includes(item.id)) {
      throw new ApiError(409, 'You already own that.');
    }
    if (user.gold < item.price) {
      throw new ApiError(402, `You need ${item.price - user.gold} more gold.`);
    }

    user.gold -= item.price;
    user.lifetime.goldSpent += item.price;

    if (!user.ownedItemIds.includes(item.id)) user.ownedItemIds.push(item.id);

    if (item.stackable) {
      const held = user.inventory.find((entry) => entry.itemId === item.id);
      if (held) held.charges = (held.charges ?? 0) + (item.payload.charges ?? 1);
      else {
        user.inventory.push({
          itemId: item.id,
          kind: item.kind,
          charges: item.payload.charges ?? 1,
        });
      }
    } else if (!user.inventory.some((entry) => entry.itemId === item.id)) {
      user.inventory.push({ itemId: item.id, kind: item.kind, charges: null });
    }

    // Cosmetics equip themselves on purchase — buying then hunting for a
    // second "equip" click is a needless step.
    if (item.kind === 'theme') user.equipped.theme = item.payload.theme;
    if (item.kind === 'title') user.equipped.title = item.payload.title;
    if (item.kind === 'badge') user.equipped.badge = item.payload.badge;

    await user.save();

    res.json({
      character: serializeCharacter(user),
      items: projectForUser(user),
      purchased: { id: item.id, name: item.name, kind: item.kind, price: item.price },
    });
  }),
);

/* -------------------------------------------------------------------------- */
/* POST /api/shop/:itemId/use                                                 */
/* -------------------------------------------------------------------------- */

router.post(
  '/:itemId/use',
  asyncRoute(async (req, res) => {
    const user = req.user;
    const item = getShopItem(req.params.itemId);

    if (!item) throw new ApiError(404, 'No such item.');
    if (item.kind !== 'consumable') throw new ApiError(400, 'That item is not consumable.');

    const held = user.inventory.find((entry) => entry.itemId === item.id);
    if (!held || !held.charges) throw new ApiError(409, 'You have none of those left.');

    let message;

    if (item.payload.effect === 'xpElixir') {
      held.charges -= 1;
      user.effects.xpElixirCharges += item.payload.charges ?? 5;
      message = `Focus sharpens. Your next ${user.effects.xpElixirCharges} completions earn +50% XP.`;
    } else if (item.payload.effect === 'streakShield') {
      held.charges -= 1;
      user.streak.shields += 1;
      message = 'A ward settles over your streak. One missed day will be absorbed.';
    } else {
      throw new ApiError(400, 'That item has no effect to invoke.');
    }

    if (held.charges <= 0) {
      user.inventory = user.inventory.filter((entry) => entry.itemId !== item.id);
      user.ownedItemIds = user.ownedItemIds.filter((id) => id !== item.id);
    }

    await user.save();

    res.json({ character: serializeCharacter(user), items: projectForUser(user), message });
  }),
);

export default router;

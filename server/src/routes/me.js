import { Router } from 'express';
import { z } from 'zod';

import { ApiError, asyncRoute } from '../middleware/error.js';
import { serializeCharacter } from '../services/character.js';
import {
  getShopItem,
  getShopItems,
  getClasses,
  getClass,
  isClass,
  getFocusAreas,
  getFocusArea,
  getAttribute,
} from '../services/gameData.js';
import { Task } from '../models/Task.js';
import { dayKey, daysBetween } from '../utils/day.js';

const router = Router();

/* -------------------------------------------------------------------------- */
/* POST /api/me/sync                                                          */
/* Called right after Firebase sign-in. Creates the character on first visit   */
/* and refreshes the profile mirror + timezone on every later visit.           */
/* -------------------------------------------------------------------------- */

const syncInput = z.object({
  timezoneOffset: z.number().int().min(-900).max(900).optional(),
  displayName: z.string().trim().min(1).max(40).optional(),
  photoURL: z.string().url().max(500).nullable().optional(),
});

router.post(
  '/sync',
  asyncRoute(async (req, res) => {
    const data = syncInput.parse(req.body ?? {});
    const user = req.user;
    const isNew = !user.onboardedAt;

    if (typeof data.timezoneOffset === 'number') {
      user.settings.timezoneOffset = data.timezoneOffset;
    }
    // Trust Firebase's copy of the profile over anything the client states.
    if (req.firebaseClaims?.name) user.displayName = req.firebaseClaims.name.slice(0, 40);
    else if (data.displayName) user.displayName = data.displayName;
    if (req.firebaseClaims?.picture) user.photoURL = req.firebaseClaims.picture;
    if (req.firebaseClaims?.email) user.email = req.firebaseClaims.email;

    if (isNew) user.onboardedAt = new Date();

    /* A streak that lapsed while the user was away should read as broken the
     * moment they open the app, not stay stale until their next completion. */
    const today = dayKey(new Date(), user.settings.timezoneOffset);
    const gap = daysBetween(user.streak.lastActiveDay, today);
    if (user.streak.lastActiveDay && gap > 1) {
      if (gap === 2 && user.streak.shields > 0) {
        // Ward still held; the chain is intact until another day passes.
      } else {
        user.streak.current = 0;
      }
    }

    await user.save();

    res.json({ character: serializeCharacter(user), isNewCharacter: isNew, today });
  }),
);

/* -------------------------------------------------------------------------- */
/* GET /api/me                                                                */
/* -------------------------------------------------------------------------- */

router.get(
  '/',
  asyncRoute(async (req, res) => {
    res.json({
      character: serializeCharacter(req.user),
      today: dayKey(new Date(), req.user.settings.timezoneOffset),
    });
  }),
);

/* -------------------------------------------------------------------------- */
/* PATCH /api/me                                                              */
/* -------------------------------------------------------------------------- */

const profilePatch = z.object({
  displayName: z.string().trim().min(1, 'A name is required.').max(40).optional(),
  reducedMotion: z.boolean().optional(),
  mode: z.enum(['system', 'light', 'dark']).optional(),
  timezoneOffset: z.number().int().min(-900).max(900).optional(),
  equip: z
    .object({
      theme: z.string().max(60).optional(),
      title: z.string().max(60).nullable().optional(),
      badge: z.string().max(16).nullable().optional(),
    })
    .optional(),
});

router.patch(
  '/',
  asyncRoute(async (req, res) => {
    const parsed = profilePatch.safeParse(req.body ?? {});
    if (!parsed.success) {
      const details = {};
      for (const issue of parsed.error.issues) {
        details[issue.path.join('.') || 'form'] = issue.message;
      }
      throw new ApiError(422, 'Please check the highlighted fields.', details);
    }

    const data = parsed.data;
    const user = req.user;

    if (data.displayName) user.displayName = data.displayName;
    if (typeof data.reducedMotion === 'boolean') user.settings.reducedMotion = data.reducedMotion;
    if (data.mode) user.settings.mode = data.mode;
    if (typeof data.timezoneOffset === 'number') user.settings.timezoneOffset = data.timezoneOffset;

    /* Equipping is a privilege check: you may only wear what you own. The
     * free themes and the empty title are always permitted.
     *
     * "Free" is read off the catalogue rather than hard-coded to one id, so
     * adding another no-cost palette does not also require editing this
     * guard — and so an account created before the default changed can still
     * wear the palette it was given. */
    if (data.equip) {
      const { theme, title, badge } = data.equip;

      if (theme !== undefined) {
        const owned = user.ownedItemIds.some((id) => getShopItem(id)?.payload?.theme === theme);
        const free = getShopItems().some(
          (item) => item.price === 0 && item.payload?.theme === theme,
        );
        if (!owned && !free) {
          throw new ApiError(403, 'You do not own that theme yet.');
        }
        user.equipped.theme = theme;
      }

      if (title !== undefined) {
        if (title !== null) {
          const owned = user.ownedItemIds.some((id) => getShopItem(id)?.payload?.title === title);
          if (!owned) throw new ApiError(403, 'You do not own that title yet.');
        }
        user.equipped.title = title;
      }

      if (badge !== undefined) {
        if (badge !== null) {
          const owned = user.ownedItemIds.some((id) => getShopItem(id)?.payload?.badge === badge);
          if (!owned) throw new ApiError(403, 'You do not own that badge yet.');
        }
        user.equipped.badge = badge;
      }
    }

    await user.save();
    res.json({ character: serializeCharacter(user) });
  }),
);

/* -------------------------------------------------------------------------- */
/* GET /api/me/onboarding                                                     */
/* The choices offered in the character-creation flow.                        */
/* -------------------------------------------------------------------------- */

router.get(
  '/onboarding',
  asyncRoute(async (req, res) => {
    res.json({
      classes: getClasses(),
      focusAreas: getFocusAreas().map((area) => ({
        id: area.id,
        name: area.name,
        glyph: area.glyph,
        attribute: area.attribute,
        attributeName: getAttribute(area.attribute)?.name ?? area.attribute,
        questCount: area.quests.length,
      })),
      needsOnboarding: !req.user.characterClass,
    });
  }),
);

/* -------------------------------------------------------------------------- */
/* POST /api/me/onboarding                                                    */
/* -------------------------------------------------------------------------- */

const onboardingInput = z.object({
  characterClass: z.string().refine(isClass, 'That is not a known class.'),
  focusAreas: z.array(z.string().max(40)).max(8).optional(),
  displayName: z.string().trim().min(1).max(40).optional(),
});

router.post(
  '/onboarding',
  asyncRoute(async (req, res) => {
    const parsed = onboardingInput.safeParse(req.body ?? {});
    if (!parsed.success) {
      const details = {};
      for (const issue of parsed.error.issues) {
        details[issue.path.join('.') || 'form'] = issue.message;
      }
      throw new ApiError(422, 'Please choose a class to continue.', details);
    }

    const user = req.user;

    // A class is chosen once. Re-running onboarding must not re-roll a
    // character that already has history behind it.
    if (user.characterClass) {
      throw new ApiError(409, 'Your character has already been created.');
    }

    const data = parsed.data;
    const chosen = getClass(data.characterClass);

    user.characterClass = chosen.id;
    user.focusAreas = (data.focusAreas ?? []).filter(getFocusArea);
    if (data.displayName) user.displayName = data.displayName;
    user.onboardedAt = user.onboardedAt ?? new Date();

    // The class's starting bonus: a couple of free levels in its focus, so a
    // Warrior opens the app already looking like a Warrior.
    for (const [attribute, levels] of Object.entries(chosen.startingBonus ?? {})) {
      // Read the fields explicitly. `user.attributes.get()` hands back a
      // Mongoose subdocument, and spreading one copies its internals rather
      // than level/xp/totalXp — which silently drops the bonus.
      const current = user.attributes.get(attribute);
      user.attributes.set(attribute, {
        level: (current?.level ?? 1) + levels,
        xp: current?.xp ?? 0,
        totalXp: current?.totalXp ?? 0,
      });
    }

    /* Seed the board from the chosen focus areas. An empty quest log is the
     * worst possible first screen, and these are editable like any other. */
    const seedQuests = user.focusAreas
      .flatMap((id) => {
        const area = getFocusArea(id);
        return area.quests.map((quest) => ({ ...quest, attribute: area.attribute }));
      })
      .slice(0, 12);

    if (seedQuests.length) {
      const existing = await Task.countDocuments({ user: user._id });
      if (existing === 0) {
        await Task.insertMany(
          seedQuests.map((quest, order) => ({
            user: user._id,
            title: quest.title,
            attribute: quest.attribute,
            difficulty: quest.difficulty,
            cadence: quest.cadence,
            order,
          })),
        );
      }
    }

    await user.save();

    res.status(201).json({
      character: serializeCharacter(user),
      questsCreated: seedQuests.length,
    });
  }),
);

export default router;

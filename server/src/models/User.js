import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import { classValidator } from '../services/gameData.js';

const { Schema, model } = mongoose;

/** One attribute track: its own level and its own progress bar. */
const attributeSchema = new Schema(
  {
    level: { type: Number, default: 1, min: 1 },
    xp: { type: Number, default: 0, min: 0 },
    totalXp: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

/* Left empty on purpose. Attribute tracks are created lazily the first time
 * one earns XP, so adding a seventh attribute to the database does not require
 * a migration over every existing user. */
const defaultAttributes = () => ({});

const achievementRecordSchema = new Schema(
  {
    achievementId: { type: String, required: true },
    tier: { type: String, required: true },
    unlockedAt: { type: Date, default: Date.now },
    goldAwarded: { type: Number, default: 0 },
  },
  { _id: false },
);

const inventoryItemSchema = new Schema(
  {
    itemId: { type: String, required: true },
    kind: { type: String, required: true },
    // Consumables hold remaining charges; cosmetics leave this null.
    charges: { type: Number, default: null },
    acquiredAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    /* ------------------------------- identity -------------------------------
     * Two providers are supported. A local account has an email and a password
     * hash; a Firebase account has a uid and no password. `sparse` on both
     * unique indexes is what lets each be absent.
     * ---------------------------------------------------------------------- */
    authProvider: { type: String, enum: ['local', 'firebase'], default: 'local', index: true },

    firebaseUid: { type: String, default: undefined },

    email: { type: String, default: undefined, lowercase: true, trim: true },
    /**
     * bcrypt hash. `select: false` keeps it out of every ordinary query, so it
     * cannot be serialised into a response by accident — the one place that
     * needs it asks for it explicitly.
     */
    passwordHash: { type: String, default: null, select: false },
    passwordChangedAt: { type: Date, default: null },
    displayName: { type: String, default: 'Wanderer', maxlength: 40, trim: true },
    photoURL: { type: String, default: null },

    /* ------------------------------- character ------------------------------ */
    // Chosen once during onboarding; grants a permanent affinity bonus.
    characterClass: { type: String, default: null, validate: classValidator },
    focusAreas: { type: [String], default: () => [] },

    level: { type: Number, default: 1, min: 1 },
    xp: { type: Number, default: 0, min: 0 },
    totalXp: { type: Number, default: 0, min: 0 },
    gold: { type: Number, default: 60, min: 0 },

    attributes: {
      type: Map,
      of: attributeSchema,
      default: defaultAttributes,
    },

    /* -------------------------------- streak -------------------------------- */
    streak: {
      current: { type: Number, default: 0, min: 0 },
      longest: { type: Number, default: 0, min: 0 },
      lastActiveDay: { type: String, default: null }, // YYYY-MM-DD, user-local
      shields: { type: Number, default: 0, min: 0 },
    },

    /* ----------------------------- achievements ----------------------------- */
    achievements: { type: [achievementRecordSchema], default: () => [] },

    /* ------------------------------- inventory ------------------------------ */
    inventory: { type: [inventoryItemSchema], default: () => [] },
    ownedItemIds: { type: [String], default: () => [] },

    equipped: {
      theme: { type: String, default: 'hogwarts' },
      title: { type: String, default: null },
      badge: { type: String, default: null },
    },

    /* -------------------------- active consumables -------------------------- */
    effects: {
      xpElixirCharges: { type: Number, default: 0, min: 0 },
    },

    /* ------------------------------- lifetime ------------------------------- */
    lifetime: {
      tasksCompleted: { type: Number, default: 0, min: 0 },
      goldEarned: { type: Number, default: 0, min: 0 },
      goldSpent: { type: Number, default: 0, min: 0 },
    },

    settings: {
      // Minutes behind UTC, per `Date#getTimezoneOffset()`.
      timezoneOffset: { type: Number, default: 0 },
      reducedMotion: { type: Boolean, default: false },
      // Dark is the default: the backdrop film is a castle at midnight and the
      // whole palette is read off it. Players can still choose light or system.
      mode: { type: String, enum: ['system', 'light', 'dark'], default: 'dark' },
    },

    onboardedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

/** Cost 12: roughly a quarter-second per hash on commodity hardware, which is
 * slow enough to make offline cracking expensive and fast enough that a login
 * still feels instant. */
/* Unique only among documents that actually have the field. A sparse index
 * would not do: it skips missing fields but still indexes explicit nulls, so
 * every local account (no firebaseUid) would collide with every other. */
userSchema.index(
  { firebaseUid: 1 },
  { unique: true, partialFilterExpression: { firebaseUid: { $type: 'string' } } },
);
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } },
);

export const BCRYPT_ROUNDS = 12;

userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, BCRYPT_ROUNDS);
  this.passwordChangedAt = new Date();
};

/**
 * Constant-time-ish comparison via bcrypt.
 *
 * When the account has no password (a Firebase account, or one still being
 * created) this still runs a hash against a dummy value, so the response time
 * does not reveal whether the address exists.
 */
userSchema.methods.verifyPassword = async function verifyPassword(plain) {
  if (!this.passwordHash) {
    await bcrypt.compare(plain, '$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
    return false;
  }
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.attr = function attr(id) {
  return this.attributes.get(id) ?? { level: 1, xp: 0, totalXp: 0 };
};

export const User = model('User', userSchema);

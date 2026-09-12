import mongoose from 'mongoose';
import { attributeValidator, difficultyValidator } from '../services/gameData.js';

const { Schema, model } = mongoose;

/**
 * An immutable ledger row, written once per completion.
 *
 * Fields are snapshotted rather than joined: a task can later be renamed,
 * re-tiered or deleted, and the history of what was actually earned must not
 * change underneath the player.
 */
const completionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    task: { type: Schema.Types.ObjectId, ref: 'Task', default: null },

    title: { type: String, required: true },
    attribute: { type: String, required: true, validate: attributeValidator },
    difficulty: { type: String, required: true, validate: difficultyValidator },

    xpAwarded: { type: Number, required: true },
    goldAwarded: { type: Number, required: true },
    multiplier: { type: Number, default: 1 },

    /** User-local `YYYY-MM-DD` — the unit streaks and the heatmap count in. */
    day: { type: String, required: true, index: true },

    leveledTo: { type: Number, default: null },
  },
  { timestamps: true },
);

// Powers the activity heatmap and the recent-history feed.
completionSchema.index({ user: 1, day: -1 });
completionSchema.index({ user: 1, createdAt: -1 });

export const Completion = model('Completion', completionSchema);

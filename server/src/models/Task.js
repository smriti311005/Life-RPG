import mongoose from 'mongoose';
import { attributeValidator, difficultyValidator } from '../services/gameData.js';

const { Schema, model } = mongoose;

const taskSchema = new Schema(
  {
    // Every query in the app is scoped by this. It is set from the verified
    // token, never from the request body.
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    title: { type: String, required: true, trim: true, maxlength: 120 },
    notes: { type: String, default: '', trim: true, maxlength: 500 },

    // Validated against the definitions loaded from the database at boot,
    // rather than a literal enum baked in at module load.
    attribute: { type: String, required: true, validate: attributeValidator },
    difficulty: { type: String, default: 'normal', validate: difficultyValidator },

    /** `once` — a one-off quest. `daily` — repeats, and feeds the streak. */
    cadence: { type: String, enum: ['once', 'daily'], default: 'once' },

    status: { type: String, enum: ['active', 'done', 'archived'], default: 'active', index: true },

    /** Last user-local day this task was completed (`YYYY-MM-DD`). */
    lastCompletedDay: { type: String, default: null },
    completedAt: { type: Date, default: null },
    completionCount: { type: Number, default: 0, min: 0 },

    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// The dashboard's main read: a user's board, newest-first within a status.
taskSchema.index({ user: 1, status: 1, order: 1, createdAt: -1 });

/**
 * Can this task be completed right now?
 * A daily resets each local day; a one-off is spent for good.
 */
taskSchema.methods.isCompletableOn = function isCompletableOn(today) {
  if (this.status === 'archived') return false;
  if (this.cadence === 'daily') return this.lastCompletedDay !== today;
  return this.status !== 'done';
};

export const Task = model('Task', taskSchema);

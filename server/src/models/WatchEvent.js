'use strict';

const mongoose = require('mongoose');

/**
 * One document per (user, episode). Rather than appending a row every playback
 * tick (which would hammer the DB and bloat the log), progress events UPSERT this
 * document and advance `positionSec` with $max — the server keeps the *furthest*
 * position, not the latest. `plays` and `watchedAt` preserve enough signal for the
 * recommender's co-watch vectors without a separate append log.
 */
const watchEventSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    titleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Title', required: true, index: true },
    episodeId: { type: mongoose.Schema.Types.ObjectId, required: true },
    season: { type: Number, default: 1 },
    episode: { type: Number, default: 1 },

    // Furthest watched position in seconds.
    positionSec: { type: Number, default: 0 },
    durationSec: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    plays: { type: Number, default: 1 },

    firstWatchedAt: { type: Date, default: Date.now },
    watchedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

// Compound index: progress lookups (continue watching, resume) are the hottest read.
watchEventSchema.index({ userId: 1, episodeId: 1 }, { unique: true });
watchEventSchema.index({ userId: 1, watchedAt: -1 });

// TTL keeps stale, incomplete progress from growing without bound. Completed
// episodes are excluded so history that feeds recommendations is not silently dropped.
watchEventSchema.index(
  { watchedAt: 1 },
  {
    expireAfterSeconds: 60 * 60 * 24 * 180, // ~180 days
    partialFilterExpression: { completed: false },
  }
);

module.exports = mongoose.model('WatchEvent', watchEventSchema);

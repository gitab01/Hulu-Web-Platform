'use strict';

const mongoose = require('mongoose');

const episodeSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true },
    title: { type: String, required: true },
    synopsis: { type: String, default: '' },
    durationSec: { type: Number, default: 0 },
    // In production this is an origin path to sharded media segments; it is NEVER
    // returned to the client directly — playback goes through a signed URL.
    mediaUrl: { type: String, required: true },
  },
  { _id: true }
);

const seasonSchema = new mongoose.Schema(
  {
    season: { type: Number, required: true },
    year: { type: Number, default: null },
    episodes: { type: [episodeSchema], default: [] },
  },
  { _id: true }
);

const titleSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    type: { type: String, enum: ['series', 'movie'], required: true, default: 'series' },
    name: { type: String, required: true },
    synopsis: { type: String, default: '' },
    genres: { type: [String], default: [], index: true },
    posterUrl: { type: String, default: '' },
    backdropUrl: { type: String, default: '' },
    year: { type: Number, default: null },
    maturity: { type: String, default: 'TV-MA' },

    // Nested because the access pattern always fetches a whole title; avoids a
    // join-equivalent lookup for the detail page.
    seasons: { type: [seasonSchema], default: [] },

    // Denormalised, batch-computed output of the nightly similarity job —
    // trading recompute cost for read latency on the "Because You Watched" row.
    similarTitles: {
      type: [{ _id: mongoose.Schema.Types.ObjectId, score: Number }],
      default: [],
    },

    // Rolling popularity score (recent completions). Used by Trending + cold start.
    popularity: { type: Number, default: 0, index: true },
    completedLast30d: { type: Number, default: 0 },
  },
  { versionKey: false }
);

titleSchema.index({ name: 'text', synopsis: 'text' });

titleSchema.methods.firstEpisode = function firstEpisode() {
  const season = this.seasons[0];
  return season && season.episodes[0];
};

module.exports = mongoose.model('Title', titleSchema);

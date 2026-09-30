'use strict';

const Title = require('../models/Title');
const WatchEvent = require('../models/WatchEvent');
const { VALID_GENRES } = require('../data/genres');

const GENRE_AXIS = VALID_GENRES;

/**
 * Recommendation is deliberately simple and explainable: no deep model, because
 * the dataset is small and an opaque model would be worse to debug. Two signals:
 *   - collaborative: co-watch counts between titles (item-item),
 *   - content: genre one-hot vectors.
 * Each title becomes the concatenation of a normalized genre vector and a
 * normalized co-watch column; cosine similarity over that produces "similar titles".
 */

function genreVector(genres) {
  const v = GENRE_AXIS.map((g) => (genres.includes(g) ? 1 : 0));
  return v.some((x) => x > 0) ? v : GENRE_AXIS.map(() => 0);
}

function cosine(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Build the co-watch count matrix from the behaviour log (one entry per user per title). */
async function buildCoWatch() {
  const rows = await WatchEvent.aggregate([
    { $group: { _id: { user: '$userId', title: '$titleId' } } },
    { $group: { _id: '$_id.user', titles: { $push: '$_id.title' } } },
  ]);

  const co = new Map(); // "a|b" -> count
  for (const row of rows) {
    const titles = [...new Set(row.titles.map(String))];
    for (let i = 0; i < titles.length; i += 1) {
      for (let j = 0; j < titles.length; j += 1) {
        if (i === j) continue;
        const key = `${titles[i]}|${titles[j]}`;
        co.set(key, (co.get(key) || 0) + 1);
      }
    }
  }
  return co;
}

/**
 * Recompute similar-title lists and persist them to each catalogue document.
 * Runs as the nightly batch job, never on a browse request.
 */
async function recomputeSimilarity({ topN = 8 } = {}) {
  const titles = await Title.find({}, 'name genres');
  const co = await buildCoWatch();
  const ids = titles.map((t) => String(t._id));

  // Column vector of co-watch counts toward every other title, normalized.
  const coVectorFor = (id) => {
    const col = ids.map((other) => (other === id ? 0 : co.get(`${other}|${id}`) || 0));
    const denom = Math.sqrt(col.reduce((s, x) => s + x * x, 0));
    return denom > 0 ? col.map((x) => x / denom) : col;
  };

  const genreVecs = new Map();
  const coVecs = new Map();
  for (const t of titles) {
    const id = String(t._id);
    genreVecs.set(id, genreVector(t.genres));
    coVecs.set(id, coVectorFor(id));
  }

  const updates = [];
  for (const t of titles) {
    const id = String(t._id);
    const base = [...genreVecs.get(id), ...coVecs.get(id)];
    const scores = [];
    for (const other of titles) {
      const oid = String(other._id);
      if (oid === id) continue;
      const otherVec = [...genreVecs.get(oid), ...coVecs.get(oid)];
      const s = cosine(base, otherVec);
      // Titles with no shared viewers still share genres; keep the blend meaningful
      // by requiring a positive score.
      if (s > 0.01) scores.push({ _id: other._id, score: Number(s.toFixed(4)) });
    }
    scores.sort((a, b) => b.score - a.score);
    updates.push({ updateOne: { filter: { _id: t._id }, update: { $set: { similarTitles: scores.slice(0, topN) } } } });
  }

  if (updates.length) await Title.bulkWrite(updates);
  return { titles: titles.length, updated: updates.length };
}

/**
 * "Because You Watched" — item-item similarity over the user's recent titles.
 * Returns [] for users without history so the caller can fall back (and hide the row).
 */
async function becauseYouWatched(userId, { limit = 12 } = {}) {
  const recent = await WatchEvent.find({ userId })
    .sort({ watchedAt: -1 })
    .limit(6)
    .distinct('titleId');

  if (!recent.length) return [];

  const docs = await Title.find({ _id: { $in: recent } }, 'similarTitles');
  const seen = new Set(recent.map(String));
  const ranked = new Map();
  for (const doc of docs) {
    for (const sim of doc.similarTitles || []) {
      const key = String(sim._id);
      if (seen.has(key)) continue;
      ranked.set(key, Math.max(ranked.get(key) || 0, sim.score));
    }
  }

  const ordered = [...ranked.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  if (!ordered.length) return [];

  const byId = new Map();
  const titles = await Title.find({ _id: { $in: ordered.map(([id]) => id) } });
  titles.forEach((t) => byId.set(String(t._id), t));
  return ordered.map(([id, score]) => ({ title: byId.get(id), score })).filter((x) => x.title);
}

/**
 * Cold-start fallback: rank by genre affinity the user picked at signup, weighted
 * by recent completion rate (popularity). Last resort is global popularity so a
 * brand-new user still gets a useful front page rather than an empty row.
 */
async function coldStartRecommendations(user, { limit = 12 } = {}) {
  const genres = (user && user.genres) || [];
  let rows;
  if (genres.length) {
    rows = await Title.find({ genres: { $in: genres } })
      .sort({ popularity: -1, completedLast30d: -1 })
      .limit(limit);
  }
  if (!rows || rows.length === 0) {
    rows = await Title.find({}).sort({ popularity: -1, completedLast30d: -1 }).limit(limit);
  }
  return rows;
}

module.exports = { recomputeSimilarity, becauseYouWatched, coldStartRecommendations, cosine, genreVector };

'use strict';

const express = require('express');
const Title = require('../models/Title');
const WatchEvent = require('../models/WatchEvent');
const { optionalAuth } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimit');
const { asyncHandler } = require('../middleware/error');
const { titleSummary, titleDetail } = require('../utils/serialize');
const recs = require('../services/recommendation');
const rowCache = require('../services/rowCache');

const router = express.Router();
const ROW_TTL = 30 * 1000; // short: browse is read-heavy and repeatable

const trendingRow = rowCache.wrap('row:trending', ROW_TTL, async () => {
  const rows = await Title.find({}).sort({ popularity: -1, completedLast30d: -1 }).limit(20);
  return rows.map(titleSummary);
});

const newReleasesRow = rowCache.wrap('row:new', ROW_TTL, async () => {
  const rows = await Title.find({}).sort({ year: -1, createdAt: -1 }).limit(20);
  return rows.map(titleSummary);
});

async function continueWatching(userId) {
  const events = await WatchEvent.find({ userId, completed: false })
    .sort({ watchedAt: -1 })
    .limit(20);
  const ids = [...new Set(events.map((e) => String(e.titleId)))];
  const titles = await Title.find({ _id: { $in: ids } });
  const byId = new Map(titles.map((t) => [String(t._id), t]));
  const seen = new Set();
  const items = [];
  for (const e of events) {
    const key = String(e.titleId);
    if (seen.has(key)) continue;
    seen.add(key);
    const t = byId.get(key);
    if (!t) continue;
    items.push({ ...titleSummary(t), progress: { episodeId: String(e.episodeId), positionSec: e.positionSec, durationSec: e.durationSec } });
  }
  return items;
}

/**
 * Home rows are server-composed. Each row has its own resolver and cache policy;
 * a slow personalized row never blocks the global ones. Empty personalized rows
 * are dropped rather than returned empty (see challenges: cold-start row).
 */
router.get(
  '/rows',
  apiLimiter,
  optionalAuth,
  asyncHandler(async (req, res) => {
    const rows = [];

    if (req.user) {
      const cont = await continueWatching(req.user._id);
      if (cont.length) rows.push({ key: 'continue_watching', title: 'Continue Watching', items: cont });
    }

    rows.push({ key: 'trending', title: 'Trending Now', items: await trendingRow() });

    if (req.user) {
      const because = await recs.becauseYouWatched(req.user._id);
      if (because.length) {
        rows.push({ key: 'because_you_watched', title: 'Because You Watched', items: because.map((r) => titleSummary(r.title)) });
      } else {
        const forYou = await recs.coldStartRecommendations(req.user);
        if (forYou.length) {
          rows.push({ key: 'for_you', title: req.user.genres.length ? 'Recommended For You' : 'Popular With New Members', items: forYou.map(titleSummary) });
        }
      }
    }

    rows.push({ key: 'new_releases', title: 'New Releases', items: await newReleasesRow() });

    res.json({ rows });
  })
);

router.get(
  '/titles/:slug',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const title = await Title.findOne({ slug: req.params.slug });
    if (!title) return res.status(404).json({ error: { code: 'not_found', message: 'Title not found' } });

    const detail = titleDetail(title);

    if (req.user) {
      const events = await WatchEvent.find({ userId: req.user._id, titleId: title._id });
      const progressByEpisode = {};
      let resume = null;
      for (const e of events) {
        progressByEpisode[String(e.episodeId)] = { positionSec: e.positionSec, completed: e.completed };
        if (!e.completed && (!resume || e.watchedAt > resume.watchedAt)) {
          resume = { episodeId: String(e.episodeId), positionSec: e.positionSec, watchedAt: e.watchedAt };
        }
      }
      detail.progressByEpisode = progressByEpisode;
      detail.resume = resume ? { episodeId: resume.episodeId, positionSec: resume.positionSec } : null;
    }

    const similar = (await Title.find({ _id: { $in: (title.similarTitles || []).map((s) => s._id) } }))
      .sort((a, b) => {
        const rank = (t) => (title.similarTitles.find((s) => String(s._id) === String(t._id)) || {}).score || 0;
        return rank(b) - rank(a);
      });
    detail.similarTitles = similar.map(titleSummary);

    res.json({ title: detail });
  })
);

router.get(
  '/titles/id/:id',
  optionalAuth,
  asyncHandler(async (req, res) => {
    const title = await Title.findById(req.params.id);
    if (!title) return res.status(404).json({ error: { code: 'not_found', message: 'Title not found' } });

    const detail = titleDetail(title);
    if (req.user) {
      const events = await WatchEvent.find({ userId: req.user._id, titleId: title._id });
      const progressByEpisode = {};
      let resume = null;
      for (const e of events) {
        progressByEpisode[String(e.episodeId)] = { positionSec: e.positionSec, completed: e.completed };
        if (!e.completed && (!resume || e.watchedAt > resume.watchedAt)) {
          resume = { episodeId: String(e.episodeId), positionSec: e.positionSec, watchedAt: e.watchedAt };
        }
      }
      detail.progressByEpisode = progressByEpisode;
      detail.resume = resume ? { episodeId: resume.episodeId, positionSec: resume.positionSec } : null;
    }
    res.json({ title: detail });
  })
);

router.get(
  '/search',
  apiLimiter,
  asyncHandler(async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json({ results: [] });
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const rows = await Title.find({ $or: [{ name: rx }, { genres: rx }] }).limit(24);
    res.json({ results: rows.map(titleSummary) });
  })
);

module.exports = router;

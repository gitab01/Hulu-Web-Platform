'use strict';

const express = require('express');
const Title = require('../models/Title');
const WatchEvent = require('../models/WatchEvent');
const Channel = require('../models/Channel');
const { optionalAuth } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimit');
const { asyncHandler } = require('../middleware/error');
const { titleSummary, titleDetail, channelSummary, channelDetail } = require('../utils/serialize');
const recs = require('../services/recommendation');
const rowCache = require('../services/rowCache');
const liveStatus = require('../services/liveStatus');

const router = express.Router();
const ROW_TTL = 30 * 1000; // short: browse is read-heavy and repeatable

/**
 * Live channels are listed without an entitlement check on purpose: the stream is
 * the broadcaster's own public broadcast, not media we host, so the signed-segment
 * path that gates the VOD catalogue does not apply.
 */
const channelsAll = rowCache.wrap('channels:all', 60 * 1000, async () => {
  const rows = await Channel.find({ active: true }).sort({ displayRank: 1, name: 1 });
  return rows.map(channelSummary);
});

/** The locally produced slate, ordered by our own watch signal. */
const originalsRow = rowCache.wrap('row:originals', ROW_TTL, async () => {
  const rows = await Title.find({ origin: 'Ethiopia' })
    .sort({ popularity: -1, externalPopularity: -1, year: -1 })
    .limit(20);
  return rows.map(titleSummary);
});

/**
 * The acquired catalogue's two global rows. They skip the local slate on purpose:
 * the originals have their own row and the hero, so repeating the same six covers
 * three times down one page is a layout fault, not a ranking.
 */
const ACQUIRED = { origin: { $ne: 'Ethiopia' } };

const trendingRow = rowCache.wrap('row:trending', ROW_TTL, async () => {
  // Our own completions rank first; the imported market signal breaks the tie for
  // titles nobody has watched yet, so a fresh catalogue still orders sensibly.
  const rows = await Title.find(ACQUIRED).sort({ popularity: -1, externalPopularity: -1, completedLast30d: -1 }).limit(20);
  return rows.map(titleSummary);
});

const newReleasesRow = rowCache.wrap('row:new', ROW_TTL, async () => {
  const rows = await Title.find(ACQUIRED).sort({ year: -1, externalPopularity: -1, createdAt: -1 }).limit(20);
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

    // The local slate opens the page: this service is Ethiopian first, and an
    // acquired international catalogue should not be the first thing a member sees.
    const originals = await originalsRow();
    if (originals.length) {
      rows.push({ key: 'ethiopian_originals', title: 'Ethiopian Originals', titleLocal: 'ኢትዮጵያ', items: originals });
    }

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
    const rows = await Title.find({ $or: [{ name: rx }, { nameLocal: rx }, { genres: rx }] }).limit(24);
    res.json({ results: rows.map(titleSummary) });
  })
);

router.get(
  '/channels',
  apiLimiter,
  asyncHandler(async (req, res) => {
    const all = await channelsAll();
    const category = String(req.query.category || '').trim();
    const kind = String(req.query.kind || '').trim();
    const country = String(req.query.country || '').trim();
    const q = String(req.query.q || '').trim().toLowerCase();
    const limit = Math.min(parseInt(req.query.limit, 10) || 0, all.length || 1);

    let items = all;
    if (category && category !== 'All') items = items.filter((c) => c.category === category);
    if (kind === 'tv' || kind === 'radio') items = items.filter((c) => c.kind === kind);
    if (country) items = items.filter((c) => c.country === country);
    if (q) items = items.filter((c) => `${c.name} ${c.country} ${c.language}`.toLowerCase().includes(q));
    if (limit > 0) items = items.slice(0, limit);

    res.json({
      categories: ['All', ...Channel.CATEGORIES],
      kinds: ['tv', 'radio'],
      countries: [...new Set(all.map((c) => c.country))],
      channels: items,
    });
  })
);

/**
 * On-air badges for the grid, asked for after the tiles have painted so a slow
 * lookup never delays the list. Only the first handful of slugs are answered: the
 * rest simply carry no badge, which the client renders as silence rather than as
 * "off air".
 */
router.get(
  '/channels/live',
  apiLimiter,
  asyncHandler(async (req, res) => {
    const slugs = String(req.query.slugs || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 12);
    if (!slugs.length) return res.json({ statuses: [] });

    const rows = await Channel.find({ slug: { $in: slugs }, active: true }).select('slug youtubeChannelId');
    const byChannel = new Map(rows.filter((r) => r.youtubeChannelId).map((r) => [r.youtubeChannelId, r.slug]));
    const found = await liveStatus.statuses([...byChannel.keys()]);
    res.json({
      statuses: found
        .filter((s) => byChannel.has(s.channelId))
        .map((s) => ({ slug: byChannel.get(s.channelId), onAir: s.onAir, liveVideoId: s.liveVideoId })),
    });
  })
);

router.get(
  '/channels/:slug',
  apiLimiter,
  asyncHandler(async (req, res) => {
    const doc = await Channel.findOne({ slug: req.params.slug, active: true });
    if (!doc) return res.status(404).json({ error: { code: 'not_found', message: 'Channel not found' } });

    // Resolved per request and cached in the service, so the embed opens whatever
    // the broadcaster is streaming now instead of a black frame. Handed over
    // unmodified: an unanswered lookup is unknown, not off air.
    const liveVideoId = await liveStatus.liveVideoId(doc.youtubeChannelId);

    const all = await channelsAll();
    const related = all.filter((c) => c.slug !== doc.slug && c.category === doc.category).slice(0, 8);
    res.json({ channel: channelDetail(doc, liveVideoId), related });
  })
);

module.exports = router;

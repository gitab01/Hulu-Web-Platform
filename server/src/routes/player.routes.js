'use strict';

const express = require('express');
const Title = require('../models/Title');
const WatchEvent = require('../models/WatchEvent');
const Subscription = require('../models/Subscription');
const { requireAuth } = require('../middleware/auth');
const { requireEntitlement } = require('../middleware/entitlement');
const { asyncHandler } = require('../middleware/error');
const playback = require('../utils/playbackSign');
const ApiError = require('../utils/ApiError');

const router = express.Router();

function apiBase(req) {
  return process.env.API_PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
}

function findEpisode(title, episodeId) {
  for (const season of title.seasons) {
    const ep = season.episodes.find((e) => String(e._id) === String(episodeId));
    if (ep) return { episode: ep, season: season.season };
  }
  return null;
}

/**
 * Issue a short-lived, title-scoped signed playback URL. Entitlement is checked
 * HERE (at token issue time) via requireEntitlement. The returned URL is what the
 * player loads; every segment fetch then re-verifies entitlement independently.
 */
router.post(
  '/playback',
  requireAuth,
  requireEntitlement,
  asyncHandler(async (req, res) => {
    const { titleId, episodeId } = req.body || {};
    if (!titleId || !episodeId) throw new ApiError(400, 'titleId and episodeId are required', 'validation_error');

    const title = await Title.findById(titleId);
    if (!title) throw new ApiError(404, 'Title not found', 'not_found');
    const found = findEpisode(title, episodeId);
    if (!found) throw new ApiError(404, 'Episode not found', 'not_found');

    const url = playback.buildPlaybackUrl(apiBase(req), {
      userId: req.user._id.toString(),
      titleId: String(title._id),
      episodeId: String(found.episode._id),
    });

    res.json({
      playbackUrl: url,
      expiresIn: playback.ttlSecondsValue(),
      episode: {
        id: String(found.episode._id),
        title: found.episode.title,
        season: found.season,
        number: found.episode.number,
        durationSec: found.episode.durationSec,
      },
    });
  })
);

/**
 * Segment fetch. The signature alone is NOT sufficient: entitlement is re-checked
 * here so a subscription that lapsed after the URL was minted still cannot serve
 * new segments to a different title. Renewal state is re-checked at the NEXT title,
 * not mid-stream (see challenges: entitlement race) — hence the URL keeps its own
 * expiry independent of subscription status within a session.
 */
router.get(
  '/segment',
  asyncHandler(async (req, res) => {
    const { uid, tid, eid, exp, sig } = req.query;
    const check = playback.verify({ userId: uid, titleId: tid, episodeId: eid, expiresAt: exp, sig });
    if (!check.ok) throw new ApiError(403, `Playback denied: ${check.reason}`, check.reason);

    const entitled = await Subscription.findEntitled(uid);
    if (!entitled) throw new ApiError(402, 'Subscription lapsed', 'no_entitlement');

    const title = await Title.findById(tid);
    if (!title) throw new ApiError(404, 'Title not found', 'not_found');
    const found = findEpisode(title, eid);
    if (!found) throw new ApiError(404, 'Episode not found', 'not_found');

    // Redirect to the actual media segment/origin (never exposed as a plain link).
    res.redirect(302, found.episode.mediaUrl);
  })
);

/**
 * Progress flush. Called on a 10s interval plus on pause, seek, visibilitychange
 * and beforeunload. The server keeps the FURTHEST position ($max), so a late flush
 * from a rewound player never moves progress backwards.
 */
router.post(
  '/progress',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { titleId, episodeId, positionSec, durationSec, completed } = req.body || {};
    if (!titleId || !episodeId) throw new ApiError(400, 'titleId and episodeId are required', 'validation_error');

    const title = await Title.findById(titleId);
    if (!title) throw new ApiError(404, 'Title not found', 'not_found');
    const found = findEpisode(title, episodeId);
    if (!found) throw new ApiError(404, 'Episode not found', 'not_found');

    const pos = Math.max(0, Number(positionSec) || 0);
    const dur = Math.max(0, Number(durationSec) || found.episode.durationSec || 0);
    const isComplete = Boolean(completed) || (dur > 0 && pos >= dur - 5);

    const existing = await WatchEvent.findOne({ userId: req.user._id, episodeId });
    let doc;
    if (existing) {
      existing.positionSec = Math.max(existing.positionSec, pos); // furthest wins
      existing.durationSec = dur || existing.durationSec;
      existing.completed = existing.completed || isComplete;
      existing.plays += 1;
      existing.watchedAt = new Date();
      doc = await existing.save();
    } else {
      doc = await WatchEvent.create({
        userId: req.user._id,
        titleId: title._id,
        episodeId,
        season: found.season,
        episode: found.episode.number,
        positionSec: pos,
        durationSec: dur,
        completed: isComplete,
        watchedAt: new Date(),
      });
    }

    res.json({ ok: true, progress: { positionSec: doc.positionSec, completed: doc.completed } });
  })
);

module.exports = router;

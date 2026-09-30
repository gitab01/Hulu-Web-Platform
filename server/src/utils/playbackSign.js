'use strict';

const crypto = require('crypto');
const config = require('../config');

/**
 * Playback URLs are time-boxed and title-scoped HMAC signatures, issued only
 * after entitlement passes. Authorization is therefore re-established per segment
 * request rather than being a one-time gate at stream start, and a link cannot be
 * hotlisted beyond its validity window or replayed against a different title.
 */
function sign({ userId, titleId, episodeId, expiresAt }) {
  const payload = `${userId}.${titleId}.${episodeId}.${expiresAt}`;
  return crypto.createHmac('sha256', config.playback.secret).update(payload).digest('base64url');
}

function verify({ userId, titleId, episodeId, expiresAt, sig }) {
  const now = Math.floor(Date.now() / 1000);
  if (!expiresAt || Number(expiresAt) < now) {
    return { ok: false, reason: 'expired' };
  }
  const expected = sign({ userId, titleId, episodeId, expiresAt });
  const a = Buffer.from(String(expected));
  const b = Buffer.from(String(sig || ''));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: 'bad_signature' };
  }
  return { ok: true };
}

function buildPlaybackUrl(apiBase, { userId, titleId, episodeId }) {
  const expiresAt = Math.floor(Date.now() / 1000) + config.playback.ttlSeconds;
  const sig = sign({ userId, titleId, episodeId, expiresAt });
  const url = new URL(`${String(apiBase).replace(/\/$/, '')}/player/segment`);
  url.searchParams.set('uid', userId);
  url.searchParams.set('tid', titleId);
  url.searchParams.set('eid', episodeId);
  url.searchParams.set('exp', String(expiresAt));
  url.searchParams.set('sig', sig);
  return url.toString();
}

module.exports = { sign, verify, buildPlaybackUrl, ttlSecondsValue: () => config.playback.ttlSeconds };

'use strict';

/**
 * What to embed for a channel, resolved from the broadcaster's own published feed.
 *
 * YouTube used to offer `embed/live_stream?channel=<id>`, a frame that opened
 * whatever the channel was streaming at that moment. It no longer resolves: the
 * player answers "This video is unavailable" for every channel, live or not, which
 * is the black rectangle that reads as a broken app. An embed needs a real video id.
 *
 * A video id is available without touching the pages YouTube refuses to serve to a
 * server. `https://www.youtube.com/feeds/videos.xml?channel_id=<id>` is the
 * broadcaster's own Atom feed: it answers from any network, names the channel, and
 * lists what it has published most recently — which is the honest thing to put in
 * the player when nothing says otherwise.
 *
 * What the feed cannot settle is whether that video is live at this moment: every
 * feed checked here listed finished uploads, and the channel page that used to
 * answer the question is now served to non-browser clients as an empty shell. So
 * this service never claims a channel is off air: it hands over a playable video id
 * and leaves the on-air question to the player, which knows the answer the moment it
 * loads.
 *
 * Results are cached per channel. A feed updates on the broadcaster's schedule, so
 * an hour is not too long, and a channel that did not answer is retried soon rather
 * than being remembered as broken.
 */

const OK_TTL = 60 * 60 * 1000;
const MISS_TTL = 5 * 60 * 1000;
const FETCH_TIMEOUT = 4000;
const BATCH_LIMIT = 12;
const CONCURRENCY = 4;

const cache = new Map(); // channelId -> { candidate, at, ttl }
const inflight = new Map(); // channelId -> Promise

/**
 * `{ videoId, title }` for the channel's most recent published video, `null` when
 * the feed answered and held nothing, `undefined` when the feed could not be read —
 * so a slow YouTube is never mistaken for a channel with nothing to show.
 */
function cached(channelId) {
  const hit = cache.get(channelId);
  if (!hit) return undefined;
  if (Date.now() - hit.at > hit.ttl) {
    cache.delete(channelId);
    return undefined;
  }
  return hit.candidate;
}

function firstEntry(xml) {
  const entry = xml.split('<entry>')[1];
  if (!entry) return null;
  const videoId = (entry.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/) || [])[1];
  if (!videoId) return null;
  return { videoId, title: ((entry.match(/<title>([^<]*)<\/title>/) || [])[1] || '').trim() || null };
}

async function fetchCandidate(channelId) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?${new URLSearchParams({ channel_id: channelId })}`, {
      headers: { accept: 'application/atom+xml', 'user-agent': 'streamline-catalog/1.0' },
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!res.ok) return undefined;
    return firstEntry(await res.text());
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

async function streamCandidate(channelId) {
  if (!channelId) return null;
  const hit = cached(channelId);
  if (hit !== undefined) return hit;
  if (inflight.has(channelId)) return inflight.get(channelId);

  const p = (async () => {
    const candidate = await fetchCandidate(channelId);
    cache.set(channelId, { candidate: candidate ?? null, at: Date.now(), ttl: candidate === undefined ? MISS_TTL : OK_TTL });
    inflight.delete(channelId);
    return candidate;
  })();
  inflight.set(channelId, p);
  return p;
}

/**
 * Candidates for a set of channels, in the order asked for, bounded by
 * `deadlineMs`: whatever the feeds answered by then is reported and the rest stay
 * unanswered, which the caller renders as silence rather than as an empty channel.
 */
async function candidates(channelIds, { deadlineMs = 4000 } = {}) {
  const ids = [...new Set(channelIds.filter(Boolean))].slice(0, BATCH_LIMIT);
  const out = new Map();
  const queue = [...ids];
  const deadline = Date.now() + deadlineMs;

  async function worker() {
    while (queue.length) {
      if (Date.now() > deadline) return;
      const id = queue.shift();
      const candidate = await streamCandidate(id);
      if (candidate !== undefined) out.set(id, candidate);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker));

  return ids.map((id) => ({ channelId: id, candidate: out.get(id) || null }));
}

module.exports = { streamCandidate, candidates };

'use strict';

/**
 * Which channels are actually on air right now.
 *
 * A channel id alone cannot answer that: `embed/live_stream?channel=…` paints a
 * black rectangle whenever the broadcaster is not currently streaming, which looks
 * like a broken player rather than an off-air channel. YouTube answers the question
 * at `https://www.youtube.com/channel/<id>/live` — when a live stream exists the
 * page is that stream's watch page, so its canonical URL carries the video id; when
 * none exists it is the ordinary channel page and carries no watch URL at all.
 *
 * Only that canonical watch id is accepted. Nothing is played from it here: it is
 * handed to the client so the embed can point at the broadcaster's own stream by id.
 *
 * Results are cached per channel. Broadcast schedules move on a scale of hours, so
 * a short cache keeps the grid responsive without re-fetching a channel page on
 * every request, and a miss is remembered briefly so a slow YouTube cannot be
 * hammered by one impatient page.
 */

const OK_TTL = 5 * 60 * 1000;
const MISS_TTL = 60 * 1000;
const FETCH_TIMEOUT = 3000;
const BATCH_LIMIT = 12;
const CONCURRENCY = 4;

const cache = new Map(); // channelId -> { videoId, at, ttl }
const inflight = new Map(); // channelId -> Promise

function cachedLiveVideo(channelId) {
  const hit = cache.get(channelId);
  if (!hit) return undefined;
  if (Date.now() - hit.at > hit.ttl) {
    cache.delete(channelId);
    return undefined;
  }
  return hit.videoId;
}

function watchIdFrom(html) {
  const m =
    html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/) ||
    html.match(/property="og:url" content="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/);
  return m ? m[1] : null;
}

async function fetchLiveVideo(channelId) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const res = await fetch(`https://www.youtube.com/channel/${encodeURIComponent(channelId)}/live`, {
      headers: {
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'accept-language': 'en-US,en;q=0.9',
        cookie: 'CONSENT=YES+1',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    if (!res.ok) return null;
    return watchIdFrom(await res.text());
  } catch {
    // Unreachable, throttled or timed out: unknown, which the caller must not read
    // as "off air" forever.
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The current live video id for one channel, or null when the channel is not
 * streaming. `undefined` means we could not tell, so the caller keeps its silence.
 */
async function liveVideoId(channelId) {
  if (!channelId) return null;
  const hit = cachedLiveVideo(channelId);
  if (hit !== undefined) return hit;
  if (inflight.has(channelId)) return inflight.get(channelId);

  const p = (async () => {
    const videoId = await fetchLiveVideo(channelId);
    cache.set(channelId, { videoId: videoId ?? null, at: Date.now(), ttl: videoId === undefined ? MISS_TTL : OK_TTL });
    inflight.delete(channelId);
    return videoId;
  })();
  inflight.set(channelId, p);
  return p;
}

/**
 * Statuses for a set of channels, in the order asked for. Values are `true`,
 * `false` or `null` (unknown), so the client can stay quiet instead of labelling a
 * channel off air on a network hiccup. The whole call is bounded by `deadlineMs`:
 * whichever lookups have answered by then are reported and the rest are null.
 */
async function statuses(channelIds, { deadlineMs = 4000 } = {}) {
  const ids = [...new Set(channelIds.filter(Boolean))].slice(0, BATCH_LIMIT);
  const out = new Map();
  const queue = [...ids];
  const deadline = Date.now() + deadlineMs;

  async function worker() {
    while (queue.length) {
      if (Date.now() > deadline) return;
      const id = queue.shift();
      const v = await liveVideoId(id);
      if (v !== undefined) out.set(id, v);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker));

  return ids.map((id) => {
    const v = out.get(id);
    return { channelId: id, liveVideoId: v || null, onAir: v === undefined ? null : Boolean(v) };
  });
}

module.exports = { liveVideoId, statuses };

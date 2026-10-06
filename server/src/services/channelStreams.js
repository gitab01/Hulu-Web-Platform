'use strict';

/**
 * What to embed for a channel: the broadcast it is making now, or — when it is not
 * making one — the most recent video it published.
 *
 * YouTube used to offer `embed/live_stream?channel=<id>`, a frame that opened
 * whatever a channel was streaming. It no longer resolves: the player answers
 * "This video is unavailable" for every channel, live or not, which is the black
 * rectangle that reads as a broken app. An embed needs a real video id.
 *
 * The id is available without touching the pages YouTube refuses to serve to a
 * server. `youtubei/v1/browse` is the endpoint the web player itself uses, and it
 * answers a server too: asked for a channel's Videos tab with the Live filter
 * applied, it returns the broadcast in progress as its first item, marked with a
 * LIVE badge, or no items at all when nothing is on air. That is the answer the
 * broadcaster's Atom feed cannot give — a 24/7 stream is an old upload, so it never
 * reaches the fifteen entries the feed lists, and a news channel's live programme is
 * routinely outranked by its own trailers.
 *
 * The feed is still read, as the fallback for a channel that is not streaming and as
 * the only thing left if youtubei stops answering.
 *
 * Results are cached per channel: two minutes for a broadcast, which can end at any
 * moment; twenty for a channel that is off air, whose feed does not move that fast;
 * one minute for a YouTube that did not answer, so a slow moment is not remembered
 * as a broken channel.
 */

const LIVE_PARAMS = 'EgZ2aWRlb3MYAyAAMAE%3D';
const WEB_CLIENT = '2.20250922.01.00';
const BROWSER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

const LIVE_TTL = 2 * 60 * 1000;
const OK_TTL = 20 * 60 * 1000;
const MISS_TTL = 60 * 1000;
const FETCH_TIMEOUT = 4000;

const cache = new Map(); // channelId -> { candidate, at, ttl }
const inflight = new Map(); // channelId -> Promise

/**
 * `{ videoId, title, onAir }` for what to put in the player, `null` when YouTube
 * answered and the channel has nothing to show, `undefined` when it could not be
 * read — so a slow YouTube is never mistaken for a channel with nothing on.
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

function store(channelId, candidate) {
  const ttl = candidate === undefined ? MISS_TTL : candidate && candidate.onAir ? LIVE_TTL : OK_TTL;
  cache.set(channelId, { candidate: candidate ?? null, at: Date.now(), ttl });
}

const text = (node) =>
  (typeof node === 'string' && node) ||
  (node && node.content) ||
  (node && node.simpleText) ||
  (node && Array.isArray(node.runs) && node.runs.map((r) => r.text || '').join('')) ||
  '';

/**
 * The first item in a live-filtered response that the payload itself marks as
 * broadcasting. Both shapes the web client uses are read: `lockupViewModel` is what
 * YouTube returns now, `videoRenderer` what it returned before, and the marker is
 * the badge on the item rather than anything in its title.
 */
function liveItem(node) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const item of node) {
      const hit = liveItem(item);
      if (hit) return hit;
    }
    return null;
  }

  const model = node.lockupViewModel || node.videoRenderer;
  if (model) {
    const videoId = model.contentId || model.videoId;
    const marked = /THUMBNAIL_OVERLAY_BADGE_STYLE_LIVE|BADGE_STYLE_TYPE_LIVE/.test(JSON.stringify(model));
    if (typeof videoId === 'string' && /^[\w-]{11}$/.test(videoId) && marked) {
      const metadata = (model.metadata && model.metadata.lockupMetadataViewModel) || model;
      const title = text(metadata.title) || null;
      return { videoId, title, onAir: true };
    }
    return null;
  }

  for (const key of Object.keys(node)) {
    const hit = liveItem(node[key]);
    if (hit) return hit;
  }
  return null;
}

function firstEntry(xml) {
  const entry = xml.split('<entry>')[1];
  if (!entry) return null;
  const videoId = (entry.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/) || [])[1];
  if (!videoId) return null;
  return { videoId, title: ((entry.match(/<title>([^<]*)<\/title>/) || [])[1] || '').trim() || null, onAir: false };
}

/** What the channel is streaming at this moment, or `null` when it is not streaming. */
async function fetchOnAir(channelId) {
  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/browse', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'user-agent': BROWSER_AGENT,
        'x-youtube-client-name': '1',
        'x-youtube-client-version': WEB_CLIENT,
      },
      body: JSON.stringify({
        context: { client: { clientName: 'WEB', clientVersion: WEB_CLIENT, hl: 'en', gl: 'US' } },
        browseId: channelId,
        params: LIVE_PARAMS,
      }),
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
    });
    if (!res.ok) return undefined;
    return liveItem(await res.json()) || null;
  } catch {
    return undefined;
  }
}

/** The channel's own Atom feed: what it published most recently, live or not. */
async function fetchPublished(channelId) {
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?${new URLSearchParams({ channel_id: channelId })}`, {
      headers: { accept: 'application/atom+xml', 'user-agent': 'streamline-catalog/1.0' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT),
      redirect: 'follow',
    });
    if (!res.ok) return undefined;
    return firstEntry(await res.text());
  } catch {
    return undefined;
  }
}

async function resolve(channelId) {
  const onAir = await fetchOnAir(channelId);
  if (onAir) return onAir;
  // Nothing on air, or the question could not be asked: either way the feed answers.
  return fetchPublished(channelId);
}

async function streamCandidate(channelId) {
  if (!channelId) return null;
  const hit = cached(channelId);
  if (hit !== undefined) return hit;
  if (inflight.has(channelId)) return inflight.get(channelId);

  const p = (async () => {
    const candidate = await resolve(channelId);
    store(channelId, candidate);
    inflight.delete(channelId);
    return candidate;
  })();
  inflight.set(channelId, p);
  return p;
}

module.exports = { streamCandidate, liveItem };

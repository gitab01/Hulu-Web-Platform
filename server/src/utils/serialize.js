'use strict';

/** Catalogue-facing serialization: never expose raw mediaUrl (only via signed playback). */
function titleSummary(t) {
  if (!t) return null;
  return {
    id: String(t._id),
    slug: t.slug,
    type: t.type,
    name: t.name,
    synopsis: t.synopsis,
    genres: t.genres,
    posterUrl: t.posterUrl,
    backdropUrl: t.backdropUrl,
    year: t.year,
    maturity: t.maturity,
    popularity: t.popularity,
    origin: t.origin,
    nameLocal: t.nameLocal,
    motif: t.motif,
  };
}

function titleDetail(t) {
  return {
    ...titleSummary(t),
    seasons: (t.seasons || []).map((s) => ({
      _id: String(s._id),
      season: s.season,
      year: s.year,
      episodes: (s.episodes || []).map((e) => ({
        _id: String(e._id),
        number: e.number,
        title: e.title,
        synopsis: e.synopsis,
        durationSec: e.durationSec,
        stillUrl: e.stillUrl,
        // mediaUrl intentionally omitted.
      })),
    })),
  };
}

/**
 * Live TV channels. A channel stores only the broadcaster's own channel id; the
 * embed addresses are derived here so the client never has to know YouTube's
 * embed grammar.
 *
 * An embed needs a video id: `embed/live_stream?channel=…`, which used to open
 * whatever a channel was streaming, now answers "This video is unavailable" for
 * every channel, live or not. So `stream` is whatever services/channelStreams found
 * for the channel — the broadcast in progress when the channel's live-filtered video
 * list names one, otherwise its most recent published video — falling back to its
 * uploads playlist when neither answered, since a playlist player always has
 * something to show. `latest` is that playlist either way: a channel's uploads list
 * is its own id with the UC prefix swapped for UU.
 *
 * `streamOnAir` carries that distinction to the page. The player is asked anyway,
 * because a broadcast can end while the frame is open, but the server no longer has
 * to leave the question entirely to a player whose answer is inconsistent.
 */
function embedUrls(youtubeChannelId, candidate) {
  if (!youtubeChannelId) return null;
  const uploads = youtubeChannelId.startsWith('UC') ? `UU${youtubeChannelId.slice(2)}` : '';
  const latest = uploads ? `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(uploads)}&autoplay=1` : '';
  const stream = candidate?.videoId
    ? `https://www.youtube.com/embed/${encodeURIComponent(candidate.videoId)}?autoplay=1&rel=0`
    : latest;
  return {
    stream,
    latest,
    watch: `https://www.youtube.com/channel/${encodeURIComponent(youtubeChannelId)}/live`,
  };
}

function channelSummary(c) {
  if (!c) return null;
  return {
    id: String(c._id),
    slug: c.slug,
    name: c.name,
    category: c.category,
    kind: c.kind,
    country: c.country,
    language: c.language,
    description: c.description,
    logoUrl: c.logoUrl,
    displayRank: c.displayRank,
    hasStream: Boolean(c.youtubeChannelId),
  };
}

function channelDetail(c, candidate) {
  return {
    ...channelSummary(c),
    embeds: embedUrls(c.youtubeChannelId, candidate),
    // What is in the frame, as YouTube described it a moment ago: the broadcast in
    // progress when the channel's live list named one, otherwise its latest upload.
    streamVideoId: candidate?.videoId || null,
    streamTitle: candidate?.title || null,
    streamOnAir: Boolean(candidate?.onAir),
    homepageUrl: c.homepageUrl,
  };
}

module.exports = { titleSummary, titleDetail, channelSummary, channelDetail };

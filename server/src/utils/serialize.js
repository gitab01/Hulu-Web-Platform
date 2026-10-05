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
 * every channel, live or not. So `stream` is the broadcaster's most recent
 * published video (see services/channelStreams, which reads the channel's own
 * feed), falling back to its uploads playlist when the feed did not answer — a
 * playlist player always has something to show. `latest` is that playlist either
 * way: a channel's uploads list is its own id with the UC prefix swapped for UU.
 *
 * Whether the video in the frame is live at this moment is not something this
 * server can read any more — YouTube serves channel pages to non-browser clients as
 * an empty shell, and the feeds answer only with what a channel has published. The
 * player answers it instead, from the viewer's own connection, where the question is
 * answerable.
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
    // What is in the frame, as far as the broadcaster's own feed can say. Whether it
    // is live right now is answered by the player, not here.
    streamVideoId: candidate?.videoId || null,
    streamTitle: candidate?.title || null,
    homepageUrl: c.homepageUrl,
  };
}

module.exports = { titleSummary, titleDetail, channelSummary, channelDetail };

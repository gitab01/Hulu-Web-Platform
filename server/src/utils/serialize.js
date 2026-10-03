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
 * embed grammar. `latest` is the fallback for the (ordinary) case where the
 * broadcaster is not live at that moment: a channel's uploads playlist is its own
 * id with the UC prefix swapped for UU.
 *
 * `liveVideoId` is what the caller resolved for this moment (see
 * services/liveStatus). When it is known the embed opens that stream by id; when it
 * is not, the address still goes to the channel's live_stream endpoint, but `onAir`
 * is false and the client explains rather than painting black.
 */
function embedUrls(youtubeChannelId, liveVideoId) {
  if (!youtubeChannelId) return null;
  const uploads = youtubeChannelId.startsWith('UC') ? `UU${youtubeChannelId.slice(2)}` : '';
  const live = liveVideoId
    ? `https://www.youtube.com/embed/${encodeURIComponent(liveVideoId)}?autoplay=1`
    : `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(youtubeChannelId)}&autoplay=1`;
  return {
    live,
    latest: uploads ? `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(uploads)}&autoplay=1` : '',
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

function channelDetail(c, liveVideoId) {
  return {
    ...channelSummary(c),
    embeds: embedUrls(c.youtubeChannelId, liveVideoId),
    liveVideoId: liveVideoId || null,
    // true on air, false definitely not, null when YouTube could not be read — the
    // client explains the first two and stays quiet about the third.
    onAir: liveVideoId === undefined ? null : Boolean(liveVideoId),
    homepageUrl: c.homepageUrl,
  };
}

module.exports = { titleSummary, titleDetail, channelSummary, channelDetail };

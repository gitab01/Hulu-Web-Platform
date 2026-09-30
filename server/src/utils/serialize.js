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
        // mediaUrl intentionally omitted.
      })),
    })),
  };
}

module.exports = { titleSummary, titleDetail };

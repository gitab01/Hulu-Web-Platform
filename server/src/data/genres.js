'use strict';

// Canonical genre vocabulary shared by signup preferences, the catalogue, and the
// recommendation vectors. Keeping it in one place means affinity comparisons are
// always over the same axis set.
const VALID_GENRES = [
  'Action',
  'Comedy',
  'Drama',
  'Thriller',
  'Sci-Fi',
  'Horror',
  'Documentary',
  'Reality',
  'Crime',
  'Animation',
];

/**
 * TMDB genre ids folded into the canonical axis above, so imported titles are
 * comparable with signup preferences and recommendation vectors. Ids are shared
 * between films and series; a few have both a legacy and a current id, so both
 * are listed. Genres with no canonical slot (Family, Kids, Music, Soap) map to
 * null and are dropped — an imported title that ends up with no genres is skipped
 * rather than stored, because it could never be matched by the recommender.
 */
const TMDB_GENRE_TO_CANONICAL = {
  28: 'Action', // Action
  12: 'Action', // Adventure
  10759: 'Action', // Action & Adventure (series)
  37: 'Action', // Western
  10768: 'Drama', // War (series)
  10752: 'Drama', // War
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  99: 'Documentary',
  10763: 'Documentary', // News
  18: 'Drama',
  10766: 'Drama', // Soap
  10749: 'Drama', // Romance
  36: 'Drama', // History
  10770: 'Drama', // TV Movie
  14: 'Sci-Fi', // Fantasy
  878: 'Sci-Fi',
  10765: 'Sci-Fi', // Sci-Fi & Fantasy (series)
  27: 'Horror',
  53: 'Thriller',
  9648: 'Thriller', // Mystery
  10764: 'Reality',
  10767: 'Reality', // Talk
  10751: null, // Family
  10762: null, // Kids
  10407: null, // Music
};

/** TMDB genre_ids -> canonical names, de-duplicated and ordered by the axis above. */
function canonicalGenres(ids = []) {
  const picked = new Set();
  for (const id of ids) {
    const name = TMDB_GENRE_TO_CANONICAL[Number(id)];
    if (name) picked.add(name);
  }
  return VALID_GENRES.filter((g) => picked.has(g));
}

module.exports = { VALID_GENRES, TMDB_GENRE_TO_CANONICAL, canonicalGenres };

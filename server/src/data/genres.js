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

module.exports = { VALID_GENRES };

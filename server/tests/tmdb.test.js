'use strict';

/**
 * Pure mapping tests for the TMDB import — no network and no API key, because the
 * risk lives in how TMDB's payload becomes our document, not in TMDB's uptime.
 * Fixtures are trimmed to the fields the mappers read, in TMDB's real shape.
 */

const { test } = require('node:test');
const assert = require('node:assert');

const tmdb = require('../src/services/tmdb');
const { canonicalGenres } = require('../src/data/genres');
const { VALID_GENRES } = require('../src/data/genres');

const MOVIE_RAW = {
  id: 155,
  title: 'The Dark Knight',
  overview: 'Batman raises the stakes.',
  genre_ids: [18, 80, 28, 53, 10751],
  poster_path: '/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg',
  backdrop_path: '/xq12XKcdWjuBq0V53VV3uAs4ZOs.jpg',
  release_date: '2008-07-18',
  adult: false,
  popularity: 260.441,
};

const MOVIE_DETAIL = { runtime: 152, release_dates: { results: [{ iso_3166_1: 'US', release_dates: [{ certification: 'PG-13' }, { certification: '' }] }] } };

const SERIES_RAW = {
  id: 1399,
  name: 'Breaking Bad',
  overview: 'A chemistry teacher turns to manufacturing methamphetamine.',
  genre_ids: [18, 80],
  poster_path: '/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
  backdrop_path: '/tsrYTvNPBfYFqAFaSPDlqMXTZL2.jpg',
  first_air_date: '2008-01-20',
  adult: false,
  popularity: 400.1,
};

const SERIES_DETAIL = { episode_run_time: [49], content_ratings: { results: [{ iso_3166_1: 'US', rating: 'TV-MA' }] } };

const SEASON = {
  season_number: 1,
  episodes: [
    { episode_number: 1, name: 'Pilot', overview: 'Chemistry teacher.', runtime: 58, still_path: '/1di2ZIesDfv9or1bYcLjVNLpMh1.jpg' },
    { episode_number: 2, name: "Cat's in the Bag...", overview: 'A body in the trunk.', runtime: 48, still_path: null },
    { episode_number: 3, name: '...And the Bag Is in the River', overview: 'Walt makes a choice.', runtime: 48, still_path: null },
  ],
};

const mediaFor = (kind, i) => `https://media.test/${kind}-${i}.mp4`;

test('TMDB genre ids fold into the canonical axis, unmapped ones dropped', () => {
  assert.deepStrictEqual(canonicalGenres([18, 80, 28, 53, 10751]), ['Action', 'Drama', 'Thriller', 'Crime']);
  // every produced name must exist on the recommendation axis, or affinity breaks
  for (const g of canonicalGenres([10765, 9648, 10764, 10767, 10407])) {
    assert.ok(VALID_GENRES.includes(g), `${g} is not a canonical genre`);
  }
  assert.deepStrictEqual(canonicalGenres([10751, 10762]), []); // Family + Kids only
  assert.deepStrictEqual(canonicalGenres(undefined), []);
});

test('a film becomes a one-episode title with real artwork and runtime', () => {
  const doc = tmdb.movieDoc(MOVIE_RAW, MOVIE_DETAIL, mediaFor('movie', 0));

  assert.strictEqual(doc.type, 'movie');
  assert.strictEqual(doc.slug, 'the-dark-knight');
  assert.strictEqual(doc.year, 2008);
  assert.strictEqual(doc.maturity, 'PG-13');
  assert.strictEqual(doc.durationSec, undefined);
  assert.strictEqual(doc.runtimeSec, undefined, 'runtime is consumed, not stored on the document');
  assert.strictEqual(doc.seasons[0].episodes[0].durationSec, 152 * 60);
  assert.strictEqual(doc.seasons[0].episodes[0].mediaUrl, 'https://media.test/movie-0.mp4');

  // Public CDN links: the browser needs no key to render them.
  assert.strictEqual(doc.posterUrl, 'https://image.tmdb.org/t/p/w500/nMKdUUepR0i5zn0y1T4CsSB5chy.jpg');
  assert.match(doc.backdropUrl, /^https:\/\/image\.tmdb\.org\/t\/p\/w1280\//);
  assert.strictEqual(doc.seasons[0].episodes[0].stillUrl, doc.backdropUrl, 'a film still falls back to the backdrop');
  assert.strictEqual(doc.externalPopularity, 260);
});

test('a series keeps real episode names, runtimes and stills', () => {
  const doc = tmdb.seriesDoc(SERIES_RAW, SERIES_DETAIL, SEASON, (i) => mediaFor('episode', i));

  assert.strictEqual(doc.type, 'series');
  assert.strictEqual(doc.maturity, 'TV-MA');
  assert.strictEqual(doc.seasons[0].season, 1);
  assert.strictEqual(doc.seasons[0].episodes.length, 3);

  const [first, second] = doc.seasons[0].episodes;
  assert.strictEqual(first.title, 'Pilot');
  assert.strictEqual(first.durationSec, 58 * 60);
  assert.strictEqual(first.stillUrl, 'https://image.tmdb.org/t/p/w780/1di2ZIesDfv9or1bYcLjVNLpMh1.jpg');
  assert.strictEqual(second.stillUrl, '', 'a missing still stays empty so the slab fallback renders');
  assert.strictEqual(second.mediaUrl, 'https://media.test/episode-1.mp4');
});

test('a series with no season listing still gets playable episodes', () => {
  const doc = tmdb.seriesDoc(SERIES_RAW, SERIES_DETAIL, null, (i) => mediaFor('episode', i));
  const eps = doc.seasons[0].episodes;

  assert.strictEqual(eps.length, 3);
  assert.strictEqual(eps[0].title, 'Episode 1');
  assert.strictEqual(eps[0].durationSec, 49 * 60, 'falls back to the series episode runtime');
  assert.ok(eps.every((e) => e.mediaUrl));
});

test('missing artwork and a missing certification degrade without crashing', () => {
  const bare = tmdb.movieDoc({ ...MOVIE_RAW, poster_path: null, backdrop_path: null, release_date: '' }, {}, mediaFor('movie', 1));

  assert.strictEqual(bare.posterUrl, '');
  assert.strictEqual(bare.backdropUrl, '');
  assert.strictEqual(bare.year, null);
  assert.strictEqual(bare.maturity, 'NR', 'no US certificate yet, so it is not invented');
  assert.strictEqual(bare.seasons[0].episodes[0].stillUrl, '');

  const adultFallback = tmdb.movieDoc({ ...MOVIE_RAW, adult: true }, { release_dates: { results: [] } }, mediaFor('movie', 2));
  assert.strictEqual(adultFallback.maturity, 'R');
});

test('both TMDB credential formats are carried correctly, and the key is query-safe', () => {
  assert.strictEqual(tmdb.isReadToken('eyJh.eyJp.sig'), true);
  assert.strictEqual(tmdb.isReadToken('abc123def456'), false);

  const tokenUrl = new URL(tmdb.buildUrl('/discover/tv', { with_genres: '18,80', include_adult: 'false' }, 'eyJh.eyJp.sig'));
  assert.strictEqual(tokenUrl.searchParams.get('api_key'), null, 'a v4 token goes in the header, never the URL');
  assert.strictEqual(tokenUrl.searchParams.get('with_genres'), '18,80');
  assert.match(tokenUrl.pathname, /\/discover\/tv$/);

  const keyUrl = new URL(tmdb.buildUrl('/tv/1', { foo: '', bar: undefined }, 'plainkey'));
  assert.strictEqual(keyUrl.searchParams.get('api_key'), 'plainkey');
  assert.strictEqual(keyUrl.searchParams.get('foo'), null, 'empty params are not sent');
});

test('slugs strip punctuation and accents so routes stay readable', () => {
  assert.strictEqual(tmdb.slugify("O Brother, Where Art Thou?"), 'o-brother-where-art-thou');
  assert.strictEqual(tmdb.slugify('  À Broken  Code  '), 'a-broken-code');
  assert.strictEqual(tmdb.slugify('1917'), '1917');
});

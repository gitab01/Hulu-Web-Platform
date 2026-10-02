'use strict';

/**
 * The Movie Database (TMDB) import.
 *
 * TMDB's API is free for this kind of use and carries real metadata: titles,
 * overviews, official artwork, per-episode names, runtimes and US certifications.
 * Only METADATA is imported — the media itself stays public-domain stand-in footage,
 * because TMDB does not licence or host streams. The API key is server-side only:
 * image.tmdb.org needs no key, so the client receives plain public image URLs and
 * never sees the credential.
 *
 * Requests are spaced because TMDB throttles per key; a 429 retries once with the
 * server's own retry window before giving up.
 */

const config = require('../config');
const { canonicalGenres } = require('../data/genres');

const POSTER_SIZE = 'w500';
const BACKDROP_SIZE = 'w1280';
const STILL_SIZE = 'w780';

const MIN_INTERVAL_MS = Number(process.env.TMDB_REQUEST_SPACING_MS || 200);
const REQUEST_TIMEOUT_MS = 15000;
const EPISODE_CAP = 8;

/**
 * Pulls that together fill the canonical genre axis, so every row and every
 * signup preference finds something. `genres` is a comma-separated TMDB id list,
 * which discover treats as OR — that is how a legacy and a current id for the same
 * genre are covered in one request.
 */
const PULLS = [
  { media: 'movie', genres: '28,12', want: 2 },
  { media: 'movie', genres: '35', want: 2 },
  { media: 'movie', genres: '18', want: 3 },
  { media: 'movie', genres: '53,9648', want: 2 },
  { media: 'movie', genres: '878,14', want: 2 },
  { media: 'movie', genres: '27', want: 1 },
  { media: 'movie', genres: '80', want: 2 },
  { media: 'movie', genres: '99', want: 1 },
  { media: 'tv', genres: '10759,28,12', want: 2 },
  { media: 'tv', genres: '35', want: 2 },
  { media: 'tv', genres: '18', want: 3 },
  { media: 'tv', genres: '80', want: 2 },
  { media: 'tv', genres: '10765,878', want: 2 },
  { media: 'tv', genres: '16', want: 1 },
  { media: 'tv', genres: '10764', want: 1 },
];

function enabled() {
  return config.tmdb.enabled;
}

/** A v4 read access token is a JWT (three dot-separated parts); a v3 key is not. */
function isReadToken(key) {
  return key.split('.').length === 3;
}

function authHeaders(key) {
  return isReadToken(key)
    ? { accept: 'application/json', Authorization: `Bearer ${key}` }
    : { accept: 'application/json' };
}

function buildUrl(path, params, key) {
  const url = new URL(config.tmdb.apiBase + path);
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(name, String(value));
  }
  if (!isReadToken(key)) url.searchParams.set('api_key', key);
  return url.toString();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path, params, { attempt = 0 } = {}) {
  if (!enabled()) throw new Error('TMDB_API_KEY is not set');
  await sleep(MIN_INTERVAL_MS);

  const res = await fetch(buildUrl(path, params, config.tmdb.apiKey), {
    headers: authHeaders(config.tmdb.apiKey),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  }).catch((err) => {
    throw new Error(`TMDB ${path} unreachable: ${err.message}`);
  });

  if (res.status === 429 && attempt < 1) {
    const retryAfter = Number(res.headers.get('retry-after')) || 1000;
    await sleep(Math.max(retryAfter, 1000));
    return request(path, params, { attempt: attempt + 1 });
  }
  if (!res.ok) throw new Error(`TMDB ${path} -> HTTP ${res.status}`);

  const body = await res.json();
  // TMDB answers a rejected credential with HTTP 200 and an error payload.
  if (body && body.success === false) throw new Error(`TMDB ${path}: ${body.status_message || 'rejected'}`);
  return body;
}

/** TMDB paths arrive with a leading slash ("/abc.jpg"); join without doubling it. */
function image(path, size) {
  if (!path) return '';
  return `${config.tmdb.imageBase}/${size}/${String(path).replace(/^\/+/, '')}`;
}

function slugify(name) {
  return String(name)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function yearOf(dateString) {
  const y = Number(String(dateString || '').slice(0, 4));
  return y > 0 ? y : null;
}

/** US certificate when TMDB has one; '' lets the caller fall back honestly. */
function usCertification(detail) {
  const dated = (detail?.release_dates?.results || []).find((r) => r.iso_3166_1 === 'US') || detail?.release_dates?.results?.[0];
  const cert = (dated?.release_dates || []).map((d) => d.certification).find(Boolean);
  if (cert) return cert;
  const rated = (detail?.content_ratings?.results || []).find((r) => r.iso_3166_1 === 'US') || detail?.content_ratings?.results?.[0];
  return rated?.rating || '';
}

function episodeDoc(raw, mediaUrl) {
  return {
    number: Number(raw.episode_number) || 0,
    title: raw.name || `Episode ${raw.episode_number}`,
    synopsis: raw.overview || '',
    // TMDB runtimes are minutes; the client overwrites durationSec with the real
    // media duration on its first progress flush, so this stays display metadata.
    durationSec: (Number(raw.runtime) || 0) * 60,
    mediaUrl,
    stillUrl: image(raw.still_path, STILL_SIZE),
  };
}

function baseDoc(raw, { type, name, year, maturity, runtimeMin = 0 }) {
  return {
    slug: slugify(name),
    type,
    name,
    synopsis: raw.overview || '',
    genres: canonicalGenres(raw.genre_ids),
    posterUrl: image(raw.poster_path, POSTER_SIZE),
    backdropUrl: image(raw.backdrop_path, BACKDROP_SIZE),
    year,
    maturity,
    // Market signal from TMDB, kept separate from the behaviour-derived `popularity`
    // the nightly job owns: Trending reads behaviour first, TMDB popularity second.
    externalPopularity: Math.round(Number(raw.popularity) || 0),
    runtimeSec: (Number(runtimeMin) || 0) * 60,
  };
}

/** Film -> one-season title whose single "episode" is the feature itself. */
function movieDoc(raw, detail, mediaUrl) {
  const base = baseDoc(raw, {
    type: 'movie',
    name: raw.title || raw.original_title,
    year: yearOf(raw.release_date),
    maturity: usCertification(detail) || (raw.adult ? 'R' : 'NR'),
    runtimeMin: detail?.runtime,
  });
  base.seasons = [
    {
      season: 1,
      year: base.year,
      episodes: [
        {
          number: 1,
          title: 'Feature',
          synopsis: base.synopsis,
          durationSec: base.runtimeSec,
          mediaUrl,
          stillUrl: base.backdropUrl || base.posterUrl,
        },
      ],
    },
  ];
  delete base.runtimeSec;
  return base;
}

/** Series -> real season-1 episode names, runtimes and stills. */
function seriesDoc(raw, detail, season, mediaUrlForEpisode) {
  const base = baseDoc(raw, {
    type: 'series',
    name: raw.name || raw.original_name,
    year: yearOf(raw.first_air_date),
    maturity: usCertification(detail) || (raw.adult ? 'TV-MA' : 'NR'),
    runtimeMin: (detail?.episode_run_time || [])[0],
  });

  const listed = (season?.episodes || []).filter((e) => Number(e.episode_number) > 0).slice(0, EPISODE_CAP);
  base.seasons = [
    {
      season: Number(season?.season_number) || 1,
      year: base.year,
      episodes: listed.length
        ? listed.map((e, i) => episodeDoc(e, mediaUrlForEpisode(i)))
        : // TMDB has no season listing (a brand-new or obscure show): keep the title
          // with placeholder episodes so its artwork and metadata still browse.
          [1, 2, 3].map((n) => ({
            number: n,
            title: `Episode ${n}`,
            synopsis: '',
            durationSec: base.runtimeSec || 45 * 60,
            mediaUrl: mediaUrlForEpisode(n - 1),
            stillUrl: base.backdropUrl || base.posterUrl,
          })),
    },
  ];
  delete base.runtimeSec;
  return base;
}

/** discover, pre-filtered to candidates worth a detail request. */
async function candidates(pull) {
  const body = await request(`/discover/${pull.media}`, {
    with_genres: pull.genres,
    sort_by: 'popularity.desc',
    'vote_count.gte': pull.media === 'movie' ? 150 : 40,
    include_adult: 'false',
    with_original_language: 'en',
  });
  return (body.results || []).filter((raw) => {
    const name = pull.media === 'movie' ? raw.title : raw.name;
    return name && (raw.backdrop_path || raw.poster_path) && canonicalGenres(raw.genre_ids).length;
  });
}

/**
 * Build a catalogue of real titles. `mediaFor(type, index)` supplies the stand-in
 * media path for each episode, which keeps this service free of playback concerns.
 * A title that cannot be resolved is skipped rather than failing the whole import.
 */
async function buildCatalogue({ mediaFor }) {
  const docs = [];
  const seen = new Set();

  for (const pull of PULLS) {
    const list = await candidates(pull);
    let taken = 0;

    for (const raw of list) {
      if (taken >= pull.want) break;
      const key = `${pull.media}:${raw.id}`;
      if (seen.has(key)) continue;

      try {
        const detail = await request(`/${pull.media}/${raw.id}`, {
          append_to_response: pull.media === 'movie' ? 'release_dates' : 'content_ratings,episode_run_time',
        });

        let doc;
        if (pull.media === 'movie') {
          doc = movieDoc(raw, detail, mediaFor('movie', docs.length));
        } else {
          const season = await request(`/tv/${raw.id}/season/1`).catch(() => null);
          doc = seriesDoc(raw, detail, season, (i) => mediaFor('episode', docs.length * 10 + i));
        }

        if (!doc.name || !doc.slug) continue;
        seen.add(key);
        docs.push(doc);
        taken += 1;
      } catch (err) {
        console.warn(`[tmdb] skipped ${pull.media} ${raw.id}: ${err.message}`);
      }
    }
  }

  return docs;
}

module.exports = {
  enabled,
  buildCatalogue,
  PULLS,
  // exported for tests
  isReadToken,
  buildUrl,
  image,
  slugify,
  yearOf,
  usCertification,
  canonicalGenres,
  movieDoc,
  seriesDoc,
  episodeDoc,
};

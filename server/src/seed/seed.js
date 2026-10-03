'use strict';

/**
 * Seed the catalogue, demo accounts and watch history.
 *
 * With TMDB_API_KEY set, the catalogue is imported from The Movie Database: real
 * titles, official artwork, overviews, per-episode names and runtimes. Without a
 * key it falls back to the invented catalogue below, so a fresh clone seeds with no
 * accounts at all. Either way the media is public-domain stand-in footage — TMDB
 * publishes metadata, not streams.
 *
 * The Ethiopian originals in data/originals.js are appended on both paths: a
 * service produces its own local slate, it does not license it from anyone, so an
 * import must never displace it.
 */

const { connectDb, disconnectDb } = require('../config/db');
const User = require('../models/User');
const Title = require('../models/Title');
const Subscription = require('../models/Subscription');
const WatchEvent = require('../models/WatchEvent');
const Channel = require('../models/Channel');
const { CHANNELS } = require('../data/channels');
const { ETHIOPIAN_ORIGINALS } = require('../data/originals');
const config = require('../config');
const { recomputeSimilarity } = require('../services/recommendation');
const tmdb = require('../services/tmdb');

// Public domain sample clips from Google's open test bucket, used as stand-in
// media so the player actually plays something without any licensed content.
const SAMPLE = [
  'BigBuckBunny.mp4',
  'ElephantsDream.mp4',
  'ForBiggerBlazes.mp4',
  'ForBiggerEscapes.mp4',
  'ForBiggerFun.mp4',
  'ForBiggerJoyrides.mp4',
  'ForBiggerMeltdowns.mp4',
  'Sintel.mp4',
  'SubaruOutbackOnStreetAndDirt.mp4',
  'TearsOfSteel.mp4',
  'VolkswagenGTIReview.mp4',
  'WeAreGoingOnBullrun.mp4',
  'WhatCarCanYouGetForAGrand.mp4',
];

// The longer open films stand in for features; the short clips keep an episode list
// watchable end to end.
const FEATURES = ['BigBuckBunny.mp4', 'Sintel.mp4', 'TearsOfSteel.mp4', 'ElephantsDream.mp4'];
const CLIPS = [
  'ForBiggerBlazes.mp4',
  'ForBiggerEscapes.mp4',
  'ForBiggerFun.mp4',
  'ForBiggerJoyrides.mp4',
  'ForBiggerMeltdowns.mp4',
  'SubaruOutbackOnStreetAndDirt.mp4',
  'VolkswagenGTIReview.mp4',
  'WeAreGoingOnBullrun.mp4',
  'WhatCarCanYouGetForAGrand.mp4',
];

function media(name) {
  return `${config.mediaBaseUrl}/${name}`;
}

/** Media for an imported title: features get a long clip, episodes rotate short ones. */
function mediaFor(kind, index) {
  const pool = kind === 'movie' ? FEATURES : CLIPS;
  return media(pool[index % pool.length]);
}

// Original, invented titles (not real shows) mapped across the genre vocabulary.
function ep(number, title, synopsis, durationSec, idx) {
  return { number, title, synopsis, durationSec, mediaUrl: media(SAMPLE[idx % SAMPLE.length]) };
}

const CATALOGUE = [
  {
    slug: 'neon-hollow',
    name: 'Neon Hollow',
    type: 'series',
    genres: ['Sci-Fi', 'Thriller', 'Action'],
    year: 2024,
    maturity: 'TV-MA',
    synopsis: 'A detective in a rain-soaked megacity hunts a killer who erases memories before the crime.',
    seasons: [
      {
        season: 1,
        year: 2024,
        episodes: [
          ep(1, 'Cold Static', 'A body with no record of ever existing.', 340, 0),
          ep(2, 'Ghostwire', 'The case file rewrites itself overnight.', 320, 2),
          ep(3, 'Red Sector', 'A blackout hides a second murder.', 355, 3),
          ep(4, 'Wetwork', 'The killer leaves a signature.', 380, 4),
        ],
      },
    ],
  },
  {
    slug: 'paper-empire',
    name: 'Paper Empire',
    type: 'series',
    genres: ['Drama', 'Crime'],
    year: 2023,
    synopsis: 'Three siblings inherit a failing printing house and the debts buried inside it.',
    maturity: 'TV-14',
    seasons: [
      {
        season: 1,
        year: 2023,
        episodes: [ep(1, 'Ink', 'The will is read.', 410, 1), ep(2, 'Margins', 'A hidden ledger surfaces.', 400, 5), ep(3, 'Ream', 'The oldest debt comes due.', 420, 6)],
      },
      {
        season: 2,
        year: 2024,
        episodes: [ep(1, 'Overprint', 'Expansion tempts the youngest.', 430, 7), ep(2, 'Plate', 'A rival buys the landlord.', 415, 8)],
      },
    ],
  },
  {
    slug: 'laugh-track',
    name: 'Laugh Track',
    type: 'series',
    genres: ['Comedy', 'Reality'],
    year: 2025,
    synopsis: 'A washed-up sitcom crew reunites for a live reunion special that nothing survives.',
    maturity: 'TV-14',
    seasons: [{ season: 1, year: 2025, episodes: [ep(1, 'Cold Open', 'Nobody remembers the catchphrase.', 210, 3), ep(2, 'Sweeps', 'The network wants a stunt.', 220, 4)] }],
  },
  {
    slug: 'the-quiet-floor',
    name: 'The Quiet Floor',
    type: 'series',
    genres: ['Horror', 'Thriller'],
    year: 2024,
    synopsis: 'A night-shift archivist discovers a floor plan that changes when no one is looking.',
    maturity: 'TV-MA',
    seasons: [{ season: 1, year: 2024, episodes: [ep(1, 'Sublevel', 'The elevator has an extra button.', 360, 9), ep(2, 'Stacks', 'A record that should not exist.', 375, 10)] }],
  },
  {
    slug: 'hard-light',
    name: 'Hard Light',
    type: 'movie',
    genres: ['Action', 'Drama'],
    year: 2023,
    synopsis: 'A stunt driver takes one last job to pay for her father’s surgery.',
    maturity: 'R',
    seasons: [{ season: 1, year: 2023, episodes: [ep(1, 'Feature', 'One take, no doubles.', 900, 1)] }],
  },
  {
    slug: 'salt-and-static',
    name: 'Salt & Static',
    type: 'movie',
    genres: ['Documentary', 'Drama'],
    year: 2024,
    synopsis: 'The last radio operator on a disappearing island coast.',
    maturity: 'TV-PG',
    seasons: [{ season: 1, year: 2024, episodes: [ep(1, 'Feature', 'Signal fades with the shoreline.', 720, 7)] }],
  },
  {
    slug: 'greener-pastures',
    name: 'Greener Pastures',
    type: 'series',
    genres: ['Comedy', 'Drama'],
    year: 2025,
    synopsis: 'A city chef inherits a struggling farm and refuses to admit she cannot farm.',
    maturity: 'TV-14',
    seasons: [{ season: 1, year: 2025, episodes: [ep(1, 'First Frost', 'The goats are the problem.', 260, 5), ep(2, 'Crop Rotation', 'A pop-up dinner goes wrong.', 255, 6)] }],
  },
  {
    slug: 'blackout-protocol',
    name: 'Blackout Protocol',
    type: 'movie',
    genres: ['Sci-Fi', 'Thriller'],
    year: 2024,
    synopsis: 'A grid engineer realizes the failures are being conducted, not suffered.',
    maturity: 'PG-13',
    seasons: [{ season: 1, year: 2024, episodes: [ep(1, 'Feature', 'Every dark has a source.', 830, 3)] }],
  },
  {
    slug: 'the-long-con',
    name: 'The Long Con',
    type: 'series',
    genres: ['Crime', 'Thriller', 'Drama'],
    year: 2023,
    synopsis: 'A grifter running a decades-long scheme meets someone running the same one.',
    maturity: 'TV-MA',
    seasons: [{ season: 1, year: 2023, episodes: [ep(1, 'The Set-Up', 'Confidence is currency.', 390, 2), ep(2, 'The Switch', 'Who is conning whom?', 405, 11)] }],
  },
  {
    slug: 'tiny-planets',
    name: 'Tiny Planets',
    type: 'series',
    genres: ['Animation', 'Sci-Fi', 'Comedy'],
    year: 2025,
    synopsis: 'A maintenance robot is reassigned to a planet that keeps apologizing.',
    maturity: 'TV-Y7',
    seasons: [{ season: 1, year: 2025, episodes: [ep(1, 'Orbit', 'The planet says hello.', 140, 4), ep(2, 'Gravity Well', 'It also says sorry.', 145, 5)] }],
  },
  {
    slug: 'redline-county',
    name: 'Redline County',
    type: 'series',
    genres: ['Action', 'Crime', 'Thriller'],
    year: 2024,
    synopsis: 'Two rival tow-truck crews double as the county’s only real emergency service.',
    maturity: 'TV-14',
    seasons: [{ season: 1, year: 2024, episodes: [ep(1, 'Dispatch', 'First to the wreck sets the price.', 370, 12), ep(2, 'Impound', 'A car holds more than an engine.', 385, 8)] }],
  },
  {
    slug: 'the-understudy',
    name: 'The Understudy',
    type: 'movie',
    genres: ['Drama', 'Thriller'],
    year: 2023,
    synopsis: 'A perpetual second choice finally gets the lead — and the role consumes her.',
    maturity: 'R',
    seasons: [{ season: 1, year: 2023, episodes: [ep(1, 'Feature', 'Break a leg, literally.', 880, 10)] }],
  },
];

/** Real titles when a key is configured, otherwise the invented catalogue. */
async function loadCatalogue() {
  if (!tmdb.enabled()) {
    console.log('[seed] TMDB_API_KEY is not set — using the built-in fictional catalogue');
    console.log('[seed] set TMDB_API_KEY (free at themoviedb.org) to import real titles and artwork');
    return withOriginals(CATALOGUE);
  }

  try {
    const docs = await tmdb.buildCatalogue({ mediaFor });
    if (docs.length < 8) {
      console.warn(`[seed] TMDB returned only ${docs.length} usable titles — seeding the fictional catalogue instead`);
      return withOriginals(CATALOGUE);
    }
    const films = docs.filter((d) => d.type === 'movie').length;
    console.log(`[seed] TMDB import: ${docs.length} titles (${films} films, ${docs.length - films} series)`);
    return withOriginals(docs);
  } catch (err) {
    console.warn(`[seed] TMDB import failed (${err.message}) — seeding the fictional catalogue instead`);
    return withOriginals(CATALOGUE);
  }
}

/**
 * The local slate is produced by the service itself, so an imported international
 * catalogue never displaces it. Only the stand-in media path is filled in here.
 */
function withOriginals(docs) {
  const originals = ETHIOPIAN_ORIGINALS.map((t) => ({
    ...t,
    seasons: t.seasons.map((s) => ({
      ...s,
      episodes: s.episodes.map(({ mediaName, ...e }) => ({ ...e, mediaUrl: media(mediaName) })),
    })),
  }));
  return [...originals, ...docs];
}

async function upsertCatalogue(docs) {
  const taken = new Set();
  const uniqueSlug = (base) => {
    let slug = base || 'title';
    let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;
    taken.add(slug);
    return slug;
  };

  for (const t of docs) {
    const slug = uniqueSlug(t.slug || t.name);
    await Title.updateOne({ slug }, { $set: { ...t, slug } }, { upsert: true });
  }

  // The local slate is a reviewed list, like the channels, so it syncs rather than
  // accumulates: a title that leaves the slate must not keep its row slot. The
  // acquired catalogue is left alone because what it holds depends on the import.
  const localSlugs = docs.filter((t) => t.origin === 'Ethiopia').map((t) => t.slug);
  if (localSlugs.length) await Title.deleteMany({ origin: 'Ethiopia', slug: { $nin: localSlugs } });

  return Title.find({});
}

/** Live TV channels come from a reviewed list, not an API, so this is a straight sync. */
async function seedChannels() {
  for (const c of CHANNELS) {
    await Channel.updateOne({ slug: c.slug }, { $set: c }, { upsert: true });
  }
  await Channel.deleteMany({ slug: { $nin: CHANNELS.map((c) => c.slug) } });
  return Channel.countDocuments({});
}

async function makeUser(email, password, displayName, genres) {
  let user = await User.findOne({ email });
  if (!user) {
    user = new User({ email, displayName, genres });
    await user.setPassword(password);
    await user.save();
  }
  return user;
}

const DEMO_PREFS = ['Sci-Fi', 'Thriller', 'Crime'];
const MAYA_PREFS = ['Drama', 'Crime', 'Comedy'];

const byMarketRank = (a, b) => (b.externalPopularity || 0) - (a.externalPopularity || 0) || (b.popularity || 0) - (a.popularity || 0);

/** Titles matching declared genres first, then the rest of the catalogue. */
function rankedFor(titles, prefs) {
  const liked = titles.filter((t) => (t.genres || []).some((g) => prefs.includes(g))).sort(byMarketRank);
  return [...liked, ...titles.filter((t) => !liked.includes(t))];
}

/**
 * Stand-in clips are minutes long while a real episode runs ~45 minutes, so a true
 * percentage would put "Resume at" past the end of the footage. Positions stay in a
 * short window: enough to read as part-watched, small enough to be resumable.
 */
function partialPosition(durationSec) {
  const dur = durationSec > 0 ? durationSec : 600;
  return Math.min(Math.max(Math.round(dur * 0.3), 120), Math.max(dur - 30, 120));
}

function eventFor(user, title, { episodeIndex = 0, completed = false, daysAgo }) {
  const season = title.seasons[0];
  const episode = season.episodes[Math.min(episodeIndex, season.episodes.length - 1)];
  const durationSec = episode.durationSec || 600;
  return {
    userId: user._id,
    titleId: title._id,
    episodeId: episode._id,
    season: season.season,
    episode: episode.number,
    positionSec: completed ? durationSec : partialPosition(durationSec),
    durationSec,
    completed,
    plays: 1,
    watchedAt: new Date(Date.now() - daysAgo * 24 * 3600 * 1000),
  };
}

/**
 * Watch history is planned from the titles that actually landed, so the same script
 * works for imported and invented catalogues. Two accounts with different tastes,
 * each with one unfinished episode for Continue Watching, plus completions shared
 * between them so item-item similarity has real co-watch signal.
 */
function planEvents(titles, { demo, maya }) {
  const demoPicks = rankedFor(titles, DEMO_PREFS).slice(0, 4);
  const mayaPicks = rankedFor(titles, MAYA_PREFS).slice(0, 4);
  const shared = demoPicks.slice(0, 2).filter((t) => String(t._id) !== String(mayaPicks[0]._id));

  return [
    eventFor(demo, demoPicks[0], { daysAgo: 1 }),
    ...demoPicks.slice(1).map((t, i) => eventFor(demo, t, { completed: true, daysAgo: 4 + i * 2 })),
    eventFor(maya, mayaPicks[0], { episodeIndex: 1, daysAgo: 2 }),
    ...mayaPicks.slice(1).map((t, i) => eventFor(maya, t, { completed: true, daysAgo: 5 + i * 2 })),
    ...shared.map((t, i) => eventFor(maya, t, { completed: true, daysAgo: 3 + i * 5 })),
  ];
}

async function seed() {
  await connectDb();
  console.log('[seed] wiping collections');
  await Promise.all([
    Title.deleteMany({}),
    User.deleteMany({}),
    Subscription.deleteMany({}),
    WatchEvent.deleteMany({}),
    Channel.deleteMany({}),
  ]);

  const titles = await upsertCatalogue(await loadCatalogue());
  const local = titles.filter((t) => t.origin === 'Ethiopia').length;
  console.log(`[seed] ${titles.length} titles (${local} Ethiopian originals)`);

  const channels = await seedChannels();
  const localChannels = CHANNELS.filter((c) => c.country === 'Ethiopia').length;
  console.log(`[seed] ${channels} live channels (${localChannels} Ethiopian, ${channels - localChannels} international)`);

  const demo = await makeUser('demo@hulu.test', 'password123', 'Demo Viewer', DEMO_PREFS);
  const maya = await makeUser('maya@hulu.test', 'password123', 'Maya', MAYA_PREFS);
  await makeUser('sam@hulu.test', 'password123', 'Sam', []); // cold-start account, no genres

  // Active mock subscriptions for demo + maya.
  const end = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  await Subscription.create([
    { userId: demo._id, plan: 'premium', status: 'active', currentPeriodEnd: end },
    { userId: maya._id, plan: 'basic', status: 'active', currentPeriodEnd: end },
  ]);

  const events = planEvents(titles, { demo, maya });
  for (const e of events) {
    await WatchEvent.updateOne({ userId: e.userId, episodeId: e.episodeId }, { $set: e }, { upsert: true });
  }
  console.log(`[seed] ${events.length} watch events`);

  const sim = await recomputeSimilarity();
  console.log('[seed] similarity', sim);

  console.log('\n[seed] Demo logins:');
  console.log('  demo@hulu.test / password123  (premium, has history)');
  console.log('  maya@hulu.test / password123  (basic, has history)');
  console.log('  sam@hulu.test  / password123  (no subscription, cold start)\n');

  await disconnectDb();
}

/**
 * Catalogue-only pass: refresh the titles and the channel list and nothing else.
 * `seed()` above wipes users, subscriptions and watch history, which is the wrong
 * thing to do to a live database when only the slate has changed.
 */
async function seedCatalogue() {
  await connectDb();

  const titles = await upsertCatalogue(await loadCatalogue());
  const local = titles.filter((t) => t.origin === 'Ethiopia').length;
  console.log(`[seed] ${titles.length} titles (${local} Ethiopian originals)`);

  const channels = await seedChannels();
  const localChannels = CHANNELS.filter((c) => c.country === 'Ethiopia').length;
  console.log(`[seed] ${channels} live channels (${localChannels} Ethiopian, ${channels - localChannels} international)`);

  const sim = await recomputeSimilarity();
  console.log('[seed] similarity', sim);
  console.log('[seed] accounts, subscriptions and watch history were left alone');

  await disconnectDb();
}

/** The line-up ships with the code, so a database seeded under an older release is
 *  quietly behind it. Extra rows already stored do not show up here, but seedChannels()
 *  deletes what the slate no longer lists.
 */
async function missingChannels() {
  const stored = new Set(await Channel.distinct('slug'));
  return CHANNELS.filter((c) => !stored.has(c.slug));
}

/**
 * A deployed API pointed at an empty database serves an empty site: no rows on the
 * home page and a Live TV page with no channels. Both of those come from lists
 * reviewed and shipped with the code, so boot fills them in rather than waiting for
 * someone to run a seed script against production — and the same check catches a
 * database that is only behind the slate. Accounts, subscriptions and watch history
 * are left alone, and the connection stays open for the server to use.
 */
async function ensureCatalogue() {
  const [channels, titles] = await Promise.all([Channel.countDocuments({}), Title.countDocuments({})]);
  const missing = await missingChannels();
  if (channels && titles && !missing.length) return;

  if (!channels) {
    const n = await seedChannels();
    const local = CHANNELS.filter((c) => c.country === 'Ethiopia').length;
    console.log(`[boot] the live line-up was empty — loaded ${n} channels (${local} Ethiopian)`);
  } else if (missing.length) {
    const n = await seedChannels();
    console.log(`[boot] the stored line-up was behind the shipped one — added ${missing.length} channels, now ${n}`);
  }

  if (!titles) {
    const docs = await upsertCatalogue(await loadCatalogue());
    console.log(`[boot] the catalogue was empty — loaded ${docs.length} titles`);
    console.log('[boot] similarity', await recomputeSimilarity());
  }
}

if (require.main === module) {
  const run = process.argv.includes('--catalogue-only') ? seedCatalogue : seed;
  run()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed] failed', err);
      process.exit(1);
    });
}

module.exports = { seed, seedCatalogue, ensureCatalogue, CATALOGUE };

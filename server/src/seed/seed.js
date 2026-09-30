'use strict';

const { connectDb, disconnectDb } = require('../config/db');
const User = require('../models/User');
const Title = require('../models/Title');
const Subscription = require('../models/Subscription');
const WatchEvent = require('../models/WatchEvent');
const config = require('../config');
const { recomputeSimilarity } = require('../services/recommendation');

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

function media(name) {
  return `${config.mediaBaseUrl}/${name}`;
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

async function upsertCatalogue() {
  for (const t of CATALOGUE) {
    await Title.updateOne({ slug: t.slug }, { $set: t }, { upsert: true });
  }
  return Title.find({});
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

async function seed() {
  await connectDb();
  console.log('[seed] wiping collections');
  await Promise.all([Title.deleteMany({}), User.deleteMany({}), Subscription.deleteMany({}), WatchEvent.deleteMany({})]);

  const titles = await upsertCatalogue();
  console.log(`[seed] ${titles.length} titles`);

  const demo = await makeUser('demo@hulu.test', 'password123', 'Demo Viewer', ['Sci-Fi', 'Thriller', 'Crime']);
  const maya = await makeUser('maya@hulu.test', 'password123', 'Maya', ['Drama', 'Crime', 'Comedy']);
  await makeUser('sam@hulu.test', 'password123', 'Sam', []); // cold-start account, no genres

  // Active mock subscriptions for demo + maya.
  const end = new Date(Date.now() + 30 * 24 * 3600 * 1000);
  await Subscription.create([
    { userId: demo._id, plan: 'premium', status: 'active', currentPeriodEnd: end },
    { userId: maya._id, plan: 'basic', status: 'active', currentPeriodEnd: end },
  ]);

  // Watch history so Continue Watching, Trending and item-item similarity have signal.
  const findTitle = (slug) => titles.find((t) => t.slug === slug);
  const ev = (user, slug, epi, positionSec, completed, daysAgo) => {
    const t = findTitle(slug);
    const season = t.seasons[0];
    const epObj = season.episodes[epi] || season.episodes[0];
    return {
      userId: user._id,
      titleId: t._id,
      episodeId: epObj._id,
      season: season.season,
      episode: epObj.number,
      positionSec,
      durationSec: epObj.durationSec,
      completed,
      plays: 1,
      watchedAt: new Date(Date.now() - daysAgo * 24 * 3600 * 1000),
    };
  };

  const events = [
    // demo: sci-fi/thriller lean
    ev(demo, 'neon-hollow', 1, 120, false, 1), // in progress -> continue watching
    ev(demo, 'blackout-protocol', 0, 830, true, 4),
    ev(demo, 'the-long-con', 0, 390, true, 6),
    ev(demo, 'the-quiet-floor', 0, 360, true, 8),
    // maya: drama/crime/comedy lean
    ev(maya, 'paper-empire', 0, 200, false, 2),
    ev(maya, 'paper-empire', 1, 400, true, 5),
    ev(maya, 'the-understudy', 0, 880, true, 7),
    ev(maya, 'greener-pastures', 0, 260, true, 9),
    // shared completions to create co-watch signal between neon-hollow & blackout-protocol
    ev(maya, 'blackout-protocol', 0, 830, true, 3),
    ev(maya, 'neon-hollow', 0, 340, true, 10),
  ];

  for (const e of events) {
    await WatchEvent.updateOne(
      { userId: e.userId, episodeId: e.episodeId },
      { $set: e },
      { upsert: true }
    );
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

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[seed] failed', err);
      process.exit(1);
    });
}

module.exports = { seed, CATALOGUE };

'use strict';

process.env.TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017/hulu_test_recs';

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { reset, teardown } = require('./helpers');
const { Title, User, WatchEvent } = require('../src/models');
const { recomputeSimilarity, becauseYouWatched, coldStartRecommendations } = require('../src/services/recommendation');

let A, B, C, user1, user2, solo;

before(async () => {
  await reset();
  const mk = async (slug, name, genres) => Title.create({ slug, name, type: 'series', genres, seasons: [{ season: 1, episodes: [{ number: 1, title: 'x', durationSec: 100, mediaUrl: 'https://e/x.mp4' }] }] });
  A = await mk('alpha', 'Alpha', ['Sci-Fi', 'Thriller']);
  B = await mk('beta', 'Beta', ['Sci-Fi']);
  C = await mk('gamma', 'Gamma', ['Comedy']);

  user1 = await User.create({ email: 'u1@h.test', passwordHash: 'x', genres: ['Comedy'] });
  user2 = await User.create({ email: 'u2@h.test', passwordHash: 'x', genres: [] });
  solo = await User.create({ email: 'solo@h.test', passwordHash: 'x', genres: [] });

  // Fixed event fixture. Both users watched A and B (strong co-watch). Only user1
  // also watched C, so C co-occurs with A and B weakly.
  const log = (u, t, days) => WatchEvent.create({ userId: u._id, titleId: t._id, episodeId: t.seasons[0].episodes[0]._id, completed: true, watchedAt: new Date(Date.now() - days * 86400000) });
  await log(user1, A, 1);
  await log(user1, B, 2);
  await log(user1, C, 3);
  await log(user2, A, 1);
  await log(user2, B, 2);
  await log(solo, A, 1); // solo watched only A -> its neighbors are unseen

  await recomputeSimilarity();
});

after(teardown);

test('item-item similarity ranks co-watched + genre-matched title first', async () => {
  const a = await Title.findById(A._id);
  assert.ok(a.similarTitles.length > 0);
  assert.strictEqual(String(a.similarTitles[0]._id), String(B._id), 'B should be Alpha\'s closest title');
});

test('Because You Watched returns similar titles and excludes already-watched', async () => {
  const recs = await becauseYouWatched(solo._id); // solo watched only A
  const ids = recs.map((r) => String(r.title._id));
  assert.ok(ids.includes(String(B._id)), 'A\'s closest neighbour B should be recommended');
  assert.ok(!ids.includes(String(A._id)), 'must not recommend what the user already watched');
});

test('cold-start uses genre affinity over the user\'s picked genres', async () => {
  const picks = await coldStartRecommendations(user1); // user1 genres: [Comedy]
  assert.ok(picks.some((t) => String(t._id) === String(C._id)), 'Comedy fan should get Gamma');
});

test('cold-start with no genres falls back to popularity (never empty)', async () => {
  const blank = await User.create({ email: 'blank@h.test', passwordHash: 'x', genres: [] });
  const picks = await coldStartRecommendations(blank);
  assert.ok(picks.length > 0, 'empty front page is the bug we are guarding against');
});

test('user with no history gets an empty because-you-watched so the caller can hide the row', async () => {
  const fresh = await User.create({ email: 'fresh@h.test', passwordHash: 'x', genres: ['Drama'] });
  const recs = await becauseYouWatched(fresh._id);
  assert.strictEqual(recs.length, 0);
});

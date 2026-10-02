'use strict';

process.env.TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017/hulu_test_rows';

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { reset, teardown } = require('./helpers');
const app = require('../src/app');
const rowCache = require('../src/services/rowCache');
const Title = require('../src/models/Title');
const Channel = require('../src/models/Channel');

// Rows sit behind a short-TTL cache, so every fixture has to exist before the
// first request to /catalog/rows.
before(async () => {
  await reset();
  const episode = { number: 1, title: 'Feature', durationSec: 600, mediaUrl: 'https://media.test/a.mp4' };
  await Title.insertMany([
    {
      slug: 'eskista',
      name: 'Eskista',
      nameLocal: 'እንቁልጥል',
      origin: 'Ethiopia',
      motif: 'drum',
      type: 'series',
      genres: ['Drama', 'Music'],
      year: 2025,
      popularity: 9,
      seasons: [{ season: 1, year: 2025, episodes: [episode] }],
    },
    {
      slug: 'demera',
      name: 'Demera',
      nameLocal: 'ደመራ',
      origin: 'Ethiopia',
      motif: 'bonfire',
      type: 'movie',
      genres: ['Drama'],
      year: 2024,
      popularity: 2,
      seasons: [{ season: 1, year: 2024, episodes: [episode] }],
    },
    {
      slug: 'neon-hollow',
      name: 'Neon Hollow',
      type: 'series',
      genres: ['Sci-Fi'],
      year: 2024,
      popularity: 50,
      seasons: [{ season: 1, year: 2024, episodes: [episode] }],
    },
  ]);
  await Channel.insertMany([
    { slug: 'ebc', name: 'EBC', category: 'News', kind: 'tv', country: 'Ethiopia', youtubeChannelId: 'UCDTHLb5sWwIGXwB8Yz9NvAg', displayRank: 1 },
    { slug: 'sheger-fm', name: 'Sheger FM', category: 'Music', kind: 'radio', country: 'Ethiopia', youtubeChannelId: 'UCBZrJLnGdJTcDig3FTWp5FQ', displayRank: 2 },
    { slug: 'aljazeera', name: 'Al Jazeera English', category: 'News', kind: 'tv', country: 'Qatar', youtubeChannelId: 'UCnuyZ9i4REUby4dmFKtzzVA', displayRank: 3 },
  ]);
});

after(async () => {
  await teardown();
});

async function rows() {
  const res = await request(app).get('/catalog/rows');
  assert.strictEqual(res.status, 200);
  return res.body.rows;
}

test('the front page opens on the local slate, in Amharic as well as Latin', async () => {
  const list = await rows();
  const local = list[0];
  assert.strictEqual(local.key, 'ethiopian_originals');
  assert.strictEqual(local.titleLocal, 'ኢትዮጵያ');
  assert.deepStrictEqual(local.items.map((t) => t.slug), ['eskista', 'demera']);
  assert.strictEqual(local.items[0].nameLocal, 'እንቁልጥል');
  assert.strictEqual(local.items[0].motif, 'drum');
  assert.strictEqual(local.items[0].origin, 'Ethiopia');
});

test('the acquired rows skip the local slate so no title repeats down the page', async () => {
  const list = await rows();
  const acquired = list.filter((r) => r.key === 'trending' || r.key === 'new_releases');
  assert.strictEqual(acquired.length, 2);
  for (const row of acquired) {
    assert.deepStrictEqual(row.items.map((t) => t.slug), ['neon-hollow']);
  }
});

test('a catalogue with no local titles loses the row instead of rendering it empty', async () => {
  await Title.updateMany({ origin: 'Ethiopia' }, { $set: { origin: 'International' } });
  rowCache.clear();
  const res = await request(app).get('/catalog/rows');
  const keys = res.body.rows.map((r) => r.key);
  assert.ok(!keys.includes('ethiopian_originals'), `got ${keys.join(', ')}`);
  assert.ok(keys.includes('trending'), 'the acquired rows still carry the page');
  await Title.updateMany({ slug: { $in: ['eskista', 'demera'] } }, { $set: { origin: 'Ethiopia' } });
  rowCache.clear();
});

test('the home live strip asks for one country, one kind, and a bounded slice', async () => {
  const tv = await request(app).get('/catalog/channels?country=Ethiopia&kind=tv');
  assert.deepStrictEqual(tv.body.channels.map((c) => c.slug), ['ebc']);

  const bounded = await request(app).get('/catalog/channels?country=Ethiopia&limit=1');
  assert.deepStrictEqual(bounded.body.channels.map((c) => c.slug), ['ebc']);

  const all = await request(app).get('/catalog/channels');
  assert.strictEqual(all.body.channels.length, 3, 'a limit must not leak into an unbounded request');
});

'use strict';

process.env.TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017/hulu_test_channels';

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { reset, teardown } = require('./helpers');
const app = require('../src/app');
const Channel = require('../src/models/Channel');
const liveStatus = require('../src/services/liveStatus');

// Whether a broadcaster is streaming is a question for youtube.com, and no test
// should depend on the answer. The routes call these as properties at request
// time, so replacing them here is enough: an id missing from the map is unknown,
// a null is off air, a video id is on air.
const airtime = new Map();
liveStatus.liveVideoId = async (id) => (airtime.has(id) ? airtime.get(id) : undefined);
liveStatus.statuses = async (ids) =>
  ids.map((id) => {
    if (!airtime.has(id)) return { channelId: id, liveVideoId: null, onAir: null };
    const videoId = airtime.get(id) || null;
    return { channelId: id, liveVideoId: videoId, onAir: Boolean(videoId) };
  });

// The route list is behind a 60s TTL cache, so every fixture has to exist before
// the first request — writing channels afterwards would read a stale list.
before(async () => {
  await reset();
  await Channel.insertMany([
    {
      slug: 'ebc',
      name: 'EBC TV',
      category: 'News',
      kind: 'tv',
      country: 'Ethiopia',
      language: 'Amharic',
      youtubeChannelId: 'UCDTHLb5sWwIGXwB8Yz9NvAg',
      displayRank: 1,
    },
    {
      slug: 'sheger-fm',
      name: 'Sheger FM',
      category: 'Music',
      kind: 'radio',
      country: 'Ethiopia',
      language: 'Amharic',
      youtubeChannelId: 'UCBZrJLnGdJTcDig3FTWp5FQ',
      displayRank: 2,
    },
    {
      slug: 'aljazeera',
      name: 'Al Jazeera English',
      category: 'News',
      kind: 'tv',
      country: 'Qatar',
      youtubeChannelId: 'UCnuyZ9i4REUby4dmFKtzzVA',
      displayRank: 3,
    },
    { slug: 'off-air', name: 'Retired Channel', category: 'Sports', kind: 'tv', country: 'Kenya', active: false, displayRank: 4 },
    { slug: 'no-stream', name: 'Listed Only', category: 'Movies', kind: 'tv', country: 'United States', displayRank: 5 },
  ]);
});

after(async () => {
  await teardown();
});

function getChannels(query = '') {
  return request(app).get(`/catalog/channels${query}`);
}

test('the channel list is public — no token, no plan', async () => {
  const res = await getChannels();
  assert.strictEqual(res.status, 200);
  const slugs = res.body.channels.map((c) => c.slug);
  assert.deepStrictEqual(slugs, ['ebc', 'sheger-fm', 'aljazeera', 'no-stream']);
  assert.ok(!slugs.includes('off-air'), 'inactive channels must not be listed');
});

test('category and kind filters compose', async () => {
  const news = await getChannels('?category=News');
  assert.deepStrictEqual(news.body.channels.map((c) => c.slug), ['ebc', 'aljazeera']);

  const radio = await getChannels('?kind=radio');
  assert.deepStrictEqual(radio.body.channels.map((c) => c.slug), ['sheger-fm']);

  const musicRadio = await getChannels('?category=News&kind=radio');
  assert.strictEqual(musicRadio.body.channels.length, 0);
});

test('search matches name, country and language', async () => {
  const byName = await getChannels('?q=sheger');
  assert.deepStrictEqual(byName.body.channels.map((c) => c.slug), ['sheger-fm']);

  const byCountry = await getChannels('?q=qatar');
  assert.deepStrictEqual(byCountry.body.channels.map((c) => c.slug), ['aljazeera']);
});

test('the filter vocabulary is offered so the client never hardcodes it', async () => {
  const res = await getChannels();
  assert.strictEqual(res.body.categories[0], 'All');
  assert.ok(res.body.categories.includes('Entertainment'));
  assert.deepStrictEqual(res.body.kinds, ['tv', 'radio']);
  assert.deepStrictEqual(res.body.countries.sort(), ['Ethiopia', 'Qatar', 'United States']);
  assert.ok(!res.body.countries.includes('Kenya'), 'inactive channels must not contribute countries');
});

test('a channel detail exposes embeds built from the broadcaster id', async () => {
  const res = await request(app).get('/catalog/channels/ebc');
  assert.strictEqual(res.status, 200);
  const { channel, related } = res.body;
  assert.strictEqual(channel.name, 'EBC TV');
  assert.match(channel.embeds.live, /youtube\.com\/embed\/live_stream\?channel=UCDTHLb5/);
  assert.match(channel.embeds.latest, /videoseries\?list=UUDTHLb5/);
  assert.match(channel.embeds.watch, /UCDTHLb5.*\/live$/);
  assert.deepStrictEqual(related.map((c) => c.slug), ['aljazeera']);
});

test('a channel with no broadcaster id has no embeds, and says so', async () => {
  const res = await request(app).get('/catalog/channels/no-stream');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.channel.embeds, null);
});

test('an inactive or unknown channel slug is a 404', async () => {
  const inactive = await request(app).get('/catalog/channels/off-air');
  assert.strictEqual(inactive.status, 404);
  const missing = await request(app).get('/catalog/channels/never-existed');
  assert.strictEqual(missing.status, 404);
});

test('a channel that is on air is embedded by its own current stream id', async () => {
  airtime.clear();
  airtime.set('UCDTHLb5sWwIGXwB8Yz9NvAg', 'abcdefghijk');

  const res = await request(app).get('/catalog/channels/ebc');
  assert.strictEqual(res.body.channel.onAir, true);
  assert.strictEqual(res.body.channel.liveVideoId, 'abcdefghijk');
  assert.strictEqual(res.body.channel.embeds.live, 'https://www.youtube.com/embed/abcdefghijk?autoplay=1');
});

test('a lookup that could not be completed is unknown, never off air', async () => {
  airtime.clear();

  const res = await request(app).get('/catalog/channels/ebc');
  assert.strictEqual(res.body.channel.onAir, null);
  assert.strictEqual(res.body.channel.liveVideoId, null);
  assert.match(res.body.channel.embeds.live, /live_stream\?channel=UCDTHLb5/);
});

test('the live batch answers by slug and omits what it cannot stream', async () => {
  airtime.clear();
  airtime.set('UCnuyZ9i4REUby4dmFKtzzVA', 'x1x2x3x4x5x');
  airtime.set('UCBZrJLnGdJTcDig3FTWp5FQ', null);

  const res = await request(app).get('/catalog/channels/live?slugs=aljazeera,sheger-fm,no-stream,never-existed');
  assert.strictEqual(res.status, 200);
  const bySlug = Object.fromEntries(res.body.statuses.map((s) => [s.slug, s]));
  assert.deepStrictEqual(Object.keys(bySlug).sort(), ['aljazeera', 'sheger-fm']);
  assert.deepStrictEqual(bySlug.aljazeera, { slug: 'aljazeera', onAir: true, liveVideoId: 'x1x2x3x4x5x' });
  assert.strictEqual(bySlug['sheger-fm'].onAir, false);
});

test('the live batch with nothing asked for is an empty answer, not an error', async () => {
  const res = await request(app).get('/catalog/channels/live');
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(res.body, { statuses: [] });
});

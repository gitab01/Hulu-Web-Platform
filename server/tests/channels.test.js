'use strict';

process.env.TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017/hulu_test_channels';

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { reset, teardown } = require('./helpers');
const app = require('../src/app');
const Channel = require('../src/models/Channel');
const channelStreams = require('../src/services/channelStreams');

// What a broadcaster has published is a question for youtube.com, and no test should
// depend on the answer. The route calls this as a property at request time, so
// replacing it here is enough: an id missing from the map is a feed that did not
// answer, which the serializer treats as "nothing known", not as "nothing to show".
const published = new Map();
channelStreams.streamCandidate = async (id) => (published.has(id) ? published.get(id) : undefined);

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

test('the channel stream is the broadcaster’s latest video, by id', async () => {
  published.clear();
  published.set('UCDTHLb5sWwIGXwB8Yz9NvAg', { videoId: 'abcdefghijk', title: 'Evening news', onAir: false });

  const res = await request(app).get('/catalog/channels/ebc');
  assert.strictEqual(res.body.channel.embeds.stream, 'https://www.youtube.com/embed/abcdefghijk?autoplay=1&rel=0');
  assert.strictEqual(res.body.channel.streamVideoId, 'abcdefghijk');
  assert.strictEqual(res.body.channel.streamTitle, 'Evening news');
  assert.strictEqual(res.body.channel.streamOnAir, false, 'an upload is not a broadcast');
});

/* What a channel is streaming is a different video from what it published last: a
   24/7 stream is an old upload that never reaches the top of the feed. YouTube's
   live-filtered list names it, and only its badge says so — a title containing the
   word live is something a channel writes about its news bulletins too. */
test('a candidate from the live list reaches the client as on air', async () => {
  published.clear();
  published.set('UCDTHLb5sWwIGXwB8Yz9NvAg', { videoId: 'abcdefghijk', title: 'Live from Addis', onAir: true });

  const res = await request(app).get('/catalog/channels/ebc');
  assert.strictEqual(res.body.channel.streamOnAir, true);
  assert.strictEqual(res.body.channel.embeds.stream, 'https://www.youtube.com/embed/abcdefghijk?autoplay=1&rel=0');
});

const lockup = (videoId, badgeStyle, title) => ({
  lockupViewModel: {
    contentId: videoId,
    contentImage: {
      thumbnailViewModel: {
        overlays: [{ thumbnailBottomOverlayViewModel: { badges: [{ thumbnailBadgeViewModel: { text: 'LIVE', badgeStyle } }] } }],
      },
    },
    metadata: { lockupMetadataViewModel: { title: { content: title } } },
  },
});

test('the live item is read off the badge, in both shapes YouTube serves', () => {
  assert.deepStrictEqual(
    channelStreams.liveItem({ contents: [lockup('abcdefghijk', 'THUMBNAIL_OVERLAY_BADGE_STYLE_LIVE', 'Live from Addis')] }),
    { videoId: 'abcdefghijk', title: 'Live from Addis', onAir: true }
  );

  assert.deepStrictEqual(
    channelStreams.liveItem({
      contents: [
        {
          videoRenderer: {
            videoId: 'xyz789qwer1',
            title: { runs: [{ text: 'DW News livestream' }] },
            badges: [{ metadataBadgeRenderer: { style: 'BADGE_STYLE_TYPE_LIVE', label: 'LIVE' } }],
          },
        },
      ],
    }),
    { videoId: 'xyz789qwer1', title: 'DW News livestream', onAir: true }
  );

  assert.strictEqual(channelStreams.liveItem({ contents: [lockup('abcdefghijk', 'THUMBNAIL_OVERLAY_BADGE_STYLE_DEFAULT', 'Evening news')] }), null);
  assert.strictEqual(channelStreams.liveItem({ contents: [] }), null);
});

/* A feed we could not read has to fall back to something that plays rather than be
   reported as a channel with nothing on. */
test('a channel that answered nothing falls back to the uploads playlist', async () => {
  published.clear();

  const res = await request(app).get('/catalog/channels/ebc');
  assert.strictEqual(res.status, 200);
  assert.match(res.body.channel.embeds.stream, /videoseries\?list=UUDTHLb5/);
  assert.strictEqual(res.body.channel.streamVideoId, null);
  assert.ok(!res.body.channel.embeds.stream.includes('live_stream'), 'the dead channel-wide embed must not come back');
});

test('the on-air badge endpoint is gone', async () => {
  const res = await request(app).get('/catalog/channels/live?slugs=ebc');
  assert.strictEqual(res.status, 404);
});

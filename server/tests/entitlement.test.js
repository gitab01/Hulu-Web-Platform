'use strict';

process.env.TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017/hulu_test_entitlement';

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { reset, teardown } = require('./helpers');
const app = require('../src/app');
const { User, Subscription, Title } = require('../src/models');
const { signAccessToken } = require('../src/utils/jwt');

let user, token, titleId, episodeId;

before(async () => {
  await reset();
  user = new User({ email: 'e@h.test', genres: [] });
  await user.setPassword('password123');
  await user.save();
  token = signAccessToken(user);

  const title = await Title.create({
    slug: 'sample',
    name: 'Sample',
    type: 'series',
    genres: ['Drama'],
    seasons: [{ season: 1, episodes: [{ number: 1, title: 'Pilot', durationSec: 300, mediaUrl: 'https://example/x.mp4' }] }],
  });
  titleId = String(title._id);
  episodeId = String(title.seasons[0].episodes[0]._id);
});

after(async () => {
  await teardown();
});

async function setSub(status, periodEndDays) {
  await Subscription.deleteMany({ userId: user._id });
  return Subscription.create({
    userId: user._id,
    plan: 'basic',
    status,
    currentPeriodEnd: new Date(Date.now() + periodEndDays * 86400000),
  });
}

async function playbackStatus() {
  const res = await request(app)
    .post('/player/playback')
    .set('Authorization', `Bearer ${token}`)
    .send({ titleId, episodeId });
  return res.status;
}

test('active subscription is entitled', async () => {
  await setSub('active', 10);
  assert.strictEqual(await playbackStatus(), 200);
});

test('trialing subscription is entitled', async () => {
  await setSub('trialing', 10);
  assert.strictEqual(await playbackStatus(), 200);
});

test('past_due is NOT entitled by the guard', async () => {
  await setSub('past_due', 10);
  assert.strictEqual(await playbackStatus(), 402);
});

test('canceled is NOT entitled', async () => {
  await setSub('canceled', 10);
  assert.strictEqual(await playbackStatus(), 402);
});

test('expired period is NOT entitled even when status active', async () => {
  await setSub('active', -1); // period already ended
  assert.strictEqual(await playbackStatus(), 402);
});

test('no subscription at all is NOT entitled', async () => {
  await Subscription.deleteMany({ userId: user._id });
  assert.strictEqual(await playbackStatus(), 402);
});

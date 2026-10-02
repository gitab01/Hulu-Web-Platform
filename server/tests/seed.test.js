'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert');

const { reset, teardown, models } = require('./helpers');
const { connectDb } = require('../src/config/db');
const { seedCatalogue } = require('../src/seed/seed');
const { ETHIOPIAN_ORIGINALS } = require('../src/data/originals');
const { CHANNELS } = require('../src/data/channels');

const { Title, User } = models;

before(async () => {
  await reset();
});

after(async () => {
  await teardown();
});

/**
 * The destructive seed() wipes everything first, so it cannot show a stale local
 * title surviving. Against a live database the catalogue pass is the one people
 * run, and that is where a retired original used to keep its row slot.
 */
test('a catalogue pass retires local titles the slate no longer carries', async () => {
  await Title.create({ slug: 'addis-midnight', name: 'Addis Midnight', type: 'series', origin: 'Ethiopia', seasons: [] });
  await seedCatalogue();
  await connectDb();

  assert.strictEqual(await Title.countDocuments({ slug: 'addis-midnight' }), 0);
  const slugs = ETHIOPIAN_ORIGINALS.map((t) => t.slug);
  assert.strictEqual(await Title.countDocuments({ slug: { $in: slugs }, origin: 'Ethiopia' }), slugs.length);
});

test('a catalogue pass leaves accounts and their history alone', async () => {
  const keeper = await User.create({ email: 'keeper@hulu.test', passwordHash: 'not-a-real-hash', displayName: 'Keeper' });
  await seedCatalogue();
  await connectDb();

  assert.ok(await User.findById(keeper._id), 'the catalogue pass must not delete accounts');
});

test('the catalogue pass syncs the channel list to the reviewed one', async () => {
  await seedCatalogue();
  await connectDb();

  assert.ok(await Title.countDocuments({ origin: { $ne: 'Ethiopia' } }), 'the acquired catalogue is left standing');
  const live = await models.Channel.find({});
  assert.strictEqual(live.length, CHANNELS.length);
  assert.ok(live.every((c) => c.youtubeChannelId), 'every channel embeds the broadcaster’s own stream');
});

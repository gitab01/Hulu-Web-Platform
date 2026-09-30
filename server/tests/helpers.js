'use strict';

// Shared bootstrap for integration tests: isolated Mongo DB, clean collections.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/hulu_test';
process.env.JWT_ACCESS_SECRET = 'test_access';
process.env.JWT_REFRESH_SECRET = 'test_refresh';
process.env.PLAYBACK_SECRET = 'test_playback';
process.env.STRIPE_SECRET_KEY = ''; // force mock provider

const { connectDb, disconnectDb } = require('../src/config/db');
const models = require('../src/models');

async function reset() {
  await connectDb();
  await Promise.all(Object.values(models).map((M) => M.deleteMany({})));
}

async function teardown() {
  await disconnectDb();
}

module.exports = { reset, teardown, models };

'use strict';

const mongoose = require('mongoose');
const config = require('./index');

async function connectDb() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  mongoose.set('strictQuery', true);
  await mongoose.connect(config.env === 'test' ? process.env.TEST_MONGODB_URI || config.mongoUri : config.mongoUri);
  return mongoose.connection;
}

async function disconnectDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

module.exports = { connectDb, disconnectDb };

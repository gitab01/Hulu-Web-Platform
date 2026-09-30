'use strict';

require('dotenv').config();

function required(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function bool(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return raw === '1' || raw.toLowerCase() === 'true';
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  mongoUri: required('MONGODB_URI', 'mongodb://127.0.0.1:27017/hulu_web_platform'),

  auth: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev_access_secret_change_me'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev_refresh_secret_change_me'),
    accessTtl: process.env.ACCESS_TOKEN_TTL || '15m',
    refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30),
  },

  playback: {
    secret: required('PLAYBACK_SECRET', 'dev_playback_secret_change_me'),
    ttlSeconds: Number(process.env.PLAYBACK_TTL_SECONDS || 300),
  },

  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  billing: {
    // Empty secret key => the app runs on the mock provider so it is usable/deployable
    // without a Stripe account.
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    prices: {
      basic: process.env.STRIPE_PRICE_BASIC || '',
      premium: process.env.STRIPE_PRICE_PREMIUM || '',
    },
    get enabled() {
      return Boolean(this.secretKey);
    },
  },

  recommender: {
    inProcess: bool('RUN_RECOMMENDER_IN_PROCESS', false),
    intervalMinutes: Number(process.env.RECOMMENDER_INTERVAL_MINUTES || 360),
  },

  mediaBaseUrl: process.env.MEDIA_BASE_URL || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample',
};

module.exports = config;

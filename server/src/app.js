'use strict';

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config');

const webhookRoutes = require('./routes/webhook.routes');
const authRoutes = require('./routes/auth.routes');
const catalogRoutes = require('./routes/catalog.routes');
const playerRoutes = require('./routes/player.routes');
const subscriptionRoutes = require('./routes/subscription.routes');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();

app.set('trust proxy', 1); // behind Render/Vercel proxies + rate limiting by real IP

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin/no-origin (curl, health checks) and configured origins.
      if (!origin || config.corsOrigins.includes(origin)) return cb(null, true);
      return cb(new Error('Origin not allowed by CORS'));
    },
    credentials: true,
  })
);

// Stripe webhook MUST receive the raw body for signature verification, so it is
// mounted before the JSON parser and reads req.body as a Buffer.
app.use('/webhooks', webhookRoutes);

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/health', (_req, res) => res.json({ ok: true, service: 'hulu-api', billing: config.billing.enabled ? 'stripe' : 'mock' }));

app.use('/auth', authRoutes);
app.use('/catalog', catalogRoutes);
app.use('/player', playerRoutes);
app.use('/billing', subscriptionRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

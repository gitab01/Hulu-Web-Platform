'use strict';

const express = require('express');
const billing = require('../services/billingService');

// Mounted in app.js with express.raw() BEFORE the JSON body parser, so the exact
// bytes Stripe signed are available for signature verification.
const router = express.Router();

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    // req.body is a Buffer here (raw). billing verifies the signature first.
    const result = await billing.handleStripeWebhook(req.body, signature);
    res.json(result);
  } catch (err) {
    res.status(err.status || 400).json({ error: { code: err.code || 'webhook_error', message: err.message } });
  }
});

module.exports = router;

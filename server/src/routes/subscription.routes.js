'use strict';

const express = require('express');
const billing = require('../services/billingService');
const Subscription = require('../models/Subscription');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/error');
const ApiError = require('../utils/ApiError');

const router = express.Router();

function publicSub(sub) {
  if (!sub) return null;
  return {
    plan: sub.plan,
    status: sub.status,
    entitled: sub.isEntitled(),
    currentPeriodEnd: sub.currentPeriodEnd,
    provider: sub.stripeSubscriptionId ? 'stripe' : 'mock',
  };
}

router.get(
  '/plans',
  asyncHandler(async (_req, res) => {
    const real = billing.isRealStripe();
    res.json({
      provider: real ? 'stripe' : 'mock',
      plans: [
        { id: 'basic', label: billing.PLANS.basic.label, priceUsd: real ? null : 5.99, features: ['1 stream', 'SD', 'No downloads'] },
        { id: 'premium', label: billing.PLANS.premium.label, priceUsd: real ? null : 12.99, features: ['4 streams', '4K', 'Downloads'] },
      ],
    });
  })
);

router.post(
  '/checkout',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { plan } = req.body || {};
    if (!plan) throw new ApiError(400, 'plan is required', 'validation_error');
    const result = await billing.createCheckout({ user: req.user, plan });
    res.json(result);
  })
);

/**
 * Mock-only confirm: with no Stripe keys configured this is the legitimate way to
 * activate entitlement. Refused (400) when real Stripe is enabled, so it cannot be
 * used to bypass billing in a configured deployment.
 */
router.post(
  '/mock/confirm',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (billing.isRealStripe()) throw new ApiError(400, 'Live billing is enabled; use Stripe checkout', 'wrong_mode');
    const { plan } = req.body || {};
    if (!plan || !billing.PLANS[plan]) throw new ApiError(400, 'Unknown plan', 'bad_plan');
    const sub = await billing.confirmMockSubscription({ user: req.user, plan });
    res.json({ subscription: publicSub(sub) });
  })
);

router.get(
  '/status',
  requireAuth,
  asyncHandler(async (req, res) => {
    const sub = await Subscription.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ subscription: publicSub(sub) });
  })
);

module.exports = router;

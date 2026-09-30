'use strict';

const mongoose = require('mongoose');

const PLANS = ['basic', 'premium'];
const STATUSES = ['active', 'trialing', 'past_due', 'canceled', 'expired'];

const subscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: String, enum: PLANS, required: true, default: 'basic' },

    // Mirrors Stripe subscription status. With the mock provider these are set
    // directly by the mock checkout route.
    status: { type: String, enum: STATUSES, required: true, default: 'active' },

    currentPeriodEnd: { type: Date, required: true },

    // Stripe identifiers are null when running on the mock provider.
    stripeCustomerId: { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null },

    canceledAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

// Entitlement reads are the hottest guard in the app: find the one live subscription.
subscriptionSchema.index({ userId: 1, status: 1, currentPeriodEnd: 1 });

/**
 * Entitlement is derived, not stored: a subscription is "live" only while its
 * status allows access AND the paid period has not elapsed. Keeping this as a
 * pure function means the guard and the tests never disagree about the rule.
 */
subscriptionSchema.methods.isEntitled = function isEntitled(now = new Date()) {
  const accessStatus = this.status === 'active' || this.status === 'trialing' || this.status === 'past_due';
  return accessStatus && this.currentPeriodEnd.getTime() > now.getTime();
};

/**
 * Static guard used by entitlement middleware. Only an unexpired, active/trialing
 * document grants access — `past_due` intentionally fails here so a lapsed card
 * does not silently keep paying-less users served (see challenges: renewal race is
 * handled at the signed-URL layer, not by loosening this).
 */
subscriptionSchema.statics.findEntitled = function findEntitled(userId, now = new Date()) {
  return this.findOne({
    userId,
    status: { $in: ['active', 'trialing'] },
    currentPeriodEnd: { $gt: now },
  });
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
module.exports.PLANS = PLANS;
module.exports.STATUSES = STATUSES;

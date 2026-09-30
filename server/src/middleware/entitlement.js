'use strict';

const Subscription = require('../models/Subscription');
const ApiError = require('../utils/ApiError');

/**
 * Single guard that owns "is this user allowed to consume media?". It reads the
 * subscription record (source of truth) and decorates the request, so the
 * entitlement rule lives in one place instead of drifting across many route
 * handlers. Must run AFTER requireAuth and BEFORE any media route.
 */
async function requireEntitlement(req, _res, next) {
  try {
    if (!req.user) throw new ApiError(401, 'Authentication required', 'unauthorized');

    const subscription = await Subscription.findEntitled(req.user._id);
    if (!subscription) {
      // 402 Payment Required is semantically right: authenticated, but no live
      // paid period. A signed-in user is not necessarily a paying user.
      throw new ApiError(402, 'No active subscription', 'no_entitlement');
    }

    req.subscription = subscription;
    req.entitled = true;
    next();
  } catch (err) {
    next(err);
  }
}

/** Like requireEntitlement but does not throw — exposes req.entitled as a boolean. */
async function attachEntitlement(req, _res, next) {
  try {
    if (req.user) {
      const subscription = await Subscription.findEntitled(req.user._id);
      req.subscription = subscription || null;
      req.entitled = Boolean(subscription);
    } else {
      req.entitled = false;
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireEntitlement, attachEntitlement };

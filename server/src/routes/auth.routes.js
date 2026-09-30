'use strict';

const express = require('express');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const tokenService = require('../services/tokenService');
const { signAccessToken } = require('../utils/jwt');
const { asyncHandler } = require('../middleware/error');
const { requireAuth } = require('../middleware/auth');
const { authIpLimiter, loginAccountLimiter } = require('../middleware/rateLimit');
const ApiError = require('../utils/ApiError');
const { VALID_GENRES } = require('../data/genres');

const router = express.Router();

const LOCK_BASE_MS = 15 * 1000; // 15s, doubling per failed attempt

function buildAuthResponse(user) {
  return { accessToken: signAccessToken(user), user: user.toPublic() };
}

async function attachTokens(res, user, refreshed) {
  const issued = refreshed ? null : await tokenService.issueFamily(user);
  res.json({
    ...buildAuthResponse(user),
    // Client stores refreshToken (localStorage) and rotates it via /auth/refresh.
    refreshToken: issued ? issued.token : undefined,
  });
}

router.post(
  '/register',
  authIpLimiter,
  asyncHandler(async (req, res) => {
    const { email, password, displayName, genres } = req.body || {};
    if (!email || !password) throw new ApiError(400, 'Email and password are required', 'validation_error');
    if (password.length < 8) throw new ApiError(400, 'Password must be at least 8 characters', 'weak_password');

    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) throw new ApiError(409, 'An account with that email already exists', 'duplicate');

    const user = new User({
      email,
      displayName: displayName || String(email).split('@')[0],
      genres: Array.isArray(genres) ? genres.filter((g) => VALID_GENRES.includes(g)).slice(0, 5) : [],
    });
    await user.setPassword(password);
    await user.save();

    res.status(201);
    await attachTokens(res, user);
  })
);

router.post(
  '/login',
  authIpLimiter,
  loginAccountLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) throw new ApiError(400, 'Email and password are required', 'validation_error');

    const user = await User.findOne({ email: String(email).toLowerCase() });
    // Uniform failure message — don't reveal whether the account exists.
    const INVALID = new ApiError(401, 'Invalid email or password', 'invalid_credentials');

    if (!user) throw INVALID;

    if (user.isLocked()) {
      throw new ApiError(423, 'Too many failed attempts. Try again later.', 'account_locked');
    }

    const ok = await user.comparePassword(password);
    if (!ok) {
      user.failedLoginCount += 1;
      // Exponential backoff: 15s, 30s, 60s, 120s ... capped at 15 min.
      const delay = Math.min(LOCK_BASE_MS * 2 ** (user.failedLoginCount - 1), 15 * 60 * 1000);
      if (user.failedLoginCount >= 3) user.lockUntil = new Date(Date.now() + delay);
      await user.save();
      throw INVALID;
    }

    user.failedLoginCount = 0;
    user.lockUntil = null;
    await user.save();

    await attachTokens(res, user);
  })
);

/**
 * Rotate the refresh token. On reuse detection the family is invalidated and the
 * client must re-authenticate — surfaced as a 401 so the single client-side auth
 * handler can trigger one silent refresh attempt, then redirect to sign-in.
 */
router.post(
  '/refresh',
  authIpLimiter,
  asyncHandler(async (req, res) => {
    const refreshToken = (req.body && req.body.refreshToken) || (req.cookies && req.cookies.refresh_token);
    if (!refreshToken) throw new ApiError(401, 'Refresh token required', 'no_refresh_token');

    const result = await tokenService.rotate(refreshToken);
    if (result.error === 'reuse_detected') {
      throw new ApiError(401, 'Session expired. Please sign in again.', 'reuse_detected');
    }
    if (result.error) {
      throw new ApiError(401, 'Invalid refresh token', 'invalid_refresh_token');
    }

    const user = result.user;
    res.json({
      ...buildAuthResponse(user),
      // Rotation returns the same field; the client overwrites its stored token.
      refreshToken: result.token,
    });
  })
);

router.post(
  '/logout',
  asyncHandler(async (req, res) => {
    const refreshToken = (req.body && req.body.refreshToken) || (req.cookies && req.cookies.refresh_token);
    if (req.user) {
      await tokenService.revokeAllForUser(req.user._id);
    } else if (refreshToken) {
      // Best-effort logout without an access token.
      const { hashToken } = require('../utils/jwt');
      const RefreshToken = require('../models/RefreshToken');
      const record = await RefreshToken.findOne({ tokenHash: hashToken(refreshToken) });
      if (record) await tokenService.revokeFamily(record.userId, record.family);
    }
    res.json({ ok: true });
  })
);

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const subscription = await Subscription.findOne({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({
      user: req.user.toPublic(),
      subscription: subscription
        ? {
            plan: subscription.plan,
            status: subscription.status,
            entitled: subscription.isEntitled(),
            currentPeriodEnd: subscription.currentPeriodEnd,
          }
        : null,
    });
  })
);

module.exports = router;

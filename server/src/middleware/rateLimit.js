'use strict';

const rateLimit = require('express-rate-limit');

// Broad limiter for auth-adjacent endpoints keyed by IP.
const authIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'rate_limited', message: 'Too many attempts, slow down.' } },
});

/**
 * Per-account limiter for login: keyed by email so one abusive address cannot
 * exhaust the shared IP budget for everyone. Combined with exponential lockout on
 * the User model (failedLoginCount / lockUntil).
 */
const loginAccountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => `login:${String(req.body && req.body.email || '').toLowerCase()}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'rate_limited', message: 'Too many login attempts for this account.' } },
});

// Read-heavy browse rows get a generous but bounded budget.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authIpLimiter, loginAccountLimiter, apiLimiter };

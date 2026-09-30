'use strict';

const User = require('../models/User');
const { verifyAccessToken } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  if (req.cookies && req.cookies.access_token) return req.cookies.access_token;
  return null;
}

/** Requires a valid access token; attaches req.user. */
async function requireAuth(req, _res, next) {
  try {
    const token = extractToken(req);
    if (!token) throw new ApiError(401, 'Authentication required', 'unauthorized');

    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new ApiError(401, 'Access token expired', 'token_expired');
      }
      throw new ApiError(401, 'Invalid token', 'invalid_token');
    }

    const user = await User.findById(payload.sub);
    if (!user) throw new ApiError(401, 'Account no longer exists', 'invalid_token');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/** Attaches req.user when a valid token is present, otherwise continues anonymously. */
async function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (user) req.user = user;
  } catch {
    // Anonymous fallback — the route decides whether it needs auth.
  }
  next();
}

module.exports = { requireAuth, optionalAuth };

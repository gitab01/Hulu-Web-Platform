'use strict';

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config');

function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), email: user.email, typ: 'access' },
    config.auth.accessSecret,
    { expiresIn: config.auth.accessTtl }
  );
}

function verifyAccessToken(token) {
  const payload = jwt.verify(token, config.auth.accessSecret);
  if (payload.typ !== 'access') {
    throw new jwt.JsonWebTokenError('Wrong token type');
  }
  return payload;
}

/**
 * Refresh tokens are opaque random strings, not JWTs. The DB only ever stores a
 * SHA-256 hash of the value, so a stolen database dump is not a set of usable
 * tokens, and rotation is a simple insert + revoke.
 */
function newOpaqueRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function newFamilyId() {
  return crypto.randomUUID();
}

module.exports = { signAccessToken, verifyAccessToken, newOpaqueRefreshToken, hashToken, newFamilyId };

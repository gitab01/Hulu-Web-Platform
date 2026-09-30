'use strict';

const mongoose = require('mongoose');

// The active token family for a user. Rotation records the family each refresh
// token came from; reuse of an already-rotated token invalidates the whole family,
// forcing re-authentication. See services/tokenService.js.
const refreshTokenSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Hashed token value — a leaked DB dump cannot be replayed as a token.
    tokenHash: { type: String, required: true },
    family: { type: String, required: true, index: true },
    replacedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'RefreshToken', default: null },
    revokedAt: { type: Date, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// Mongo TTL index drops expired tokens automatically; the app still filters on
// expiresAt so an expired-but-not-yet-collected token is treated as invalid.
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);

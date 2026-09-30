'use strict';

const RefreshToken = require('../models/RefreshToken');
const User = require('../models/User');
const { newOpaqueRefreshToken, hashToken, newFamilyId } = require('../utils/jwt');
const config = require('../config');

function expiryDate() {
  return new Date(Date.now() + config.auth.refreshTtlDays * 24 * 60 * 60 * 1000);
}

/**
 * Issue a brand-new refresh token family (login / register). The family id is
 * stored on the user as the currently-active family.
 */
async function issueFamily(user) {
  await RefreshToken.updateMany({ userId: user._id, revokedAt: null }, { $set: { revokedAt: new Date() } });
  const family = newFamilyId();
  const token = newOpaqueRefreshToken();
  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(token),
    family,
    expiresAt: expiryDate(),
  });
  await User.updateOne({ _id: user._id }, { $set: { activeTokenFamily: family } });
  return { token, family };
}

/**
 * Rotate a refresh token. Returns { user, token } on success.
 *
 * Reuse detection: if a token that was already replaced (or revoked) is presented,
 * an attacker is replaying a stolen token. We then invalidate the entire family and
 * clear the user's active family, forcing re-authentication. A legitimate client
 * holding the newest token is unaffected.
 */
async function rotate(presentedToken) {
  const tokenHash = hashToken(presentedToken);
  const record = await RefreshToken.findOne({ tokenHash });

  if (!record) {
    return { error: 'invalid_token' };
  }

  const alreadyUsed = record.replacedBy !== null || record.revokedAt !== null;
  if (alreadyUsed) {
    // Replay detected — kill the whole family.
    await RefreshToken.updateMany(
      { userId: record.userId, family: record.family, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );
    await User.updateOne({ _id: record.userId }, { $set: { activeTokenFamily: null } });
    return { error: 'reuse_detected' };
  }

  if (record.expiresAt.getTime() < Date.now()) {
    return { error: 'expired' };
  }

  const user = await User.findById(record.userId);
  if (!user) {
    return { error: 'invalid_token' };
  }

  // Only the active family may rotate; a stale family from a prior re-auth is dead.
  if (user.activeTokenFamily !== record.family) {
    return { error: 'reuse_detected' };
  }

  const nextToken = newOpaqueRefreshToken();
  const next = await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(nextToken),
    family: record.family,
    expiresAt: expiryDate(),
  });

  record.replacedBy = next._id;
  record.revokedAt = new Date();
  await record.save();

  return { user, token: nextToken, family: record.family };
}

async function revokeFamily(userId, family) {
  await RefreshToken.updateMany({ userId, family, revokedAt: null }, { $set: { revokedAt: new Date() } });
}

async function revokeAllForUser(userId) {
  await RefreshToken.updateMany({ userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
  await User.updateOne({ _id: userId }, { $set: { activeTokenFamily: null } });
}

module.exports = { issueFamily, rotate, revokeFamily, revokeAllForUser };

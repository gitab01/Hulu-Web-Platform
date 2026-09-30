'use strict';

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Invalid email address'],
    },
    passwordHash: { type: String, required: true },
    displayName: { type: String, default: '' },

    // Genre affinity captured at signup; drives the cold-start recommendation fallback.
    genres: { type: [String], default: [] },

    // Identity: the family currently considered valid for refresh rotation.
    // Reuse of a token from a superseded family invalidates this family.
    activeTokenFamily: { type: String, default: null },

    // Login throttling (exponential backoff on failed attempts).
    failedLoginCount: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },

    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

userSchema.methods.setPassword = async function setPassword(plain) {
  // bcrypt with a per-user salt. Cost factor 12 balances security and latency.
  this.passwordHash = await bcrypt.hash(plain, 12);
};

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.isLocked = function isLocked(now = new Date()) {
  return Boolean(this.lockUntil && this.lockUntil.getTime() > now.getTime());
};

// Serialise safely — never leak the hash or throttling internals.
userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    email: this.email,
    displayName: this.displayName,
    genres: this.genres || [],
  };
};

module.exports = mongoose.model('User', userSchema);

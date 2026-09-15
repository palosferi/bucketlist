const crypto = require('crypto');
const { Schema } = require('mongoose');
const db = require('../config/db');

/**
 * Single-use tokens for email verification and password reset.
 *
 * Only a SHA-256 hash of the token is stored. The raw value exists solely in
 * the email that was sent, so a leaked database dump cannot be used to verify
 * addresses or seize accounts.
 *
 * Mongo's TTL monitor removes documents once `expiresAt` passes, so expired
 * tokens clean themselves up.
 */
const tokenSchema = new Schema(
  {
    _user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, index: true },
    purpose: { type: String, enum: ['verify-email', 'reset-password'], required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const hash = (raw) => crypto.createHash('sha256').update(raw).digest('hex');

module.exports = db.model('Token', tokenSchema);
module.exports.hashToken = hash;

/** Mints a token, stores only its hash, and returns the raw value to email. */
module.exports.issue = async function issue(userId, purpose, ttlMs) {
  const Token = module.exports;
  const raw = crypto.randomBytes(32).toString('base64url');

  // One live token per purpose: requesting a new link invalidates the old one.
  await Token.deleteMany({ _user: userId, purpose, usedAt: null });
  await Token.create({
    _user: userId,
    tokenHash: hash(raw),
    purpose,
    expiresAt: new Date(Date.now() + ttlMs),
  });

  return raw;
};

/** Looks up an unused, unexpired token and marks it used. Returns the user id. */
module.exports.consume = async function consume(raw, purpose) {
  const Token = module.exports;
  if (typeof raw !== 'string' || !raw) return null;

  // findOneAndUpdate, not findOne-then-save: two concurrent requests could
  // otherwise both see usedAt:null and consume the same token, letting a
  // single reset link set two different passwords.
  const doc = await Token.findOneAndUpdate(
    {
      tokenHash: hash(raw),
      purpose,
      usedAt: null,
      expiresAt: { $gt: new Date() },
    },
    { $set: { usedAt: new Date() } },
    { new: false }
  );
  if (!doc) return null;

  return doc._user;
};

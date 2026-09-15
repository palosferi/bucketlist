const { Schema } = require('mongoose');
const db = require('../config/db');

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true },
    displayName: { type: String, required: true, trim: true, maxlength: 60 },
    // Public profile lives at /u/:handle. Also the map's public URL.
    handle: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9-]+$/,
    },
    // Running total of stored photo bytes, kept in step with uploads/deletes
    // so a quota check never has to stat the disk.
    storageUsedBytes: { type: Number, default: 0, min: 0 },
    // Null until the address is confirmed. Publishing anything publicly is
    // gated on this, so an unverified account cannot use the service to host
    // content under someone else's address.
    emailVerifiedAt: { type: Date, default: null },
    // Sessions issued before this moment are refused. Bumping it is how a
    // password change logs every other device out, without depending on the
    // session store supporting enumeration.
    sessionsValidFrom: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

userSchema.methods.isVerified = function isVerified() {
  return this.emailVerifiedAt instanceof Date;
};

module.exports = db.model('User', userSchema);

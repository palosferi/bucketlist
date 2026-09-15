const { Schema } = require('mongoose');
const db = require('../config/db');
const { DEFAULT_COLOR } = require('../lib/colors');

/**
 * A named collection of adventures.
 *
 * Ownership lives here rather than on each adventure, which is what makes
 * sharing cheap to add later: a `members` array on this model turns every
 * adventure inside it into shared content without touching the adventures
 * themselves.
 */
const listSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    _owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // 'private'  — only the owner
    // 'unlisted' — anyone holding the share token
    // 'public'   — listed on the owner's public profile and map
    visibility: {
      type: String,
      enum: ['private', 'unlisted', 'public'],
      default: 'private',
    },
    shareToken: { type: String, index: true, sparse: true },
    isDefault: { type: Boolean, default: false },
    // One of lib/colors.js. Used for the list's dot in the UI and to fill the
    // countries it contributes to on the public map.
    color: { type: String, default: DEFAULT_COLOR },
  },
  { timestamps: true }
);

module.exports = db.model('List', listSchema);

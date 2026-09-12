const { Schema } = require('mongoose');
const db = require('../config/db');

/**
 * Location handling is deliberately split into a public and a private half.
 *
 *   country            ISO 3166-1 alpha-2, drawn from a fixed list. This is the
 *                      only geographic field that is ever exposed publicly, and
 *                      a country is far too coarse to identify anyone.
 *   placeName/lat/long Free-text and exact coordinates. NEVER rendered on a
 *                      public page — only to viewers who can see the adventure
 *                      itself.
 *
 * The old shared `Location` collection was removed because it leaked: a private
 * adventure at a sensitive place still created a globally visible row holding
 * that place's exact coordinates, and any user could delete a location another
 * user's adventure pointed at.
 */
const photoSchema = new Schema(
  {
    filename: { type: String, required: true },
    bytes: { type: Number, required: true, min: 0 },
    width: Number,
    height: Number,
    caption: { type: String, trim: true, maxlength: 200, default: '' },
  },
  { _id: true, timestamps: true }
);

const adventureSchema = new Schema(
  {
    _list: { type: Schema.Types.ObjectId, ref: 'List', required: true, index: true },
    // Denormalised from the parent list purely so ownership checks and
    // per-user storage accounting never need a second query.
    _owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    name: { type: String, required: true, trim: true, maxlength: 120 },
    type: { type: String, trim: true, maxlength: 40, default: '' },
    // A real Date, so adventures can be sorted and filtered by time.
    date: { type: Date, default: null },
    done: { type: Boolean, default: false },
    // An unfinished adventure is a future plan, and a public future plan
    // announces when its owner is away from home. Aspirational items are
    // therefore withheld from public pages unless explicitly opted in.
    shareUndone: { type: Boolean, default: false },

    country: { type: String, uppercase: true, trim: true, default: null, index: true },

    placeName: { type: String, trim: true, maxlength: 160, default: '' },
    latitude: { type: Number, min: -90, max: 90, default: null },
    longitude: { type: Number, min: -180, max: 180, default: null },

    description: { type: String, trim: true, maxlength: 5000, default: '' },
    photos: { type: [photoSchema], default: [] },
  },
  { timestamps: true }
);

adventureSchema.index({ _owner: 1, country: 1 });

/** Whether this adventure may appear on a public page at all. */
adventureSchema.methods.isPubliclyVisible = function isPubliclyVisible() {
  return this.done === true || this.shareUndone === true;
};

/** The subset that is safe to render on a public page. */
adventureSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id,
    name: this.name,
    type: this.type,
    date: this.date,
    done: this.done,
    country: this.country,
    description: this.description,
    photos: this.photos.map((p) => ({ filename: p.filename, caption: p.caption })),
  };
};

module.exports = db.model('Adventure', adventureSchema);

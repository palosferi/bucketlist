const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

/**
 * Photo storage with cost controlled at the point of upload.
 *
 * The important decision here is that originals are never kept. Every upload is
 * re-encoded to a bounded WebP, which turns "a user can upload anything" into a
 * predictable ~150-400 KB per photo. A per-user byte quota still exists, but as
 * a backstop rather than the primary defence — re-encoding plus the per-list and
 * per-adventure caps are what actually keep disk use flat.
 *
 * Re-encoding also strips EXIF, which matters more than the disk space: phone
 * photos carry GPS coordinates, and a public map rendering an unstripped image
 * would leak the exact spot a "country-level only" adventure was trying to keep
 * vague.
 */
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024; // what multer will accept pre-encode
const MAX_DIMENSION = 2048;
const WEBP_QUALITY = 82;
const MAX_PHOTOS_PER_ADVENTURE = 12;
// Multer buffers in memory, so this bounds one request's peak allocation.
// 4 x 8 MB keeps a burst well clear of a box that also runs a media stack.
const MAX_FILES_PER_UPLOAD = 4;
const DEFAULT_QUOTA_BYTES = 250 * 1024 * 1024; // 250 MB per user

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'data', 'photos');

class QuotaError extends Error {
  constructor(message) {
    super(message);
    this.name = 'QuotaError';
    this.status = 413;
  }
}

function quotaBytes() {
  const raw = Number.parseInt(process.env.USER_QUOTA_BYTES || '', 10);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_QUOTA_BYTES;
}

async function init() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

/** Fans files across 256 subdirectories to keep any one directory small. */
function shardPathFor(filename) {
  return path.join(UPLOAD_DIR, filename.slice(0, 2), filename);
}

/**
 * Re-encodes a buffer and writes it. Returns the stored photo's metadata.
 * Throws QuotaError if the user has no room left.
 */
async function store(UserModel, userId, buffer) {
  const user = await UserModel.findById(userId).select('storageUsedBytes');
  if (!user) throw new Error('Unknown user for photo upload');

  // sharp() on untrusted input: failOn 'truncated' rejects malformed images
  // rather than letting the decoder work on them.
  const image = sharp(buffer, { failOn: 'truncated', limitInputPixels: 50e6 });
  const meta = await image.metadata();
  if (!meta.format) throw Object.assign(new Error('Unrecognised image'), { status: 400 });

  const encoded = await image
    .rotate() // bake in EXIF orientation before the metadata is dropped
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer({ resolveWithObject: true });

  const bytes = encoded.data.length;

  // Reserve the space in one conditional update rather than checking and then
  // incrementing. Two concurrent uploads would otherwise both read the same
  // old total, both pass, and together exceed the quota.
  const reserved = await UserModel.updateOne(
    { _id: userId, storageUsedBytes: { $lte: quotaBytes() - bytes } },
    { $inc: { storageUsedBytes: bytes } }
  );
  if (!reserved.modifiedCount) {
    throw new QuotaError('You have used all of your photo storage.');
  }

  const filename = `${crypto.randomBytes(16).toString('hex')}.webp`;
  try {
    const dest = shardPathFor(filename);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, encoded.data);
  } catch (err) {
    // Give the reservation back, or a failed write would permanently consume
    // part of the user's quota.
    await UserModel.updateOne({ _id: userId }, { $inc: { storageUsedBytes: -bytes } });
    throw err;
  }

  return { filename, bytes, width: encoded.info.width, height: encoded.info.height };
}

async function remove(filename) {
  if (!/^[a-f0-9]{32}\.webp$/.test(filename)) return; // never let a path escape UPLOAD_DIR
  await fs.rm(shardPathFor(filename), { force: true });
}

async function releaseQuota(UserModel, userId, bytes) {
  if (bytes <= 0) return;
  await UserModel.updateOne({ _id: userId }, { $inc: { storageUsedBytes: -bytes } });
}

/**
 * Binds the store to a User model, matching the objRepo dependency-injection
 * style used across middlewares/ so tests can pass a fake model in.
 */
function create(UserModel) {
  return {
    init,
    shardPathFor,
    quotaBytes,
    remove,
    store: (userId, buffer) => store(UserModel, userId, buffer),
    releaseQuota: (userId, bytes) => releaseQuota(UserModel, userId, bytes),
    usage: async (userId) => {
      const u = await UserModel.findById(userId).select('storageUsedBytes');
      return { used: u ? u.storageUsedBytes : 0, total: quotaBytes() };
    },
  };
}

module.exports = {
  create,
  init,
  shardPathFor,
  quotaBytes,
  QuotaError,
  UPLOAD_DIR,
  MAX_UPLOAD_BYTES,
  MAX_PHOTOS_PER_ADVENTURE,
  MAX_FILES_PER_UPLOAD,
};

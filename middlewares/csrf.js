const crypto = require('crypto');

/**
 * Synchroniser-token CSRF protection.
 *
 * A per-session secret is minted on first use and exposed to templates as
 * `res.locals.csrfToken`; every state-changing request must echo it back. The
 * comparison is constant-time so a token cannot be recovered by timing.
 *
 * Ordering note: the token travels in the request body, so verification can
 * only happen once the body is parsed. `csrf()` runs globally and handles
 * urlencoded/JSON forms, but it cannot check a multipart upload — multer has
 * not run yet at that point. Multipart routes are therefore skipped here and
 * must place `verifyCsrf()` immediately after their multer middleware.
 */
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function isMultipart(req) {
  return (req.get('content-type') || '').toLowerCase().startsWith('multipart/form-data');
}

function check(req) {
  const sent = String((req.body && req.body._csrf) || req.get('x-csrf-token') || '');
  const expected = String((req.session && req.session.csrfToken) || '');

  const a = Buffer.from(sent);
  const b = Buffer.from(expected);
  if (!expected || a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    const err = new Error('Invalid or missing CSRF token');
    err.status = 403;
    return err;
  }
  return null;
}

function csrf() {
  return (req, res, next) => {
    if (!req.session) return next(new Error('csrf() requires a session'));

    if (!req.session.csrfToken) {
      req.session.csrfToken = crypto.randomBytes(32).toString('base64url');
    }
    res.locals.csrfToken = req.session.csrfToken;

    if (SAFE_METHODS.has(req.method)) return next();

    // Deferred to verifyCsrf(), after the upload middleware has parsed the body.
    if (isMultipart(req)) {
      req.csrfDeferred = true;
      return next();
    }

    const err = check(req);
    return err ? next(err) : next();
  };
}

/** Verifies a deferred (multipart) token. Place directly after multer. */
function verifyCsrf() {
  return (req, res, next) => {
    if (SAFE_METHODS.has(req.method)) return next();
    const err = check(req);
    if (err) return next(err);
    req.csrfDeferred = false;
    return next();
  };
}

module.exports = csrf;
module.exports.csrf = csrf;
module.exports.verifyCsrf = verifyCsrf;

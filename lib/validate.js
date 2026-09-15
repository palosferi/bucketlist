const { isValidCountry } = require('./countries');
const { isValidColor, DEFAULT_COLOR } = require('./colors');
const { parseMonth } = require('./dates');

/** Thrown for bad user input; the error handler turns it into a 400. */
class ValidationError extends Error {
  constructor(errors) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.status = 400;
    this.errors = errors; // { field: message }
  }
}

const str = (v) => (typeof v === 'string' ? v : '');

/**
 * Validates and normalises an adventure form submission.
 * Returns clean values; throws ValidationError listing every problem at once
 * so the form can show them all rather than one per round-trip.
 */
function parseAdventure(body) {
  const errors = {};
  const out = {};

  out.name = str(body.name).trim();
  if (!out.name) errors.name = 'Give the adventure a name.';
  else if (out.name.length > 120) errors.name = 'Keep the name under 120 characters.';

  out.type = str(body.type).trim().slice(0, 40);

  // Month granularity: an <input type="month"> posts YYYY-MM.
  const month = parseMonth(body.date);
  if (month === undefined) errors.date = 'Pick a month.';
  else out.date = month;

  const country = str(body.country).trim().toUpperCase();
  if (!country) {
    out.country = null;
  } else if (!isValidCountry(country)) {
    errors.country = 'Pick a country from the list.';
  } else {
    out.country = country;
  }

  out.placeName = str(body.placeName).trim().slice(0, 160);

  // parseFloat, not parseInt: the old code truncated 47.4979 to 47, moving
  // every pin by up to ~111 km.
  for (const [field, min, max] of [
    ['latitude', -90, 90],
    ['longitude', -180, 180],
  ]) {
    const raw = str(body[field]).trim();
    if (!raw) {
      out[field] = null;
      continue;
    }
    // Number(), not parseFloat(): parseFloat takes any valid numeric prefix, so
    // "47.5abc" would be silently stored as 47.5 by the one layer that is
    // supposed to be the input boundary.
    const n = Number(raw);
    if (!Number.isFinite(n)) errors[field] = 'Must be a number.';
    else if (n < min || n > max) errors[field] = `Must be between ${min} and ${max}.`;
    else out[field] = n;
  }

  out.description = str(body.description).trim();
  if (out.description.length > 5000) errors.description = 'Keep the description under 5000 characters.';

  const truthy = (v) => v === 'on' || v === 'true' || v === true;
  out.done = truthy(body.done);
  out.shareUndone = truthy(body.shareUndone);

  if (Object.keys(errors).length) throw new ValidationError(errors);
  return out;
}

function parseList(body) {
  const errors = {};
  const out = {};

  out.name = str(body.name).trim();
  if (!out.name) errors.name = 'Give the list a name.';
  else if (out.name.length > 80) errors.name = 'Keep the name under 80 characters.';

  const vis = str(body.visibility).trim() || 'private';
  if (!['private', 'unlisted', 'public'].includes(vis)) errors.visibility = 'Unknown visibility.';
  else out.visibility = vis;

  const color = str(body.color).trim() || DEFAULT_COLOR;
  if (!isValidColor(color)) errors.color = 'Pick a colour from the list.';
  else out.color = color;

  if (Object.keys(errors).length) throw new ValidationError(errors);
  return out;
}

/** Validates a profile edit: display name, handle and email. */
function parseProfile(body) {
  const errors = {};
  const out = {};

  out.displayName = str(body.displayName).trim();
  if (!out.displayName) errors.displayName = 'Tell us what to call you.';
  else if (out.displayName.length > 60) errors.displayName = 'Keep it under 60 characters.';

  out.handle = str(body.handle).trim().toLowerCase();
  if (!out.handle) errors.handle = 'A handle is required — it is your public map address.';
  else if (!/^[a-z0-9-]{3,30}$/.test(out.handle))
    errors.handle = 'Use 3-30 characters: lowercase letters, numbers and dashes.';
  else if (RESERVED_HANDLES.has(out.handle)) errors.handle = 'That handle is reserved.';

  out.email = str(body.email).trim().toLowerCase();
  if (!out.email) errors.email = 'Email is required.';
  else if (out.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email))
    errors.email = 'That does not look like an email address.';

  if (Object.keys(errors).length) throw new ValidationError(errors);
  return out;
}

function parseSignup(body) {
  const errors = {};
  const out = {};

  out.email = str(body.email).trim().toLowerCase();
  if (!out.email) errors.email = 'Email is required.';
  else if (out.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.email))
    errors.email = 'That does not look like an email address.';

  out.displayName = str(body.displayName).trim();
  if (!out.displayName) errors.displayName = 'Tell us what to call you.';
  else if (out.displayName.length > 60) errors.displayName = 'Keep it under 60 characters.';

  out.handle = str(body.handle).trim().toLowerCase();
  if (!out.handle) errors.handle = 'Pick a handle — it becomes your public map address.';
  else if (!/^[a-z0-9-]{3,30}$/.test(out.handle))
    errors.handle = 'Use 3-30 characters: lowercase letters, numbers and dashes.';
  else if (RESERVED_HANDLES.has(out.handle)) errors.handle = 'That handle is reserved.';

  const password = str(body.password);
  if (password.length < 10) errors.password = 'Use at least 10 characters.';
  else if (password.length > 200) errors.password = 'That password is too long.';
  else out.password = password;

  if (Object.keys(errors).length) throw new ValidationError(errors);
  return out;
}

const RESERVED_HANDLES = new Set([
  'admin', 'api', 'login', 'logout', 'signup', 'settings', 'about', 'help',
  'lists', 'list', 'adventure', 'adventures', 'map', 'u', 'static', 'public',
  'uploads', 'root', 'support', 'www',
]);

module.exports = { ValidationError, parseAdventure, parseList, parseSignup, parseProfile, RESERVED_HANDLES };

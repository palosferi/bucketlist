/**
 * Adventures are recorded to the month, not the day.
 *
 * "June 2019" is what people actually remember about a trip, and a day-precise
 * date on a public page is a sharper movement record than a month is. Values
 * are stored as a real Date pinned to the first of the month in UTC, so they
 * still sort and range-query normally.
 */
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Parses a YYYY-MM value from an <input type="month">.
 * @returns {Date|null|undefined} Date for a valid value, null for empty,
 *   undefined when the value is present but unparseable.
 */
function parseMonth(value) {
  const raw = String(value == null ? '' : value).trim();
  if (!raw) return null;

  const m = /^(\d{4})-(\d{2})$/.exec(raw);
  if (!m) return undefined;

  const year = Number(m[1]);
  const month = Number(m[2]);
  if (year < 1000 || year > 9999 || month < 1 || month > 12) return undefined;

  return new Date(Date.UTC(year, month - 1, 1));
}

/** Formats a Date as the YYYY-MM an <input type="month"> expects. */
function toMonthInput(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Formats a Date for display, e.g. "June 2019". */
function formatMonth(date) {
  const d = date instanceof Date ? date : date ? new Date(date) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/**
 * Years offered in the year select. Wide enough for a childhood memory at one
 * end and a plan a decade out at the other.
 */
function yearRange(now = new Date()) {
  const current = now.getUTCFullYear();
  const years = [];
  for (let y = current + 10; y >= 1950; y -= 1) years.push(y);
  return years;
}

/** Splits a stored Date into the {month, year} the two selects display. */
function toMonthParts(date) {
  const d = date instanceof Date ? date : date ? new Date(date) : null;
  if (!d || Number.isNaN(d.getTime())) return { month: '', year: '' };
  return { month: String(d.getUTCMonth() + 1), year: String(d.getUTCFullYear()) };
}

module.exports = { parseMonth, toMonthInput, formatMonth, toMonthParts, yearRange, MONTHS };

const { parseMonth, toMonthInput, formatMonth } = require('../../lib/dates');

describe('parseMonth', () => {
  it('pins a month to the first of it, in UTC', () => {
    expect(parseMonth('2019-06').toISOString()).toBe('2019-06-01T00:00:00.000Z');
  });

  it('returns null for empty input, meaning "not set"', () => {
    expect(parseMonth('')).toBeNull();
    expect(parseMonth(null)).toBeNull();
    expect(parseMonth(undefined)).toBeNull();
  });

  it('returns undefined for input that is present but unparseable', () => {
    // null and undefined mean different things here, so they must not collide.
    for (const bad of ['2019-6', '2019', 'garbage', '2019-13', '2019-00', '2019-06-15']) {
      expect(parseMonth(bad)).toBeUndefined();
    }
  });

  it('accepts the boundary months', () => {
    expect(parseMonth('2019-01').getUTCMonth()).toBe(0);
    expect(parseMonth('2019-12').getUTCMonth()).toBe(11);
  });
});

describe('toMonthInput', () => {
  it('round-trips with parseMonth', () => {
    expect(toMonthInput(parseMonth('2019-06'))).toBe('2019-06');
  });

  it('zero-pads single-digit months', () => {
    expect(toMonthInput(new Date(Date.UTC(2019, 0, 1)))).toBe('2019-01');
  });

  it('is empty for a missing or invalid date', () => {
    expect(toMonthInput(null)).toBe('');
    expect(toMonthInput(new Date('nope'))).toBe('');
  });
});

describe('formatMonth', () => {
  it('renders a human month and year', () => {
    expect(formatMonth(new Date(Date.UTC(2019, 5, 1)))).toBe('June 2019');
  });

  it('collapses an older day-precise value to its month', () => {
    // Entries saved before the switch still carry a day; they must still read.
    expect(formatMonth(new Date('2025-05-10T00:00:00Z'))).toBe('May 2025');
  });

  it('is empty for a missing date', () => {
    expect(formatMonth(null)).toBe('');
    expect(formatMonth(undefined)).toBe('');
  });
});

const { COLORS, DEFAULT_COLOR, isValidColor, colorHex } = require('../../lib/colors');
const { parseList, ValidationError } = require('../../lib/validate');

describe('colour palette', () => {
  it('offers a usable number of distinct colours', () => {
    expect(COLORS.length).toBeGreaterThanOrEqual(10);
    expect(COLORS.length).toBeLessThanOrEqual(20);
  });

  it('has unique names and unique hex values', () => {
    expect(new Set(COLORS.map((c) => c.name)).size).toBe(COLORS.length);
    expect(new Set(COLORS.map((c) => c.hex)).size).toBe(COLORS.length);
  });

  it('uses well-formed hex values', () => {
    for (const c of COLORS) expect(c.hex).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('includes the default colour', () => {
    expect(isValidColor(DEFAULT_COLOR)).toBe(true);
  });

  it('falls back to the default for an unknown name', () => {
    expect(colorHex('chartreuse')).toBe(colorHex(DEFAULT_COLOR));
    expect(colorHex(undefined)).toBe(colorHex(DEFAULT_COLOR));
  });

  it('rejects anything outside the palette', () => {
    expect(isValidColor('chartreuse')).toBe(false);
    expect(isValidColor('#ff0000')).toBe(false);
    expect(isValidColor(null)).toBe(false);
  });
});

describe('parseList colour', () => {
  it('defaults when none is given', () => {
    expect(parseList({ name: 'L' }).color).toBe(DEFAULT_COLOR);
  });

  it('accepts a palette colour', () => {
    expect(parseList({ name: 'L', color: 'teal' }).color).toBe('teal');
  });

  it('rejects a colour outside the palette', () => {
    expect(() => parseList({ name: 'L', color: '#bada55' })).toThrow(ValidationError);
  });
});

const { parseAdventure, parseSignup, parseList, ValidationError } = require('../../lib/validate');

describe('parseAdventure', () => {
  it('keeps full coordinate precision', () => {
    const out = parseAdventure({ name: 'x', latitude: '47.4863921', longitude: '19.0397544' });
    expect(out.latitude).toBe(47.4863921);
    expect(out.longitude).toBe(19.0397544);
  });

  it('rejects a number with trailing garbage rather than truncating it', () => {
    // parseFloat would silently accept "47.5abc" as 47.5.
    expect(() => parseAdventure({ name: 'x', latitude: '47.5abc' })).toThrow(ValidationError);
    expect(() => parseAdventure({ name: 'x', longitude: '19deg' })).toThrow(ValidationError);
  });

  it('still accepts a plain number with surrounding whitespace', () => {
    expect(parseAdventure({ name: 'x', latitude: '  47.5  ' }).latitude).toBe(47.5);
  });

  it('rejects out-of-range coordinates', () => {
    expect.assertions(2);
    try {
      parseAdventure({ name: 'x', latitude: '91', longitude: '181' });
    } catch (err) {
      expect(err.errors.latitude).toMatch(/between -90 and 90/);
      expect(err.errors.longitude).toMatch(/between -180 and 180/);
    }
  });

  it('requires a name', () => {
    expect(() => parseAdventure({ name: '   ' })).toThrow(ValidationError);
  });

  it('parses a date into a Date, not a string', () => {
    const out = parseAdventure({ name: 'x', date: '2025-05-10' });
    expect(out.date).toBeInstanceOf(Date);
    expect(out.date.toISOString().slice(0, 10)).toBe('2025-05-10');
  });

  it('treats a blank date as unset rather than invalid', () => {
    expect(parseAdventure({ name: 'x', date: '' }).date).toBeNull();
  });

  it('rejects an unknown country code', () => {
    expect(() => parseAdventure({ name: 'x', country: 'ZZ' })).toThrow(ValidationError);
  });

  it('uppercases a valid country code', () => {
    expect(parseAdventure({ name: 'x', country: 'hu' }).country).toBe('HU');
  });

  it('defaults shareUndone to false when the box is unchecked', () => {
    expect(parseAdventure({ name: 'x' }).shareUndone).toBe(false);
  });

  it('reads shareUndone from a checked box', () => {
    expect(parseAdventure({ name: 'x', shareUndone: 'on' }).shareUndone).toBe(true);
  });

  it('reports every problem at once', () => {
    try {
      parseAdventure({ name: '', country: 'ZZ', latitude: 'abc' });
    } catch (err) {
      expect(Object.keys(err.errors).sort()).toEqual(['country', 'latitude', 'name']);
      expect(err.status).toBe(400);
    }
  });
});

describe('parseSignup', () => {
  const valid = {
    email: 'a@b.com', displayName: 'A', handle: 'aaa', password: 'correcthorse1',
  };

  it('accepts a good signup', () => {
    expect(parseSignup(valid).handle).toBe('aaa');
  });

  it('rejects short passwords', () => {
    expect(() => parseSignup({ ...valid, password: 'short' })).toThrow(ValidationError);
  });

  it('rejects reserved handles', () => {
    expect(() => parseSignup({ ...valid, handle: 'admin' })).toThrow(ValidationError);
  });

  it('rejects handles with illegal characters', () => {
    expect(() => parseSignup({ ...valid, handle: 'Not Valid!' })).toThrow(ValidationError);
  });
});

describe('parseList', () => {
  it('defaults to private', () => {
    expect(parseList({ name: 'L' }).visibility).toBe('private');
  });

  it('rejects an unknown visibility', () => {
    expect(() => parseList({ name: 'L', visibility: 'everyone' })).toThrow(ValidationError);
  });
});

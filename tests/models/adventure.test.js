const Adventure = require('../../models/adventure');

describe('Adventure.isPubliclyVisible', () => {
  const make = (attrs) =>
    new Adventure({
      _list: '507f1f77bcf86cd799439011',
      _owner: '507f1f77bcf86cd799439012',
      name: 'x',
      ...attrs,
    });

  it('hides an unfinished adventure by default', () => {
    expect(make({ done: false }).isPubliclyVisible()).toBe(false);
  });

  it('defaults shareUndone to false', () => {
    expect(make({}).shareUndone).toBe(false);
  });

  it('shows a finished adventure', () => {
    expect(make({ done: true }).isPubliclyVisible()).toBe(true);
  });

  it('shows an unfinished adventure that opted in', () => {
    expect(make({ done: false, shareUndone: true }).isPubliclyVisible()).toBe(true);
  });
});

describe('Adventure.toPublicJSON', () => {
  it('never exposes the private location fields', () => {
    const adv = new Adventure({
      _list: '507f1f77bcf86cd799439011',
      _owner: '507f1f77bcf86cd799439012',
      name: 'Climbed a hill',
      country: 'HU',
      placeName: "Grandma's house",
      latitude: 47.4863921,
      longitude: 19.0397544,
      description: 'Nice.',
    });

    const pub = adv.toPublicJSON();
    const serialised = JSON.stringify(pub);

    expect(pub.country).toBe('HU');
    expect(pub.name).toBe('Climbed a hill');

    expect(pub).not.toHaveProperty('placeName');
    expect(pub).not.toHaveProperty('latitude');
    expect(pub).not.toHaveProperty('longitude');
    expect(serialised).not.toContain('Grandma');
    expect(serialised).not.toContain('47.48');
    expect(serialised).not.toContain('19.03');
  });

  it('exposes only filename and caption for photos', () => {
    const adv = new Adventure({
      _list: '507f1f77bcf86cd799439011',
      _owner: '507f1f77bcf86cd799439012',
      name: 'x',
      photos: [{ filename: 'abc.webp', bytes: 1234, width: 10, height: 10, caption: 'hi' }],
    });

    expect(adv.toPublicJSON().photos).toEqual([{ filename: 'abc.webp', caption: 'hi' }]);
  });
});

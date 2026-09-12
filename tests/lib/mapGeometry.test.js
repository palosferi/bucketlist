const fs = require('fs');
const path = require('path');
// The vendored UMD bundles are required directly, so this exercises exactly
// the files the browser is served rather than a parallel ESM copy of them.
const topojson = require('../../public/vendor/topojson-client.min.js');
const d3 = require('../../public/vendor/d3.min.js');

const { COUNTRIES, ALPHA2_TO_NUMERIC } = require('../../lib/countries');

/**
 * The map colours a country by matching our alpha-2 code to the topojson's
 * ISO numeric id. Nothing at runtime would complain if that mapping drifted —
 * countries would just silently stop lighting up — so it is asserted here.
 */
describe('map geometry', () => {
  const world = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', '..', 'public', 'world-50m.json'), 'utf8')
  );
  const features = topojson.feature(world, world.objects.countries).features;
  const byId = new Map(features.map((f) => [String(Number(f.id)), f]));

  it('resolves every country to a numeric id', () => {
    const unmapped = COUNTRIES.filter((c) => !ALPHA2_TO_NUMERIC[c.code]);
    expect(unmapped).toEqual([]);
  });

  it('finds geometry for all but the known-missing microstates', () => {
    const missing = COUNTRIES.filter((c) => !byId.has(ALPHA2_TO_NUMERIC[c.code])).map((c) => c.code);
    // Tuvalu is absent from the 50m world atlas; anything else is a regression.
    expect(missing).toEqual(['TV']);
  });

  it('renders a real path for the countries used in testing', () => {
    const projection = d3.geoNaturalEarth1().scale(175).translate([480, 250]);
    const render = d3.geoPath(projection);

    for (const code of ['HU', 'IS', 'JP', 'NO', 'IT', 'SG', 'US', 'BR']) {
      const feature = byId.get(ALPHA2_TO_NUMERIC[code]);
      expect(feature).toBeDefined();
      const d = render(feature);
      expect(typeof d).toBe('string');
      expect(d.length).toBeGreaterThan(10);
    }
  });
});

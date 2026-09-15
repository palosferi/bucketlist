#!/usr/bin/env node
/**
 * Regenerates lib/countries.js from Node's bundled ICU region data.
 * Run with: node scripts/genCountries.js > lib/countries.js
 */
const CODES = "AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TZ UA UG US UY UZ VA VC VE VN VU WS YE ZA ZM ZW GL PS HK TW PR NC PF".split(" ");

const iso = require("i18n-iso-countries");
const dn = new Intl.DisplayNames(["en"], { type: "region" });
const rows = [...new Set(CODES)]
  .map((c) => ({ code: c, name: dn.of(c) }))
  .sort((a, b) => a.name.localeCompare(b.name, "en"));

const numeric = {};
for (const c of rows) numeric[c.code] = String(Number(iso.alpha2ToNumeric(c.code)));

process.stdout.write(`// Generated from Node's ICU region data. Regenerate with scripts/genCountries.js.
// ISO 3166-1 alpha-2. This is the ONLY geographic field that is ever public.
const COUNTRIES = ${JSON.stringify(rows, null, 2)};

// ISO 3166-1 numeric, keyed by alpha-2. The world atlas topojson identifies
// countries by numeric id, so the map needs this to colour a country in.
const ALPHA2_TO_NUMERIC = ${JSON.stringify(numeric, null, 2)};

const BY_CODE = new Map(COUNTRIES.map((c) => [c.code, c]));

/** @returns {boolean} true if code is a country we recognise */
function isValidCountry(code) {
  return typeof code === 'string' && BY_CODE.has(code.toUpperCase());
}

/** @returns {string|null} display name, or null if unknown */
function countryName(code) {
  const row = BY_CODE.get(String(code || '').toUpperCase());
  return row ? row.name : null;
}

module.exports = { COUNTRIES, ALPHA2_TO_NUMERIC, isValidCountry, countryName };
`);

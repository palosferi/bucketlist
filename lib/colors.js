/**
 * Fixed palette for list colours.
 *
 * A closed set rather than a free colour picker: every value has to stay
 * legible as a country fill on the map's near-white background, and has to be
 * distinguishable from its neighbours. Sixteen is enough to tell lists apart
 * without becoming a decision.
 */
const COLORS = [
  { name: 'red', hex: '#dc2626' },
  { name: 'orange', hex: '#ea580c' },
  { name: 'amber', hex: '#d97706' },
  { name: 'yellow', hex: '#ca8a04' },
  { name: 'lime', hex: '#65a30d' },
  { name: 'green', hex: '#16a34a' },
  { name: 'emerald', hex: '#059669' },
  { name: 'teal', hex: '#0d9488' },
  { name: 'cyan', hex: '#0891b2' },
  { name: 'sky', hex: '#0284c7' },
  { name: 'blue', hex: '#1d4ed8' },
  { name: 'indigo', hex: '#4f46e5' },
  { name: 'violet', hex: '#7c3aed' },
  { name: 'purple', hex: '#9333ea' },
  { name: 'pink', hex: '#db2777' },
  { name: 'slate', hex: '#475569' },
];

const DEFAULT_COLOR = 'blue';
const BY_NAME = new Map(COLORS.map((c) => [c.name, c]));

/** @returns {boolean} true if name is one of the palette colours */
function isValidColor(name) {
  return typeof name === 'string' && BY_NAME.has(name);
}

/** @returns {string} hex for a colour name, falling back to the default */
function colorHex(name) {
  const c = BY_NAME.get(name) || BY_NAME.get(DEFAULT_COLOR);
  return c.hex;
}

module.exports = { COLORS, DEFAULT_COLOR, isValidColor, colorHex };

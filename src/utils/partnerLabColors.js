// Shared categorical color assignment for partner labs, so the same lab
// gets the same color everywhere on the dashboard regardless of which
// chart it appears in or how it currently ranks by revenue. Colors are
// assigned by lab id (ascending, stable) — never by on-screen rank — and
// "Other" is used to keep a chart's series to slots that are documented
// as validated.
//
// Slots are ordered to start after the blue/orange pair already used
// elsewhere on the dashboard for the Collected-vs-Cost identity, so a
// lab's color and that meaning don't collide until a business has 6+ labs.
export const DPS_THEME = { light: '#1baf7a', dark: '#199e70' };

const LAB_THEME_ORDER = [
  { light: '#4a3aa7', dark: '#9085e9' }, // violet
  { light: '#e34948', dark: '#e66767' }, // red
  { light: '#eda100', dark: '#c98500' }, // yellow
  { light: '#e87ba4', dark: '#d55181' }, // magenta
  { light: '#008300', dark: '#008300' }, // green
  { light: '#2a78d6', dark: '#3987e5' }, // blue (overflow)
  { light: '#eb6834', dark: '#d95926' }, // orange (overflow)
];

const MAX_LAB_SLOTS = LAB_THEME_ORDER.length;

// Returns a Map from partnerLabId -> theme, stable across calls for the
// same set of lab ids regardless of the order they're passed in.
export function assignLabThemes(labIds) {
  const sorted = [...new Set(labIds)].sort((a, b) => a - b);
  const map = new Map();
  sorted.forEach((id, i) => {
    map.set(id, LAB_THEME_ORDER[Math.min(i, MAX_LAB_SLOTS - 1)]);
  });
  return map;
}

// Builds pie-chart-ready segments — DPS first (fixed color), then each lab
// (stable color via assignLabThemes), folding anything past the available
// slots into "Other".
export function buildDpsLabSegments(dpsValue, byLab, valueKey) {
  const labs = byLab.filter((l) => l[valueKey] > 0);
  const themeById = assignLabThemes(labs.map((l) => l.partnerLabId));

  const sortedForDisplay = [...labs].sort((a, b) => b[valueKey] - a[valueKey]);
  const shown = sortedForDisplay.slice(0, MAX_LAB_SLOTS - 1);
  const overflow = sortedForDisplay.slice(MAX_LAB_SLOTS - 1);
  const otherValue = overflow.reduce((sum, l) => sum + l[valueKey], 0);

  const config = { dps: { label: 'Direct (DPS)', theme: DPS_THEME } };
  const data = [];

  if (dpsValue > 0) {
    data.push({ key: 'dps', value: dpsValue, fill: 'var(--color-dps)' });
  }

  shown.forEach((l) => {
    const key = `lab_${l.partnerLabId}`;
    config[key] = { label: l.partnerLabName, theme: themeById.get(l.partnerLabId) };
    data.push({ key, value: l[valueKey], fill: `var(--color-${key})` });
  });

  if (otherValue > 0) {
    config.other = { label: 'Other labs', theme: LAB_THEME_ORDER[MAX_LAB_SLOTS - 1] };
    data.push({ key: 'other', value: otherValue, fill: 'var(--color-other)' });
  }

  return { data, config };
}

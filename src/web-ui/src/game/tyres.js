// Tyre model: compounds, wear per lap, and time lost to wear and to track wetness.
//
// Wetness w runs 0 (dry) to 1 (standing water). Each compound has an ideal
// wetness; the further the track is from it, the more time it loses:
//   slicks  ideal 0     -> +22 * w^2         (already ~2 s at w = 0.3)
//   inter   ideal 0.5   -> +0.9 + 10 * (w - 0.5)^2
//   wet     ideal 0.9   -> +2.0 + 9 * (w - 0.9)^2
// Crossovers: slick -> inter at w ~0.26, inter -> wet at w ~0.83.

export const COMPOUNDS = {
  S: { key: 'S', name: 'Soft', pace: -0.9, wear: 0.05, color: '#ef4444', wet: false },
  M: { key: 'M', name: 'Medium', pace: 0, wear: 0.032, color: '#facc15', wet: false },
  H: { key: 'H', name: 'Hard', pace: 0.7, wear: 0.021, color: '#e2e8f0', wet: false },
  I: { key: 'I', name: 'Intermediate', pace: 0.9, wear: 0.03, color: '#22c55e', wet: true, ideal: 0.5, scale: 10 },
  W: { key: 'W', name: 'Wet', pace: 2.0, wear: 0.026, color: '#3b82f6', wet: true, ideal: 0.9, scale: 9 },
};
export const COMPOUND_KEYS = ['S', 'M', 'H'];
export const WET_KEYS = ['I', 'W'];
export const ALL_KEYS = ['S', 'M', 'H', 'I', 'W'];

/** Wear added in one lap (0-1 scale). */
export function wearPerLap(compoundKey, { track, driver, ersMode = 'Neutral', fuelMode = 'Standard', wetness = 0 }) {
  const c = COMPOUNDS[compoundKey];
  const trackFactor = (track.tireWearFactor ?? 0.05) / 0.05;
  const mgmt = 1.2 - (driver.tireManagement ?? 85) / 250; // 90 -> 0.84, 70 -> 0.92
  const ers = ersMode === 'Overtake' ? 1.3 : ersMode === 'Attack' ? 1.08 : 1;
  const fuel = fuelMode === 'Rich' ? 1.05 : fuelMode === 'Lean' ? 0.95 : 1;
  // wet tyres overheat and wear fast on a dry track; slicks wear less on a wet one
  const surface = c.wet ? (wetness < 0.2 ? 2.6 - wetness * 8 : 1) : 1 - wetness * 0.5;
  return c.wear * trackFactor * mgmt * ers * fuel * surface;
}

/** Seconds lost to tyre wear: gentle at first, then a cliff above 80 %. */
export function wearPenalty(wear) {
  return 3.2 * wear * wear + (wear > 0.8 ? (wear - 0.8) * 8 : 0);
}

/** Seconds a compound loses (or gains, negative) for the track wetness. */
export function conditionDelta(compoundKey, wetness = 0) {
  const c = COMPOUNDS[compoundKey];
  if (!c.wet) return c.pace + 22 * wetness * wetness;
  return c.pace + c.scale * (wetness - c.ideal) ** 2;
}

/** Total tyre effect on a lap time (negative = faster). */
export function tyreDelta(compoundKey, wear, wetness = 0) {
  return conditionDelta(compoundKey, wetness) + wearPenalty(wear);
}

/** The fastest compound family for this wetness: 'dry', 'I' or 'W'. */
export function bestFamily(wetness) {
  const dry = conditionDelta('M', wetness);
  const inter = conditionDelta('I', wetness);
  const wet = conditionDelta('W', wetness);
  if (dry <= inter && dry <= wet) return 'dry';
  return inter <= wet ? 'I' : 'W';
}
export const familyOf = (k) => (COMPOUNDS[k].wet ? k : 'dry');

/** How many laps a compound lasts before reaching `limit` wear. */
export function stintLaps(compoundKey, ctx, limit = 0.75) {
  return Math.floor(limit / wearPerLap(compoundKey, ctx));
}

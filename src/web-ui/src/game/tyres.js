// Tyre model: compounds, wear per lap, and time lost to wear.

export const COMPOUNDS = {
  S: { key: 'S', name: 'Soft', pace: -0.9, wear: 0.05, color: '#ef4444' },
  M: { key: 'M', name: 'Medium', pace: 0, wear: 0.032, color: '#facc15' },
  H: { key: 'H', name: 'Hard', pace: 0.7, wear: 0.021, color: '#e2e8f0' },
};
export const COMPOUND_KEYS = ['S', 'M', 'H'];

/** Wear added in one lap (0-1 scale). */
export function wearPerLap(compoundKey, { track, driver, ersMode = 'Neutral', fuelMode = 'Standard' }) {
  const c = COMPOUNDS[compoundKey];
  const trackFactor = (track.tireWearFactor ?? 0.05) / 0.05;
  const mgmt = 1.2 - (driver.tireManagement ?? 85) / 250; // 90 -> 0.84, 70 -> 0.92
  const ers = ersMode === 'Overtake' ? 1.3 : ersMode === 'Attack' ? 1.08 : 1;
  const fuel = fuelMode === 'Rich' ? 1.05 : fuelMode === 'Lean' ? 0.95 : 1;
  return c.wear * trackFactor * mgmt * ers * fuel;
}

/** Seconds lost to tyre wear: gentle at first, then a cliff above 80 %. */
export function wearPenalty(wear) {
  return 3.2 * wear * wear + (wear > 0.8 ? (wear - 0.8) * 8 : 0);
}

/** Total tyre effect on a lap time (negative = faster). */
export function tyreDelta(compoundKey, wear) {
  return COMPOUNDS[compoundKey].pace + wearPenalty(wear);
}

/** How many laps a compound lasts before reaching `limit` wear. */
export function stintLaps(compoundKey, ctx, limit = 0.75) {
  return Math.floor(limit / wearPerLap(compoundKey, ctx));
}

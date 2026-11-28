// Footprint register for a circuit. Everything placed beside the road claims
// circles of ground; a claim that would touch the road or another object is
// refused, so scenery never overlaps.

export const ROAD_HALF = 3.5;
const CELL = 16;

export function createRegistry(path) {
  const cells = new Map();
  const items = [];
  let refused = 0;
  let largest = 0; // the search must reach the biggest circle on record

  const road = (x, z) => {
    let best = Infinity;
    for (const p of path.points) {
      const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
      if (d < best) best = d;
    }
    return Math.sqrt(best);
  };

  const near = (x, z, r) => {
    const found = new Set();
    const reach = r + largest;
    for (let i = Math.floor((x - reach) / CELL); i <= Math.floor((x + reach) / CELL); i++) {
      for (let j = Math.floor((z - reach) / CELL); j <= Math.floor((z + reach) / CELL); j++) {
        cells.get(`${i},${j}`)?.forEach((c) => found.add(c));
      }
    }
    return found;
  };

  /** circles = [[x, z, r], ...]; roadGap = clear distance kept from the road edge. */
  const free = (circles, roadGap = 0.4) => circles.every(([x, z, r]) => {
    if (roadGap !== null && road(x, z) < ROAD_HALF + roadGap + r) return false;
    for (const c of near(x, z, r)) if (Math.hypot(c.x - x, c.z - z) < c.r + r - 0.05) return false;
    return true;
  });

  /** Claim without asking (things that are part of the circuit itself). */
  const add = (circles, tag, roadGap = null) => {
    const item = { tag, roadGap, circles };
    items.push(item);
    circles.forEach(([x, z, r]) => {
      const key = `${Math.floor(x / CELL)},${Math.floor(z / CELL)}`;
      largest = Math.max(largest, r);
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key).push({ x, z, r, item });
    });
  };

  return {
    free,
    add,
    /** Claim the ground if it is free. Returns false (and counts it) when not. */
    take(circles, tag, roadGap = 0.4) {
      if (!free(circles, roadGap)) {
        refused += 1;
        return false;
      }
      add(circles, tag, roadGap);
      return true;
    },
    /** Independent re-check of what was accepted: overlaps and road intrusions. */
    audit() {
      const checked = items.filter((i) => i.roadGap !== null);
      let overlaps = 0;
      let onRoad = 0;
      checked.forEach((item, a) => {
        item.circles.forEach(([x, z, r]) => {
          if (road(x, z) < ROAD_HALF + r - 0.05) onRoad += 1;
          for (let b = a + 1; b < checked.length; b++) {
            if (checked[b].circles.some(([ox, oz, or]) => Math.hypot(ox - x, oz - z) < or + r - 0.1)) overlaps += 1;
          }
        });
      });
      return { placed: items.length, refused, overlaps, onRoad };
    },
  };
}

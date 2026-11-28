// Checks the headquarters layout: no footpath (or walker) comes onto a road.
// Run: node tools/validate-campus.mjs
import { WALKS, WALK_WIDTH, onRoad } from '../src/web-ui/src/game/hqLayout.js';

const bad = [];
WALKS.forEach((path, w) => {
  for (let i = 1; i < path.length; i++) {
    const [x1, z1] = path[i - 1];
    const [x2, z2] = path[i];
    const steps = Math.ceil(Math.hypot(x2 - x1, z2 - z1) / 0.5);
    for (let s = 0; s <= steps; s++) {
      const x = x1 + ((x2 - x1) * s) / steps;
      const z = z1 + ((z2 - z1) * s) / steps;
      if (onRoad(x, z, WALK_WIDTH / 2)) bad.push(`walk ${w} at ${x.toFixed(1)},${z.toFixed(1)}`);
    }
  }
});
console.log(bad.length ? `FAIL  campus: ${bad.length} points on a road, first ${bad.slice(0, 5).join(' | ')}` : `OK    campus: ${WALKS.length} footpaths clear of every road`);
process.exit(bad.length ? 1 : 0);

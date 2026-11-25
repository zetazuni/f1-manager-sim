// Checks every calendar layout: no crossings, clearance between sections,
// a straight pit section, and garages clear of the track. Run: node tools/validate-tracks.mjs
let failed = 0;
import { makeTrackPath } from '../src/web-ui/src/game/trackPath.js';
import { CALENDAR } from '../src/web-ui/src/data/calendar.js';
for (const t of CALENDAR) {
  const path = makeTrackPath(t.points);
  const P = path.points, n = P.length;
  // min distance between samples that are far apart along the lap
  let minClear = Infinity, where = null;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const along = Math.min(j - i, n - (j - i)) / n * path.total;
    if (along < 25) continue;
    const d = Math.hypot(P[i].x - P[j].x, P[i].z - P[j].z);
    if (d < minClear) { minClear = d; where = [(i/n).toFixed(2), (j/n).toFixed(2)]; }
  }
  // straightness of the pit section 0..0.23
  let maxCurv = 0;
  for (let i = 0; i < n; i++) { const f = i / n; if (f * path.total <= 66) maxCurv = Math.max(maxCurv, Math.abs(P[i].curvature)); }
  // the pit/garage side (lateral -14) must be outside the loop: no track point within 9 of it
  let pitClash = Infinity;
  for (let k = 0; k <= 20; k++) { const f = (6 + 54 * k / 20) / path.total; const g = path.pointAt(f, -14);
    for (let i = 0; i < n; i++) { const fi = i / n; if (fi * path.total < 75 || fi > 0.95) continue; pitClash = Math.min(pitClash, Math.hypot(P[i].x - g.x, P[i].z - g.z)); } }
  // lap length sanity: real seconds per lap at 60x and race length
  const ok = minClear >= 16 && maxCurv < 0.04 && pitClash > 12;
  if (!ok) failed++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${t.id.padEnd(15)} len ${path.total.toFixed(0)} clear ${minClear.toFixed(1)} @${where} pitCurv ${maxCurv.toFixed(3)} pitClash ${pitClash.toFixed(1)} race ${(t.laps * t.baseLapTime / 60 / 60).toFixed(1)} min@1x`);
}
process.exit(failed ? 1 : 0);

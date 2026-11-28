// Makes room on a circuit: scales it up, then eases apart stretches that run
// too close to each other, so road, run-off and scenery never overlap. A real
// crossing (a figure of eight) is left alone; trackPath.js raises a bridge.

import { makeTrackPath } from './trackPath.js';

export const TRACK_SCALE = 1.6;
export const MIN_GAP = 15; // centre line to centre line

const segmentsCross = (a, b, c, d) => {
  const side = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return side(a, b, c) !== side(a, b, d) && side(c, d, a) !== side(c, d, b);
};

export function spreadTrack(points, scale = TRACK_SCALE, gap = MIN_GAP) {
  const path = makeTrackPath(points.map(([x, z]) => [x * scale, z * scale]), 480);
  let pts = path.points.map((p) => [p.x, p.z]);
  const n = pts.length;
  const step = path.total / n;
  const apart = Math.ceil((gap * 2.6) / step); // neighbours along the lap are meant to be close

  const crossings = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + apart; j < n; j++) {
      if (n - (j - i) < apart) continue;
      if (segmentsCross(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n])) crossings.push(pts[i]);
    }
  }
  const atCrossing = (p) => crossings.some((c) => Math.hypot(c[0] - p[0], c[1] - p[1]) < gap * 2);
  const free = pts.map((p) => !atCrossing(p));
  // the start straight must stay straight for the pits and grid
  const straight = Math.ceil(75 / step);
  const weight = pts.map((_, i) => (i <= straight || i > n - Math.ceil(30 / step) ? 0.12 : 1));

  for (let pass = 0; pass < 160; pass++) {
    const move = pts.map(() => [0, 0]);
    let worst = 0;
    for (let i = 0; i < n; i++) {
      if (!free[i]) continue;
      for (let j = i + apart; j < n; j++) {
        if (!free[j] || n - (j - i) < apart) continue;
        const dx = pts[j][0] - pts[i][0];
        const dz = pts[j][1] - pts[i][1];
        const d = Math.hypot(dx, dz);
        if (d >= gap || d === 0) continue;
        worst = Math.max(worst, gap - d);
        const push = ((gap - d) / d) * 0.09;
        move[i][0] -= dx * push * weight[i];
        move[i][1] -= dz * push * weight[i];
        move[j][0] += dx * push * weight[j];
        move[j][1] += dz * push * weight[j];
      }
    }
    if (worst < 0.4) break;
    // spread each push over its neighbours so the road stays smooth
    pts = pts.map((p, i) => {
      let mx = 0;
      let mz = 0;
      let total = 0;
      for (let k = -6; k <= 6; k++) {
        const w = 7 - Math.abs(k);
        const m = move[(i + k + n) % n];
        mx += m[0] * w;
        mz += m[1] * w;
        total += w;
      }
      return [p[0] + (mx / total) * 2.2, p[1] + (mz / total) * 2.2];
    });
  }
  // control points for the game's spline
  const every = 3;
  return pts.filter((_, i) => i % every === 0).map(([x, z]) => [+x.toFixed(2), +z.toFixed(2)]);
}

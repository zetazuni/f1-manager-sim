// Closed circuit path built from a few control points.
// A Catmull-Rom spline is sampled densely, then re-sampled by distance so that
// "fraction 0.5" really means halfway round the lap.

export const DEFAULT_CIRCUIT = [
  [-32, -22], [4, -22], [40, -22], [50, -11], [43, 2], [25, 6], [17, 16],
  [22, 28], [6, 34], [-20, 31], [-40, 24], [-52, 8], [-54, -10], [-46, -22],
];

// Pit lane in track units along the main straight (every layout has a straight
// of at least 66 units after the line; tools/validate-tracks.mjs checks it).
export const PIT = { startUnits: 6, endUnits: 60, rampUnits: 9, lateral: -9, firstBox: 10, boxSpacing: 4.6 };

/** Pit lane as lap fractions for a track of length `total`. */
export function pitLayout(total) {
  return {
    start: PIT.startUnits / total,
    end: PIT.endUnits / total,
    ramp: PIT.rampUnits / total,
    lateral: PIT.lateral,
    garageLen: PIT.boxSpacing * 0.96,
    boxFrac: (teamIndex) => (PIT.firstBox + teamIndex * PIT.boxSpacing) / total,
  };
}

const catmullRom = (p0, p1, p2, p3, t) => {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
};

export function makeTrackPath(controlPoints = DEFAULT_CIRCUIT, samples = 360) {
  const n = controlPoints.length;
  const dense = [];
  const perSeg = 64;
  for (let i = 0; i < n; i++) {
    const p0 = controlPoints[(i - 1 + n) % n];
    const p1 = controlPoints[i];
    const p2 = controlPoints[(i + 1) % n];
    const p3 = controlPoints[(i + 2) % n];
    for (let s = 0; s < perSeg; s++) {
      const t = s / perSeg;
      dense.push([catmullRom(p0[0], p1[0], p2[0], p3[0], t), catmullRom(p0[1], p1[1], p2[1], p3[1], t)]);
    }
  }

  // cumulative length of the dense polyline (closed)
  const cum = [0];
  for (let i = 1; i <= dense.length; i++) {
    const a = dense[i - 1];
    const b = dense[i % dense.length];
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = cum[cum.length - 1];

  const sampleDense = (dist) => {
    let d = ((dist % total) + total) % total;
    let lo = 0;
    let hi = cum.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] <= d) lo = mid; else hi = mid;
    }
    const a = dense[lo];
    const b = dense[(lo + 1) % dense.length];
    const segLen = cum[lo + 1] - cum[lo] || 1;
    const t = (d - cum[lo]) / segLen;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  };

  // even spacing by distance
  const points = [];
  for (let i = 0; i < samples; i++) {
    const [x, z] = sampleDense((i / samples) * total);
    points.push({ x, z });
  }
  // tangents, normals (pointing to the left of travel) and curvature
  for (let i = 0; i < samples; i++) {
    const prev = points[(i - 1 + samples) % samples];
    const next = points[(i + 1) % samples];
    let tx = next.x - prev.x;
    let tz = next.z - prev.z;
    const len = Math.hypot(tx, tz) || 1;
    tx /= len; tz /= len;
    points[i].tx = tx;
    points[i].tz = tz;
    points[i].nx = -tz;
    points[i].nz = tx;
  }
  for (let i = 0; i < samples; i++) {
    const a = points[(i - 1 + samples) % samples];
    const b = points[(i + 1) % samples];
    const cross = a.tx * b.tz - a.tz * b.tx;
    points[i].curvature = cross; // sign = turn direction, size = how sharp
  }

  /** Position on the racing line at lap fraction f (any real number, wraps). */
  const pointAt = (f, lateral = 0) => {
    const d = (((f % 1) + 1) % 1) * total;
    const [x, z] = sampleDense(d);
    const [x2, z2] = sampleDense(d + 0.5);
    let tx = x2 - x;
    let tz = z2 - z;
    const len = Math.hypot(tx, tz) || 1;
    tx /= len; tz /= len;
    return {
      x: x - tz * lateral,
      z: z + tx * lateral,
      heading: (Math.atan2(tx, tz) * 180) / Math.PI, // yaw in degrees, +Z forward
    };
  };

  return { points, total, pointAt };
}

/**
 * Speed shaping: cars brake into corners and accelerate out instead of moving
 * at one speed. Speed at each sample falls with curvature, is smoothed into
 * braking and acceleration zones, then integrated into time. The result maps
 * "fraction of the lap time" (what the simulation knows) to "fraction of the
 * lap distance" (where to draw the car). Lap times do not change.
 */
export function makeTimeProfile(path, { cornerFactor = 14, smooth = 7 } = {}) {
  const n = path.points.length;
  const raw = path.points.map((p) => 1 / (1 + cornerFactor * Math.abs(p.curvature)));
  const speed = raw.map((_, i) => {
    let s = 0;
    for (let k = -smooth; k <= smooth; k++) s += raw[(i + k + n) % n];
    return s / (2 * smooth + 1);
  });
  // cumulative time at each sample boundary (equal distance per sample)
  const cumT = [0];
  for (let i = 0; i < n; i++) cumT.push(cumT[i] + 1 / speed[i]);
  const total = cumT[n];
  /** time fraction (any real number) -> distance fraction */
  return (tau) => {
    const lap = Math.floor(tau);
    const t = (tau - lap) * total;
    let lo = 0;
    let hi = n;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (cumT[mid] <= t) lo = mid; else hi = mid;
    }
    const segT = cumT[lo + 1] - cumT[lo] || 1;
    return lap + (lo + (t - cumT[lo]) / segT) / n;
  };
}

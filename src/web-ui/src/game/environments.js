// Per-circuit look: colours, light, and the props around the track.
// Everything here is baked into merged meshes (see meshBuilder.js).

export const ENVIRONMENTS = {
  forest: {
    label: 'Parkland', ground: '#2f6b35', ground2: '#3b7f40', runoff: '#8a8470', sky: '#9cc3e6',
    sun: { color: '#ffe2b8', intensity: 1.45, pitch: 40, yaw: 35 }, ambient: '#6e6488', ambientLevel: 0.42,
    walls: false,
  },
  desert: {
    label: 'Desert', ground: '#d8b878', ground2: '#c9a463', runoff: '#c4a06a', sky: '#f1d7a8',
    sun: { color: '#ffcf96', intensity: 1.55, pitch: 34, yaw: 60 }, ambient: '#8a6a5a', ambientLevel: 0.45,
    walls: false,
  },
  city: {
    label: 'Street circuit', ground: '#5b6270', ground2: '#4d5461', runoff: '#6b7280', sky: '#b9c6d6',
    sun: { color: '#ffe0bd', intensity: 1.35, pitch: 42, yaw: 25 }, ambient: '#6a6480', ambientLevel: 0.48,
    walls: true,
  },
  coast: {
    label: 'Coastal', ground: '#4f9a53', ground2: '#5aa65c', runoff: '#d9c79a', sky: '#9fd3ee',
    sun: { color: '#ffdcb0', intensity: 1.5, pitch: 38, yaw: 40 }, ambient: '#66688c', ambientLevel: 0.45,
    walls: false,
  },
  night: {
    label: 'Night race', ground: '#1d2430', ground2: '#232b39', runoff: '#3a4150', sky: '#070a14',
    sun: { color: '#b4c4ff', intensity: 0.9, pitch: 60, yaw: 10 }, ambient: '#5a6aa0', ambientLevel: 0.75,
    walls: true,
  },
  alpine: {
    label: 'Alpine', ground: '#4d7b3c', ground2: '#5b8a46', runoff: '#857e6c', sky: '#bcd6ec',
    sun: { color: '#fff0dc', intensity: 1.5, pitch: 40, yaw: 25 }, ambient: '#6a6c90', ambientLevel: 0.42,
    walls: false,
  },
};

const CROWD = ['#f43f5e', '#f59e0b', '#22d3ee', '#a3e635', '#e2e8f0', '#818cf8', '#fb7185', '#facc15', '#38bdf8'];
const SPONSORS = ['#e10600', '#0ea5e9', '#f59e0b', '#16a34a', '#7c3aed', '#f8fafc'];

function seeded(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Distance from (x,z) to the closest sampled track point. */
function trackDistance(path, x, z) {
  let best = Infinity;
  for (const p of path.points) {
    const d = (p.x - x) * (p.x - x) + (p.z - z) * (p.z - z);
    if (d < best) best = d;
  }
  return Math.sqrt(best);
}

/** Scatter `count` items of footprint `size`; each claims its ground first. */
function scatter(path, rng, count, minDist, area, place, reg, size = 2) {
  let placed = 0;
  for (let tries = 0; tries < count * 6 && placed < count; tries++) {
    const x = area.x0 + rng() * (area.x1 - area.x0);
    const z = area.z0 + rng() * (area.z1 - area.z0);
    if (trackDistance(path, x, z) < minDist) continue;
    if (!reg.take([[x, z, size]], 'scenery', 2)) continue;
    place(x, z, rng);
    placed++;
  }
}

// --- props --------------------------------------------------------------
const pine = (mb, x, z, s, snow = false) => {
  mb.prism({ pos: [x, 0.6 * s, z], radius: 0.25 * s, height: 1.2 * s, sides: 5, color: '#5b3a1e' });
  mb.frustum({ pos: [x, 1.0 * s, z], rBottom: 1.6 * s, height: 2.6 * s, sides: 7, color: '#1f5e33', colorTop: snow ? '#e8f0f2' : '#2e7d43' });
  mb.frustum({ pos: [x, 2.4 * s, z], rBottom: 1.1 * s, height: 2.2 * s, sides: 7, color: '#256b3a', colorTop: snow ? '#ffffff' : '#3a8f4f' });
};
const broadleaf = (mb, x, z, s, rng) => {
  mb.prism({ pos: [x, 0.9 * s, z], radius: 0.28 * s, height: 1.8 * s, sides: 6, color: '#5b3a1e' });
  mb.box({ pos: [x, 2.4 * s, z], scale: [2.6 * s, 2.0 * s, 2.6 * s], rot: [0, rng() * 90, 0], color: rng() < 0.5 ? '#2f7d32' : '#3d8b3a' });
  mb.box({ pos: [x + 0.3 * s, 3.4 * s, z - 0.2 * s], scale: [1.6 * s, 1.2 * s, 1.6 * s], rot: [0, rng() * 90, 0], color: '#4a9a45' });
};
const palm = (mb, x, z, s, rng) => {
  const lean = (rng() - 0.5) * 12;
  mb.box({ pos: [x, 1.8 * s, z], scale: [0.35 * s, 3.6 * s, 0.35 * s], rot: [lean, 0, 0], color: '#8b6b45' });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 360 + rng() * 20;
    const rad = (a * Math.PI) / 180;
    mb.box({ pos: [x + Math.sin(rad) * 0.9 * s, 3.55 * s, z + Math.cos(rad) * 0.9 * s], scale: [0.5 * s, 0.12 * s, 2.1 * s], rot: [-18, a, 0], color: i % 2 ? '#3f9b4a' : '#2f8a3e' });
  }
};
const rock = (mb, x, z, s, rng, color = '#a97f52') => {
  mb.box({ pos: [x, 0.4 * s, z], scale: [2.2 * s, 1.1 * s, 1.6 * s], rot: [rng() * 10, rng() * 90, rng() * 10], color });
};
const building = (mb, glow, x, z, rng, night, distToTrack = 40) => {
  const w = 6 + rng() * 8;
  const d = 6 + rng() * 8;
  // low near the track so blocks never hide the cars in the isometric view
  const h = 5 + rng() * Math.min(26, Math.max(4, (distToTrack - 16) * 0.9));
  const shades = night ? ['#1e2635', '#252e40', '#1a2230'] : ['#cbd5e1', '#94a3b8', '#e2e8f0', '#a5b4c8', '#d6cfc4'];
  const col = shades[Math.floor(rng() * shades.length)];
  mb.box({ pos: [x, h / 2, z], scale: [w, h, d], color: col });
  mb.box({ pos: [x, h + 0.3, z], scale: [w * 0.6, 0.6, d * 0.6], color: night ? '#111827' : '#64748b' });
  // window bands on all four sides
  const winColor = night ? (rng() < 0.5 ? '#fde68a' : '#93c5fd') : '#33415588';
  const target = night ? glow : mb;
  for (let y = 2.5; y < h - 1; y += 3) {
    if (night && rng() < 0.3) continue;
    target.box({ pos: [x, y, z + d / 2 + 0.05], scale: [w * 0.8, 0.8, 0.1], color: night ? winColor : '#334155' });
    target.box({ pos: [x, y, z - d / 2 - 0.05], scale: [w * 0.8, 0.8, 0.1], color: night ? winColor : '#334155' });
    target.box({ pos: [x + w / 2 + 0.05, y, z], scale: [0.1, 0.8, d * 0.8], color: night ? winColor : '#334155' });
    target.box({ pos: [x - w / 2 - 0.05, y, z], scale: [0.1, 0.8, d * 0.8], color: night ? winColor : '#334155' });
  }
};
const mountain = (mb, x, z, s, rng) => {
  mb.frustum({ pos: [x, -0.5, z], rBottom: 18 * s, height: 22 * s, sides: 5 + Math.floor(rng() * 3), color: '#6b7280', colorTop: '#9ca3af', spin: rng() * 3 });
  mb.frustum({ pos: [x, 13 * s, z], rBottom: 7.2 * s, height: 9 * s, sides: 6, color: '#f1f5f9', colorTop: '#ffffff', spin: rng() * 3 });
};
const lightTower = (mb, glow, x, z) => {
  mb.box({ pos: [x, 6, z], scale: [0.4, 12, 0.4], color: '#475569' });
  mb.box({ pos: [x, 12.2, z], scale: [2.4, 0.9, 0.5], color: '#1f2937' });
  glow.box({ pos: [x, 12.2, z + 0.3], scale: [2.2, 0.7, 0.1], color: '#fffbe6' });
  glow.box({ pos: [x, 12.2, z - 0.3], scale: [2.2, 0.7, 0.1], color: '#fffbe6' });
};
const boat = (mb, x, z, rng) => {
  const yaw = rng() * 180;
  mb.box({ pos: [x, 0.35, z], scale: [2.2, 0.7, 6], rot: [0, yaw, 0], color: '#f8fafc' });
  mb.box({ pos: [x, 1, z], scale: [1.4, 0.8, 2.2], rot: [0, yaw, 0], color: '#0ea5e9' });
};

/** Concrete street-circuit walls with a coloured top stripe, both sides. */
function streetWalls(mb, path, pitSide, reg) {
  const built = [];
  const n = path.points.length;
  for (let i = 0; i < n; i += 2) {
    const f = i / n;
    for (const side of [1, -1]) {
      const p = path.pointAt(f + 1 / n, side * (3.5 + 2.2));
      if (p.y > 0.1 || trackDistance(path, p.x, p.z) < 3.5 + 2.05) continue; // would fold over inside a bend or stand on another stretch
      // leave the pit entry and exit open
      if (side === pitSide && (f < 0.2 || f > 0.97)) continue;
      const seg = (2 * path.total) / n;
      // inside a tight bend pieces pile up and cross: never put two in one spot
      if (built.some((q) => Math.hypot(q.x - p.x, q.z - p.z) < seg * 0.92)) continue;
      built.push(p);
      mb.box({ pos: [p.x, 0.5, p.z], scale: [0.5, 1, seg * 1.05], rot: [0, p.heading, 0], color: '#d1d5db' });
      mb.box({ pos: [p.x, 1.05, p.z], scale: [0.55, 0.12, seg * 1.05], rot: [0, p.heading, 0], color: i % 8 < 4 ? '#e10600' : '#f8fafc' });
    }
  }
}

/**
 * Fill the world around the circuit.
 * @param mb   MeshBuilder for lit geometry
 * @param glow MeshBuilder for self-lit geometry (lamps, windows)
 * @param water optional callback(x, z, w, d) to place a water plane
 */
export function buildEnvironment(mb, glow, path, envKey, seed, pitSide, reg) {
  const env = ENVIRONMENTS[envKey] || ENVIRONMENTS.forest;
  const rng = seeded(seed);
  const xs = path.points.map((p) => p.x);
  const zs = path.points.map((p) => p.z);
  const bx = { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
  const area = { x0: Math.min(-125, bx.x0 - 55), x1: Math.max(125, bx.x1 + 55), z0: Math.min(-95, bx.z0 - 55), z1: Math.max(115, bx.z1 + 55) };
  // bigger maps get proportionally more scenery
  const dense = ((area.x1 - area.x0) * (area.z1 - area.z0)) / (250 * 210);
  const many = (n) => Math.round(n * Math.min(2.2, dense));
  const shore = Math.max(58, bx.z1 + 24); // beach line for coastal circuits
  const far = Math.max(100, bx.z1 + 55); // mountain line
  // keep the paddock (behind the garages) and grandstand strip free

  if (env.walls) streetWalls(mb, path, pitSide, reg);


  switch (envKey) {
    case 'desert':
      scatter(path, rng, many(18), 22, area, (x, z, r) => mb.frustum({ pos: [x, -0.3, z], rBottom: 9 + r() * 8, rTop: 3, height: 2 + r() * 3, sides: 7, color: '#e6c78c', colorTop: '#f0d6a0', spin: r() * 3 }), reg, 12);
      scatter(path, rng, many(40), 12, area, (x, z, r) => palm(mb, x, z, 1 + r() * 0.6, r), reg, 2);
      scatter(path, rng, many(30), 10, area, (x, z, r) => rock(mb, x, z, 0.8 + r(), r), reg, 1.8);
      break;
    case 'city':
    case 'night': {
      const night = envKey === 'night';
      scatter(path, rng, many(night ? 60 : 70), 18, area, (x, z, r) => building(mb, glow, x, z, r, night, trackDistance(path, x, z)), reg, 9);
      if (night) {
        // floodlights all round the lap
        for (let i = 0; i < 26; i++) {
          const f = i / 26 + 0.01;
          const p = path.pointAt(f, (i % 2 ? 1 : -1) * 9.5);
          if (!reg.take([[p.x, p.z, 1.4]], 'floodlight', 3)) continue;
          lightTower(mb, glow, p.x, p.z);
        }
        // neon strip along the start straight
        for (let i = 0; i < 12; i++) {
          const p = path.pointAt(0.02 + i * 0.012, 7.2);
          glow.box({ pos: [p.x, 0.2, p.z], scale: [0.15, 0.15, 2.5], rot: [0, p.heading, 0], color: i % 2 ? '#22d3ee' : '#e879f9' });
        }
      } else {
        scatter(path, rng, many(25), 11, area, (x, z, r) => broadleaf(mb, x, z, 0.8 + r() * 0.4, r), reg, 2);
      }
      break;
    }
    case 'coast': {
      // sea along the far side, a beach strip, boats and palms
      // ground top is y=0: sea surface at +0.02, beach at +0.04 so both show
      mb.box({ pos: [0, -0.28, shore + 34], scale: [600, 0.6, 70], color: '#1b78b8' });
      mb.box({ pos: [0, -0.26, shore], scale: [600, 0.6, 7], color: '#e8d6a6' });
      for (let i = 0; i < 14; i++) mb.box({ pos: [-160 + i * 24, 0.03, shore + 4 + (i % 3) * 3], scale: [10, 0.02, 0.5], color: '#e0f2fe' }); // surf lines
      for (let i = 0; i < 9; i++) boat(mb, -100 + rng() * 200, shore + 14 + rng() * 30, rng);
      scatter(path, rng, many(45), 11, { ...area, z1: shore - 6 }, (x, z, r) => palm(mb, x, z, 0.9 + r() * 0.5, r), reg, 2);
      break;
    }
    case 'alpine':
      for (let i = 0; i < 9; i++) mountain(mb, -110 + i * 28 + rng() * 10, far + rng() * 15, 1 + rng() * 0.6, rng);
      for (let i = 0; i < 5; i++) mountain(mb, Math.min(-120, bx.x0 - 40) + rng() * 10, -40 + i * 30, 0.9 + rng() * 0.5, rng);
      scatter(path, rng, many(80), 11, { ...area, z1: far - 20 }, (x, z, r) => pine(mb, x, z, 0.9 + r() * 0.6, r() < 0.25), reg, 1.9);
      break;
    default: // forest
      scatter(path, rng, many(50), 11, area, (x, z, r) => pine(mb, x, z, 0.9 + r() * 0.5), reg, 1.9);
      scatter(path, rng, many(45), 11, area, (x, z, r) => broadleaf(mb, x, z, 0.9 + r() * 0.5, r), reg, 2);
  }
  return env;
}

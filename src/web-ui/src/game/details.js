// Trackside detail. Boxes and prisms go into the shared static mesh (no extra
// draw calls); only the lettered sponsor boards are entities of their own.

import * as pc from 'playcanvas';

const HALF = 3.5; // half the track width

export const clearance = (path, x, z) => {
  let best = Infinity;
  for (const p of path.points) best = Math.min(best, Math.hypot(p.x - x, p.z - z));
  return best;
};

/** Lap fractions of the distinct tight corners, in lap order. */
function corners(path, min = 0.045) {
  const n = path.points.length;
  const out = [];
  let i = 0;
  while (i < n) {
    if (Math.abs(path.points[i].curvature) < min) {
      i += 1;
      continue;
    }
    let peak = i;
    const start = i;
    while (i < n && Math.abs(path.points[i].curvature) >= min) {
      if (Math.abs(path.points[i].curvature) > Math.abs(path.points[peak].curvature)) peak = i;
      i += 1;
    }
    const f = peak / n;
    if (!out.length || (f - out[out.length - 1].f) * path.total > 20) {
      // outside of the bend: opposite to the way the road turns
      out.push({ f, entry: start / n, outside: -Math.sign(path.points[peak].curvature) });
    }
  }
  return out;
}

const person = (mb, x, z, color) => {
  mb.box({ pos: [x, 0.35, z], scale: [0.28, 0.7, 0.22], color });
  mb.box({ pos: [x, 0.85, z], scale: [0.26, 0.26, 0.26], color: '#f8fafc' });
};

const CROWD = ['#f43f5e', '#f59e0b', '#22d3ee', '#a3e635', '#e2e8f0', '#818cf8', '#fb7185', '#facc15', '#38bdf8'];

/** A stepped stand with crowd, roof and flags, following the road from f0 for `length`. */
function cornerStand(mb, path, f0, side, length, rows = 5) {
  const seg = 2.4;
  for (let d = 0; d < length; d += seg) {
    const f = f0 + d / path.total;
    const base = path.pointAt(f, side * (HALF + 9));
    const back = path.pointAt(f, side * (HALF + 9 + rows * 1.2));
    // skip pieces that would sit on another part of the lap
    if (clearance(path, back.x, back.z) < HALF + 6 || clearance(path, base.x, base.z) < HALF + 6) continue;
    const rot = [0, base.heading, 0];
    for (let r = 0; r < rows; r++) {
      const p = path.pointAt(f, side * (HALF + 9 + r * 1.2));
      const h = 0.9 + r * 0.75;
      mb.box({ pos: [p.x, h / 2, p.z], scale: [1.25, h, seg * 1.04], rot, color: r % 2 ? '#334155' : '#475569' });
      for (let k = 0; k < 3; k++) {
        const q = path.pointAt(f + ((k - 1) * 0.75) / path.total, side * (HALF + 9 + r * 1.2));
        const c = CROWD[Math.abs(Math.floor(q.x * 7 + q.z * 13 + r * 3 + k)) % CROWD.length];
        mb.box({ pos: [q.x, h + 0.22, q.z], scale: [0.42, 0.44, 0.42], rot, color: c });
        mb.box({ pos: [q.x, h + 0.56, q.z], scale: [0.22, 0.22, 0.22], rot, color: '#e7c6a5' });
      }
    }
    const roof = path.pointAt(f, side * (HALF + 9 + rows * 0.6));
    mb.box({ pos: [roof.x, rows * 0.75 + 2.9, roof.z], scale: [rows * 1.2 + 1.2, 0.18, seg * 1.04], rot, color: '#e2e8f0' });
    mb.box({ pos: [back.x, (rows * 0.75 + 2.9) / 2, back.z], scale: [0.22, rows * 0.75 + 2.9, 0.22], color: '#94a3b8' });
    if (Math.round(d / seg) % 3 === 0) {
      mb.box({ pos: [back.x, rows * 0.75 + 4, back.z], scale: [0.08, 2.2, 0.08], color: '#cbd5e1' });
      mb.box({ pos: [back.x, rows * 0.75 + 4.7, back.z], scale: [0.06, 0.7, 1.2], rot, color: CROWD[Math.floor(d) % CROWD.length] });
    }
  }
}

/** Footbridge over the road. */
function footbridge(mb, path, f, color) {
  const c = path.pointAt(f);
  const rot = [0, c.heading, 0];
  for (const side of [1, -1]) {
    const leg = path.pointAt(f, side * (HALF + 2.4));
    if (clearance(path, leg.x, leg.z) < HALF + 1.5) return;
    mb.box({ pos: [leg.x, 3.4, leg.z], scale: [0.7, 6.8, 1.4], rot, color: '#64748b' });
  }
  mb.box({ pos: [c.x, 7, c.z], scale: [HALF * 2 + 6, 0.5, 2], rot, color: '#cbd5e1' });
  mb.box({ pos: [c.x, 8, c.z], scale: [HALF * 2 + 6, 1.5, 0.2], rot, color });
}

export function trackside(mb, path, { teams = [], pit, grass = true }) {
  const at = (f, lateral) => path.pointAt(f, lateral);
  const away = (p) => clearance(path, p.x, p.z);

  for (const c of corners(path)) {
    // gravel trap and a three-high tyre wall on the outside
    for (let k = -3; k <= 3; k++) {
      const f = c.f + (k * 1.9) / path.total;
      const bed = at(f, c.outside * (HALF + 3.4));
      if (grass && away(bed) > HALF + 2.6) mb.box({ pos: [bed.x, 0.02 + (k + 3) * 0.001, bed.z], scale: [2.4, 0.02, 2.1], rot: [0, bed.heading, 0], color: '#d9c38f' });
      const wall = at(f, c.outside * (HALF + 5.4));
      if (away(wall) < HALF + 3.5) continue;
      for (let row = 0; row < 3; row++) {
        mb.prism({ pos: [wall.x, 0.18 + row * 0.34, wall.z], radius: 0.55, height: 0.32, sides: 8, color: row === 1 ? (k % 2 ? '#d81e1e' : '#f1f5f9') : '#1b1d22' });
      }
    }
    // braking boards: one, two and three bars before the corner
    for (let n = 1; n <= 3; n++) {
      const p = at(c.entry - (n * 7) / path.total, c.outside * (HALF + 2));
      if (away(p) < HALF + 1.4) continue;
      mb.box({ pos: [p.x, 0.6, p.z], scale: [0.12, 1.2, 0.12], color: '#475569' });
      mb.box({ pos: [p.x, 1.45, p.z], scale: [1.1, 0.7, 0.1], rot: [0, p.heading, 0], color: '#f8fafc' });
      for (let b = 0; b < n; b++) {
        // local x of the board after its yaw
        const off = (b - (n - 1) / 2) * 0.3;
        const rad = (p.heading * Math.PI) / 180;
        mb.box({ pos: [p.x + Math.cos(rad) * off, 1.45, p.z - Math.sin(rad) * off], scale: [0.14, 0.5, 0.16], rot: [0, p.heading, 0], color: '#111827' });
      }
    }
  }

  // grandstands outside the big corners, spread round the lap
  const stands = corners(path, 0.06).filter((c) => c.f > 0.2 && c.f < 0.95);
  const step = Math.max(1, Math.floor(stands.length / 5));
  stands.filter((_, i) => i % step === 0).slice(0, 6).forEach((c) => cornerStand(mb, path, c.f - 8 / path.total, c.outside, 17));

  // two footbridges and a ring of floodlight poles
  footbridge(mb, path, 0.47, '#e10600');
  footbridge(mb, path, 0.78, '#0ea5e9');
  for (let i = 0; i < 16; i++) {
    const f = (i + 0.5) / 16;
    const q = path.pointAt(f, (i % 2 ? 1 : -1) * (HALF + 8.5));
    if (f < 0.2 || clearance(path, q.x, q.z) < HALF + 6) continue;
    mb.box({ pos: [q.x, 4.5, q.z], scale: [0.22, 9, 0.22], color: '#94a3b8' });
    mb.box({ pos: [q.x, 9.1, q.z], scale: [1.4, 0.35, 0.5], rot: [0, q.heading, 0], color: '#f8fafc' });
  }

  // catch fence behind the grandstand side of the main straight
  const fenceSide = -pit.side * (HALF + 3.1);
  for (let d = 4; d < 62; d += 2.2) {
    const p = at(d / path.total, fenceSide);
    mb.box({ pos: [p.x, 1.1, p.z], scale: [0.12, 2.2, 0.12], color: '#94a3b8' });
    for (const y of [1.4, 2.1]) mb.box({ pos: [p.x, y, p.z], scale: [0.05, 0.05, 2.3], rot: [0, p.heading, 0], color: '#cbd5e1' });
  }

  // marshal posts round the lap
  for (let i = 1; i < 10; i++) {
    const f = i / 10 + 0.03;
    const side = i % 2 ? 1 : -1;
    const p = at(f, side * (HALF + 7));
    if (away(p) < HALF + 5 || f < 0.18) continue;
    mb.box({ pos: [p.x, 0.5, p.z], scale: [1.4, 1, 1.4], color: '#e5e7eb' });
    mb.box({ pos: [p.x, 1.55, p.z], scale: [1.7, 0.16, 1.7], color: '#f97316' });
    person(mb, p.x + 0.4, p.z + 0.9, '#f97316');
  }

  // pit crews at each box, and a team truck behind each garage
  teams.forEach((team, i) => {
    const f = pit.boxFrac(i);
    for (const [along, out] of [[-1.1, 0.6], [1.1, 0.6], [-0.5, 1.9], [0.5, 1.9]]) {
      const p = at(f + along / path.total, pit.lateral + pit.side * out);
      person(mb, p.x, p.z, team.color);
    }
    const t = at(f, pit.lateral + pit.side * 12.5);
    if (away(t) < 11) return;
    const rot = [0, t.heading + 90, 0];
    mb.box({ pos: [t.x, 1.25, t.z], scale: [2.6, 1.9, 5.2], rot, color: team.color });
    mb.box({ pos: [t.x, 2.28, t.z], scale: [2.3, 0.16, 4.8], rot, color: team.accent });
    mb.box({ pos: [t.x, 0.28, t.z], scale: [2.4, 0.4, 4.6], rot, color: '#111827' });
  });

  // big screen facing the main straight
  const s = at(40 / path.total, -pit.side * (HALF + 15));
  if (away(s) > HALF + 9) {
    const rot = [0, s.heading, 0];
    for (const dz of [-2.4, 2.4]) {
      const leg = at((40 + dz) / path.total, -pit.side * (HALF + 15));
      mb.box({ pos: [leg.x, 4, leg.z], scale: [0.35, 8, 0.35], color: '#475569' });
    }
    mb.box({ pos: [s.x, 9.4, s.z], scale: [0.5, 3.6, 7], rot, color: '#0f172a' });
    mb.box({ pos: [s.x, 9.4, s.z], scale: [0.56, 3, 6.4], rot, color: '#38bdf8' });
  }
}

/** Boards with the grid's sponsor names, standing along the outside of the lap. */
export function sponsorBoards(app, root, path, teams, pitSide) {
  const names = teams.map((t) => ({ text: t.sponsor || t.name, color: t.color, accent: t.accent }));
  if (!names.length || typeof document === 'undefined') return;
  const materials = names.map(({ text, color }) => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 96;
    const g = canvas.getContext('2d');
    g.fillStyle = color;
    g.fillRect(0, 0, 512, 96);
    const light = parseInt(color.slice(1, 3), 16) * 0.3 + parseInt(color.slice(3, 5), 16) * 0.59 + parseInt(color.slice(5, 7), 16) * 0.11 > 150;
    g.fillStyle = light ? '#0b0f19' : '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    let size = 58;
    do {
      g.font = `800 ${size}px system-ui, sans-serif`;
      size -= 3;
    } while (g.measureText(text.toUpperCase()).width > 480 && size > 18);
    g.fillText(text.toUpperCase(), 256, 52);
    const texture = new pc.Texture(app.graphicsDevice, { width: 512, height: 96, mipmaps: true });
    texture.setSource(canvas);
    const m = new pc.StandardMaterial();
    m.diffuse = new pc.Color(0, 0, 0);
    m.emissive = new pc.Color(1, 1, 1);
    m.emissiveMap = texture;
    m.cull = pc.CULLFACE_NONE;
    m.update();
    return m;
  });
  const count = Math.min(16, Math.max(8, names.length));
  for (let i = 0; i < count; i++) {
    const f = 0.2 + (i / count) * 0.76;
    const p = path.pointAt(f, pitSide * (HALF + 4.6));
    if (clearance(path, p.x, p.z) < HALF + 3.4) continue;
    const e = new pc.Entity('sponsor-board');
    e.addComponent('render', { type: 'plane', castShadows: false, receiveShadows: false });
    e.render.material = materials[i % materials.length];
    e.setLocalPosition(p.x, 1.15, p.z);
    // stand the plane up and turn its face to the road
    e.setLocalEulerAngles(90, p.heading + (pitSide > 0 ? 90 : -90), 0);
    e.setLocalScale(7, 1, 1.3);
    root.addChild(e);
  }
}

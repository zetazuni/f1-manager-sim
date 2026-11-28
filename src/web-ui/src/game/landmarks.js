// Landmarks that give a circuit its identity. A calendar entry lists them as
//   landmarks: [{ type, f, side, dist }]
// f = where along the lap (0-1), side = 1 or -1 of the road, dist = how far out.
// Each claims its ground first, searching nearby when the wanted spot is taken,
// so none overlaps the road or anything else. They are stylised, not surveys.

const TAU = Math.PI * 2;

const ellipse = (cx, cz, rx, rz, n = 40) => Array.from({ length: n }, (_, i) => [cx + Math.cos((i / n) * TAU) * rx, cz + Math.sin((i / n) * TAU) * rz]);

// ---- builders: draw at (x, z); `yaw` follows the road, `s` is the road side ----

const KINDS = {
  ferris: { r: 17, build: ({ mb, glow, x, z, yaw }) => {
    const rot = [0, yaw, 0];
    const g = { pos: [x, 0, z], rot };
    for (const k of [-1, 1]) {
      mb.box({ pos: [k * 0.1, 9, -5], scale: [0.8, 21, 0.8], rot: [-16, 0, 0], color: '#e5e7eb' }, g);
      mb.box({ pos: [k * 0.1, 9, 5], scale: [0.8, 21, 0.8], rot: [16, 0, 0], color: '#e5e7eb' }, g);
    }
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * TAU;
      mb.box({ pos: [0, 19 + Math.sin(a) * 15, Math.cos(a) * 15], scale: [0.6, 0.5, 2.7], rot: [(a * 180) / Math.PI + 90, 0, 0], color: '#f8fafc' }, g);
      if (i % 3 === 0) {
        mb.box({ pos: [0, 19 + (Math.sin(a) * 15) / 2, (Math.cos(a) * 15) / 2], scale: [0.2, 0.2, 15], rot: [(-a * 180) / Math.PI, 0, 0], color: '#cbd5e1' }, g);
        mb.box({ pos: [0, 19 + Math.sin(a) * 15 - 1.2, Math.cos(a) * 15], scale: [2.4, 1.8, 1.8], color: ['#e11d48', '#2563eb', '#f59e0b', '#16a34a'][(i / 3) % 4] }, g);
        glow.box({ pos: [x, 19 + Math.sin(a) * 15, z], scale: [0.1, 0.1, 0.1], color: '#ffffff' });
      }
    }
    mb.prism({ pos: [x, 19, z], radius: 1.6, height: 2.4, sides: 20, color: '#94a3b8', rot: [90, yaw + 90, 0] });
  } },

  tower: { r: 7, build: ({ mb, glow, x, z, color = '#e11d48' }) => {
    mb.frustum({ pos: [x, 0, z], rBottom: 3.2, rTop: 1.2, height: 36, sides: 14, color: '#e8ecf1' });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      mb.box({ pos: [x + Math.cos(a) * 2.4, 18, z + Math.sin(a) * 2.4], scale: [0.35, 36, 0.35], color });
    }
    mb.prism({ pos: [x, 37, z], radius: 5, height: 1.2, sides: 24, color });
    mb.prism({ pos: [x, 39.2, z], radius: 4, height: 3, sides: 24, color: '#bfdbfe' });
    mb.prism({ pos: [x, 41.4, z], radius: 4.8, height: 0.8, sides: 24, color: '#f8fafc' });
    glow.box({ pos: [x, 44, z], scale: [0.4, 4, 0.4], color: '#fde68a' });
  } },

  spires: { r: 14, build: ({ mb, glow, x, z }) => {
    for (const [dx, dz, h] of [[-7, 2, 34], [0, -5, 42], [7, 3, 31]]) {
      for (let k = 0; k < 14; k++) {
        const t = k / 13;
        const w = 6 * Math.sqrt(1 - t * 0.94);
        mb.box({ pos: [x + dx + t * t * 3, (k + 0.5) * (h / 14), z + dz], scale: [w, h / 14 + 0.05, w * 0.6], color: k % 2 ? '#3b82f6' : '#1d4ed8' });
        if (k % 3 === 1) glow.box({ pos: [x + dx + t * t * 3, (k + 0.5) * (h / 14), z + dz + w * 0.31], scale: [w * 0.8, 0.5, 0.1], color: '#fb923c' });
      }
    }
  } },

  oldTower: { r: 9, build: ({ mb, x, z }) => {
    mb.prism({ pos: [x, 9, z], radius: 5, height: 18, sides: 24, color: '#c9a876' });
    mb.box({ pos: [x + 4.4, 8, z], scale: [4, 16, 3], color: '#bd9a68' });
    for (let y = 2; y < 18; y += 2.4) mb.prism({ pos: [x, y, z], radius: 5.15, height: 0.35, sides: 24, color: '#a98a5c' });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU;
      mb.box({ pos: [x + Math.cos(a) * 4.6, 18.6, z + Math.sin(a) * 4.6], scale: [1, 1.2, 1], color: '#c9a876' });
    }
  } },

  walls: { r: 11, build: ({ mb, x, z, yaw }) => {
    const g = { pos: [x, 0, z], rot: [0, yaw, 0] };
    mb.box({ pos: [0, 2.5, 0], scale: [2.4, 5, 19], color: '#bd9a68' }, g);
    for (let i = -4; i <= 4; i++) mb.box({ pos: [0, 5.5, i * 2.1], scale: [2.4, 1, 1.1], color: '#c9a876' }, g);
    for (const d of [-9.5, 9.5]) {
      mb.box({ pos: [0, 4, d], scale: [4, 8, 4], color: '#c9a876' }, g);
      mb.box({ pos: [0, 8.6, d], scale: [4.6, 1.2, 4.6], color: '#a98a5c' }, g);
    }
  } },

  harbour: { r: 26, flat: true, build: ({ mb, x, z, yaw, rng }) => {
    mb.slab({ points: ellipse(x, z, 25, 25), y0: 0, y1: 0.12, color: '#1e6f9f' });
    for (let i = 0; i < 14; i++) {
      const bx = x - 17 + (i % 5) * 8 + rng() * 2;
      const bz = z - 12 + Math.floor(i / 5) * 11 + rng() * 2;
      const g = { pos: [bx, 0, bz], rot: [0, yaw, 0] };
      const long = 4 + rng() * 4;
      mb.box({ pos: [0, 0.6, 0], scale: [1.8, 1, long], color: '#f8fafc' }, g);
      mb.box({ pos: [0, 0.55, long / 2 + 0.5], scale: [1.1, 0.8, 1.1], rot: [0, 45, 0], color: '#f8fafc' }, g);
      mb.box({ pos: [0, 1.5, -0.4], scale: [1.4, 0.8, long * 0.5], color: '#cbd5e1' }, g);
      mb.box({ pos: [0, 2.1, -0.6], scale: [1, 0.5, long * 0.3], color: '#334155' }, g);
      if (i % 4 === 0) mb.box({ pos: [0, 5, 0], scale: [0.12, 7, 0.12], color: '#94a3b8' }, g);
    }
    for (let i = 0; i < 9; i++) mb.box({ pos: [x - 20 + i * 5, 0.35, z - 18], scale: [4.4, 0.5, 1.4], color: '#a8825a' });
  } },

  lake: { r: 28, flat: true, build: ({ mb, x, z, rng }) => {
    mb.slab({ points: ellipse(x, z, 27, 20), y0: 0, y1: 0.12, color: '#2b7fae' });
    mb.slab({ points: ellipse(x + 6, z - 3, 5, 3, 18), y0: 0.12, y1: 0.5, color: '#4d8a3c' });
    for (let i = 0; i < 8; i++) {
      const bx = x - 16 + rng() * 30;
      const bz = z - 10 + rng() * 20;
      mb.box({ pos: [bx, 0.4, bz], scale: [1, 0.5, 2.4], rot: [0, rng() * 180, 0], color: '#f8fafc' });
      mb.box({ pos: [bx, 1.8, bz], scale: [0.08, 2.4, 1.1], color: ['#f43f5e', '#facc15', '#f8fafc'][i % 3] });
    }
  } },

  dome: { r: 20, build: ({ mb, glow, x, z }) => {
    mb.prism({ pos: [x, 2, z], radius: 16, height: 4, sides: 40, color: '#334155' });
    mb.sphere({ pos: [x, 15, z], radius: 15, color: '#1e1b4b', seg: 36 });
    for (let k = 1; k < 9; k++) {
      const a = (k / 9) * Math.PI - Math.PI / 2;
      const rr = Math.cos(a) * 15.15;
      const y = 15 + Math.sin(a) * 15.15;
      for (let i = 0; i < 28; i++) {
        const t = (i / 28) * TAU + k * 0.2;
        glow.box({ pos: [x + Math.cos(t) * rr, y, z + Math.sin(t) * rr], scale: [0.7, 0.7, 0.7], color: ['#22d3ee', '#a78bfa', '#f472b6', '#fbbf24'][(i + k) % 4] });
      }
    }
  } },

  lattice: { r: 15, build: ({ mb, x, z }) => {
    for (let k = 0; k <= 8; k++) {
      const a = (k / 9) * Math.PI - Math.PI / 2 + 0.2;
      const rr = Math.cos(a) * 12;
      const y = 11 + Math.sin(a) * 12;
      for (let i = 0; i < 24; i++) {
        const t = (i / 24) * TAU + (k % 2) * 0.13;
        mb.box({ pos: [x + Math.cos(t) * rr, y, z + Math.sin(t) * rr], scale: [0.2, 0.2, (rr * TAU) / 24], rot: [0, (-t * 180) / Math.PI, 0], color: '#cbd5e1' });
        mb.box({ pos: [x + Math.cos(t) * rr, y + 1.1, z + Math.sin(t) * rr], scale: [0.18, 2.6, 0.18], rot: [12, (-t * 180) / Math.PI, 18], color: '#94a3b8' });
      }
    }
    mb.prism({ pos: [x, 4, z], radius: 3, height: 8, sides: 16, color: '#64748b' });
  } },

  stadium: { r: 27, build: ({ mb, glow, x, z, rng, color = '#0ea5e9' }) => {
    const n = 44;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const g = { pos: [x + Math.cos(a) * 22, 0, z + Math.sin(a) * 18], rot: [0, (-a * 180) / Math.PI, 0] };
      for (let row = 0; row < 4; row++) {
        mb.box({ pos: [row * 1.2 - 2, 1 + row, 0], scale: [1.2, 2 + row * 2, 3.3], color: row % 2 ? '#475569' : '#64748b' }, g);
        mb.box({ pos: [row * 1.2 - 2, 2.3 + row * 2, 0], scale: [0.7, 0.6, 2.8], color: ['#f43f5e', '#f59e0b', '#22d3ee', '#a3e635', '#e2e8f0'][Math.floor(rng() * 5)] }, g);
      }
      mb.box({ pos: [3, 11, 0], scale: [3.4, 0.3, 3.3], color }, g);
    }
    mb.slab({ points: ellipse(x, z, 18, 14), y0: 0, y1: 0.15, color: '#3f9b4a' });
    for (const [dx, dz] of [[-23, -17], [23, -17], [-23, 17], [23, 17]]) {
      mb.box({ pos: [x + dx, 9, z + dz], scale: [0.6, 18, 0.6], color: '#94a3b8' });
      glow.box({ pos: [x + dx, 18.4, z + dz], scale: [3, 1.2, 0.8], color: '#fffbe6' });
    }
  } },

  skyline: { r: 24, build: ({ mb, glow, x, z, rng }) => {
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * TAU;
      const rr = i % 3 === 0 ? 6 : 17;
      const bx = x + Math.cos(a) * rr;
      const bz = z + Math.sin(a) * rr;
      const h = 14 + rng() * 26;
      const w = 4 + rng() * 3;
      mb.box({ pos: [bx, h / 2, bz], scale: [w, h, w], color: ['#94a3b8', '#7dd3fc', '#cbd5e1', '#64748b'][i % 4] });
      for (let y = 3; y < h - 1; y += 3.2) glow.box({ pos: [bx, y, bz + w / 2 + 0.05], scale: [w * 0.7, 0.35, 0.1], color: '#dbeafe' });
      mb.box({ pos: [bx, h + 1.5, bz], scale: [0.25, 3, 0.25], color: '#475569' });
    }
  } },

  skypark: { r: 22, build: ({ mb, glow, x, z, yaw }) => {
    const g = { pos: [x, 0, z], rot: [0, yaw, 0] };
    for (const d of [-12, 0, 12]) {
      for (let k = 0; k < 12; k++) mb.box({ pos: [(6 - k * 0.45) * 0.4, 1.5 + k * 2.6, d], scale: [4.2, 2.6, 6], color: k % 2 ? '#cbd5e1' : '#a5b4c8' }, g);
    }
    mb.box({ pos: [0.2, 32.5, 1], scale: [5.4, 1.6, 36], color: '#f8fafc' }, g);
    mb.box({ pos: [0.2, 33.5, 1], scale: [3.6, 0.5, 30], color: '#22d3ee' }, g);
    glow.box({ pos: [x, 34.5, z], scale: [0.6, 0.6, 0.6], color: '#fde68a' });
  } },

  palace: { r: 15, build: ({ mb, glow, x, z, yaw }) => {
    const g = { pos: [x, 0, z], rot: [0, yaw, 0] };
    mb.box({ pos: [0, 4, 0], scale: [9, 8, 20], color: '#f3e4c4' }, g);
    mb.box({ pos: [0, 8.6, 0], scale: [10, 1.2, 21], color: '#e0c794' }, g);
    for (let d = -8; d <= 8; d += 3.2) {
      mb.box({ pos: [-4.7, 3.6, d], scale: [0.7, 7, 0.9], color: '#fff7e6' }, g);
      mb.box({ pos: [4.7, 3.6, d], scale: [0.7, 7, 0.9], color: '#fff7e6' }, g);
    }
    for (const d of [-8, 8]) {
      mb.box({ pos: [0, 11, d], scale: [5, 5, 5], color: '#f3e4c4' }, g);
      mb.box({ pos: [0, 14.6, d], scale: [3.6, 2.2, 3.6], rot: [0, 45, 0], color: '#2f8f7a' }, g);
      mb.box({ pos: [0, 16.8, d], scale: [0.3, 2.4, 0.3], color: '#fbbf24' }, g);
    }
    mb.box({ pos: [0, 10.4, 0], scale: [6, 2.4, 6], rot: [0, 45, 0], color: '#2f8f7a' }, g);
    glow.box({ pos: [x, 13, z], scale: [0.5, 0.5, 0.5], color: '#fde68a' });
  } },

  wing: { r: 24, build: ({ mb, x, z, yaw }) => {
    const g = { pos: [x, 0, z], rot: [0, yaw, 0] };
    mb.box({ pos: [0, 2.5, 0], scale: [7, 5, 42], color: '#e5e7eb' }, g);
    for (let d = -20; d <= 20; d += 2.5) mb.box({ pos: [-3.6, 2.4, d], scale: [0.2, 4.4, 1.9], color: '#334155' }, g);
    for (let i = 0; i < 14; i++) {
      const t = i / 13;
      mb.box({ pos: [0, 6 + Math.sin(t * Math.PI * 0.85) * 3.4 + t * 2.6, -21 + t * 42], scale: [11, 0.5, 3.6], rot: [-Math.cos(t * Math.PI * 0.85) * 14 - 3, 0, 0], color: i % 2 ? '#f8fafc' : '#cbd5e1' }, g);
    }
  } },

  canopy: { r: 22, build: ({ mb, x, z, yaw, rng, color = '#f8fafc' }) => {
    const g = { pos: [x, 0, z], rot: [0, yaw, 0] };
    for (let row = 0; row < 6; row++) {
      mb.box({ pos: [row * 1.3 - 4, 0.6 + row * 0.5, 0], scale: [1.4, 1.2 + row, 36], color: row % 2 ? '#334155' : '#475569' }, g);
      for (let d = -17; d <= 17; d += 1.6) {
        if (rng() < 0.2) continue;
        mb.box({ pos: [row * 1.3 - 4, 1.6 + row, d], scale: [0.5, 0.6, 0.6], color: ['#f43f5e', '#f59e0b', '#22d3ee', '#a3e635', '#e2e8f0'][Math.floor(rng() * 5)] }, g);
      }
    }
    // great petal-shaped roofs
    for (const d of [-12, 0, 12]) {
      mb.box({ pos: [4.6, 6.5, d], scale: [0.7, 13, 0.7], color: '#94a3b8' }, g);
      for (let k = 0; k < 7; k++) {
        const w = Math.sin(((k + 0.7) / 7.4) * Math.PI) * 11;
        mb.box({ pos: [5 - k * 1.7, 13.4 - k * 0.35, d], scale: [1.8, 0.35, w], rot: [0, 0, 11], color }, g);
      }
    }
  } },

  dunes: { r: 20, build: ({ mb, x, z, rng }) => {
    for (let i = 0; i < 9; i++) {
      const bx = x - 12 + (i % 3) * 12 + rng() * 3;
      const bz = z - 12 + Math.floor(i / 3) * 12 + rng() * 3;
      const r = 4 + rng() * 3;
      mb.sphere({ pos: [bx, -0.8, bz], radius: r, color: i % 2 ? '#e6cf94' : '#d9bd7d', scale: [1.3, 0.55, 1], seg: 16 });
      for (let k = 0; k < 5; k++) mb.box({ pos: [bx - 2 + rng() * 4, r * 0.45, bz - 2 + rng() * 4], scale: [0.2, 0.9, 0.2], rot: [rng() * 30, 0, rng() * 30], color: '#8a9a4a' });
    }
  } },

  halls: { r: 26, build: ({ mb, x, z, yaw }) => {
    const g = { pos: [x, 0, z], rot: [0, yaw, 0] };
    for (const [dx, d] of [[-9, -12], [9, -12], [-9, 12], [9, 12]]) {
      mb.box({ pos: [dx, 3.5, d], scale: [15, 7, 20], color: '#e2e8f0' }, g);
      for (let k = -4; k <= 4; k++) mb.box({ pos: [dx, 7.4, d + k * 2.2], scale: [15.4, 0.8, 1.1], rot: [28, 0, 0], color: '#94a3b8' }, g);
      mb.box({ pos: [dx, 5, d + 10.2], scale: [11, 1.4, 0.2], color: '#e11d48' }, g);
    }
  } },

  banking: { r: 24, build: ({ mb, x, z, yaw, s }) => {
    const g = { pos: [x, 0, z], rot: [0, yaw, 0] };
    for (let i = 0; i < 22; i++) {
      const a = -1.1 + (i / 21) * 2.2;
      const rr = 24;
      const px = -s * (rr - Math.cos(a) * rr);
      const pz = Math.sin(a) * rr;
      const turn = (-s * a * 180) / Math.PI;
      mb.box({ pos: [px, 3, pz], scale: [8.5, 0.6, 2.6], rot: [0, turn, s * 32], color: i % 2 ? '#9ca3af' : '#aeb5bf' }, g);
      mb.box({ pos: [px + s * 3.4, 2.4, pz], scale: [0.5, 5, 0.5], rot: [0, turn, 0], color: '#6b7280' }, g);
      mb.box({ pos: [px + s * 4, 6, pz], scale: [0.3, 1, 2.6], rot: [0, turn, 0], color: i % 2 ? '#e11d48' : '#f8fafc' }, g);
    }
  } },

  monument: { r: 10, build: ({ mb, x, z, color = '#e11d48' }) => {
    mb.prism({ pos: [x, 1.2, z], radius: 6, height: 2.4, sides: 32, color: '#64748b' });
    // a rising ribbon of steel: abstract art on a hill
    for (let i = 0; i < 34; i++) {
      const t = i / 33;
      const a = t * TAU * 1.25;
      mb.box({ pos: [x + Math.cos(a) * (4.5 - t * 2.5), 3 + t * 17, z + Math.sin(a) * (4.5 - t * 2.5)], scale: [1.6, 1.4, 0.7], rot: [0, (-a * 180) / Math.PI, 25], color: i % 2 ? color : '#fbbf24' });
    }
  } },

  parkland: { r: 18, build: ({ mb, x, z, rng }) => {
    mb.slab({ points: ellipse(x, z, 17, 17, 28), y0: 0, y1: 0.1, color: '#4a8c3f' });
    mb.box({ pos: [x, 3.4, z], scale: [9, 6.8, 6], color: '#e8d9b5' });
    mb.box({ pos: [x, 7.6, z], scale: [10, 1.6, 7], color: '#9a4a36' });
    for (let i = -3; i <= 3; i++) mb.box({ pos: [x + i * 1.2, 3, z + 3.1], scale: [0.5, 5.6, 0.4], color: '#fff7e6' });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      const bx = x + Math.cos(a) * (12 + rng() * 3);
      const bz = z + Math.sin(a) * (12 + rng() * 3);
      mb.prism({ pos: [bx, 1.6, bz], radius: 0.4, height: 3.2, sides: 8, color: '#5b3a1e' });
      mb.sphere({ pos: [bx, 4.8, bz], radius: 2.4 + rng(), color: i % 2 ? '#2f6b34' : '#3b7f40', seg: 10 });
    }
  } },
};

/** Structures that go over the road itself. */
const OVER = {
  tunnel: ({ mb, glow, path, f }) => {
    for (let k = -9; k <= 9; k++) {
      const q = path.pointAt(f + (k * 2.4) / path.total);
      const rot = [0, q.heading, 0];
      const g = { pos: [q.x, q.y, q.z], rot };
      for (const side of [-1, 1]) mb.box({ pos: [side * 4.6, 2.8, 0], scale: [0.6, 5.6, 1.1], color: '#8b93a1' }, g);
      mb.box({ pos: [0, 5.9, 0], scale: [10.4, 0.5, 2.45], color: k % 2 ? '#aab2bf' : '#9aa2b0' }, g);
      glow.box({ pos: [q.x, q.y + 5.55, q.z], scale: [2.4, 0.08, 0.3], rot, color: '#fff3c4' });
    }
  },
  overHotel: ({ mb, glow, path, f }) => {
    const c = path.pointAt(f);
    const g = { pos: [c.x, c.y, c.z], rot: [0, c.heading, 0] };
    for (const side of [-1, 1]) {
      mb.box({ pos: [side * 9, 8, 0], scale: [6, 16, 12], color: '#e2e8f0' }, g);
      for (let y = 2; y < 15; y += 2.6) for (const face of [6.1, -6.1]) mb.box({ pos: [side * 9, y, face], scale: [5, 0.9, 0.2], color: '#1e3a5f' }, g);
    }
    mb.box({ pos: [0, 12, 0], scale: [14, 5, 9], color: '#f8fafc' }, g);
    // a glowing wave-shaped shell over the whole thing
    for (let i = -8; i <= 8; i++) {
      mb.box({ pos: [i * 1.5, 18 + Math.cos(i / 3.2) * 3, 0], scale: [1.2, 0.25, 14], rot: [0, 0, -Math.sin(i / 3.2) * 20], color: i % 2 ? '#a78bfa' : '#7dd3fc' }, g);
      glow.box({ pos: [c.x, c.y + 14.6, c.z], scale: [0.2, 0.2, 0.2], color: '#c4b5fd' });
    }
  },
};

export const LANDMARK_TYPES = [...Object.keys(KINDS), ...Object.keys(OVER)];

/** Place a calendar entry's landmarks. Returns [{ type, placed }]. */
export function buildLandmarks(mb, glow, path, reg, list = []) {
  let a = 4177;
  const rng = () => {
    a = (a * 16807) % 2147483647;
    return a / 2147483647;
  };
  return list.map(({ type, f = 0.5, side = 1, dist = 0, color }) => {
    if (OVER[type]) {
      // slide along the lap to a stretch that is straight enough and level
      for (let k = 0; k < 40; k++) {
        const at = (f + (k % 2 ? -1 : 1) * Math.ceil(k / 2) * 0.012 + 1) % 1;
        const turn = [-18, -9, 0, 9, 18].map((d) => path.pointAt(at + d / path.total).heading);
        const bend = Math.max(...turn.map((h) => Math.abs(((h - turn[2] + 540) % 360) - 180)));
        const c = path.pointAt(at);
        if (bend > (type === 'tunnel' ? 38 : 22) || c.y > 0.1 || at * path.total < 90) continue;
        // a tunnel needs both sides clear along its whole length; a hotel only its towers
        const along = type === 'tunnel' ? [-18, -12, -6, 0, 6, 12, 18] : [0];
        const legs = along.flatMap((d) => [-1, 1].map((sd) => path.pointAt(at + d / path.total, sd * (type === 'tunnel' ? 6.2 : 9)))).map((l) => [l.x, l.z, type === 'tunnel' ? 2.2 : 5]);
        // neighbouring pieces of one structure may touch each other
        if (!legs.every((c) => reg.free([c], 0.1))) continue;
        reg.add(legs, `landmark-${type}`, 0.1);
        OVER[type]({ mb, glow, path, f: at });
        return { type, placed: true };
      }
      return { type, placed: false };
    }
    const kind = KINDS[type];
    if (!kind) return { type, placed: false };
    // the wanted spot first, then further out, along the lap and the other side
    for (let tries = 0; tries < 400; tries++) {
      const sideNow = tries % 2 ? -side : side;
      const along = f + ((Math.floor(tries / 2) % 20) - 10) * 0.017 * (tries >= 2 ? 1 : 0);
      const out = dist + kind.r + 9 + Math.floor(tries / 40) * 8;
      const at = ((along % 1) + 1) % 1;
      const p = path.pointAt(at, sideNow * out);
      if (!reg.take([[p.x, p.z, kind.r]], `landmark-${type}`, 3)) continue;
      kind.build({ mb, glow, x: p.x, z: p.z, yaw: path.pointAt(at).heading, s: sideNow, rng, color });
      return { type, placed: true };
    }
    return { type, placed: false };
  });
}

// The headquarters from the air: an original campus with a curved glass
// building beside a lake, a long workshop, a glazed bridge, a roundabout,
// car parks, walkways and woodland.

import { createGroup, walker } from './hqKit';

const ring = (cx, cz, rx, rz, n = 72, from = 0, to = Math.PI * 2) => Array.from({ length: n }, (_, i) => {
  const a = from + ((to - from) * i) / (to - from >= Math.PI * 2 - 1e-6 ? n : n - 1);
  return [cx + Math.cos(a) * rx, cz + Math.sin(a) * rz];
});

const rounded = (cx, cz, w, d, r, n = 8) => {
  const out = [];
  const corners = [[w / 2 - r, d / 2 - r, 0], [-w / 2 + r, d / 2 - r, 1], [-w / 2 + r, -d / 2 + r, 2], [w / 2 - r, -d / 2 + r, 3]];
  corners.forEach(([x, z, q]) => {
    for (let i = 0; i <= n; i++) {
      const a = (q + i / n) * (Math.PI / 2);
      out.push([cx + x + Math.cos(a) * r, cz + z + Math.sin(a) * r]);
    }
  });
  return out;
};

let seedState = 7;
const random = () => {
  seedState = (seedState * 16807) % 2147483647;
  return seedState / 2147483647;
};

function tree(g, x, z, s = 1) {
  const greens = ['#2f6b34', '#3b7f3c', '#255a2e', '#4a8c3f'];
  const c = greens[Math.floor(random() * greens.length)];
  g.cyl(x, 0.6 * s, z, 0.16 * s, 1.2 * s, '#5b4027', [0, 0, 0], 7);
  g.ball(x, 1.8 * s, z, 1.05 * s, c, [1, 1.1, 1], 9);
  g.ball(x + 0.3 * s, 2.5 * s, z - 0.2 * s, 0.65 * s, c, [1, 1, 1], 8);
}

/** A floor of glazing round an outline, with mullions and a floor plate. */
function glazedStorey(g, outline, y, height) {
  const n = outline.length;
  for (let i = 0; i < n; i++) {
    const [ax, az] = outline[i];
    const [bx, bz] = outline[(i + 1) % n];
    const len = Math.hypot(bx - ax, bz - az);
    const yaw = (Math.atan2(bx - ax, bz - az) * 180) / Math.PI;
    g.glass((ax + bx) / 2, y + height / 2, (az + bz) / 2, 0.12, height, len, [0, yaw, 0]);
    g.box(ax, y + height / 2, az, 0.18, height, 0.18, '#dfe5ec');
    g.lamp((ax + bx) / 2, y + height - 0.25, (az + bz) / 2, 0.06, 0.1, len * 0.7, '#fff2d0', [0, yaw, 0]);
  }
}

export function buildCampus(app, { sky, color, accent, name }) {
  seedState = 7;
  const g = createGroup(app, 'campus', { sky });
  const { gloss, mb } = g;

  // land
  g.box(0, -1, 0, 1400, 2, 1400, '#4f7a38');
  mb.slab({ points: ring(-10, -4, 118, 86), y0: 0, y1: 0.06, color: '#5d8c40' });
  for (let i = 0; i < 7; i++) mb.slab({ points: ring(-70 + random() * 160, -150 + random() * 40, 18 + random() * 16, 10 + random() * 9, 20), y0: 0, y1: 0.05 + i * 0.004, color: i % 2 ? '#7d9a4a' : '#8fa653' });

  // main building: two glazed storeys under a curved roof, lake wrapped into it
  const main = ring(40, -14, 37, 27);
  mb.slab({ points: ring(40, -14, 40, 30), y0: 0, y1: 0.3, color: '#9aa1a8' });
  mb.slab({ points: ring(40, -14, 35.5, 25.5), y0: 0.3, y1: 0.5, color: '#e9edf1' });
  glazedStorey(g, main, 0.5, 4);
  mb.slab({ points: ring(40, -14, 37.8, 27.8), y0: 4.5, y1: 4.9, color: '#f4f6f8', side: '#aab2bb' });
  glazedStorey(g, main, 4.9, 3.6);
  mb.slab({ points: ring(40, -14, 39, 29), y0: 8.5, y1: 9.4, color: '#cfd5db', side: '#f6f7f9' });
  // roof lights in rows, and the team name on the roof
  for (let r = -3; r <= 3; r++) {
    for (let k = -9; k <= 9; k++) {
      const x = 44 + k * 2.6;
      const z = -8 + r * 4.4;
      if (((x - 40) / 33) ** 2 + ((z + 14) / 23) ** 2 > 1) continue;
      g.box(x, 9.5, z, 1.5, 0.16, 0.7, '#8d97a3');
    }
  }
  // the lake, on the ground, tucked into the back of the building
  gloss.slab({ points: ring(12, -36, 30, 17, 56), y0: 0, y1: 0.34, color: '#2f6d93' });
  for (const p of ring(12, -36, 31.2, 18.2, 90)) if (((p[0] - 40) / 41) ** 2 + ((p[1] + 14) / 31) ** 2 > 1) g.box(p[0], 0.25, p[1], 1.2, 0.45, 1.2, '#c3c8cd');
  // entrance
  g.box(40, 3.4, 15.4, 14, 0.4, 6, '#f4f6f8');
  for (const dx of [-6, -2, 2, 6]) g.cyl(40 + dx, 1.7, 17.6, 0.22, 3.4, '#cbd2da');
  g.box(40, 4.2, 18.3, 14, 1.2, 0.3, color);
  g.sign(name, 40, 4.2, 18.52, 13, 1, '#ffffff');

  // the workshop: a long hall with a ribbed roof
  const shop = rounded(-52, -12, 62, 30, 6);
  mb.slab({ points: rounded(-52, -12, 66, 34, 7), y0: 0, y1: 0.3, color: '#9aa1a8' });
  mb.slab({ points: rounded(-52, -12, 59, 27, 5), y0: 0.3, y1: 0.5, color: '#e9edf1' });
  glazedStorey(g, shop, 0.5, 5);
  mb.slab({ points: rounded(-52, -12, 64, 32, 7), y0: 5.5, y1: 6.6, color: '#e4e8ec', side: '#bcc3ca' });
  for (let i = -5; i <= 5; i++) g.box(-52 + i * 5.2, 6.68, -12, 0.18, 0.16, 29, '#9aa4ae');
  g.box(-52, 6.7, 1, 58, 0.2, 0.9, accent);
  for (let i = -4; i <= 4; i++) g.box(-52 + i * 6, 1.7, 4.2, 3.6, 2.8, 0.4, '#2a313c');

  // the glazed bridge between them
  for (let x = -18; x <= 2; x += 4) {
    g.box(x, 3.6, -14, 4, 0.35, 5, '#eef1f4');
    g.box(x, 6.4, -14, 4, 0.3, 5, '#eef1f4');
    for (const dz of [-2.4, 2.4]) {
      g.glass(x, 5, -14 + dz, 4, 2.5, 0.1);
      g.box(x - 2, 5, -14 + dz, 0.15, 2.8, 0.15, '#cbd2da');
    }
    g.cyl(x, 1.8, -14, 0.3, 3.6, '#aab2bb');
  }

  // roundabout, drive and forecourt
  mb.slab({ points: ring(-2, 36, 24, 18), y0: 0, y1: 0.12, color: '#4b4f57' });
  mb.slab({ points: ring(-2, 36, 17, 12), y0: 0.12, y1: 0.24, color: '#5d8c40' });
  mb.slab({ points: ring(-2, 36, 8, 6), y0: 0.24, y1: 0.8, color: '#c9ced4' });
  gloss.slab({ points: ring(-2, 36, 6.6, 4.8), y0: 0.8, y1: 0.95, color: '#37566e' });
  const road = (x1, z1, x2, z2, w = 6) => {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const yaw = (Math.atan2(x2 - x1, z2 - z1) * 180) / Math.PI;
    g.box((x1 + x2) / 2, 0.11, (z1 + z2) / 2, w, 0.06, len + w * 0.4, '#4b4f57', [0, yaw, 0]);
    for (let d = 3; d < len; d += 6) g.box(x1 + ((x2 - x1) * d) / len, 0.17, z1 + ((z2 - z1) * d) / len, 0.2, 0.02, 2, '#e5e7eb', [0, yaw, 0]);
  };
  road(-120, 76, -62, 56);
  road(-62, 56, -24, 40);
  road(20, 34, 40, 22);
  road(-14, 22, -34, 10);

  // car parks with hedges, trees and cars
  const paint = ['#e11d48', '#2563eb', '#f8fafc', '#111827', '#9ca3af', '#f59e0b', color];
  const park = (cx, cz, cols, rows) => {
    g.box(cx, 0.08, cz, cols * 3.2 + 4, 0.05, rows * 8 + 4, '#565b63');
    for (let r = 0; r < rows; r++) {
      const z = cz - (rows - 1) * 4 + r * 8;
      g.box(cx, 0.4, z, cols * 3.2, 0.6, 0.8, '#3f7034');
      for (let c = 0; c < cols; c++) {
        const x = cx - (cols - 1) * 1.6 + c * 3.2;
        if (c % 3 === 0) tree(g, x, z, 0.7);
        if (random() < 0.7) {
          const body = paint[Math.floor(random() * paint.length)];
          g.box(x, 0.55, z + 2.4, 1.5, 0.55, 3, body);
          g.box(x, 1, z + 2.2, 1.35, 0.4, 1.6, '#1f2a38');
        }
      }
    }
  };
  park(44, 44, 14, 4);
  park(-62, 24, 15, 3);

  // walkways with lamp posts, linking everything
  const walks = [
    [[40, 19], [40, 26], [14, 26], [14, 52], [-20, 52], [-20, 22], [-40, 8], [-52, 6], [-30, 6], [-4, 18], [20, 22]],
    [[-8, -6], [-8, -34], [8, -36], [36, -44], [60, -50], [82, -36], [84, -14], [82, 12], [60, 20], [30, 20], [6, 8]],
  ];
  walks.forEach((path) => path.forEach((p, i) => {
    const q = path[(i + 1) % path.length];
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
    const yaw = (Math.atan2(q[0] - p[0], q[1] - p[1]) * 180) / Math.PI;
    g.box((p[0] + q[0]) / 2, 0.18, (p[1] + q[1]) / 2, 2.4, 0.08, len + 2, '#c8ccd2', [0, yaw, 0]);
    for (let d = 4; d < len; d += 10) {
      const x = p[0] + ((q[0] - p[0]) * d) / len + 1.6;
      const z = p[1] + ((q[1] - p[1]) * d) / len + 1.6;
      g.cyl(x, 1.4, z, 0.07, 2.8, '#64748b', [0, 0, 0], 6);
      g.lamp(x, 2.9, z, 0.35, 0.25, 0.35, '#fff1c2');
    }
  }));

  // woodland all round, and avenues near the buildings
  for (let i = 0; i < 620; i++) {
    const a = random() * Math.PI * 2;
    const r = 100 + random() * 90;
    const x = Math.cos(a) * r * 1.15 - 8;
    const z = Math.sin(a) * r * 0.85;
    tree(g, x, z, 1.1 + random() * 1.1);
  }
  for (let i = 0; i < 70; i++) tree(g, -30 + random() * 50, 58 + random() * 22, 1 + random());
  for (let i = 0; i < 18; i++) tree(g, -14 + (i % 3) * 3.4, -6 + i * 1.5, 0.9);
  for (const p of ring(-2, 36, 28, 22, 36)) if (p[1] > 22 || Math.abs(p[0] + 2) > 14) tree(g, p[0], p[1], 0.75);

  // flags by the entrance
  for (let i = 0; i < 5; i++) {
    const x = 52 + i * 2.6;
    g.cyl(x, 3, 22, 0.08, 6, '#e5e7eb', [0, 0, 0], 8);
    g.part((m) => m.box({ pos: [0.8, 0, 0], scale: [1.6, 0.9, 0.06], color: i % 2 ? accent : color }), x, 5.4, 22, (e, t) => e.setLocalEulerAngles(0, Math.sin(t * 2 + i) * 22, 0));
  }

  // staff walking the paths and shuttles going round
  for (let i = 0; i < 18; i++) {
    walker(g, walks[i % 2], { y: 0.2, offset: i * 23, speed: 2.2 + (i % 3) * 0.4, shirt: i % 3 ? color : '#f1f5f9', seed: i });
  }
  g.root.children.filter((c) => c.name === 'person').forEach((c) => c.setLocalScale(1.5, 1.5, 1.5));
  for (let k = 0; k < 3; k++) {
    g.part((m) => {
      m.box({ pos: [0, 0.9, 0], scale: [1.8, 1.1, 4.2], color: k % 2 ? accent : color });
      m.box({ pos: [0, 1.6, -0.2], scale: [1.7, 0.7, 3], color: '#1f2a38' });
      for (const [x, z] of [[0.9, 1.4], [-0.9, 1.4], [0.9, -1.4], [-0.9, -1.4]]) m.prism({ pos: [x, 0.4, z], radius: 0.4, height: 0.3, sides: 14, color: '#111827', rot: [0, 0, 90] });
    }, 0, 0.1, 0, (e, t) => {
      const a = t * 0.35 + (k * Math.PI * 2) / 3;
      e.setLocalPosition(-2 + Math.cos(a) * 20.5, 0.1, 36 + Math.sin(a) * 15);
      e.setLocalEulerAngles(0, (Math.atan2(-Math.sin(a) * 20.5, Math.cos(a) * 15) * 180) / Math.PI, 0);
    });
  }
  return g.finish();
}

// The departments. Each is its own hall: polished floor, lettered back wall,
// a glazed office floor above it, glass sides with walkways behind them and a
// slatted ceiling. Only the department in view exists on screen.

import * as pc from 'playcanvas';
import { materialCache, glowMaterial } from './meshBuilder';
import { buildCar } from './scene';
import { walker, worker, cheerer, person } from './hqKit';
import { inkOn } from './liveries';

const W = 30;
const D = 24;
const H = 9.4;

function shell(g, ctx, { title, floor = '#7d838c' }) {
  const { color, accent, name } = ctx;
  g.shine(0, -0.15, 1, W, 0.3, D + 2, floor);
  g.box(0, -0.5, 0, W + 14, 0.3, D + 12, '#2a2d34');
  for (const x of [-9, 9]) g.box(x, 0.012, 1, 0.12, 0.01, D - 2, '#e5e7eb');
  for (let z = -8; z <= 10; z += 3) for (const x of [-9, 9]) g.box(x, 0.016, z, 0.5, 0.01, 1.2, accent);

  // back wall below, offices above
  const back = -D / 2;
  g.box(0, 2.35, back, W, 4.7, 0.4, '#f1f3f6');
  g.box(0, 4.3, back + 0.23, W, 0.2, 0.1, color);
  g.box(0, 0.25, back + 0.23, W, 0.5, 0.1, '#2a2f38');
  // lettering sits on a fascia above anything standing on the floor
  g.box(0, 4.95, back + 0.36, W, 1.1, 0.1, '#f8fafc');
  g.sign(name, -6.5, 4.95, back + 0.43, 12, 0.95, '#111827');
  g.sign(title, 8, 4.95, back + 0.43, 9, 0.75, inkOn(color) === '#0b0f19' ? '#111827' : color); // light team colours would vanish on white
  g.box(-13.3, 3.5, back + 0.24, 0.5, 1.2, 0.06, accent, [0, 0, -24]);

  g.box(0, 4.9, back - 1.7, W, 0.3, 4, '#dfe3e8'); // mezzanine slab
  g.box(0, H - 0.2, back - 3.6, W, H - 4.9, 0.3, '#c9d0d9');
  for (let x = -W / 2; x <= W / 2; x += 3.75) g.box(x, 6.9, back + 0.1, 0.12, 4, 0.12, '#2b3440');
  g.glass(0, 7, back + 0.1, W, 3.8, 0.06);
  g.box(0, 5.9, back + 0.34, W, 0.07, 0.07, '#aeb6c0'); // rail
  for (let i = 0; i < 6; i++) {
    const x = -12.5 + i * 5;
    g.box(x, 5.85, back - 1.8, 2.6, 0.1, 1.1, '#cbd5e1');
    g.box(x, 6.45, back - 2.1, 1.1, 0.7, 0.07, '#0f172a');
    g.lamp(x, 6.45, back - 2.05, 0.98, 0.58, 0.02, i % 2 ? '#38bdf8' : '#a3e635');
    worker(g, x, 5.05, back - 1, { pose: 'sit', yaw: 180, shirt: i % 3 ? color : '#f1f5f9', seed: i + 3 });
    g.lamp(x, 8.7, back - 1.6, 2.6, 0.08, 0.5, '#fff6e0');
  }

  // glass side walls with a walkway and a plain wall beyond
  for (const side of [-1, 1]) {
    const x = (side * W) / 2;
    for (let z = back; z <= D / 2; z += 4) {
      g.box(x, 2.5, z, 0.14, 5, 0.14, '#2b3440');
      g.box(x, 7.2, z, 0.14, 4.4, 0.14, '#2b3440');
    }
    g.glass(x, 2.5, 0, 0.06, 4.9, D);
    g.glass(x, 7.1, 0, 0.06, 4.1, D);
    g.box(x, 5, 0, 0.5, 0.25, D, '#dfe3e8');
    g.shine(x + side * 2.2, -0.12, 0, 4, 0.24, D, '#9aa1ab');
    g.box(x + side * 4.4, H / 2, 0, 0.3, H, D, '#aeb7c4');
    for (let z = back + 2; z < D / 2; z += 5) g.lamp(x + side * 4.22, 3.6, z, 0.04, 1.6, 2.6, '#e8f4ff');
    walker(g, [[x + side * 2, back + 1.5], [x + side * 2, D / 2 - 2], [x + side * 3.2, D / 2 - 2], [x + side * 3.2, back + 1.5]], { offset: side * 9 + 11, seed: side + 4, shirt: color });
  }

  // slatted ceiling with strip lights
  for (let x = -W / 2 + 0.75; x < W / 2; x += 1.5) g.box(x, H, 1, 0.45, 0.5, D + 2, '#20232a');
  for (let i = -2; i <= 2; i++) g.lamp(i * 5.4, H - 0.3, 1, 0.18, 0.1, D - 3, '#ffffff', [0, i * 6, 0]);
}

// ---- props --------------------------------------------------------------

function desk(g, x, z, screen = '#38bdf8') {
  g.box(x, 0.95, z, 2.5, 0.1, 1.15, '#e2e8f0');
  for (const dx of [-1.15, 1.15]) g.box(x + dx, 0.47, z, 0.1, 0.94, 1, '#64748b');
  for (const dx of [-0.55, 0.55]) {
    g.box(x + dx, 1.48, z - 0.3, 0.98, 0.62, 0.06, '#0f172a', [0, dx * -14, 0]);
    g.lamp(x + dx, 1.48, z - 0.26, 0.88, 0.52, 0.02, screen, [0, dx * -14, 0]);
    g.box(x + dx, 1.08, z - 0.32, 0.08, 0.24, 0.08, '#334155');
  }
  g.box(x, 1.02, z + 0.2, 0.9, 0.04, 0.3, '#1f2937');
  g.cyl(x, 0.55, z + 1.15, 0.36, 0.1, '#111827');
  g.cyl(x, 0.28, z + 1.15, 0.06, 0.5, '#64748b');
}

function toolCabinet(g, x, z, color, yaw = 0) {
  g.box(x, 0.75, z, 2.4, 1.5, 0.9, color, [0, yaw, 0]);
  g.box(x, 1.55, z, 2.5, 0.1, 1, '#9ca3af', [0, yaw, 0]);
  const rad = (yaw * Math.PI) / 180;
  for (let k = 0; k < 4; k++) g.box(x + Math.sin(rad) * 0.47, 0.3 + k * 0.33, z + Math.cos(rad) * 0.47, 2.1, 0.04, 0.03, '#e5e7eb', [0, yaw, 0]);
}

function tyres(g, x, z, rows = 4) {
  for (let k = 0; k < rows; k++) {
    g.cyl(x, 0.3 + k * 0.52, z, 0.7, 0.48, '#17181c');
    g.cyl(x, 0.3 + k * 0.52, z, 0.32, 0.5, '#6b7280');
  }
}

function car(g, ctx, x, y, z, yaw, scale = 1, seat = 0) {
  const e = buildCar(g.app, ctx.color, ctx.accent, ctx.teamId ? `${ctx.teamId}-${seat}` : '');
  g.root.addChild(e);
  e.setLocalPosition(x, y, z);
  e.setLocalEulerAngles(0, yaw, 0);
  e.setLocalScale(scale, scale, scale);
  return e;
}

/** Wheeled build stand under a car. */
function stand(g, x, z, yawAlongX = false) {
  const [sx, sz] = yawAlongX ? [3.6, 1.2] : [1.2, 3.6];
  g.box(x, 0.45, z, sx, 0.12, sz, '#9ca3af');
  for (const dx of [-sx / 2 + 0.15, sx / 2 - 0.15]) {
    for (const dz of [-sz / 2 + 0.15, sz / 2 - 0.15]) {
      g.box(x + dx, 0.24, z + dz, 0.1, 0.4, 0.1, '#64748b');
      g.cyl(x + dx, 0.09, z + dz, 0.1, 0.1, '#111827', [0, 0, 90], 10);
    }
  }
}

// ---- departments --------------------------------------------------------

const BUILDERS = {
  lobby(g, ctx) {
    const { color, accent } = ctx;
    shell(g, ctx, { title: 'Welcome', floor: '#b9b2a8' });
    g.cyl(0, 0.15, -1, 5.2, 0.3, '#22262e', [0, 0, 0], 48);
    g.lamp(0, 0.31, -1, 0.1, 0.02, 10, accent);
    const show = car(g, ctx, 0, 0.35, -1, 35, 1.45);
    g.moving.push((t) => show.setLocalEulerAngles(0, 35 + t * 9, 0));
    // curved stair to the office floor
    for (let i = 0; i < 26; i++) {
      const a = -0.2 + (i / 25) * 2.1;
      const x = -8 + Math.cos(a) * 5.6;
      const z = -7 - Math.sin(a) * 3.2 + 3.4;
      g.box(x, 0.2 + i * 0.19, z, 1.9, 0.16, 0.8, '#f1f3f6', [0, (a * 180) / Math.PI - 90, 0]);
      g.glass(x + Math.cos(a) * 0.9, 0.9 + i * 0.19, z - Math.sin(a) * 0.9, 0.06, 1, 0.8, [0, (a * 180) / Math.PI, 0]);
    }
    // reception and trophy wall
    g.box(9, 0.6, 3, 4.4, 1.2, 1.2, '#f8fafc');
    g.box(9, 0.6, 3.63, 4.4, 0.3, 0.06, color);
    worker(g, 8.4, 0, 2, { shirt: color, seed: 2 });
    for (let s = 0; s < 3; s++) {
      g.box(11, 1 + s * 1.1, -10.9, 5.4, 0.1, 0.8, '#334155');
      for (let i = 0; i < 5; i++) {
        g.cyl(9 + i, 1.3 + s * 1.1, -10.9, 0.16, 0.45, '#fbbf24', [0, 0, 0], 14);
        g.ball(9 + i, 1.62 + s * 1.1, -10.9, 0.22, '#fde68a', [1, 0.6, 1]);
      }
    }
    // the team cheering the car home
    for (let i = 0; i < 12; i++) cheerer(g, -12 + (i % 6) * 1.15, 0, 6 - Math.floor(i / 6) * 1.3, { shirt: color, seed: i, yaw: 115 });
    for (let i = 0; i < 4; i++) walker(g, [[-4 + i, 7.5], [11, 6 - i], [11, -5], [5, -8]], { offset: i * 8, seed: i + 5, shirt: i % 2 ? color : '#f1f5f9' });
  },

  wind(g, ctx) {
    const { color, accent } = ctx;
    shell(g, ctx, { title: 'Wind tunnel', floor: '#3a4150' });
    g.box(0, 0.3, -2, 17, 0.5, 6.4, '#111827');
    for (let i = -8; i <= 8; i++) g.box(i, 0.57, -2, 0.09, 0.02, 6, '#374151');
    car(g, ctx, 0.5, 0.6, -2, 90, 1.35);
    // contraction and diffuser rings
    for (const dx of [-9, 9]) {
      g.box(dx, 5.3, -2, 1.4, 0.5, 7.8, '#aab6c6');
      for (const dz of [-3.8, 3.8]) g.box(dx, 2.7, -2 + dz, 1.4, 5, 0.5, '#aab6c6');
    }
    for (let x = -8; x <= 8; x += 4) g.glass(x, 3, 1.5, 3.9, 4.4, 0.06);
    g.box(0, 5.3, 1.5, 17, 0.15, 0.15, '#2b3440');
    g.cyl(-12.2, 3, -2, 3.3, 1, '#475569', [0, 0, 90], 48);
    g.part((m) => {
      for (let i = 0; i < 12; i++) m.box({ pos: [0, Math.cos((i * Math.PI) / 6) * 1.5, Math.sin((i * Math.PI) / 6) * 1.5], scale: [0.14, 2.6, 0.45], rot: [i * 30, 22, 0], color: '#dbe3ec' });
      m.sphere({ pos: [0.1, 0, 0], radius: 0.6, color: accent, seg: 18 });
    }, -11.4, 3, -2, (e, t) => e.setLocalEulerAngles(t * 430, 0, 0));
    // smoke lines bending over the car
    for (let line = 0; line < 15; line++) {
      const dz = -1.4 + (line % 5) * 0.7;
      const base = 1 + Math.floor(line / 5) * 0.55;
      for (let k = 0; k < 4; k++) {
        g.part((m) => m.box({ pos: [0, 0, 0], scale: [1.5, 0.03, 0.03], color: '#e0f2fe' }), 0, 0, 0, (e, t) => {
          const u = ((t * 6.5 + k * 4.3 + line * 0.9) % 17) - 8.5;
          const over = Math.max(0, 1 - Math.abs(u - 0.4) / 3.6);
          e.setLocalPosition(-u, base + over * over * Math.max(0, 1.9 - base * 0.7), -2 + dz * (1 + over * 0.25));
        });
      }
    }
    for (let i = 0; i < 4; i++) {
      desk(g, -6 + i * 4, 6.4, i % 2 ? '#a3e635' : '#38bdf8');
      worker(g, -6 + i * 4, 0, 7.6, { pose: 'sit', yaw: 180, shirt: color, seed: i });
    }
    walker(g, [[-11, 3.4], [11, 3.4], [11, 4.4], [-11, 4.4]], { shirt: '#f1f5f9', seed: 7 });
    walker(g, [[12, 9], [-12, 9], [-12, 10], [12, 10]], { shirt: color, seed: 9, offset: 13 });
  },

  power(g, ctx) {
    const { color, accent } = ctx;
    shell(g, ctx, { title: 'Powertrain lab', floor: '#5a5560' });
    g.box(0, 0.5, -3, 7.6, 0.9, 3.8, '#3f4652');
    g.box(0, 1.5, -3, 2.8, 0.9, 1.6, '#aeb4bd');
    for (const side of [-1, 1]) {
      g.box(0, 2.15, -3 + side * 0.52, 2.7, 0.6, 0.6, '#6b7280', [side * 28, 0, 0]);
      g.box(0, 2.55, -3 + side * 0.72, 2.6, 0.18, 0.58, accent, [side * 28, 0, 0]);
      for (let i = -1; i <= 1; i++) {
        g.cyl(i * 0.8, 1.85, -3 + side * 1.2, 0.15, 1.15, '#d97706', [side * 55, 0, 0], 14);
        g.ball(i * 0.8, 1.45, -3 + side * 1.62, 0.17, '#b45309');
      }
    }
    for (let i = -2; i <= 2; i++) g.cyl(i * 0.5, 2.55, -3, 0.12, 0.5, '#e5e7eb', [0, 0, 0], 14);
    g.cyl(2.1, 1.75, -3, 0.75, 0.9, '#cbd5e1', [0, 0, 90], 32);
    g.ball(2.62, 1.75, -3, 0.45, '#94a3b8');
    g.cyl(-3.1, 1.55, -3, 1.2, 1.5, '#334155', [0, 0, 90], 32);
    g.cyl(-1.9, 1.55, -3, 0.2, 1.5, '#e5e7eb', [0, 0, 90], 16);
    g.part((m) => {
      m.prism({ pos: [0, 0, 0], radius: 0.8, height: 0.2, sides: 32, color: '#94a3b8', rot: [0, 0, 90] });
      for (let i = 0; i < 3; i++) m.box({ pos: [0.12, 0, 0], scale: [0.05, 1.5, 0.14], color: accent, rot: [i * 60, 0, 0] });
    }, 2.95, 1.75, -3, (e, t) => e.setLocalEulerAngles(t * 620, 0, 0));
    const heat = g.part((m) => m.box({ pos: [0, 0, 0], scale: [2.3, 0.07, 1.05], color: '#ff7a18' }), 0, 1.03, -3, (e, t) => e.setLocalScale(1, 0.7 + 0.7 * Math.abs(Math.sin(t * 3)), 1));
    heat.render.meshInstances[0].material = materialCache().get('#glow') || heat.render.meshInstances[0].material;
    // dyno cell glazing and gantry
    for (const x of [-6, 6]) {
      g.glass(x, 2.6, -4, 0.06, 4.6, 9);
      g.box(x, 5.2, -4, 0.2, 0.2, 9, '#facc15');
      g.box(x, 2.6, 0.4, 0.2, 5.4, 0.2, '#facc15');
    }
    g.box(0, 5.2, 0.4, 12.2, 0.28, 0.28, '#facc15');
    // battery racks
    for (let i = 0; i < 5; i++) {
      g.box(7.6 + i * 1.45, 1.7, -10.4, 1.25, 3.2, 1.1, '#1f2937');
      for (let k = 0; k < 7; k++) g.lamp(7.6 + i * 1.45, 0.5 + k * 0.4, -9.83, 0.85, 0.09, 0.04, (i + k) % 2 ? '#22d3ee' : '#a3e635');
    }
    for (let i = 0; i < 4; i++) {
      desk(g, -9 + i * 3.4, 6.2, i % 2 ? '#f59e0b' : '#38bdf8');
      worker(g, -9 + i * 3.4, 0, 7.4, { pose: 'sit', yaw: 180, shirt: color, seed: i + 1 });
    }
    toolCabinet(g, -12.6, -6, color, 90);
    toolCabinet(g, -12.6, -2.6, color, 90);
    worker(g, 3.2, 0, -0.9, { yaw: 215, shirt: '#f1f5f9', seed: 4 });
    worker(g, -3.6, 0, -0.8, { yaw: 140, shirt: color, seed: 6 });
    walker(g, [[8, -7], [11, 8], [3, 9], [8, 2]], { shirt: '#f1f5f9', seed: 8 });
  },

  factory(g, ctx) {
    const { color } = ctx;
    shell(g, ctx, { title: 'Composites', floor: '#6a7079' });
    g.cyl(-9.5, 1.95, -7.6, 1.85, 5.6, '#d6dde6', [0, 0, 90], 48);
    g.cyl(-6.6, 1.95, -7.6, 2, 0.35, '#475569', [0, 0, 90], 48);
    g.cyl(-6.35, 1.95, -7.6, 0.8, 0.12, '#1f2937', [0, 0, 90], 32);
    g.lamp(-6.26, 1.95, -7.6, 0.04, 0.8, 0.8, '#fbbf24');
    stand(g, 1.5, -2.5);
    car(g, ctx, 1.5, 0.5, -2.5, 25, 1.25);
    for (let i = 0; i < 3; i++) {
      const x = -9 + i * 4;
      g.box(x, 0.95, 5, 3, 0.14, 1.9, '#cbd5e1');
      g.box(x, 1.06, 5, 2.4, 0.04, 1.3, '#17181d');
      for (const dx of [-1.3, 1.3]) g.box(x + dx, 0.47, 5, 0.14, 0.94, 1.6, '#475569');
      worker(g, x - 0.6, 0, 6.4, { yaw: 180, shirt: '#f1f5f9', seed: i });
      worker(g, x + 0.7, 0, 3.7, { shirt: color, seed: i + 5 });
    }
    // spare wings and floors on a rack
    for (let k = 0; k < 4; k++) {
      g.box(9.5, 0.7 + k * 1.05, -10.3, 6.4, 0.1, 1.5, '#64748b');
      g.box(9.5, 0.9 + k * 1.05, -10.3, 5.4, 0.16, 0.85, k % 2 ? color : '#1c1c22');
      for (const dx of [-2.7, 2.7]) g.box(9.5 + dx, 1.05 + k * 1.05, -10.3, 0.1, 0.5, 0.9, '#1c1c22');
    }
    // robot arm laying up carbon
    g.cyl(8.5, 0.45, 2, 1.1, 0.9, '#334155', [0, 0, 0], 32);
    const arm = g.part((m) => {
      m.prism({ pos: [0, 1.2, 0], radius: 0.32, height: 2.4, sides: 20, color: '#f59e0b' });
      m.sphere({ pos: [0, 2.45, 0], radius: 0.42, color: '#e5e7eb' });
    }, 8.5, 0.9, 2, (e, t) => e.setLocalEulerAngles(0, Math.sin(t * 0.7) * 50 - 20, 0));
    const fore = new pc.Entity('forearm');
    fore.setLocalPosition(0, 2.45, 0);
    arm.addChild(fore);
    const rod = g.part((m) => {
      m.box({ pos: [-1.4, 0, 0], scale: [2.8, 0.34, 0.34], color: '#f59e0b' });
      m.sphere({ pos: [-2.85, 0, 0], radius: 0.28, color: '#e5e7eb' });
      m.prism({ pos: [-2.85, -0.45, 0], radius: 0.09, height: 0.7, sides: 12, color: '#64748b' });
    }, 0, 0, 0);
    fore.addChild(rod);
    g.moving.push((t) => fore.setLocalEulerAngles(0, 0, Math.sin(t * 1.6) * 14));
    walker(g, [[-12, 0], [-3, 1], [-3, 2.4], [-12, 1.6]], { shirt: color, seed: 3 });
    walker(g, [[4, 9], [12, 8], [12, -6], [5, -7]], { shirt: '#f1f5f9', seed: 2, offset: 6 });
  },

  bay(g, ctx) {
    const { color, accent } = ctx;
    shell(g, ctx, { title: 'Race bay', floor: '#d5d9de' });
    // two work bays and the car being built up front
    [[-7.5, -4.5, 0], [7.5, -4.5, 1]].forEach(([x, z, seat]) => {
      g.box(x, 0.02, z, 7.4, 0.02, 7.6, '#2b3038');
      stand(g, x, z);
      car(g, ctx, x, 0.5, z, seat ? -20 : 20, 1.15, seat);
      toolCabinet(g, x - 2.4, z - 4.6, '#f8fafc');
      toolCabinet(g, x + 0.4, z - 4.6, color);
      worker(g, x - 2.5, 0, z + 0.4, { yaw: 90, shirt: color, seed: seat + 1 });
      worker(g, x + 2.5, 0, z - 0.8, { yaw: 270, shirt: '#1f2937', seed: seat + 3 });
      worker(g, x + 0.2, 0, z + 4, { yaw: 180, shirt: color, seed: seat + 6 });
    });
    g.box(0, 0.02, 4, 6, 0.02, 7, '#2b3038');
    stand(g, 0, 3.6);
    car(g, ctx, 0, 0.55, 3.6, 0, 1.3);
    g.shine(0, 1.65, 4.1, 0.9, 0.55, 1.5, accent); // cover over the cockpit
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) tyres(g, side * 12.4, -1 + i * 1.7, 2 + (i % 2));
      toolCabinet(g, side * 5.4, 6.5, '#f8fafc', side * -90);
    }
    walker(g, [[-4, -9], [4, -9], [4, 9], [-4, 9]], { shirt: color, seed: 4, offset: 3 });
    walker(g, [[11, 8], [-11, 8], [-11, 10], [11, 10]], { shirt: '#f1f5f9', seed: 5 });
  },

  rig(g, ctx) {
    const { color } = ctx;
    shell(g, ctx, { title: 'Reliability rig', floor: '#42474f' });
    g.box(0, 0.2, -2, 11, 0.2, 7.6, '#111827');
    for (const [x, z] of [[-1.35, -3.9], [1.35, -3.9], [-1.35, -0.4], [1.35, -0.4], [0, -2], [-3.4, -2], [3.4, -2]]) {
      g.cyl(x, 0.55, z, 0.42, 0.7, '#facc15');
      g.part((m) => {
        m.prism({ pos: [0, 0.35, 0], radius: 0.16, height: 0.7, sides: 14, color: '#e5e7eb' });
        m.prism({ pos: [0, 0.72, 0], radius: 0.5, height: 0.12, sides: 28, color: '#cbd5e1' });
      }, x, 0.6, z, (e, t) => e.setLocalPosition(x, 0.6 + Math.sin(t * 16 + x * 2 + z) * 0.07, z));
    }
    const shaken = car(g, ctx, 0, 1.4, -2, 0, 1.3);
    g.moving.push((t) => {
      shaken.setLocalPosition(0, 1.4 + Math.sin(t * 17) * 0.05 + Math.sin(t * 7) * 0.04, -2);
      shaken.setLocalEulerAngles(Math.sin(t * 9) * 0.5, 0, Math.sin(t * 13) * 0.6);
    });
    for (const x of [-7, 7]) for (const z of [-5.5, 2]) g.box(x, 2.8, z, 0.45, 5.4, 0.45, '#ef4444');
    for (const z of [-5.5, 2]) g.box(0, 5.4, z, 14.5, 0.4, 0.4, '#ef4444');
    for (const x of [-7, 7]) g.box(x, 5.4, -1.75, 0.4, 0.4, 7.5, '#ef4444');
    for (let i = 0; i < 3; i++) {
      desk(g, -5 + i * 5, 6.8, i === 2 ? '#f43f5e' : '#a3e635');
      worker(g, -5 + i * 5, 0, 8, { pose: 'sit', yaw: 180, shirt: color, seed: i + 2 });
    }
    for (let i = 0; i < 5; i++) tyres(g, -13 + i * 1.6, -10.4, 4);
    walker(g, [[10, -8], [10, 4], [12, 4], [12, -8]], { shirt: '#f1f5f9', seed: 1 });
    walker(g, [[-9, 4], [9, 4], [9, 5], [-9, 5]], { shirt: color, seed: 6, offset: 5 });
  },

  sim(g, ctx) {
    const { color, accent } = ctx;
    shell(g, ctx, { title: 'Race simulator', floor: '#23252e' });
    const base = [0, -1.5];
    g.cyl(0, 0.25, base[1], 4.4, 0.5, '#2b303a', [0, 0, 0], 48);
    g.lamp(0, 0.52, base[1] + 4.2, 3, 0.04, 0.12, accent);
    // motion platform: six struts under a tilting deck
    const deck = new pc.Entity('deck');
    deck.setLocalPosition(0, 2, base[1]);
    g.root.addChild(deck);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + (i % 2 ? 0.18 : -0.18);
      g.cyl(Math.cos(a) * 2.4, 1.15, base[1] + Math.sin(a) * 2.4, 0.16, 1.9, '#cbd5e1', [(i % 2 ? 22 : -22) * Math.sin(a), 0, (i % 2 ? -22 : 22) * Math.cos(a)], 14);
      g.cyl(Math.cos(a) * 2.6, 0.62, base[1] + Math.sin(a) * 2.6, 0.34, 0.25, '#f59e0b', [0, 0, 0], 16);
    }
    const platform = g.part((m) => m.prism({ pos: [0, 0, 0], radius: 3, height: 0.25, sides: 48, color: '#3b414d' }), 0, 0, 0);
    deck.addChild(platform);
    const tub = car(g, ctx, 0, 0, 0, 180, 1.25);
    deck.addChild(tub);
    tub.setLocalPosition(0, 0.15, 0);
    const driver = person(g, 0, 0, 0, { shirt: color, pose: 'sit', seed: 1, yaw: 180 });
    deck.addChild(driver.root);
    driver.root.setLocalPosition(0, 0.25, 0.2);
    driver.root.setLocalScale(0.85, 0.85, 0.85);

    // wrap-round screen showing the road, redrawn as it drives
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = 192;
    const draw = canvas.getContext('2d');
    const device = g.app.graphicsDevice;
    const texture = new pc.Texture(device, { width: 768, height: 192, mipmaps: false, addressU: pc.ADDRESS_CLAMP_TO_EDGE, addressV: pc.ADDRESS_CLAMP_TO_EDGE });
    const bend = (t) => Math.sin(t * 0.7) * 0.8 + Math.sin(t * 1.7) * 0.3;
    const paintRoad = (t) => {
      const w = 768;
      const h = 192;
      const horizon = 76;
      draw.fillStyle = '#7fb4ea';
      draw.fillRect(0, 0, w, horizon);
      draw.fillStyle = '#35702f';
      draw.fillRect(0, horizon, w, h - horizon);
      for (let y = horizon; y < h; y += 3) {
        const k = (y - horizon) / (h - horizon);
        const mid = w / 2 + bend(t) * (1 - k) ** 2 * 280;
        const half = 6 + k * 250;
        const stripe = Math.floor(2.4 / (k + 0.06) + t * 11) % 2;
        draw.fillStyle = stripe ? '#e11d48' : '#f8fafc';
        draw.fillRect(mid - half * 1.13, y, half * 2.26, 3);
        draw.fillStyle = stripe ? '#3a3d44' : '#34373d';
        draw.fillRect(mid - half, y, half * 2, 3);
        if (stripe) {
          draw.fillStyle = '#f8fafc';
          draw.fillRect(mid - half * 0.015, y, Math.max(1, half * 0.03), 3);
        }
      }
      draw.fillStyle = '#ffffff';
      draw.font = 'bold 20px system-ui, sans-serif';
      draw.fillText(`${Math.round(255 - Math.abs(bend(t)) * 90)} km/h`, 24, 30);
      draw.fillText(`LAP ${1 + (Math.floor(t / 9) % 20)}`, w - 100, 30);
    };
    paintRoad(0);
    texture.setSource(canvas);
    const positions = [];
    const uvs = [];
    const indices = [];
    const segments = 40;
    for (let i = 0; i <= segments; i++) {
      const u = i / segments;
      const a = (u - 0.5) * 3.1;
      const x = Math.sin(a) * 7.2;
      const z = base[1] - Math.cos(a) * 7.2 + 0.6;
      positions.push(x, 0.7, z, x, 5.6, z);
      uvs.push(u, 1, u, 0); // read the right way round from inside the curve
      if (i < segments) {
        const v = i * 2;
        indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
      }
      if (i % 5 === 0) g.box(x * 1.04, 3.1, base[1] - Math.cos(a) * 7.5 + 0.6, 0.18, 5.2, 0.18, '#111827');
    }
    const mesh = new pc.Mesh(device);
    mesh.setPositions(positions);
    mesh.setUvs(0, uvs);
    mesh.setIndices(indices);
    mesh.update();
    const screen = new pc.StandardMaterial();
    screen.useLighting = false;
    screen.diffuse = new pc.Color(0, 0, 0);
    screen.emissive = new pc.Color(1, 1, 1);
    screen.emissiveMap = texture;
    screen.cull = pc.CULLFACE_NONE;
    screen.update();
    const curved = new pc.Entity('sim-screen');
    curved.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, screen)], castShadows: false });
    g.root.addChild(curved);
    let since = 0;
    g.moving.push((t, dt) => {
      deck.setLocalEulerAngles(Math.sin(t * 2.6) * 1.6, bend(t) * -5, bend(t) * 5);
      since += dt;
      if (since < 0.06) return;
      since = 0;
      paintRoad(t);
      texture.setSource(canvas);
    });

    // engineers behind a glass control desk
    g.glass(0, 1.7, 6, 18, 2.4, 0.08);
    g.box(0, 0.5, 6, 18, 0.15, 0.2, accent);
    for (let i = 0; i < 5; i++) {
      desk(g, -7 + i * 3.5, 8, i % 2 ? '#22d3ee' : '#a78bfa');
      worker(g, -7 + i * 3.5, 0, 9.2, { pose: 'sit', yaw: 180, shirt: i % 2 ? color : '#e2e8f0', seed: i });
    }
    walker(g, [[-12, 3], [-8, -7], [-7, 3], [-10, 5]], { shirt: color, seed: 7 });
    walker(g, [[12, 4], [8, -6], [7.4, 2], [10, 5]], { shirt: '#f1f5f9', seed: 3, offset: 4 });
  },

  hub(g, ctx) {
    const { color, accent } = ctx;
    shell(g, ctx, { title: 'Team hub', floor: '#4a4560' });
    for (let i = -4; i <= 4; i++) {
      for (let k = 0; k < 2; k++) {
        g.box(i * 2.5, 1.1 + k * 1.35, -11.6, 2.4, 1.28, 0.12, '#0b1020');
        g.lamp(i * 2.5, 1.1 + k * 1.35, -11.52, 2.2, 1.1, 0.02, ['#1d4ed8', '#0891b2', '#334155', color][(i + k + 12) % 4]);
      }
    }
    g.cyl(0, 1, -2, 3.4, 0.18, '#eef2f7', [0, 0, 0], 48);
    g.cyl(0, 0.5, -2, 0.7, 1, '#64748b');
    g.lamp(0, 1.11, -2, 3.6, 0.02, 2.2, '#22d3ee');
    g.part((m) => {
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        m.box({ pos: [Math.cos(a) * 1.5, 0, Math.sin(a) * 1], scale: [0.18, 0.08, 0.18], color: i % 6 ? '#7dd3fc' : accent });
      }
    }, 0, 1.9, -2, (e, t) => e.setLocalEulerAngles(0, t * 28, 0));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      worker(g, Math.cos(a) * 4.3, 0, -2 + Math.sin(a) * 4.3, { yaw: (Math.atan2(-Math.cos(a), -Math.sin(a)) * 180) / Math.PI, shirt: i % 3 ? color : '#e2e8f0', seed: i });
    }
    // lounge
    for (const x of [-10, 10]) {
      g.box(x, 0.55, 5, 4.6, 0.7, 1.7, accent);
      g.box(x, 1.2, 5.75, 4.6, 0.9, 0.35, accent);
      g.cyl(x, 0.5, 2.8, 1, 0.1, '#e2e8f0', [0, 0, 0], 32);
      worker(g, x - 1, 0.05, 5.2, { pose: 'sit', yaw: 180, shirt: color, seed: x > 0 ? 2 : 4 });
      worker(g, x + 1, 0.05, 5.2, { pose: 'sit', yaw: 180, shirt: '#f1f5f9', seed: x > 0 ? 6 : 8 });
      g.cyl(x * 1.3, 0.5, -8, 0.7, 1, '#d6d3d1');
      g.ball(x * 1.3, 1.9, -8, 1.1, '#2f7d32', [1, 1.3, 1], 18);
    }
    walker(g, [[-7, 8], [7, 8], [8, -8], [-8, -8]], { shirt: color, seed: 9 });
    walker(g, [[7, 7], [-7, 9], [-12, -3], [12, -2]], { shirt: '#f1f5f9', seed: 11, offset: 9 });
  },

  board(g, ctx) {
    const { color, accent } = ctx;
    shell(g, ctx, { title: 'Board room', floor: '#4b3338' });
    g.box(0, 0.03, -2, 20, 0.04, 11, '#5a2b38');
    g.shine(0, 1.12, -2, 13, 0.2, 3.6, '#7c4a2d');
    for (const x of [-6.5, 6.5]) g.cyl(x, 1.12, -2, 1.8, 0.2, '#7c4a2d', [0, 0, 0], 48);
    g.lamp(0, 1.23, -2, 12, 0.02, 0.18, accent);
    for (const x of [-4.8, 0, 4.8]) g.box(x, 0.55, -2, 0.5, 1.1, 2, '#4b2e1f');
    for (let i = 0; i < 6; i++) {
      for (const side of [-1, 1]) {
        const x = -6 + i * 2.4;
        const z = -2 + side * 2.7;
        g.box(x, 0.62, z, 1.1, 0.14, 1, '#111827');
        g.box(x, 1.4, z + side * 0.48, 1.1, 1.5, 0.14, '#111827');
        g.cyl(x, 0.3, z, 0.08, 0.6, '#9ca3af', [0, 0, 0], 10);
        if ((i + side + 2) % 4) worker(g, x, 0.1, z, { pose: 'sit', yaw: side > 0 ? 180 : 0, shirt: i % 2 ? '#475569' : color, seed: i + side + 3 });
        g.box(x, 1.25, -2 + side * 1.1, 0.55, 0.03, 0.4, '#1f2937');
      }
    }
    g.box(0, 2.4, -11.6, 9.6, 3.4, 0.12, '#0b1020');
    for (let i = 0; i < 9; i++) {
      g.part((m) => m.box({ pos: [0, 0.5, 0], scale: [0.7, 1, 0.04], color: i % 2 ? '#34d399' : '#22d3ee' }), -3.8 + i * 0.95, 0.9, -11.5,
        (e, t) => e.setLocalScale(1, 0.5 + i * 0.22 + Math.sin(t * 1.2 + i) * 0.2, 1));
    }
    person(g, 5.8, 0, -10, { shirt: '#f1f5f9', seed: 5, yaw: 20 });
    for (const x of [-12.5, 12.5]) {
      g.cyl(x, 0.5, -8, 0.65, 1, '#d6d3d1');
      g.ball(x, 2, -8, 1.1, '#2f7d32', [1, 1.4, 1], 18);
    }
    walker(g, [[-11, 6], [11, 6], [11, 8], [-11, 8]], { shirt: '#e2e8f0', seed: 2 });
  },
};

// ---- what an upgrade looks like -----------------------------------------

/** Equipment every hall gains, plus what is particular to it. */
function upgrades(g, id, ctx) {
  const { color, accent } = ctx;
  const level = ctx.levels?.[id] || 1;
  // level plate on the side glass, one lit bar per level
  g.box(-14.7, 3.4, 6, 0.1, 1.7, 3.4, '#111827');
  g.sign(`Level ${level}`, -14.62, 3.8, 6, 2.8, 0.6, '#ffffff', 90);
  for (let i = 0; i < 3; i++) g[i < level ? 'lamp' : 'box'](-14.62, 2.95, 5.1 + i * 0.9, 0.05, 0.28, 0.7, i < level ? '#f6b25e' : '#374151');

  if (level >= 2) {
    for (const side of [-1, 1]) {
      g.lamp(side * 14.4, 0.1, 1, 0.2, 0.05, D - 2, accent); // floor light strips
      // server and tool towers, except where a rack already fills that corner
      if (side > 0 && (id === 'power' || id === 'factory')) continue;
      g.box(side * 11.5, 2.1, -10.9, 1.6, 4, 1, '#1f2937');
      for (let k = 0; k < 8; k++) g.lamp(side * 11.5, 0.5 + k * 0.45, -10.37, 1.2, 0.08, 0.04, k % 2 ? '#22d3ee' : '#a3e635');
    }
    desk(g, 11.8, 9.4, '#f6b25e');
    worker(g, 11.8, 0, 10.6, { pose: 'sit', yaw: 180, shirt: color, seed: 12 });
    walker(g, [[-13, 10.6], [13, 10.6], [13, 11.2], [-13, 11.2]], { shirt: color, seed: 13, offset: 7 });
  }
  if (level >= 3) {
    // gold trim, hanging banners and a hologram of the part being studied
    g.lamp(0, 4.36, -11.72, W, 0.08, 0.06, '#fbbf24');
    for (const x of [-12, 12]) {
      g.box(x, 7.2, 1, 2.2, 3.4, 0.08, color);
      g.box(x, 5.4, 1, 2.2, 0.22, 0.12, '#fbbf24');
    }
    g.cyl(-11.8, 0.4, 9, 1.5, 0.8, '#1f2937', [0, 0, 0], 40);
    g.lamp(-11.8, 0.82, 9, 1.9, 0.03, 1.9, '#38bdf8');
    g.part((m) => {
      m.box({ pos: [0, 0, 0], scale: [2.4, 0.1, 0.7], color: '#7dd3fc' });
      m.box({ pos: [0, 0.35, -0.2], scale: [2, 0.08, 0.35], color: '#bae6fd', rot: [14, 0, 0] });
      for (const x of [-1.2, 1.2]) m.box({ pos: [x, 0.15, 0], scale: [0.08, 0.7, 0.8], color: '#38bdf8' });
    }, -11.8, 2, 9, (e, t) => e.setLocalEulerAngles(0, t * 40, 0), glowMaterial());
    worker(g, -10, 0, 9.4, { yaw: 270, shirt: '#f1f5f9', seed: 14 });
  }
  // extra machinery belonging to this hall
  for (let n = 2; n <= level; n++) {
    const x = n === 2 ? -4.5 : 4.5;
    if (id === 'wind' || id === 'sim' || id === 'hub') {
      g.box(x * 2.4, 1.9, 2.6, 2.8, 1.7, 0.1, '#0b1020');
      g.lamp(x * 2.4, 1.9, 2.66, 2.6, 1.5, 0.02, n === 2 ? '#0891b2' : '#7c3aed');
      g.box(x * 2.4, 0.5, 2.6, 0.2, 1.1, 0.2, '#64748b');
    } else if (id === 'power' || id === 'rig') {
      g.box(x * 2.5, 0.5, -7.6, 3, 1, 2, '#3f4652');
      g.cyl(x * 2.5, 1.5, -7.6, 0.8, 2.2, '#aeb4bd', [0, 0, 90]);
      g.cyl(x * 2.5, 1.5, -7.6, 0.5, 2.4, accent, [0, 0, 90]);
    } else if (id === 'factory' || id === 'bay') {
      g.box(x * 2.5, 1, -7.4, 3.2, 2, 2.4, '#e2e8f0');
      g.glass(x * 2.5, 1.5, -6.16, 2.6, 0.9, 0.05);
      g.lamp(x * 2.5, 2.1, -6.14, 2.4, 0.12, 0.04, '#22d3ee');
    } else {
      g.box(x * 2.5, 0.6, -9.8, 2.6, 1.2, 0.9, '#7c4a2d');
      for (let i = 0; i < 4; i++) g.cyl(x * 2.5 - 0.9 + i * 0.6, 1.55, -9.8, 0.18, 0.7, '#fbbf24', [0, 0, 0], 14);
    }
  }
  // builders at work
  if (ctx.sites?.includes(id)) {
    for (const x of [9, 11.5, 14]) for (const z of [-9.2, -7.0]) g.box(x, 2.2, z, 0.12, 4.4, 0.12, '#f59e0b');
    for (const y of [1.5, 3, 4.3]) {
      for (const z of [-9.2, -7.0]) g.box(11.5, y, z, 5.2, 0.1, 0.1, '#f59e0b');
      g.box(11.5, y + 0.08, -8.1, 5, 0.08, 2.2, '#b45309');
    }
    for (let i = 0; i < 6; i++) {
      g.cyl(8.4 + i * 1.1, 0.45, -5.8, 0.18, 0.9, i % 2 ? '#f97316' : '#f8fafc', [0, 0, 0], 12);
    }
    g.sign('Upgrading', 11.5, 3.8, -6.9, 4, 0.75, '#b45309');
    worker(g, 9, 0, -5.4, { yaw: 180, shirt: '#f97316', seed: 15 });
    worker(g, 12, 3.1, -8, { shirt: '#f97316', seed: 16 });
  }
}

export function buildRoom(g, id, ctx) {
  BUILDERS[id](g, ctx);
  upgrades(g, id, ctx);
  return g.finish();
}

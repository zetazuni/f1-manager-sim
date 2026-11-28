// The team headquarters as an open-roofed model: six rooms, each with its own
// camera shots. Static things are merged into two meshes; only the moving
// parts (fan, smoke, robot arm, dyno glow) are separate entities.

import { MeshBuilder, vertexColorMaterial, glowMaterial, meshToEntity, useMaterials } from './meshBuilder';
import { buildCar, clearCarMeshCache } from './scene';

const W = 26; // room width (x)
const D = 20; // room depth (z)
const GAP = 3;

/** id, name, car areas worked on there, grid cell [column, row]. */
export const ROOMS = [
  { id: 'wind', label: 'Wind tunnel', areas: ['aeroHighSpeed', 'aeroLowSpeed'], cell: [0, 0] },
  { id: 'power', label: 'Powertrain lab', areas: ['powerUnit', 'ersEfficiency'], cell: [1, 0] },
  { id: 'factory', label: 'Composites floor', areas: ['chassisWeight'], cell: [2, 0] },
  { id: 'rig', label: 'Reliability rig', areas: ['reliability'], cell: [0, 1] },
  { id: 'hub', label: 'Team hub', areas: [], cell: [1, 1] },
  { id: 'board', label: 'Board room', areas: [], cell: [2, 1] },
];

export const roomOfArea = (area) => ROOMS.find((r) => r.areas.includes(area))?.id || 'hub';

const centre = (room) => [(room.cell[0] - 1) * (W + GAP), (room.cell[1] - 0.5) * (D + GAP)];

// camera shots, relative to the room centre: [position, look at, fov]
const SHOTS = {
  wind: [[[11, 7, 12], [-1, 1.6, -1], 46], [[-10, 3, 7], [1, 1.2, -1], 52], [[8, 2.2, 3], [-6, 2, -2], 55]],
  power: [[[10, 8, 11], [0, 1.4, -1], 44], [[-6, 3.2, 5], [0, 1.4, -2], 48], [[4, 2.4, 6], [-2, 1.6, -3], 50]],
  factory: [[[-11, 9, 11], [1, 1, -1], 46], [[9, 3.4, 6], [-2, 1, -1], 50], [[0, 12, 8], [0, 0, -1], 48]],
  rig: [[[10, 7, 11], [0, 1.2, -1], 44], [[-8, 2.6, 6], [0, 1, -1], 50], [[0, 3, 9], [0, 1, -2], 52]],
  hub: [[[9, 8, 11], [-1, 1, -2], 46], [[-9, 4, 8], [2, 1.5, -4], 50], [[0, 5, 10], [0, 2, -6], 46]],
  board: [[[0, 8, 12], [0, 1.4, -2], 44], [[-9, 4, 6], [2, 1.4, -2], 48], [[7, 3, 5], [-3, 1.8, -6], 50]],
};

export function shot(roomId, index = 0) {
  if (roomId === 'campus') return { pos: [index % 2 ? -24 : 24, 40, 46], at: [0, 0, 2], fov: 44 };
  const room = ROOMS.find((r) => r.id === roomId) || ROOMS[4];
  const [cx, cz] = centre(room);
  const [pos, at, fov] = SHOTS[room.id][index % SHOTS[room.id].length];
  return { pos: [cx + pos[0], pos[1], cz + pos[2]], at: [cx + at[0], at[1], cz + at[2]], fov };
}

export function buildHQ(app, { color = '#1e3a8a', accent = '#e10600' } = {}) {
  useMaterials(app.graphicsDevice);
  const mb = new MeshBuilder();
  const glow = new MeshBuilder();
  const moving = [];
  const box = (x, y, z, sx, sy, sz, c, rot) => mb.box({ pos: [x, y, z], scale: [sx, sy, sz], color: c, rot });
  const lamp = (x, y, z, sx, sy, sz, c) => glow.box({ pos: [x, y, z], scale: [sx, sy, sz], color: c });
  const cyl = (x, y, z, radius, height, c, rot, sides = 16) => mb.prism({ pos: [x, y, z], radius, height, sides, color: c, rot });

  const person = (x, z, shirt, seated = false) => {
    const lift = seated ? -0.35 : 0;
    box(x, 0.55 + lift / 2, z, 0.36, 1.1 + lift, 0.26, '#1f2937');
    box(x, 1.45 + lift, z, 0.56, 0.75, 0.34, shirt);
    cyl(x, 2.05 + lift, z, 0.2, 0.36, '#e7c6a5', [0, 0, 0], 10);
  };
  const desk = (x, z, screen = '#38bdf8') => {
    box(x, 0.95, z, 2.4, 0.1, 1.1, '#cbd5e1');
    for (const dx of [-1.1, 1.1]) box(x + dx, 0.47, z, 0.1, 0.94, 1, '#64748b');
    box(x, 1.55, z - 0.3, 1.3, 0.8, 0.08, '#0f172a');
    lamp(x, 1.55, z - 0.25, 1.15, 0.65, 0.02, screen);
    box(x, 1.05, z - 0.3, 0.1, 0.3, 0.1, '#334155');
  };
  const car = (x, y, z, yaw, scale = 1) => {
    clearCarMeshCache();
    const e = buildCar(app, color, accent);
    e.setPosition(x, y, z);
    e.setEulerAngles(0, yaw, 0);
    e.setLocalScale(scale, scale, scale);
    return e;
  };
  const spinner = (build, x, y, z, update) => {
    const part = new MeshBuilder();
    build(part);
    const e = meshToEntity(part.build(app.graphicsDevice), vertexColorMaterial(false), { name: 'moving-part' });
    e.setPosition(x, y, z);
    app.root.addChild(e);
    moving.push((t) => update(e, t));
    return e;
  };

  // ground, paths and the team strip round the campus
  box(0, -0.6, 0, 140, 1, 100, '#1b1730');
  box(0, -0.05, 0, 90, 0.06, 2, '#2c2646');

  const floors = { wind: '#2b3040', power: '#33303a', factory: '#3a3f47', rig: '#2f3339', hub: '#3b3550', board: '#3c2f2c' };
  ROOMS.forEach((room) => {
    const [cx, cz] = centre(room);
    box(cx, 0, cz, W, 0.2, D, floors[room.id]);
    // back and side walls with a team-colour band; the front stays open
    box(cx, 3, cz - D / 2, W, 6, 0.4, '#d7d3e0');
    for (const side of [-1, 1]) box(cx + (side * W) / 2, 1.6, cz, 0.4, 3.2, D, '#bfb9cc');
    box(cx, 5.2, cz - D / 2 + 0.23, W, 0.5, 0.08, color);
    box(cx, 4.55, cz - D / 2 + 0.23, W, 0.18, 0.08, accent);
    for (let i = -2; i <= 2; i++) lamp(cx + i * 5, 5.75, cz - D / 2 + 0.4, 3, 0.12, 0.3, '#fff4dc');
    for (let i = -2; i <= 2; i++) box(cx + i * 5, 0.12, cz, 0.04, 0.02, D, '#4a4660');
  });

  // --- wind tunnel: test section, fan, model car on the belt, smoke -------
  {
    const [x, z] = centre(ROOMS[0]);
    box(x, 0.35, z - 1, 16, 0.5, 6, '#111827'); // rolling road
    for (let i = -7; i <= 7; i += 1) box(x + i, 0.62, z - 1, 0.08, 0.02, 5.6, '#374151');
    car(x + 0.5, 0.65, z - 1, 90, 1.25);
    // nozzle rings at both ends of the test section
    for (const dx of [-8.5, 8.5]) {
      box(x + dx, 5, z - 1, 1.2, 0.5, 7, '#94a3b8');
      for (const dz of [-3.4, 3.4]) box(x + dx, 2.6, z - 1 + dz, 1.2, 4.6, 0.5, '#94a3b8');
    }
    cyl(x - 11, 3, z - 1, 3.1, 0.8, '#475569', [0, 0, 90], 24);
    spinner((m) => {
      for (let i = 0; i < 8; i++) m.box({ pos: [0, Math.cos((i * Math.PI) / 4) * 1.4, Math.sin((i * Math.PI) / 4) * 1.4], scale: [0.2, 2.4, 0.55], rot: [i * 45, 18, 0], color: '#cbd5e1' });
      m.prism({ pos: [0, 0, 0], radius: 0.55, height: 0.6, sides: 14, color: accent, rot: [0, 0, 90] });
    }, x - 10.4, 3, z - 1, (e, t) => e.setEulerAngles(t * 420, 0, 0));
    // smoke streamlines flowing over the car
    for (let line = 0; line < 9; line++) {
      const dz = -1.2 + (line % 3) * 1.2;
      const base = 1.1 + Math.floor(line / 3) * 0.55;
      for (let k = 0; k < 5; k++) {
        const e = spinner((m) => m.box({ pos: [0, 0, 0], scale: [1.3, 0.04, 0.04], color: '#e0f2fe' }), 0, 0, 0, () => {});
        moving.pop();
        moving.push((t) => {
          const u = ((t * 6 + k * 3.2 + line * 0.7) % 16) - 8;
          const over = Math.max(0, 1 - Math.abs(u - 0.5) / 3.2);
          e.setPosition(x - u, base + over * Math.max(0, 1.5 - base * 0.6), z - 1 + dz);
        });
      }
    }
    desk(x + 6, z + 6);
    desk(x + 2.8, z + 6, '#a3e635');
    person(x + 6, z + 7.1, color, true);
    person(x + 3, z + 7.2, color, true);
    person(x - 3, z + 4, '#e2e8f0');
  }

  // --- powertrain lab: engine on a dyno, battery cells, control room -------
  {
    const [x, z] = centre(ROOMS[1]);
    box(x, 0.5, z - 2, 7, 0.8, 3.6, '#4b5563');
    // V6 block with exhaust headers
    box(x, 1.45, z - 2, 2.6, 0.9, 1.5, '#9ca3af');
    for (const side of [-1, 1]) {
      box(x, 2.1, z - 2 + side * 0.5, 2.5, 0.6, 0.55, '#6b7280', [side * 28, 0, 0]);
      box(x, 2.5, z - 2 + side * 0.68, 2.4, 0.18, 0.55, accent, [side * 28, 0, 0]);
      for (let i = -1; i <= 1; i++) cyl(x + i * 0.75, 1.8, z - 2 + side * 1.15, 0.16, 1.1, '#d97706', [side * 55, 0, 0], 10);
    }
    cyl(x + 1.9, 1.7, z - 2, 0.7, 0.9, '#cbd5e1', [0, 0, 90]); // turbo
    cyl(x - 3, 1.5, z - 2, 1.1, 1.4, '#334155', [0, 0, 90]); // dyno brake
    cyl(x - 1.9, 1.5, z - 2, 0.2, 1.4, '#e5e7eb', [0, 0, 90]);
    spinner((m) => {
      m.prism({ pos: [0, 0, 0], radius: 0.75, height: 0.18, sides: 18, color: '#94a3b8', rot: [0, 0, 90] });
      m.box({ pos: [0.1, 0, 0], scale: [0.05, 1.4, 0.16], color: accent });
    }, x + 2.55, 1.7, z - 2, (e, t) => e.setEulerAngles(t * 600, 0, 0));
    const heat = spinner((m) => m.box({ pos: [0, 0, 0], scale: [2.2, 0.08, 1], color: '#ff7a18' }), x, 1.02, z - 2, () => {});
    moving.pop();
    heat.render.meshInstances[0].material = glowMaterial();
    moving.push((t) => heat.setLocalScale(1, 0.6 + 0.6 * Math.abs(Math.sin(t * 3)), 1));
    // battery and ERS racks
    for (let i = 0; i < 4; i++) {
      box(x + 6 + i * 1.5, 1.6, z - 8, 1.2, 3, 1, '#1f2937');
      for (let k = 0; k < 5; k++) lamp(x + 6 + i * 1.5, 0.7 + k * 0.5, z - 7.45, 0.8, 0.12, 0.04, k % 2 ? '#22d3ee' : '#a3e635');
    }
    for (let i = 0; i < 3; i++) desk(x - 7 + i * 3, z + 6, i === 1 ? '#f59e0b' : '#38bdf8');
    person(x - 7, z + 7.1, color, true);
    person(x - 4, z + 7.1, color, true);
    person(x + 5, z + 1, '#e2e8f0');
    for (const dx of [-5, 5]) box(x + dx, 2.6, z - 2, 0.2, 5.2, 0.2, '#facc15');
    box(x, 5.2, z - 2, 10.2, 0.25, 0.25, '#facc15');
  }

  // --- composites floor: monocoque, autoclave, robot arm, layup tables ----
  {
    const [x, z] = centre(ROOMS[2]);
    cyl(x - 7, 2.4, z - 6, 2.3, 5.5, '#cbd5e1', [0, 0, 90], 24); // autoclave
    cyl(x - 4.1, 2.4, z - 6, 2.4, 0.3, '#475569', [0, 0, 90], 24);
    lamp(x - 3.9, 2.4, z - 6, 0.04, 0.8, 0.8, '#fbbf24');
    car(x + 2, 1.2, z - 1.5, 120, 1.15);
    for (const dx of [0.6, 3.4]) box(x + dx, 0.6, z - 1.5, 0.3, 1.2, 1.6, '#64748b');
    for (let i = 0; i < 3; i++) {
      box(x - 8 + i * 3.6, 0.95, z + 4, 2.8, 0.14, 1.8, '#94a3b8');
      box(x - 8 + i * 3.6, 1.06, z + 4, 2.2, 0.04, 1.2, '#1c1c22');
      for (const dx of [-1.2, 1.2]) box(x - 8 + i * 3.6 + dx, 0.47, z + 4, 0.14, 0.94, 1.5, '#475569');
      person(x - 8 + i * 3.6, z + 5.4, i % 2 ? '#e2e8f0' : color);
    }
    // spare floors and wings on a rack
    for (let k = 0; k < 4; k++) {
      box(x + 9, 0.7 + k * 1.1, z - 7, 5, 0.1, 1.4, '#64748b');
      box(x + 9, 0.9 + k * 1.1, z - 7, 4.2, 0.16, 0.8, k % 2 ? color : '#1c1c22');
    }
    cyl(x + 8, 0.5, z + 2, 0.9, 1, '#f59e0b', [0, 0, 0]);
    const arm = spinner((m) => {
      m.box({ pos: [0, 1.4, 0], scale: [0.45, 2.8, 0.45], color: '#f59e0b' });
      m.box({ pos: [-1.2, 2.8, 0], scale: [2.8, 0.38, 0.38], color: '#f59e0b' });
      m.box({ pos: [-2.5, 2.3, 0], scale: [0.2, 1, 0.2], color: '#e5e7eb' });
    }, x + 8, 1, z + 2, () => {});
    moving.pop();
    moving.push((t) => arm.setEulerAngles(0, Math.sin(t * 0.8) * 55 - 15, 0));
  }

  // --- reliability rig: car on a seven-post shaker ------------------------
  {
    const [x, z] = centre(ROOMS[3]);
    box(x, 0.2, z - 1, 10, 0.2, 7, '#111827');
    for (const [dx, dz] of [[-2.4, -1.2], [2.4, -1.2], [-2.4, 1.2], [2.4, 1.2]]) {
      cyl(x + dx, 0.75, z - 1 + dz, 0.45, 1.1, '#facc15', [0, 0, 0]);
      cyl(x + dx, 1.35, z - 1 + dz, 0.6, 0.16, '#e5e7eb', [0, 0, 0]);
    }
    const shaken = car(x, 1.45, z - 1, 90, 1.2);
    moving.push((t) => shaken.setPosition(x, 1.45 + Math.sin(t * 17) * 0.05 + Math.sin(t * 7) * 0.04, z - 1));
    for (const dx of [-6.5, 6.5]) {
      box(x + dx, 2.5, z - 4, 0.4, 5, 0.4, '#ef4444');
      box(x + dx, 2.5, z + 2, 0.4, 5, 0.4, '#ef4444');
    }
    box(x, 5, z - 4, 13.4, 0.35, 0.35, '#ef4444');
    box(x, 5, z + 2, 13.4, 0.35, 0.35, '#ef4444');
    for (let i = 0; i < 3; i++) desk(x - 3 + i * 3.2, z + 7, i === 2 ? '#f43f5e' : '#a3e635');
    person(x - 3, z + 8.1, color, true);
    person(x + 3.4, z + 8.1, color, true);
    // tyre stacks
    for (let i = 0; i < 4; i++) for (let k = 0; k < 4; k++) cyl(x - 10 + i * 1.5, 0.4 + k * 0.52, z - 8, 0.65, 0.46, '#17181c', [0, 0, 0]);
  }

  // --- team hub: driver simulator, video wall, lounge ----------------------
  {
    const [x, z] = centre(ROOMS[4]);
    // video wall
    for (let i = -3; i <= 3; i++) {
      for (let k = 0; k < 3; k++) {
        box(x + i * 2.2, 1.6 + k * 1.25, z - 9.6, 2.1, 1.15, 0.1, '#0b1020');
        lamp(x + i * 2.2, 1.6 + k * 1.25, z - 9.52, 1.9, 0.98, 0.02, ['#1d4ed8', '#0891b2', '#334155', color][(i + k + 8) % 4]);
      }
    }
    // simulator: cockpit on a motion base with a curved screen
    cyl(x - 6, 0.5, z - 3, 2, 0.8, '#1f2937', [0, 0, 0]);
    car(x - 6, 1, z - 3, 180, 0.9);
    for (let i = -4; i <= 4; i++) {
      const a = (i / 4) * 1.1;
      box(x - 6 + Math.sin(a) * 4.2, 2.4, z - 3 - Math.cos(a) * 4.2, 1.25, 2.4, 0.12, '#111827', [0, (-a * 180) / Math.PI, 0]);
      lamp(x - 6 + Math.sin(a) * 4.1, 2.4, z - 3 - Math.cos(a) * 4.1, 1.15, 2.1, 0.02, i % 2 ? '#2563eb' : '#38bdf8');
    }
    // pit wall style strategy table with the team
    cyl(x + 5, 1, z, 2.4, 0.16, '#e2e8f0', [0, 0, 0], 24);
    cyl(x + 5, 0.5, z, 0.4, 1, '#64748b', [0, 0, 0]);
    lamp(x + 5, 1.1, z, 2.2, 0.02, 1.4, '#22d3ee');
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      person(x + 5 + Math.cos(a) * 3.2, z + Math.sin(a) * 3.2, i % 3 ? color : '#e2e8f0');
    }
    // lounge and trophies
    box(x - 4, 0.6, z + 7, 5, 0.8, 1.4, accent);
    box(x - 4, 1.3, z + 7.6, 5, 1, 0.3, accent);
    for (let i = 0; i < 4; i++) {
      box(x + 4 + i * 1.4, 0.7, z + 8, 0.8, 1.4, 0.8, '#334155');
      cyl(x + 4 + i * 1.4, 1.75, z + 8, 0.28, 0.6, '#fbbf24', [0, 0, 0], 10);
      cyl(x + 4 + i * 1.4, 2.15, z + 8, 0.4, 0.16, '#fde68a', [0, 0, 0], 10);
    }
  }

  // --- board room: long table, chairs, figures on the screen ---------------
  {
    const [x, z] = centre(ROOMS[5]);
    box(x, 0.1, z - 1, 20, 0.04, 12, '#4a2f3a');
    box(x, 1.1, z - 1, 12, 0.18, 3.6, '#7c4a2d');
    box(x, 1.21, z - 1, 11, 0.02, 0.3, accent);
    for (const dx of [-4.5, 0, 4.5]) box(x + dx, 0.55, z - 1, 0.5, 1.1, 1.8, '#4b2e1f');
    for (let i = 0; i < 5; i++) {
      for (const side of [-1, 1]) {
        const sx = x - 4.6 + i * 2.3;
        const sz = z - 1 + side * 2.6;
        box(sx, 0.75, sz, 1.1, 0.14, 1, '#111827');
        box(sx, 1.45, sz + side * 0.45, 1.1, 1.4, 0.14, '#111827');
        if ((i + side + 2) % 3) person(sx, sz, i % 2 ? '#475569' : color, true);
      }
    }
    box(x, 3.3, z - 9.65, 9, 3.4, 0.1, '#0b1020');
    [0.9, 1.4, 1.2, 1.9, 2.3, 2.1, 2.7].forEach((h, i) => lamp(x - 3.3 + i * 1.1, 1.85 + h / 2, z - 9.55, 0.7, h, 0.02, i % 2 ? '#34d399' : '#22d3ee'));
    for (const dx of [-11, 11]) {
      cyl(x + dx, 0.5, z - 7.5, 0.5, 1, '#d6d3d1', [0, 0, 0], 10);
      mb.frustum({ pos: [x + dx, 1, z - 7.5], rBottom: 1, height: 2.2, sides: 8, color: '#2f7d32' });
    }
  }

  app.root.addChild(meshToEntity(mb.build(app.graphicsDevice), vertexColorMaterial(false), { name: 'hq' }));
  app.root.addChild(meshToEntity(glow.build(app.graphicsDevice), glowMaterial(), { name: 'hq-glow', castShadows: false, receiveShadows: false }));

  let time = 0;
  return {
    /** Advance the moving parts. */
    update(dt) {
      time += dt;
      moving.forEach((fn) => fn(time));
    },
    dropCarCache: () => clearCarMeshCache(),
  };
}

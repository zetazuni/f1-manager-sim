import * as pc from 'playcanvas';

export const TRACK_WIDTH = 7;

const hex = (h) => {
  const c = new pc.Color();
  c.fromString(h);
  return c;
};

const matCache = new Map();
/** Shared, cached material per colour (one material per colour, not per box). */
export function material(color, { emissive = null, gloss = 0.35, metalness = 0, twoSided = false } = {}) {
  const key = `${color}|${emissive}|${gloss}|${metalness}|${twoSided}`;
  if (matCache.has(key)) return matCache.get(key);
  const m = new pc.StandardMaterial();
  m.diffuse = hex(color);
  if (emissive) m.emissive = hex(emissive);
  m.gloss = gloss;
  m.metalness = metalness;
  m.useMetalness = true;
  if (twoSided) m.cull = pc.CULLFACE_NONE;
  m.update();
  matCache.set(key, m);
  return m;
}
export const clearMaterialCache = () => {
  matCache.forEach((m) => m.destroy());
  matCache.clear();
};

export function box(parent, { pos, scale, color, rot = [0, 0, 0], shadows = true, mat = null }) {
  const e = new pc.Entity();
  e.addComponent('render', { type: 'box', castShadows: shadows, receiveShadows: true });
  e.render.material = mat || material(color);
  e.setLocalPosition(...pos);
  e.setLocalEulerAngles(...rot);
  e.setLocalScale(...scale);
  parent.addChild(e);
  return e;
}

function cylinder(parent, { pos, scale, color, rot = [0, 0, 0] }) {
  const e = new pc.Entity();
  e.addComponent('render', { type: 'cylinder', castShadows: true, receiveShadows: true });
  e.render.material = material(color, { gloss: 0.15 });
  e.setLocalPosition(...pos);
  e.setLocalEulerAngles(...rot);
  e.setLocalScale(...scale);
  parent.addChild(e);
  return e;
}

/**
 * Ribbon mesh following the path, between two lateral offsets.
 * `filter(i)` decides which segments are emitted (used for dashed kerbs).
 */
function ribbon(device, path, inner, outer, y, filter = () => true) {
  const { points } = path;
  const n = points.length;
  const positions = [];
  const normals = [];
  const indices = [];
  let v = 0;
  for (let i = 0; i < n; i++) {
    if (!filter(i)) continue;
    const a = points[i];
    const b = points[(i + 1) % n];
    const quad = [
      [a.x + a.nx * inner, a.z + a.nz * inner],
      [a.x + a.nx * outer, a.z + a.nz * outer],
      [b.x + b.nx * inner, b.z + b.nz * inner],
      [b.x + b.nx * outer, b.z + b.nz * outer],
    ];
    quad.forEach(([x, z]) => {
      positions.push(x, y, z);
      normals.push(0, 1, 0);
    });
    indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
    v += 4;
  }
  const mesh = new pc.Mesh(device);
  mesh.setPositions(positions);
  mesh.setNormals(normals);
  mesh.setIndices(indices);
  mesh.update();
  return mesh;
}

function meshEntity(parent, mesh, mat, name) {
  const e = new pc.Entity(name);
  const mi = new pc.MeshInstance(mesh, mat);
  e.addComponent('render', { meshInstances: [mi], castShadows: false, receiveShadows: true });
  parent.addChild(e);
  return e;
}

export function buildCircuit(app, path) {
  const device = app.graphicsDevice;
  const root = new pc.Entity('circuit');
  app.root.addChild(root);
  const half = TRACK_WIDTH / 2;

  // Grass and run-off
  box(root, { pos: [0, -0.5, 0], scale: [420, 1, 420], color: '#1d4d2b', shadows: false });
  // Ribbon materials are two-sided so the triangle winding never hides a strip
  meshEntity(root, ribbon(device, path, -half - 3, half + 3, 0.01), material('#6b6b5e', { gloss: 0.1, twoSided: true }), 'runoff');

  // Asphalt and white edge lines
  meshEntity(root, ribbon(device, path, -half, half, 0.03), material('#2b2f36', { gloss: 0.25, twoSided: true }), 'asphalt');
  const line = material('#e8e8e8', { gloss: 0.2, twoSided: true });
  meshEntity(root, ribbon(device, path, half - 0.25, half - 0.05, 0.05), line, 'edge-l');
  meshEntity(root, ribbon(device, path, -half + 0.05, -half + 0.25, 0.05), line, 'edge-r');

  // Kerbs: only where the track bends, on the outside AND inside of the corner,
  // alternating red/white every two samples
  const corner = (i) => Math.abs(path.points[i].curvature) > 0.02;
  const red = (i) => corner(i) && Math.floor(i / 2) % 2 === 0;
  const white = (i) => corner(i) && Math.floor(i / 2) % 2 === 1;
  for (const side of [1, -1]) {
    const a = side * half;
    const b = side * (half + 1.1);
    const [lo, hi] = side > 0 ? [a, b] : [b, a];
    meshEntity(root, ribbon(device, path, lo, hi, 0.06, red), material('#d81e1e', { twoSided: true }), 'kerb-red');
    meshEntity(root, ribbon(device, path, lo, hi, 0.06, white), material('#f2f2f2', { twoSided: true }), 'kerb-white');
  }

  // Start / finish chequered line at fraction 0
  const p0 = path.pointAt(0);
  const finish = new pc.Entity('finish');
  finish.setLocalPosition(p0.x, 0.07, p0.z);
  finish.setLocalEulerAngles(0, p0.heading, 0);
  root.addChild(finish);
  const squares = 10;
  for (let i = 0; i < squares; i++) {
    for (let r = 0; r < 2; r++) {
      box(finish, {
        pos: [-half + (i + 0.5) * (TRACK_WIDTH / squares), 0, r * 0.7 - 0.35],
        scale: [TRACK_WIDTH / squares, 0.02, 0.7],
        color: (i + r) % 2 ? '#111111' : '#ffffff',
        shadows: false,
      });
    }
  }
  // Gantry over the line
  box(finish, { pos: [-half - 1.5, 2.5, 0], scale: [0.5, 5, 0.5], color: '#9aa4b2' });
  box(finish, { pos: [half + 1.5, 2.5, 0], scale: [0.5, 5, 0.5], color: '#9aa4b2' });
  box(finish, { pos: [0, 5, 0], scale: [TRACK_WIDTH + 3.5, 0.8, 0.6], color: '#e10600' });

  // Paddock / pit building along the main straight (outside), grandstand opposite
  box(root, { pos: [0, 2.5, -33], scale: [54, 5, 8], color: '#c7ccd4' });
  box(root, { pos: [0, 5.2, -33], scale: [56, 0.4, 9], color: '#e10600' });
  for (let i = 0; i < 9; i++) {
    box(root, { pos: [-24 + i * 6, 1.5, -28.9], scale: [4.5, 3, 0.2], color: '#1f2937', shadows: false });
  }
  // Stepped grandstand inside the infield, facing the straight
  for (let step = 0; step < 5; step++) {
    box(root, {
      pos: [0, 0.6 + step * 0.9, -9 + step * 1.3],
      scale: [44, 1.2, 1.4],
      color: step % 2 ? '#3b5bdb' : '#4c6ef5',
    });
  }
  box(root, { pos: [0, 6.2, -5.5], scale: [46, 0.3, 6], color: '#e5e7eb' });

  // A few trees around the outside for scale
  const rng = mulberry32(7);
  for (let i = 0; i < 60; i++) {
    const x = rng() * 170 - 85;
    const z = rng() * 130 - 65;
    if (nearTrack(path, x, z, half + 8)) continue;
    if (Math.abs(z + 33) < 8 && Math.abs(x) < 32) continue;
    if (z > -14 && z < 0 && Math.abs(x) < 26) continue;
    const s = 1 + rng() * 1.2;
    cylinder(root, { pos: [x, s, z], scale: [0.5, s * 2, 0.5], color: '#5b3a1e' });
    box(root, { pos: [x, s * 2 + 0.8, z], scale: [2.6 * s, 2.2 * s, 2.6 * s], color: '#2f7d32', rot: [0, rng() * 90, 0] });
  }
  return root;
}

function nearTrack(path, x, z, dist) {
  const d2 = dist * dist;
  for (const p of path.points) {
    const dx = p.x - x;
    const dz = p.z - z;
    if (dx * dx + dz * dz < d2) return true;
  }
  return false;
}

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Low-poly F1 car, about 5 units long, nose pointing +Z.
 * `color` = team livery, `accent` = second livery colour.
 */
export function buildCar(app, color, accent = '#111827') {
  const car = new pc.Entity('car');
  const body = material(color, { gloss: 0.7, metalness: 0.3 });
  const trim = material(accent, { gloss: 0.5 });
  const dark = material('#0f1115', { gloss: 0.3 });
  const tyre = material('#141414', { gloss: 0.1 });

  // floor + monocoque + nose
  box(car, { pos: [0, 0.22, 0], scale: [1.5, 0.1, 4.2], mat: dark });
  box(car, { pos: [0, 0.48, 0.2], scale: [0.7, 0.45, 2.6], mat: body });
  box(car, { pos: [0, 0.38, 1.95], scale: [0.4, 0.25, 1.2], mat: body, rot: [-6, 0, 0] });
  // sidepods
  box(car, { pos: [0.62, 0.42, -0.2], scale: [0.5, 0.36, 1.7], mat: body });
  box(car, { pos: [-0.62, 0.42, -0.2], scale: [0.5, 0.36, 1.7], mat: body });
  // engine cover + airbox
  box(car, { pos: [0, 0.72, -0.9], scale: [0.45, 0.35, 1.4], mat: trim });
  box(car, { pos: [0, 0.98, -0.2], scale: [0.3, 0.3, 0.4], mat: trim });
  // cockpit + halo
  box(car, { pos: [0, 0.72, 0.5], scale: [0.45, 0.12, 0.6], mat: dark });
  box(car, { pos: [0, 0.92, 0.55], scale: [0.5, 0.06, 0.7], mat: dark });
  // front wing
  box(car, { pos: [0, 0.18, 2.55], scale: [1.9, 0.06, 0.45], mat: trim });
  box(car, { pos: [0.95, 0.28, 2.55], scale: [0.06, 0.25, 0.5], mat: body });
  box(car, { pos: [-0.95, 0.28, 2.55], scale: [0.06, 0.25, 0.5], mat: body });
  // rear wing
  box(car, { pos: [0, 1.0, -2.05], scale: [1.3, 0.08, 0.4], mat: trim });
  box(car, { pos: [0, 0.88, -2.05], scale: [1.3, 0.06, 0.3], mat: body });
  box(car, { pos: [0.65, 0.75, -2.05], scale: [0.06, 0.6, 0.5], mat: body });
  box(car, { pos: [-0.65, 0.75, -2.05], scale: [0.06, 0.6, 0.5], mat: body });
  // wheels (cylinder axis is Y, so roll it 90 degrees around Z)
  for (const [x, z, w] of [[0.95, 1.45, 0.38], [-0.95, 1.45, 0.38], [0.98, -1.35, 0.48], [-0.98, -1.35, 0.48]]) {
    const wheel = new pc.Entity('wheel');
    wheel.addComponent('render', { type: 'cylinder', castShadows: true });
    wheel.render.material = tyre;
    wheel.setLocalPosition(x, 0.36, z);
    wheel.setLocalEulerAngles(0, 0, 90);
    wheel.setLocalScale(0.72, w, 0.72);
    car.addChild(wheel);
  }
  app.root.addChild(car);
  return car;
}

import * as pc from 'playcanvas';
import { pitLayout } from './trackPath';
import { GRID_SLOT_UNITS } from './raceSim';
import { MeshBuilder, vertexColorMaterial, glowMaterial, meshToEntity, materialCache, useMaterials, dropMaterials } from './meshBuilder';
import { buildEnvironment, ENVIRONMENTS } from './environments';
import { trackside, sponsorBoards, clearance, reservePit, bridgeWorks } from './details';
import { createRegistry } from './placement';
import { buildLandmarks } from './landmarks';
import { liveryOf, paint, inkOn, letteringMaterial, decal } from './liveries';

export const TRACK_WIDTH = 7;

const hex = (h) => {
  const c = new pc.Color();
  c.fromString(h);
  return c;
};

/** Shared, cached material per colour (one material per colour, not per box). */
export function material(color, { emissive = null, gloss = 0.35, metalness = 0, twoSided = false } = {}) {
  const key = `${color}|${emissive}|${gloss}|${metalness}|${twoSided}`;
  const matCache = materialCache();
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
// Called after app.destroy(): the device has already released GPU resources,
// so only drop the references (destroying here would touch a dead device).
export const clearMaterialCache = (device) => {
  dropMaterials(device);
};

export function box(parent, { pos, scale, color, rot = [0, 0, 0], shadows = true, mat = null }) {
  // A MeshBuilder (or { mb, group }) collects the box into a merged mesh instead
  if (parent instanceof MeshBuilder) return parent.box({ pos, scale, rot, color });
  if (parent && parent.mb) return parent.mb.box({ pos, scale, rot, color }, parent.group);
  const e = new pc.Entity();
  e.addComponent('render', { type: 'box', castShadows: shadows, receiveShadows: true });
  e.render.material = mat || material(color);
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
      [a.x + a.nx * inner, a.z + a.nz * inner, a.y],
      [a.x + a.nx * outer, a.z + a.nz * outer, a.y],
      [b.x + b.nx * inner, b.z + b.nz * inner, b.y],
      [b.x + b.nx * outer, b.z + b.nz * outer, b.y],
    ];
    quad.forEach(([x, z, h]) => {
      positions.push(x, y + h, z);
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

/**
 * Ribbon whose centre line moves sideways along the lap: centreAt(f) gives the
 * lateral offset at lap fraction f. Used for the pit lane with its ramps.
 */
function laneRibbon(device, path, fFrom, fTo, centreAt, width, y, steps = 120) {
  const positions = [];
  const normals = [];
  const indices = [];
  for (let i = 0; i <= steps; i++) {
    const f = fFrom + ((fTo - fFrom) * i) / steps;
    const c = centreAt(f);
    const a = path.pointAt(f, c - width / 2);
    const b = path.pointAt(f, c + width / 2);
    positions.push(a.x, y + a.y, a.z, b.x, y + b.y, b.z);
    normals.push(0, 1, 0, 0, 1, 0);
    if (i < steps) {
      const v = i * 2;
      indices.push(v, v + 2, v + 1, v + 1, v + 2, v + 3);
    }
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

export function buildCircuit(app, path, { teams = [], env = 'forest', seed = 3, pitSide = -1, landmarks = [] } = {}) {
  useMaterials(app.graphicsDevice);
  const theme = ENVIRONMENTS[env] || ENVIRONMENTS.forest;
  const device = app.graphicsDevice;
  const root = new pc.Entity('circuit');
  app.root.addChild(root);
  const half = TRACK_WIDTH / 2;
  // all static boxes are collected here and baked into a single mesh at the end
  const mb = new MeshBuilder();
  const glow = new MeshBuilder();

  // Grass and run-off
  box(root, { pos: [0, -0.58, 0], scale: [2400, 1, 2400], color: theme.ground, shadows: false }); // top at -0.08
  // Ribbon materials are two-sided so the triangle winding never hides a strip
  meshEntity(root, ribbon(device, path, -half - 3, half + 3, 0.01), material(theme.runoff, { gloss: 0.1, twoSided: true }), 'runoff');

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
  const finish = { mb, group: { pos: [p0.x, 0.07, p0.z], rot: [0, p0.heading, 0] } };
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
  // Painted grid slots behind the line: GRID_SLOT_UNITS apart, staggered
  // left/right exactly where carPose puts the cars before the start
  for (let i = 0; i < Math.max(20, teams.length * 2); i++) {
    const p = path.pointAt(-(i * GRID_SLOT_UNITS) / path.total, i % 2 ? 1.7 : -1.7);
    const g = { mb, group: { pos: [p.x, 0.065, p.z], rot: [0, p.heading, 0] } };
    box(g, { pos: [0, 0, 2.7], scale: [2.2, 0.02, 0.18], color: '#f8fafc' });
    box(g, { pos: [1.05, 0, 2.2], scale: [0.14, 0.02, 1.0], color: '#f8fafc' });
    box(g, { pos: [-1.05, 0, 2.2], scale: [0.14, 0.02, 1.0], color: '#f8fafc' });
  }

  // Gantry over the line
  box(finish, { pos: [-half - 1.5, 2.5, 0], scale: [0.5, 5, 0.5], color: '#9aa4b2' });
  box(finish, { pos: [half + 1.5, 2.5, 0], scale: [0.5, 5, 0.5], color: '#9aa4b2' });
  box(finish, { pos: [0, 5, 0], scale: [TRACK_WIDTH + 3.5, 0.8, 0.6], color: '#e10600' });

  // Pit lane alongside the main straight, with entry and exit ramps
  const pit = pitLayout(path.total, pitSide);
  const s = pit.side;
  const PIT_LANE = pit;
  const pitBoxFrac = pit.boxFrac;
  const { ramp } = pit;
  const lat = pit.lateral;
  const smooth = (t) => t * t * (3 - 2 * t);
  const centreAt = (f) => {
    if (f < PIT_LANE.start) return lat * smooth(Math.max(0, (f - (PIT_LANE.start - ramp)) / ramp));
    if (f > PIT_LANE.end) return lat * smooth(Math.max(0, 1 - (f - PIT_LANE.end) / ramp));
    return lat;
  };
  meshEntity(root, laneRibbon(device, path, PIT_LANE.start - ramp, PIT_LANE.end + ramp, centreAt, 3.6, 0.025),
    material('#30343c', { gloss: 0.2, twoSided: true }), 'pitlane');
  meshEntity(root, laneRibbon(device, path, PIT_LANE.start, PIT_LANE.end, () => lat + s * 1.9, 0.18, 0.05),
    material('#facc15', { twoSided: true }), 'pit-line');
  // Pit wall between the track and the pit lane
  const wallSteps = 24;
  for (let i = 0; i < wallSteps; i++) {
    const f = PIT_LANE.start + ((PIT_LANE.end - PIT_LANE.start) * (i + 0.5)) / wallSteps;
    const p = path.pointAt(f, s * (TRACK_WIDTH / 2 + 2.6));
    const seg = ((PIT_LANE.end - PIT_LANE.start) * path.total) / wallSteps;
    box(mb, { pos: [p.x, 0.5, p.z], scale: [0.35, 1, seg * 1.02], rot: [0, p.heading, 0], color: i % 2 ? '#e5e7eb' : '#cbd5e1' });
  }

  // Garages: one per team, in team colours, behind each team's pit box
  const { garageLen } = pit;
  const slots = Math.max(teams.length, 10);
  for (let i = 0; i < slots; i++) {
    const team = teams[i];
    const f = pitBoxFrac(i);
    const p = path.pointAt(f, lat + s * 5.2);
    // turned half way round on the other side so the door still faces the track
    const g = { mb, group: { pos: [p.x, 0, p.z], rot: [0, p.heading + (s > 0 ? 180 : 0), 0] } };
    // local axes after the yaw: +Z along the track, -X points towards the track
    // on the pit (negative lateral) side, so the door and apron sit at -X
    box(g, { pos: [0, 2, 0], scale: [6, 4, garageLen * 0.96], color: '#d7dbe2' });
    box(g, { pos: [-3.0, 1.4, 0], scale: [0.2, 2.8, garageLen * 0.78], color: '#0b0f19' });
    box(g, { pos: [-3.08, 3.4, 0], scale: [0.15, 0.7, garageLen * 0.9], color: team ? team.color : '#475569' });
    box(g, { pos: [-3.9, 0.04, 0], scale: [1.6, 0.04, garageLen * 0.7], color: team ? team.accent : '#64748b' });
  }
  // One long roof over the garage row
  const r0 = path.pointAt(pitBoxFrac(0) - garageLen / 2 / path.total, lat + s * 5.6);
  const r1 = path.pointAt(pitBoxFrac(slots - 1) + garageLen / 2 / path.total, lat + s * 5.6);
  const roofLen = Math.hypot(r1.x - r0.x, r1.z - r0.z);
  const roofHead = (Math.atan2(r1.x - r0.x, r1.z - r0.z) * 180) / Math.PI;
  box(mb, { pos: [(r0.x + r1.x) / 2, 4.25, (r0.z + r1.z) / 2], scale: [7.4, 0.5, roofLen], rot: [0, roofHead, 0], color: '#e10600' });
  // mown bands in the grass beside the run-off
  if (env !== 'city' && env !== 'night' && env !== 'desert') {
    // skip pieces that would fold over on the inside of a bend or lie on another part of the lap
    const clear = path.points.map((p) => [1, -1].every((sd) => clearance(path, p.x + p.nx * sd * (half + 8), p.z + p.nz * sd * (half + 8)) > half + 5.5));
    const band = (i) => Math.floor(i / 4) % 2 === 0 && clear[i];
    const mown = material(theme.ground2, { gloss: 0.05, twoSided: true });
    meshEntity(root, ribbon(device, path, half + 3, half + 8, -0.035, band), mown, 'mown-l');
    meshEntity(root, ribbon(device, path, -half - 8, -half - 3, -0.035, band), mown, 'mown-r');
  }

  // rubber laid down along the middle of the road
  meshEntity(root, ribbon(device, path, -1.3, -0.35, 0.034), material('#25282f', { gloss: 0.4, twoSided: true }), 'rubber-l');
  meshEntity(root, ribbon(device, path, 0.35, 1.3, 0.034), material('#25282f', { gloss: 0.4, twoSided: true }), 'rubber-r');
  // barriers, boards, marshals, pit crews and trucks
  const reg = createRegistry(path);
  reservePit(reg, path, pit, Math.max(teams.length, 10));
  bridgeWorks(mb, path, reg);
  // landmarks get the ground first: everything else fits round them
  root.landmarks = buildLandmarks(mb, glow, path, reg, landmarks);
  trackside(mb, path, reg, { teams, pit, grass: env !== 'city' && env !== 'night' });
  sponsorBoards(app, root, path, reg, teams, s);
  // Grandstands, walls, trees, buildings, water, lights: depends on the circuit
  buildEnvironment(mb, glow, path, env, seed, s, reg);
  root.placement = reg; // read by the placement check

  const staticMesh = mb.build(device);
  if (staticMesh) root.addChild(meshToEntity(staticMesh, vertexColorMaterial(false), { name: 'static-scenery' }));
  const glowMesh = glow.build(device);
  if (glowMesh) root.addChild(meshToEntity(glowMesh, glowMaterial(), { name: 'glow', castShadows: false, receiveShadows: false }));
  return root;
}



/**
 * F1 car, about 5 units long, nose pointing +Z. The body is one mesh per
 * livery and device; lettering and the race number are small decals on top.
 * `carId` ("team-seat") picks the livery; without it the two colours are used.
 */
export function buildCar(app, color, accent = '#111827', carId = '') {
  useMaterials(app.graphicsDevice);
  const livery = liveryOf(carId, color, accent);
  const c = paint(livery);
  const cache = materialCache();
  const key = `#car|${livery.key}`;
  let mesh = cache.get(key);
  if (!mesh || !mesh.vertexBuffer) {
    const mb = new MeshBuilder();
    const dark = '#121418';
    const carbon = '#1b1d22';
    const tyre = '#16171a';
    const trim = livery.second;
    const tube = (pos, radius, height, color, sides = 18) => mb.prism({ pos, radius, height, sides, color, rot: [90, 0, 0] });
    // floor with raised edges, plank and diffuser fins
    mb.box({ pos: [0, 0.2, -0.1], scale: [1.55, 0.06, 4.0], color: dark });
    mb.box({ pos: [0, 0.13, -0.1], scale: [0.4, 0.05, 3.6], color: '#8b5a2b' });
    for (const sx of [1, -1]) {
      mb.box({ pos: [0.78 * sx, 0.27, 0.1], scale: [0.04, 0.1, 2.0], color: carbon });
      for (let i = 0; i < 3; i++) mb.box({ pos: [0.18 * sx * (i + 0.6), 0.25, -2.18], scale: [0.025, 0.2, 0.34], color: carbon });
      for (let i = 0; i < 3; i++) mb.box({ pos: [(0.58 + i * 0.07) * sx, 0.27, 0.95 - i * 0.08], scale: [0.02, 0.18, 0.28], color: carbon, rot: [0, 18 * sx, 0] });
    }
    // monocoque
    mb.box({ pos: [0, 0.46, 0.1], scale: [0.7, 0.42, 2.4], color: c.tub });
    for (const sx of [1, -1]) tube([0.3 * sx, 0.6, 0.4], 0.09, 1.8, c.tub, 14);
    // nose: a smooth taper, split down the middle so two sides can differ
    for (let i = 0; i < 48; i++) {
      const t = i / 47;
      const y = 0.44 - t * 0.14;
      const r = 0.25 - t * 0.17;
      for (const sx of [1, -1]) mb.box({ pos: [(r / 2) * sx, y, 1.3 + t * 1.3], scale: [r, r * 1.3, 0.03], color: c.nose(sx) });
      tube([0, y, 1.3 + t * 1.3], r * 0.82, 0.03, c.nose(1), 20);
    }
    mb.box({ pos: [0, 0.44, 1.7], scale: [0.07, 0.34, 0.9], color: c.spine, rot: [6, 0, 0] });
    mb.box({ pos: [0, 0.29, 1.8], scale: [0.3, 0.05, 1.3], color: c.noseLow });
    // sidepods: shoulder, undercut, stripe, inlet and cooling louvres
    for (const sx of [1, -1]) {
      mb.box({ pos: [0.62 * sx, 0.46, -0.2], scale: [0.48, 0.28, 1.55], color: c.pod(sx) });
      tube([0.8 * sx, 0.46, -0.2], 0.14, 1.55, c.pod(sx), 20);
      mb.box({ pos: [0.58 * sx, 0.29, -0.25], scale: [0.42, 0.14, 1.45], color: c.podLow(sx) });
      mb.box({ pos: [0.62 * sx, 0.61, -0.25], scale: [0.4, 0.025, 1.4], color: c.podStripe });
      mb.box({ pos: [0.64 * sx, 0.46, 0.6], scale: [0.4, 0.22, 0.06], color: dark });
      for (let i = 0; i < 6; i++) mb.box({ pos: [0.6 * sx, 0.63, -0.45 - i * 0.1], scale: [0.26, 0.012, 0.035], color: dark });
      // mirrors and bargeboards
      mb.box({ pos: [0.52 * sx, 0.79, 0.82], scale: [0.22, 0.11, 0.08], color: c.pod(sx) });
      mb.box({ pos: [0.41 * sx, 0.73, 0.82], scale: [0.16, 0.025, 0.03], color: carbon });
      mb.box({ pos: [0.52 * sx, 0.36, 1.0], scale: [0.04, 0.3, 0.5], color: carbon, rot: [0, 14 * sx, 0] });
      // wishbones and push rods out to each wheel
      for (const [z, y] of [[1.45, 0.52], [1.45, 0.26], [-1.35, 0.54], [-1.35, 0.28]]) {
        mb.box({ pos: [0.56 * sx, y, z + 0.14], scale: [0.6, 0.035, 0.05], color: carbon, rot: [0, 16 * sx, 0] });
        mb.box({ pos: [0.56 * sx, y, z - 0.14], scale: [0.6, 0.035, 0.05], color: carbon, rot: [0, -16 * sx, 0] });
      }
      for (const z of [1.45, -1.35]) mb.box({ pos: [0.58 * sx, 0.42, z], scale: [0.6, 0.03, 0.03], color: carbon, rot: [0, 0, 24 * sx] });
    }
    // engine cover, shark fin, airbox, T-camera, aerial
    mb.box({ pos: [0, 0.68, -0.9], scale: [0.4, 0.3, 1.35], color: c.cover });
    tube([0, 0.78, -0.55], 0.2, 0.7, c.cover, 20);
    tube([0, 0.73, -1.15], 0.16, 0.6, c.cover, 20);
    tube([0, 0.68, -1.6], 0.12, 0.4, c.cover, 20);
    mb.box({ pos: [0, 0.97, -1.15], scale: [0.045, 0.36, 1.05], color: c.spine });
    mb.box({ pos: [0, 0.99, -0.2], scale: [0.28, 0.28, 0.42], color: c.tub });
    mb.box({ pos: [0, 0.99, 0.02], scale: [0.2, 0.18, 0.03], color: dark });
    mb.box({ pos: [0, 1.2, -0.2], scale: [0.2, 0.08, 0.12], color: '#facc15' });
    mb.box({ pos: [0, 0.75, 1.15], scale: [0.015, 0.18, 0.015], color: carbon });
    // cockpit, driver, halo
    mb.box({ pos: [0, 0.69, 0.5], scale: [0.44, 0.07, 0.68], color: dark });
    mb.prism({ pos: [0, 0.81, 0.35], radius: 0.14, height: 0.18, sides: 20, color: '#f8fafc' });
    mb.prism({ pos: [0, 0.915, 0.35], radius: 0.11, height: 0.05, sides: 20, color: trim });
    mb.box({ pos: [0, 0.83, 0.47], scale: [0.2, 0.07, 0.05], color: '#0b1220' });
    mb.box({ pos: [0, 0.74, 0.62], scale: [0.2, 0.05, 0.1], color: carbon });
    for (let i = 0; i <= 18; i++) {
      const a = (i / 18) * Math.PI;
      mb.box({ pos: [Math.cos(a) * 0.27, 0.99, 0.35 + Math.sin(a) * 0.5], scale: [0.065, 0.055, 0.11], rot: [0, (-a * 180) / Math.PI, 0], color: carbon });
    }
    mb.box({ pos: [0, 0.86, 0.86], scale: [0.05, 0.22, 0.05], color: carbon });
    // front wing: four elements, endplates, pylons
    mb.box({ pos: [0, 0.15, 2.55], scale: [1.95, 0.035, 0.45], color: c.wing });
    for (const sx of [1, -1]) {
      mb.box({ pos: [0.62 * sx, 0.21, 2.46], scale: [0.72, 0.025, 0.2], color: c.flap, rot: [-12, 0, 0] });
      mb.box({ pos: [0.66 * sx, 0.27, 2.37], scale: [0.64, 0.025, 0.15], color: c.wing, rot: [-18, 0, 0] });
      mb.box({ pos: [0.7 * sx, 0.33, 2.3], scale: [0.54, 0.022, 0.12], color: c.flap, rot: [-24, 0, 0] });
      mb.box({ pos: [0.98 * sx, 0.28, 2.52], scale: [0.045, 0.28, 0.52], color: c.plate(sx) });
      mb.box({ pos: [0.12 * sx, 0.23, 2.4], scale: [0.04, 0.14, 0.18], color: carbon });
    }
    // rear wing: two elements, big endplates, beam wing, pillar, rain light
    mb.box({ pos: [0, 1.02, -2.05], scale: [1.32, 0.06, 0.36], color: c.wing });
    mb.box({ pos: [0, 1.14, -2.17], scale: [1.32, 0.04, 0.22], color: c.flap, rot: [18, 0, 0] });
    mb.box({ pos: [0, 0.56, -2.12], scale: [1.1, 0.035, 0.18], color: carbon, rot: [10, 0, 0] });
    for (const sx of [1, -1]) mb.box({ pos: [0.68 * sx, 0.82, -2.08], scale: [0.04, 0.68, 0.52], color: c.plate(sx) });
    mb.box({ pos: [0, 0.72, -1.95], scale: [0.07, 0.55, 0.12], color: carbon });
    mb.box({ pos: [0, 0.4, -2.12], scale: [1.0, 0.18, 0.3], color: carbon });
    mb.box({ pos: [0, 0.46, -2.29], scale: [0.14, 0.16, 0.05], color: '#ef4444' });
    tube([0, 0.62, -1.9], 0.09, 0.3, '#6b7280', 16);
    // wheels: tyre, shoulder, compound ring, rim with spokes, nut, brake duct
    for (const [x, z, w] of [[0.98, 1.45, 0.36], [-0.98, 1.45, 0.36], [1.0, -1.35, 0.46], [-1.0, -1.35, 0.46]]) {
      const out = Math.sign(x);
      const wheel = (dx, radius, height, color, sides = 28) => mb.prism({ pos: [x + dx, 0.36, z], radius, height, sides, color, rot: [0, 0, 90] });
      wheel(0, 0.36, w - 0.05, tyre);
      wheel(0, 0.345, w + 0.04, '#1d1f23');
      const face = (out * w) / 2;
      wheel(face + out * 0.022, 0.27, 0.01, '#facc15');
      wheel(face + out * 0.027, 0.23, 0.012, tyre);
      wheel(face + out * 0.033, 0.19, 0.014, '#3a3f47');
      for (let k = 0; k < 5; k++) mb.box({ pos: [x + face + out * 0.045, 0.36, z], scale: [0.012, 0.34, 0.04], rot: [k * 36, 0, 0], color: '#aeb4bd' });
      wheel(face + out * 0.055, 0.055, 0.03, trim, 8);
      mb.box({ pos: [x - face - out * 0.03, 0.36, z + 0.05], scale: [0.08, 0.3, 0.26], color: carbon });
    }
    mesh = mb.build(app.graphicsDevice);
    cache.set(key, mesh);
  }
  const car = meshToEntity(mesh, vertexColorMaterial(true), { name: 'car' });
  const device = app.graphicsDevice;
  // lettering: sponsor on the sidepods, rear wing and endplates, number on the nose
  for (const sx of [1, -1]) {
    const pod = livery.pattern === 'halves' && sx < 0 ? livery.second : livery.base;
    decal(car, letteringMaterial(device, livery.title, inkOn(pod)), [0.945 * sx, 0.47, -0.2], [90, 90 * sx, 0], [1.3, 0.24]);
    decal(car, letteringMaterial(device, livery.subtitle, inkOn(pod), { width: 256 }), [0.703 * sx, 0.86, -2.08], [90, 90 * sx, 0], [0.46, 0.2]);
  }
  decal(car, letteringMaterial(device, livery.title, inkOn(livery.pattern === 'halves' ? livery.base : livery.second)), [0, 1.056, -2.05], [0, 180, 0], [1.1, 0.26]);
  decal(car, letteringMaterial(device, String(livery.number), inkOn(livery.base), { width: 128 }), [0, 0.67, 1.45], [8, 180, 0], [0.34, 0.34]);
  app.root.addChild(car);
  return car;
}
// kept for callers that tidy up: the cache now lives and dies with its device
export const clearCarMeshCache = () => {};

/**
 * Safety car: a white road car with an amber light bar, nose pointing +Z.
 * Built fresh every time (no cache): PlayCanvas frees a mesh when its last
 * entity is destroyed, so a cached mesh would be dead the next time the
 * safety car comes out.
 */
export function buildSafetyCar(app) {
  useMaterials(app.graphicsDevice);
  let safetyCarMesh = null;
  {
    const mb = new MeshBuilder();
    mb.box({ pos: [0, 0.55, 0], scale: [1.9, 0.7, 4.4], color: '#f8fafc' });
    mb.box({ pos: [0, 1.15, -0.3], scale: [1.6, 0.55, 2.2], color: '#1e293b' });
    mb.box({ pos: [0, 1.48, -0.3], scale: [1.5, 0.08, 2.0], color: '#f8fafc' });
    mb.box({ pos: [0, 1.6, -0.3], scale: [1.3, 0.16, 0.35], color: '#f59e0b' });
    mb.box({ pos: [0, 0.62, 2.21], scale: [1.6, 0.25, 0.05], color: '#f59e0b' });
    mb.box({ pos: [0, 0.3, 0], scale: [1.95, 0.15, 4.45], color: '#16a34a' });
    for (const [x, z] of [[0.95, 1.4], [-0.95, 1.4], [0.95, -1.4], [-0.95, -1.4]]) {
      mb.prism({ pos: [x, 0.35, z], radius: 0.35, height: 0.3, sides: 16, color: '#16171a', rot: [0, 0, 90] });
    }
    safetyCarMesh = mb.build(app.graphicsDevice);
  }
  const car = meshToEntity(safetyCarMesh, vertexColorMaterial(true), { name: 'safety-car' });
  app.root.addChild(car);
  return car;
}

/** Rain: thin streaks in one mesh, moved down and wrapped every frame. */
export function buildRain(app) {
  useMaterials(app.graphicsDevice);
  const mb = new MeshBuilder();
  let a = 99;
  const rnd = () => {
    a = (a * 16807) % 2147483647;
    return a / 2147483647;
  };
  for (let i = 0; i < 1600; i++) {
    mb.box({ pos: [rnd() * 260 - 130, rnd() * 60, rnd() * 260 - 110], scale: [0.22, 3.2, 0.22], color: '#cfe8ff' });
  }
  const mat = new pc.StandardMaterial();
  mat.diffuse = new pc.Color(0, 0, 0);
  mat.emissive = new pc.Color(0.75, 0.85, 1);
  mat.useLighting = false;
  mat.blendType = pc.BLEND_NORMAL;
  mat.opacity = 0.35;
  mat.depthWrite = false;
  mat.update();
  const e = meshToEntity(mb.build(app.graphicsDevice), mat, { name: 'rain', castShadows: false, receiveShadows: false });
  e.enabled = false;
  app.root.addChild(e);
  return { entity: e, material: mat };
}

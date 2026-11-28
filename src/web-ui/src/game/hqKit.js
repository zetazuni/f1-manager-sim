// Building blocks for the headquarters: a group that batches its geometry,
// glass, lettering and walking people.

import * as pc from 'playcanvas';
import { MeshBuilder, vertexColorMaterial, glowMaterial, meshToEntity, materialCache } from './meshBuilder';
import { letteringMaterial, decal } from './liveries';

export function glassMaterial(device, map = null, opacity = 0.2, tint = '#bfe3f5') {
  const cache = materialCache();
  const key = `#glass|${opacity}|${tint}`;
  if (cache.has(key)) return cache.get(key);
  const m = new pc.StandardMaterial();
  const c = new pc.Color();
  c.fromString(tint);
  m.diffuse = c;
  m.opacity = opacity;
  m.blendType = pc.BLEND_NORMAL;
  m.depthWrite = false;
  m.gloss = 0.92;
  m.useMetalness = true;
  m.metalness = 0.1;
  if (map) m.cubeMap = map;
  m.cull = pc.CULLFACE_NONE;
  m.update();
  cache.set(key, m);
  return m;
}

/**
 * One switchable part of the headquarters. Static geometry is collected and
 * merged by finish(); moving things are entities of their own.
 */
export function createGroup(app, name, { sky = null } = {}) {
  const device = app.graphicsDevice;
  const root = new pc.Entity(name);
  app.root.addChild(root);
  const mb = new MeshBuilder();
  const gloss = new MeshBuilder(); // polished floors, water, paint
  const glow = new MeshBuilder();
  const panes = []; // glass boxes, merged into one blended mesh
  const moving = [];

  const g = {
    app, root, mb, gloss, glow, moving, sky,
    box: (x, y, z, sx, sy, sz, color, rot) => mb.box({ pos: [x, y, z], scale: [sx, sy, sz], color, rot }),
    shine: (x, y, z, sx, sy, sz, color, rot) => gloss.box({ pos: [x, y, z], scale: [sx, sy, sz], color, rot }),
    lamp: (x, y, z, sx, sy, sz, color, rot) => glow.box({ pos: [x, y, z], scale: [sx, sy, sz], color, rot }),
    cyl: (x, y, z, radius, height, color, rot = [0, 0, 0], sides = 24) => mb.prism({ pos: [x, y, z], radius, height, sides, color, rot }),
    ball: (x, y, z, radius, color, scale, seg = 14) => mb.sphere({ pos: [x, y, z], radius, color, scale, seg }),
    glass: (x, y, z, sx, sy, sz, rot = [0, 0, 0]) => panes.push({ pos: [x, y, z], scale: [sx, sy, sz], rot, color: '#cfeaf8' }),
    /** Lettering on a wall, facing +Z unless turned. */
    sign: (text, x, y, z, w, h, ink = '#111827', yaw = 0) => decal(root, letteringMaterial(device, text, ink, { width: 1024, height: Math.max(64, Math.round((1024 * h) / w)) }), [x, y, z], [90, yaw, 0], [w, h]),
    /** An entity built from its own geometry, updated every frame. */
    part: (build, x, y, z, update, material = null) => {
      const own = new MeshBuilder();
      build(own);
      const e = meshToEntity(own.build(device), material || vertexColorMaterial(false), { name: 'moving-part' });
      e.setLocalPosition(x, y, z);
      root.addChild(e);
      if (update) moving.push((t, dt) => update(e, t, dt));
      return e;
    },
    finish: () => {
      const add = (builder, material, options) => {
        const mesh = builder.build(device);
        if (mesh) root.addChild(meshToEntity(mesh, material, options));
      };
      add(mb, vertexColorMaterial(false), { name: `${name}-solid` });
      const polished = vertexColorMaterial(true);
      if (sky) {
        polished.cubeMap = sky;
        polished.update();
      }
      add(gloss, polished, { name: `${name}-gloss`, castShadows: false });
      add(glow, glowMaterial(), { name: `${name}-glow`, castShadows: false, receiveShadows: false });
      const pane = new MeshBuilder();
      panes.forEach((p) => pane.box(p));
      add(pane, glassMaterial(device, sky), { name: `${name}-glass`, castShadows: false, receiveShadows: false });
      return g;
    },
  };
  return g;
}

// --- people ---------------------------------------------------------------

const SKIN = ['#f0c9a4', '#d9a577', '#a9744f', '#7c5236', '#f5d7bd'];
const HAIR = ['#1f1612', '#4a2f1d', '#8a6232', '#c9a15c', '#2b2b30'];

function cachedMesh(g, key, build) {
  const cache = materialCache();
  let mesh = cache.get(key);
  if (!mesh || !mesh.vertexBuffer) {
    const mb = new MeshBuilder();
    build(mb);
    mesh = mb.build(g.app.graphicsDevice);
    cache.set(key, mesh);
  }
  return mesh;
}

/**
 * A person with separate legs and arms. pose: 'stand' | 'sit' | 'cheer'.
 * Returns { root, legs, arms, head }.
 */
export function person(g, x, y, z, { shirt = '#334155', pants = '#1f2937', yaw = 0, pose = 'stand', seed = 0 } = {}) {
  const skin = SKIN[seed % SKIN.length];
  const hair = HAIR[(seed * 3) % HAIR.length];
  const root = new pc.Entity('person');
  root.setLocalPosition(x, y, z);
  root.setLocalEulerAngles(0, yaw, 0);
  g.root.addChild(root);
  const piece = (parent, key, build, pos) => {
    const e = meshToEntity(cachedMesh(g, key, build), vertexColorMaterial(false), { name: 'limb' });
    e.setLocalPosition(...pos);
    parent.addChild(e);
    return e;
  };
  const hip = pose === 'sit' ? 0.62 : 0.92;
  piece(root, `#torso|${shirt}`, (m) => {
    m.prism({ pos: [0, 0.36, 0], radius: 0.24, height: 0.66, sides: 14, color: shirt });
    m.sphere({ pos: [0, 0.66, 0], radius: 0.25, color: shirt, scale: [1.15, 0.5, 0.85], seg: 14 });
    m.box({ pos: [0, 0.06, 0], scale: [0.42, 0.14, 0.3], color: '#111827' });
  }, [0, hip, 0]);
  const head = piece(root, `#head|${skin}|${hair}`, (m) => {
    m.prism({ pos: [0, -0.16, 0], radius: 0.08, height: 0.14, sides: 10, color: skin });
    m.sphere({ pos: [0, 0.02, 0], radius: 0.18, color: skin, seg: 16 });
    m.sphere({ pos: [0, 0.09, -0.025], radius: 0.19, color: hair, scale: [1, 0.72, 1], seg: 16 });
  }, [0, hip + 0.98, 0]);
  const legs = [-1, 1].map((side) => {
    const pivot = new pc.Entity('hip');
    pivot.setLocalPosition(0.13 * side, hip, 0);
    root.addChild(pivot);
    piece(pivot, `#leg|${pants}`, (m) => {
      m.prism({ pos: [0, -0.43, 0], radius: 0.095, height: 0.84, sides: 12, color: pants });
      m.box({ pos: [0, -0.87, 0.07], scale: [0.2, 0.1, 0.34], color: '#0b0f19' });
    }, [0, 0, 0]);
    if (pose === 'sit') pivot.setLocalEulerAngles(-80, 0, 0);
    return pivot;
  });
  const arms = [-1, 1].map((side) => {
    const pivot = new pc.Entity('shoulder');
    pivot.setLocalPosition(0.32 * side, hip + 0.62, 0);
    root.addChild(pivot);
    piece(pivot, `#arm|${shirt}|${skin}`, (m) => {
      m.prism({ pos: [0, -0.22, 0], radius: 0.072, height: 0.48, sides: 10, color: shirt });
      m.prism({ pos: [0, -0.55, 0], radius: 0.058, height: 0.22, sides: 10, color: skin });
      m.sphere({ pos: [0, -0.68, 0], radius: 0.07, color: skin, seg: 8 });
    }, [0, 0, 0]);
    if (pose === 'sit') pivot.setLocalEulerAngles(-45, 0, 0);
    if (pose === 'cheer') pivot.setLocalEulerAngles(0, 0, 150 * side);
    return pivot;
  });
  return { root, legs, arms, head };
}

/** Someone walking a loop of waypoints [[x, z], ...] at floor height y. */
export function walker(g, path, { y = 0, speed = 1.4, offset = 0, ...look } = {}) {
  const who = person(g, path[0][0], y, path[0][1], look);
  const legs = path.map((p, i) => {
    const q = path[(i + 1) % path.length];
    return { p, dx: q[0] - p[0], dz: q[1] - p[1], length: Math.hypot(q[0] - p[0], q[1] - p[1]) || 0.001 };
  });
  const total = legs.reduce((s, l) => s + l.length, 0);
  g.moving.push((t) => {
    let d = (offset + t * speed) % total;
    const leg = legs.find((l) => {
      if (d <= l.length) return true;
      d -= l.length;
      return false;
    }) || legs[0];
    const k = d / leg.length;
    const swing = Math.sin((offset + t * speed) * 4.2) * 32;
    who.root.setLocalPosition(leg.p[0] + leg.dx * k, y + Math.abs(Math.sin((offset + t * speed) * 4.2)) * 0.04, leg.p[1] + leg.dz * k);
    who.root.setLocalEulerAngles(0, (Math.atan2(leg.dx, leg.dz) * 180) / Math.PI, 0);
    who.legs[0].setLocalEulerAngles(swing, 0, 0);
    who.legs[1].setLocalEulerAngles(-swing, 0, 0);
    who.arms[0].setLocalEulerAngles(-swing * 0.8, 0, 0);
    who.arms[1].setLocalEulerAngles(swing * 0.8, 0, 0);
  });
  return who;
}

/** Someone busy at a spot: hands working, head looking about. */
export function worker(g, x, y, z, { seed = 0, ...look } = {}) {
  const who = person(g, x, y, z, { seed, ...look });
  const sit = look.pose === 'sit';
  const rest = sit ? -55 : -35;
  g.moving.push((t) => {
    const s = t * 3 + seed * 1.7;
    who.arms[0].setLocalEulerAngles(rest + Math.sin(s) * 14, 0, 0);
    who.arms[1].setLocalEulerAngles(rest + Math.cos(s * 1.3) * 14, 0, 0);
    who.head.setLocalEulerAngles(0, Math.sin(t * 0.6 + seed) * 28, 0);
  });
  return who;
}

export function cheerer(g, x, y, z, { seed = 0, ...look } = {}) {
  const who = person(g, x, y, z, { seed, pose: 'cheer', ...look });
  g.moving.push((t) => {
    const wave = Math.sin(t * 5 + seed) * 18;
    who.arms[0].setLocalEulerAngles(0, 0, -150 + wave);
    who.arms[1].setLocalEulerAngles(0, 0, 150 + wave);
    who.root.setLocalPosition(x, y + Math.max(0, Math.sin(t * 5 + seed)) * 0.12, z);
  });
  return who;
}

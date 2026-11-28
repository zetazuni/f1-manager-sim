// Team paint schemes and lettering. A team may define
//   livery: { base, second, third, pattern, title, subtitle }
// pattern: 'lower' (second colour low down), 'stripe' (third colour spine),
// 'sweep' (second colour towards the back), 'halves' (left and right differ).
// Teams without one get a scheme from their two team colours.

import * as pc from 'playcanvas';
import { materialCache } from './meshBuilder';
import { GRID_TEAMS } from '../data/season';

const PATTERNS = ['lower', 'stripe', 'sweep', 'halves'];
const STRIPE_THIRD = ['#f8fafc', '#facc15', '#22d3ee'];

/** Everything needed to paint car `carId` ("team-seat"). */
export function liveryOf(carId, color = '#64748b', accent = '#111827') {
  const cut = String(carId || '').lastIndexOf('-');
  const teamId = cut > 0 ? carId.slice(0, cut) : '';
  const seat = cut > 0 ? Number(carId.slice(cut + 1)) : 0;
  const index = Math.max(0, GRID_TEAMS.findIndex((t) => t.id === teamId));
  const team = GRID_TEAMS.find((t) => t.id === teamId);
  const l = team?.livery || {};
  const base = l.base || color;
  const second = l.second || accent;
  const third = l.third || STRIPE_THIRD[index % STRIPE_THIRD.length];
  const pattern = l.pattern || PATTERNS[index % PATTERNS.length];
  return {
    key: `${teamId}|${base}|${second}|${third}|${pattern}`,
    base, second, third, pattern,
    title: l.title || team?.sponsor || team?.short || 'ZETRACE',
    subtitle: l.subtitle || team?.short || '',
    number: team?.drivers?.[seat]?.number ?? index * 2 + seat + 2,
  };
}

/** Colour of each part of the bodywork for a livery. side: 1 left, -1 right. */
export function paint({ base, second, third, pattern }) {
  const half = (side) => (pattern === 'halves' && side < 0 ? second : base);
  return {
    nose: (side = 1) => half(side),
    noseLow: pattern === 'lower' ? second : '#121418',
    tub: base,
    pod: half,
    podLow: (side) => (pattern === 'lower' || pattern === 'sweep' ? second : half(side)),
    podStripe: third,
    cover: pattern === 'sweep' ? second : base,
    spine: pattern === 'stripe' ? third : pattern === 'halves' ? second : third,
    wing: pattern === 'halves' ? base : second,
    flap: pattern === 'stripe' ? third : base,
    plate: half,
  };
}

const luminance = (hex) => 0.3 * parseInt(hex.slice(1, 3), 16) + 0.59 * parseInt(hex.slice(3, 5), 16) + 0.11 * parseInt(hex.slice(5, 7), 16);
export const inkOn = (hex) => (luminance(hex) > 140 ? '#0b0f19' : '#ffffff');

/** A transparent material with `text` lettered across it. Cached per device. */
export function letteringMaterial(device, text, ink, { width = 512, height = 128, weight = 800, italic = true } = {}) {
  const key = `#text|${text}|${ink}|${width}x${height}`;
  const cache = materialCache();
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const g = canvas.getContext('2d');
  g.fillStyle = ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  let size = Math.round(height * 0.82);
  const label = String(text).toUpperCase();
  do {
    g.font = `${italic ? 'italic ' : ''}${weight} ${size}px "Bricolage Grotesque Variable", system-ui, sans-serif`;
    size -= 4;
  } while (g.measureText(label).width > width * 0.94 && size > 20);
  g.fillText(label, width / 2, height / 2 + 4);
  const texture = new pc.Texture(device, { width, height, mipmaps: true, anisotropy: 4 });
  texture.setSource(canvas);
  const m = new pc.StandardMaterial();
  m.diffuse = new pc.Color(0.15, 0.15, 0.15);
  m.emissive = new pc.Color(0.8, 0.8, 0.8);
  m.emissiveMap = texture;
  m.diffuseMap = texture;
  m.opacityMap = texture;
  m.opacityMapChannel = 'a';
  m.blendType = pc.BLEND_NORMAL;
  m.depthWrite = false;
  m.cull = pc.CULLFACE_NONE;
  m.update();
  cache.set(key, m);
  return m;
}

/** A lettered plane under `parent`: size [along, across], placed and turned. */
export function decal(parent, material, pos, euler, [w, h]) {
  const e = new pc.Entity('decal');
  e.addComponent('render', { type: 'plane', castShadows: false, receiveShadows: false });
  e.render.material = material;
  e.setLocalPosition(...pos);
  e.setLocalEulerAngles(...euler);
  e.setLocalScale(w, 1, h);
  parent.addChild(e);
  return e;
}

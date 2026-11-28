import * as pc from 'playcanvas';

// Collects coloured boxes and prisms and bakes them into ONE mesh with vertex
// colours. One mesh = one draw call, instead of one draw call per box.

const srgbToLinear = (v) => Math.pow(v, 2.2);

function parseColor(hex) {
  const c = new pc.Color();
  c.fromString(hex);
  return [srgbToLinear(c.r), srgbToLinear(c.g), srgbToLinear(c.b)];
}

const BOX_FACES = [
  // normal, then 4 corners (unit cube, -0.5..0.5) wound counter-clockwise seen from outside
  [[1, 0, 0], [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5]]],
  [[-1, 0, 0], [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5]]],
  [[0, 1, 0], [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5]]],
  [[0, -1, 0], [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5]]],
  [[0, 0, 1], [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5]]],
  [[0, 0, -1], [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5]]],
];

export class MeshBuilder {
  constructor() {
    this.positions = [];
    this.normals = [];
    this.colors = [];
    this.indices = [];
    this.colorCache = new Map();
    this._q = new pc.Quat();
    this._pq = new pc.Quat();
    this._v = new pc.Vec3();
  }

  color(hex) {
    if (!this.colorCache.has(hex)) this.colorCache.set(hex, parseColor(hex));
    return this.colorCache.get(hex);
  }

  get vertexCount() {
    return this.positions.length / 3;
  }

  /**
   * Add a box. parent = { pos: [x,y,z], rot: [ex,ey,ez] } places it inside a
   * rotated group (like a child entity), so nested layouts stay simple.
   */
  box({ pos, scale, rot = [0, 0, 0], color, shade = 1 }, parent = null) {
    const [r, g, b] = this.color(color);
    const q = this._q.setFromEulerAngles(rot[0], rot[1], rot[2]);
    const pq = parent ? this._pq.setFromEulerAngles(...(parent.rot || [0, 0, 0])) : null;
    const v = this._v;
    for (const [n, corners] of BOX_FACES) {
      const base = this.vertexCount;
      for (const c of corners) {
        v.set(c[0] * scale[0], c[1] * scale[1], c[2] * scale[2]);
        q.transformVector(v, v);
        v.x += pos[0]; v.y += pos[1]; v.z += pos[2];
        if (pq) {
          pq.transformVector(v, v);
          v.x += parent.pos[0]; v.y += parent.pos[1]; v.z += parent.pos[2];
        }
        this.positions.push(v.x, v.y, v.z);
      }
      v.set(n[0], n[1], n[2]);
      q.transformVector(v, v);
      if (pq) pq.transformVector(v, v);
      // a little fake ambient occlusion: bottoms darker, tops lighter
      const ao = shade * (n[1] < 0 ? 0.55 : n[1] > 0 ? 1.06 : 0.92);
      for (let k = 0; k < 4; k++) {
        this.normals.push(v.x, v.y, v.z);
        this.colors.push(r * ao, g * ao, b * ao, 1);
      }
      this.indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }

  /** Upright n-sided prism (tree trunks, posts). Axis = local Y. */
  prism({ pos, radius, height, sides = 8, color, rot = [0, 0, 0] }, parent = null) {
    const [r, g, b] = this.color(color);
    const q = this._q.setFromEulerAngles(rot[0], rot[1], rot[2]);
    const pq = parent ? this._pq.setFromEulerAngles(...(parent.rot || [0, 0, 0])) : null;
    const v = this._v;
    const place = (x, y, z) => {
      v.set(x, y, z);
      q.transformVector(v, v);
      v.x += pos[0]; v.y += pos[1]; v.z += pos[2];
      if (pq) {
        pq.transformVector(v, v);
        v.x += parent.pos[0]; v.y += parent.pos[1]; v.z += parent.pos[2];
      }
      return [v.x, v.y, v.z];
    };
    const dir = (x, y, z) => {
      v.set(x, y, z);
      q.transformVector(v, v);
      if (pq) pq.transformVector(v, v);
      return [v.x, v.y, v.z];
    };
    const h = height / 2;
    for (let i = 0; i < sides; i++) {
      const a0 = (i / sides) * Math.PI * 2;
      const a1 = ((i + 1) / sides) * Math.PI * 2;
      const am = (a0 + a1) / 2;
      const base = this.vertexCount;
      const pts = [
        place(Math.cos(a0) * radius, -h, Math.sin(a0) * radius),
        place(Math.cos(a1) * radius, -h, Math.sin(a1) * radius),
        place(Math.cos(a1) * radius, h, Math.sin(a1) * radius),
        place(Math.cos(a0) * radius, h, Math.sin(a0) * radius),
      ];
      const n = dir(Math.cos(am), 0, Math.sin(am));
      pts.forEach((p) => {
        this.positions.push(...p);
        this.normals.push(...n);
        this.colors.push(r * 0.92, g * 0.92, b * 0.92, 1);
      });
      this.indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
      // caps
      for (const [y, ny] of [[h, 1], [-h, -1]]) {
        const cb = this.vertexCount;
        const cn = dir(0, ny, 0);
        [place(0, y, 0), place(Math.cos(a0) * radius, y, Math.sin(a0) * radius), place(Math.cos(a1) * radius, y, Math.sin(a1) * radius)].forEach((p) => {
          this.positions.push(...p);
          this.normals.push(...cn);
          this.colors.push(r, g, b, 1);
        });
        if (ny > 0) this.indices.push(cb, cb + 2, cb + 1); else this.indices.push(cb, cb + 1, cb + 2);
      }
    }
  }

  /**
   * Upright frustum / cone (rTop = 0) with flat-shaded sides: pine trees,
   * mountains, lamp heads. Base sits at pos[1].
   */
  frustum({ pos, rBottom, rTop = 0, height, sides = 6, color, colorTop = null, spin = 0 }) {
    const [r, g, b] = this.color(color);
    const [rt, gt, bt] = colorTop ? this.color(colorTop) : [r, g, b];
    const [px, py, pz] = pos;
    for (let i = 0; i < sides; i++) {
      const a0 = spin + (i / sides) * Math.PI * 2;
      const a1 = spin + ((i + 1) / sides) * Math.PI * 2;
      const p0 = [px + Math.cos(a0) * rBottom, py, pz + Math.sin(a0) * rBottom];
      const p1 = [px + Math.cos(a1) * rBottom, py, pz + Math.sin(a1) * rBottom];
      const p2 = [px + Math.cos(a1) * rTop, py + height, pz + Math.sin(a1) * rTop];
      const p3 = [px + Math.cos(a0) * rTop, py + height, pz + Math.sin(a0) * rTop];
      // face normal from the quad's diagonals
      const ux = p2[0] - p0[0]; const uy = p2[1] - p0[1]; const uz = p2[2] - p0[2];
      const vx = p1[0] - p3[0]; const vy = p1[1] - p3[1]; const vz = p1[2] - p3[2];
      let nx = uy * vz - uz * vy; let ny = uz * vx - ux * vz; let nz = ux * vy - uy * vx;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;
      // make sure the normal points outwards
      const am = (a0 + a1) / 2;
      if (nx * Math.cos(am) + nz * Math.sin(am) < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const shade = 0.8 + 0.25 * Math.max(0, nx * 0.5 + ny * 0.7 + nz * 0.5);
      const base = this.vertexCount;
      [p0, p1, p2, p3].forEach((p, k) => {
        this.positions.push(...p);
        this.normals.push(nx, ny, nz);
        const top = k >= 2;
        this.colors.push((top ? rt : r) * shade, (top ? gt : g) * shade, (top ? bt : b) * shade, 1);
      });
      this.indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
    }
  }

  /** One triangle, wound so that it faces along `n`. Corners are [x, y, z]. */
  triangle(a, b, c, n, [r, g, bl], alpha = 1) {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const facing = (u[1] * v[2] - u[2] * v[1]) * n[0] + (u[2] * v[0] - u[0] * v[2]) * n[1] + (u[0] * v[1] - u[1] * v[0]) * n[2];
    const base = this.vertexCount;
    for (const p of facing >= 0 ? [a, b, c] : [a, c, b]) {
      this.positions.push(...p);
      this.normals.push(...n);
      this.colors.push(r, g, bl, alpha);
    }
    this.indices.push(base, base + 1, base + 2);
  }

  /**
   * A slab with any outline that every part of can be seen from its middle
   * (rounded rectangles, ellipses, lakes). points = [[x, z], ...] in order.
   */
  slab({ points, y0 = 0, y1 = 1, color, side = null }) {
    const top = this.color(color);
    const wall = this.color(side || color);
    const n = points.length;
    const cx = points.reduce((s, p) => s + p[0], 0) / n;
    const cz = points.reduce((s, p) => s + p[1], 0) / n;
    for (let i = 0; i < n; i++) {
      const [ax, az] = points[i];
      const [bx, bz] = points[(i + 1) % n];
      this.triangle([cx, y1, cz], [ax, y1, az], [bx, y1, bz], [0, 1, 0], top);
      let nx = bz - az;
      let nz = ax - bx;
      const len = Math.hypot(nx, nz) || 1;
      nx /= len;
      nz /= len;
      if (nx * ((ax + bx) / 2 - cx) + nz * ((az + bz) / 2 - cz) < 0) {
        nx = -nx;
        nz = -nz;
      }
      const shaded = wall.map((v) => v * (0.8 + 0.2 * Math.max(0, nx * 0.6 + nz * 0.8)));
      this.triangle([ax, y0, az], [bx, y0, bz], [bx, y1, bz], [nx, 0, nz], shaded);
      this.triangle([ax, y0, az], [bx, y1, bz], [ax, y1, az], [nx, 0, nz], shaded);
    }
  }

  /** A smooth ball (heads, bushes, tree crowns). */
  sphere({ pos, radius, color, scale = [1, 1, 1], seg = 12 }) {
    const [r, g, b] = this.color(color);
    const rings = Math.max(4, Math.round(seg * 0.6));
    const base = this.vertexCount;
    for (let i = 0; i <= rings; i++) {
      const phi = (i / rings) * Math.PI;
      for (let j = 0; j <= seg; j++) {
        const th = (j / seg) * Math.PI * 2;
        const nx = Math.sin(phi) * Math.cos(th);
        const ny = Math.cos(phi);
        const nz = Math.sin(phi) * Math.sin(th);
        this.positions.push(pos[0] + nx * radius * scale[0], pos[1] + ny * radius * scale[1], pos[2] + nz * radius * scale[2]);
        this.normals.push(nx, ny, nz);
        const shade = 0.82 + 0.22 * Math.max(0, ny);
        this.colors.push(r * shade, g * shade, b * shade, 1);
      }
    }
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < seg; j++) {
        const a = base + i * (seg + 1) + j;
        const c = a + seg + 1;
        this.indices.push(a, a + 1, c, a + 1, c + 1, c);
      }
    }
  }

  /** Build the mesh. Returns null when nothing was added. */
  build(device) {
    if (!this.indices.length) return null;
    const mesh = new pc.Mesh(device);
    mesh.setPositions(this.positions);
    mesh.setNormals(this.normals);
    mesh.setColors(this.colors);
    mesh.setIndices(this.vertexCount > 65535 ? new Uint32Array(this.indices) : this.indices);
    mesh.update();
    return mesh;
  }
}

// Materials are cached per graphics device: two 3D views never share one.
const caches = new WeakMap();
let scope = null;
/** Builders call this first with the device they are building for. */
export const useMaterials = (device) => {
  scope = device;
};
export function materialCache() {
  if (!caches.has(scope)) caches.set(scope, new Map());
  return caches.get(scope);
}
export const dropMaterials = (device) => caches.delete(device ?? scope);

/** Shared vertex-colour materials (matte for scenery, glossy for cars). */
export function vertexColorMaterial(glossy = false) {
  const key = glossy ? '#vc-glossy' : '#vc-matte';
  const cache = materialCache();
  if (cache.has(key)) return cache.get(key);
  const m = new pc.StandardMaterial();
  m.diffuse = new pc.Color(1, 1, 1);
  m.diffuseVertexColor = true;
  m.useMetalness = true;
  m.metalness = glossy ? 0.25 : 0;
  m.gloss = glossy ? 0.72 : 0.25;
  m.update();
  cache.set(key, m);
  return m;
}
/** Self-lit vertex-colour material (lamps, lit windows, neon). */
export function glowMaterial() {
  const cache = materialCache();
  if (cache.has('#glow')) return cache.get('#glow');
  const m = new pc.StandardMaterial();
  m.diffuse = new pc.Color(0, 0, 0);
  m.emissive = new pc.Color(1, 1, 1);
  m.emissiveVertexColor = true;
  m.emissiveIntensity = 1.6;
  m.useLighting = false;
  m.update();
  cache.set('#glow', m);
  return m;
}


/** Wrap a mesh in an entity with one render component. */
export function meshToEntity(mesh, mat, { name = 'mesh', castShadows = true, receiveShadows = true } = {}) {
  const e = new pc.Entity(name);
  e.addComponent('render', { meshInstances: [new pc.MeshInstance(mesh, mat)], castShadows, receiveShadows });
  return e;
}

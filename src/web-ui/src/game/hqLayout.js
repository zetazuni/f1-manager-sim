// Where the campus roads and footpaths run. Plain data, so a Node check
// (tools/validate-campus.mjs) can prove that no footpath touches a road.

export const ROUNDABOUT = { x: -2, z: 36, outer: [24, 18], inner: [17, 12] };

/** Access roads: [x1, z1, x2, z2], all ROAD_WIDTH wide. */
export const ROAD_WIDTH = 6;
export const ROADS = [
  [-120, 76, -62, 56],
  [-62, 56, -24, 41],
  [20, 33, 34, 26],
  [-15, 20.5, -31, 14],
];

export const WALK_WIDTH = 2.4;

const arc = (cx, cz, rx, rz, from, to, n = 16) => Array.from({ length: n + 1 }, (_, i) => {
  const a = from + ((to - from) * i) / n;
  return [+(cx + Math.cos(a) * rx).toFixed(2), +(cz + Math.sin(a) * rz).toFixed(2)];
});

/** Footpaths as open lines. People walk to the end and back. */
export const WALKS = [
  // front promenade: car park gate, entrance, bridge, workshop doors
  [[72, 17.5], [40, 17.5], [26, 16], [10, 13], [-12, 11], [-30, 7], [-56, 7], [-82, 7]],
  // round the east and back of the main building
  arc(40, -14, 45, 35, 0.75, -1.45, 20),
  // down the outside of the east car park
  [[72, 17.5], [72, 40], [72, 66], [40, 66], [20, 66]],
  // garden walk south of the roundabout
  [[-28, 61], [-14, 60], [0, 60], [14, 62], [20, 66]],
];

/** True when a point lies on a road (with `margin` to spare). */
export function onRoad(x, z, margin = 0) {
  const { x: cx, z: cz, outer, inner } = ROUNDABOUT;
  const e = (rx, rz) => Math.hypot((x - cx) / rx, (z - cz) / rz);
  if (e(outer[0] + margin, outer[1] + margin) < 1 && e(inner[0] - margin, inner[1] - margin) > 1) return true;
  return ROADS.some(([x1, z1, x2, z2]) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const along = ((x - x1) * dx + (z - z1) * dz) / len;
    const across = Math.abs((x - x1) * dz - (z - z1) * dx) / len;
    return along > -ROAD_WIDTH * 0.2 - margin && along < len + ROAD_WIDTH * 0.2 + margin && across < ROAD_WIDTH / 2 + margin;
  });
}

/** True when a point lies on a footpath (with `margin` to spare). */
export function onWalk(x, z, margin = 0) {
  return WALKS.some((path) => path.slice(1).some(([x2, z2], i) => {
    const [x1, z1] = path[i];
    const dx = x2 - x1;
    const dz = z2 - z1;
    const k = Math.max(0, Math.min(1, ((x - x1) * dx + (z - z1) * dz) / (dx * dx + dz * dz || 1)));
    return Math.hypot(x - x1 - dx * k, z - z1 - dz * k) < WALK_WIDTH / 2 + margin;
  }));
}

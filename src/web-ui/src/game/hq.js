// The team headquarters: the campus seen from above, and one hall per
// department. Departments are built the first time they are visited and only
// the one in view is switched on, so the others can never be seen.

import { useMaterials } from './meshBuilder';
import { createGroup } from './hqKit';
import { buildCampus } from './hqCampus';
import { buildRoom } from './hqRooms';

/** id, name and the car areas worked on there. */
export const ROOMS = [
  { id: 'lobby', label: 'Atrium', areas: [] },
  { id: 'wind', label: 'Wind tunnel', areas: ['aeroHighSpeed', 'aeroLowSpeed'] },
  { id: 'power', label: 'Powertrain lab', areas: ['powerUnit', 'ersEfficiency'] },
  { id: 'factory', label: 'Composites floor', areas: ['chassisWeight'] },
  { id: 'bay', label: 'Race bay', areas: [] },
  { id: 'rig', label: 'Reliability rig', areas: ['reliability'] },
  { id: 'sim', label: 'Race simulator', areas: [] },
  { id: 'hub', label: 'Team hub', areas: [] },
  { id: 'board', label: 'Board room', areas: [] },
];

export const roomOfArea = (area) => ROOMS.find((r) => r.areas.includes(area))?.id || 'hub';

// camera shots inside a hall: [position, look at, vertical fov]
const SHOTS = {
  lobby: [[[9, 5, 13], [-2, 2, -3], 52], [[-12, 3.2, 10], [2, 1.6, -3], 54], [[0, 7.4, 13], [0, 1, -3], 50]],
  wind: [[[11, 6.4, 12], [-2, 1.6, -3], 50], [[-6, 2.6, 9.5], [0, 1.4, -2], 52], [[8.5, 2.2, 0.8], [-7, 2.2, -2.4], 58]],
  power: [[[9, 5.6, 10], [-1, 1.6, -3], 48], [[-5.4, 3, 3.4], [0.4, 1.7, -3], 50], [[4.6, 2.4, 2.6], [-1, 1.8, -3.4], 52]],
  factory: [[[11, 6.5, 12], [-1, 1.2, -3], 50], [[-12, 3.4, 8], [1, 1.2, -3], 52], [[5.5, 2.6, 3.5], [0, 1.2, -3], 54]],
  bay: [[[0, 3.4, 13.5], [0, 1.6, -4], 50], [[0, 8, 13], [0, 0.5, -4], 54], [[-11, 3, 7], [3, 1.2, -4], 54]],
  rig: [[[10, 5.4, 10], [-1, 1.6, -3], 48], [[-8, 2.6, 4], [0, 1.8, -2.4], 50], [[0, 3.4, 11], [0, 1.8, -3], 52]],
  sim: [[[0, 5.6, 13], [0, 2, -3], 52], [[-8.5, 3.6, 4], [1, 2.4, -3.4], 54], [[2.6, 4.6, 3.6], [-0.4, 2.2, -5], 58]],
  hub: [[[10, 6.4, 11], [-2, 1.4, -3], 50], [[-11, 4, 8], [2, 1.6, -4], 52], [[0, 6, 11], [0, 1.4, -5], 50]],
  board: [[[0, 6.4, 12], [0, 1.4, -3], 48], [[-11, 4, 6], [2, 1.4, -3], 50], [[8, 3, 5], [-3, 1.8, -8], 52]],
};

/** Camera for a department (or the campus, which slowly circles). */
export function shot(roomId, index = 0, time = 0) {
  if (roomId === 'campus') {
    const a = 1.2 + time * 0.06;
    return { pos: [Math.cos(a) * 150, 96, Math.sin(a) * 150], at: [0, 0, 2], fov: 40 };
  }
  const set = SHOTS[roomId] || SHOTS.hub;
  const [pos, at, fov] = set[index % set.length];
  return { pos, at, fov };
}

export function buildHQ(app, { color = '#1e3a8a', accent = '#e10600', teamId = '', name = 'Zetrace Racing', sky = null } = {}) {
  useMaterials(app.graphicsDevice);
  const ctx = { color, accent, teamId, name, sky };
  const groups = new Map();
  let active = null;
  let time = 0;

  const ensure = (id) => {
    if (!groups.has(id)) {
      useMaterials(app.graphicsDevice);
      groups.set(id, id === 'campus' ? buildCampus(app, ctx) : buildRoom(createGroup(app, id, { sky }), id, ctx));
    }
    return groups.get(id);
  };

  return {
    /** Switch on one department (or 'campus') and switch every other off. */
    show(id) {
      active = ensure(id);
      groups.forEach((g, key) => {
        g.root.enabled = key === id;
      });
    },
    /** Which parts are switched on. */
    visible: () => [...groups.entries()].filter(([, g]) => g.root.enabled).map(([key]) => key),
    update(dt) {
      time += dt;
      active?.moving.forEach((fn) => fn(time, dt));
    },
  };
}

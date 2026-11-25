// Fictional 10-team grid. Car stats 0-1, driver stats 0-100.
// The player team is the first entry (PLAYER_TEAM_ID).

export const PLAYER_TEAM_ID = 'zetrace';

const d = (name, code, pace, consistency, experience, overtaking, defending, tireManagement, salary) => ({
  name, code, pace, consistency, experience, adaptability: Math.round((pace + experience) / 2),
  overtaking, defending, tireManagement, starts: Math.round((pace + consistency) / 2), salary,
});

const car = (aeroHighSpeed, aeroLowSpeed, powerUnit, ersEfficiency, chassisWeight, reliability) => ({
  aeroHighSpeed, aeroLowSpeed, powerUnit, ersEfficiency, chassisWeight, reliability,
});

export const GRID_TEAMS = [
  {
    id: 'zetrace', name: 'Zetrace Racing', short: 'ZET', color: '#1e3a8a', accent: '#e10600', budget: 100000000,
    car: car(0.93, 0.91, 0.94, 0.9, 0.93, 0.97),
    drivers: [d('Danial Hakim', 'HAK', 92, 90, 80, 90, 86, 88, 12000000), d('Theo Laurent', 'LAU', 89, 92, 86, 84, 89, 90, 9000000)],
  },
  {
    id: 'vortex', name: 'Vortex GP', short: 'VTX', color: '#f97316', accent: '#111827', budget: 140000000,
    car: car(0.97, 0.95, 0.96, 0.94, 0.95, 0.96),
    drivers: [d('Kai Brandt', 'BRA', 96, 93, 88, 94, 90, 91, 30000000), d('Luca Moretti', 'MOR', 90, 89, 84, 87, 86, 86, 14000000)],
  },
  {
    id: 'aurora', name: 'Aurora Motorsport', short: 'AUR', color: '#10b981', accent: '#0f172a', budget: 130000000,
    car: car(0.95, 0.96, 0.94, 0.95, 0.94, 0.98),
    drivers: [d('Sofia Reyes', 'REY', 94, 95, 90, 89, 92, 94, 26000000), d('Jonas Eriksen', 'ERI', 88, 91, 92, 83, 90, 89, 11000000)],
  },
  {
    id: 'crimson', name: 'Crimson Arrow', short: 'CRA', color: '#b91c1c', accent: '#fde047', budget: 135000000,
    car: car(0.96, 0.94, 0.97, 0.92, 0.94, 0.94),
    drivers: [d('Mateo Silva', 'SIL', 95, 88, 82, 95, 85, 86, 24000000), d('Hugo Fischer', 'FIS', 91, 90, 87, 88, 88, 88, 15000000)],
  },
  {
    id: 'polar', name: 'Polar Dynamics', short: 'POL', color: '#e5e7eb', accent: '#0ea5e9', budget: 110000000,
    car: car(0.92, 0.93, 0.93, 0.93, 0.92, 0.97),
    drivers: [d('Ren Takeda', 'TAK', 90, 91, 85, 86, 88, 90, 10000000), d('Mia Novak', 'NOV', 87, 89, 78, 85, 84, 87, 6000000)],
  },
  {
    id: 'helix', name: 'Helix Engineering', short: 'HLX', color: '#7c3aed', accent: '#f8fafc', budget: 95000000,
    car: car(0.91, 0.9, 0.92, 0.91, 0.9, 0.95),
    drivers: [d('Oscar Lind', 'LIN', 88, 87, 83, 85, 84, 85, 7000000), d('Ade Okafor', 'OKA', 86, 88, 76, 87, 82, 84, 5000000)],
  },
  {
    id: 'meridian', name: 'Meridian F1', short: 'MER', color: '#0891b2', accent: '#fbbf24', budget: 90000000,
    car: car(0.9, 0.91, 0.9, 0.9, 0.91, 0.94),
    drivers: [d('Yusuf Demir', 'DEM', 87, 86, 81, 84, 85, 83, 6000000), d('Clara Weiss', 'WEI', 85, 90, 88, 80, 87, 88, 5500000)],
  },
  {
    id: 'sable', name: 'Sable Racing', short: 'SAB', color: '#64748b', accent: '#d4af37', budget: 85000000,
    car: car(0.89, 0.88, 0.91, 0.88, 0.89, 0.93),
    drivers: [d('Nico Haas', 'HAA', 86, 85, 90, 82, 86, 84, 5000000), d('Leo Park', 'PAR', 84, 84, 72, 83, 80, 82, 3000000)],
  },
  {
    id: 'kestrel', name: 'Kestrel Speed', short: 'KES', color: '#65a30d', accent: '#fef08a', budget: 80000000,
    car: car(0.88, 0.89, 0.88, 0.87, 0.88, 0.92),
    drivers: [d('Ivan Petrov', 'PET', 85, 83, 79, 84, 81, 80, 3500000), d('Sara Costa', 'COS', 83, 86, 74, 79, 82, 85, 2500000)],
  },
  {
    id: 'tidal', name: 'Tidal Works', short: 'TID', color: '#db2777', accent: '#f9fafb', budget: 75000000,
    car: car(0.87, 0.87, 0.89, 0.86, 0.87, 0.91),
    drivers: [d('Ben Carter', 'CAR', 83, 82, 70, 81, 79, 80, 2000000), d('Elif Aydin', 'AYD', 82, 84, 68, 78, 80, 83, 1500000)],
  },
];

export const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

// The circuit drawn in 3D (src/game/trackPath.js DEFAULT_CIRCUIT)
export const RACE_TRACK = {
  name: 'Zetrace Park',
  baseLapTime: 72.0,
  tireWearFactor: 0.05,
  fuelConsumption: 1.2,
  totalLaps: 78,
  sectors: { sector1: 0.3, sector2: 0.4, sector3: 0.3 },
};

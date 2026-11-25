// Fictional season calendar. Every layout starts with a long straight running
// +X (start line at the first control point) so the pit lane fits, and runs
// anticlockwise seen from above (infield on the +Z side of the main straight).
//
// env picks the 3D environment: forest, desert, city, coast, night, alpine.

export const CALENDAR = [
  {
    id: 'zetrace-park', name: 'Zetrace Park', country: 'Valoria', env: 'forest',
    laps: 52, baseLapTime: 72.0, tireWearFactor: 0.05, fuelConsumption: 1.7, pitLoss: 20,
    points: [[-32, -22], [4, -22], [40, -22], [50, -11], [43, 2], [25, 6], [17, 16], [22, 28], [6, 34], [-20, 31], [-40, 24], [-52, 8], [-54, -10], [-46, -22]],
  },
  {
    id: 'dune-circuit', name: 'Dune Circuit', country: 'Qasirah', env: 'desert',
    laps: 50, baseLapTime: 88.0, tireWearFactor: 0.065, fuelConsumption: 1.8, pitLoss: 22,
    points: [[-38, -30], [6, -30], [50, -30], [64, -14], [56, 2], [32, 6], [26, 20], [48, 28], [44, 44], [18, 50], [-6, 37], [-26, 46], [-50, 38], [-64, 16], [-64, -14], [-52, -30]],
  },
  {
    id: 'harbour-street', name: 'Harbour Street Circuit', country: 'Port Meridia', env: 'city',
    laps: 56, baseLapTime: 76.0, tireWearFactor: 0.04, fuelConsumption: 1.6, pitLoss: 19,
    points: [[-36, -28], [6, -28], [48, -28], [56, -12], [40, -4], [40, 14], [54, 22], [48, 38], [22, 38], [12, 20], [-6, 20], [-14, 38], [-40, 38], [-56, 22], [-44, 6], [-58, -12], [-50, -28]],
  },
  {
    id: 'coral-bay', name: 'Coral Bay Autodrome', country: 'Isla Coralina', env: 'coast',
    laps: 54, baseLapTime: 80.0, tireWearFactor: 0.055, fuelConsumption: 1.7, pitLoss: 21,
    points: [[-36, -26], [8, -26], [52, -26], [68, -6], [62, 18], [38, 30], [12, 22], [-6, 40], [-36, 40], [-58, 24], [-44, 8], [-64, -8], [-50, -26]],
  },
  {
    id: 'neon-night', name: 'Neon Night Grand Prix', country: 'Kirasaki', env: 'night',
    laps: 50, baseLapTime: 82.0, tireWearFactor: 0.045, fuelConsumption: 1.8, pitLoss: 20,
    points: [[-36, -28], [6, -28], [48, -28], [60, -12], [46, 2], [58, 16], [50, 34], [24, 30], [16, 12], [-2, 14], [-8, 34], [-34, 38], [-54, 24], [-42, 6], [-62, -8], [-50, -28]],
  },
  {
    id: 'alpen-ring', name: 'Alpenring', country: 'Hohental', env: 'alpine',
    laps: 54, baseLapTime: 78.0, tireWearFactor: 0.05, fuelConsumption: 1.7, pitLoss: 21,
    points: [[-36, -26], [6, -26], [48, -26], [62, -8], [52, 12], [60, 30], [38, 40], [22, 24], [0, 28], [-14, 42], [-42, 38], [-60, 18], [-46, 0], [-60, -14], [-50, -26]],
  },
];

export const POINTS_SYSTEM = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

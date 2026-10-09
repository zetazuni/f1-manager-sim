import { Driver, Team, Track } from '../types';

export const mockDrivers: Driver[] = [
  {
    name: "Max Verstappen",
    pace: 98,
    consistency: 95,
    experience: 90,
    adaptability: 96,
    salary: 50000000,
    overtaking: 95,
    defending: 92,
    tireManagement: 92,
    starts: 94
  },
  {
    name: "Lewis Hamilton",
    pace: 97,
    consistency: 98,
    experience: 99,
    adaptability: 95,
    salary: 45000000,
    overtaking: 94,
    defending: 93,
    tireManagement: 94,
    starts: 92
  }
];

export const mockTeams: Team[] = [
  {
    name: "Red Bull Racing",
    budget: 100000000,
    lineup: [mockDrivers[0]],
    car: {
      aeroHighSpeed: 0.95,
      aeroLowSpeed: 0.92,
      powerUnit: 0.98,
      ersEfficiency: 0.90,
      chassisWeight: 0.96,
      reliability: 0.98
    }
  }
];

export const mockTracks: Track[] = [
  {
    name: "Monaco",
    baseLapTime: 72.0,
    tireWearFactor: 0.05,
    fuelConsumption: 1.2,
    totalLaps: 78,
    sectors: {
      sector1: 0.3,
      sector2: 0.4,
      sector3: 0.3
    }
  }
];

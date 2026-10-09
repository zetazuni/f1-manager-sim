export interface CarPerformance {
  aeroHighSpeed: number;   // 0-1
  aeroLowSpeed: number;    // 0-1
  powerUnit: number;       // 0-1
  ersEfficiency: number;   // 0-1
  chassisWeight: number;   // 0-1
  reliability: number;     // 0-1
}

export interface Driver {
  name: string;
  pace: number;           // 0-100
  consistency: number;    // 0-100
  experience: number;     // 0-100
  adaptability: number;   // 0-100
  salary: number;
  overtaking: number;
  defending: number;
  tireManagement: number;
  starts: number;
}

export interface TrackSectorData {
  sector1: number; // % of lap time
  sector2: number;
  sector3: number;
}

export interface Track {
  name: string;
  baseLapTime: number;    // Seconds
  tireWearFactor: number;
  fuelConsumption: number; // kg per lap
  totalLaps: number;
  sectors: TrackSectorData;
}

export interface Team {
  name: string;
  budget: number;
  car: CarPerformance;
  lineup: Driver[];
}

export enum ERSMode { Off = 'Off', Neutral = 'Neutral', Attack = 'Attack', Defend = 'Defend', Overtake = 'Overtake' }
export enum FuelMode { Lean = 'Lean', Standard = 'Standard', Rich = 'Rich' }

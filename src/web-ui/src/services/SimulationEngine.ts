import { Driver, FuelMode, Team, Track, ERSMode } from '../types';

export interface RaceEvent {
  lap: number;
  message: string;
  type: 'info' | 'warning' | 'danger' | 'success';
}

class SimulationEngine {
  /** Random source; a race sets its seeded generator here so a seed replays exactly. */
  random: () => number = Math.random;
  private readonly FUEL_PENALTY_PER_KG = 0.033;
  private readonly MAX_CAR_DELTA = 3.0;
  private readonly MAX_DRIVER_DELTA = 1.5;

  calculateLapTime(
    track: Track,
    team: Team,
    driver: Driver,
    currentLap: number,
    fuelKg: number,
    tireCompound: string,
    tireWear: number,
    ersMode: ERSMode,
    fuelMode: FuelMode
  ): number {
    let lapTime = track.baseLapTime;

    // Granular Car Performance Calculation
    const carPerformance =
      (team.car.aeroHighSpeed * 0.2 + team.car.aeroLowSpeed * 0.2 + team.car.powerUnit * 0.3 +
        team.car.ersEfficiency * 0.1 + team.car.chassisWeight * 0.2);

    const carDelta = (1 - carPerformance) * this.MAX_CAR_DELTA;
    lapTime += carDelta;

    // Granular Driver Skill Calculation
    const driverSkill =
      (driver.pace * 0.4 + driver.experience * 0.2 + driver.consistency * 0.2 + driver.tireManagement * 0.2) / 100;

    const driverDelta = (1 - driverSkill) * this.MAX_DRIVER_DELTA;
    lapTime += driverDelta;

    // Fuel Load and Mode
    lapTime += fuelKg * this.FUEL_PENALTY_PER_KG;
    lapTime -= this.getFuelModeImpact(fuelMode);

    // ERS Impact
    lapTime -= this.getERSImpact(ersMode, team.car.ersEfficiency);

    // Tire Performance
    const tirePenalty = this.calculateTirePenalty(tireCompound, tireWear, track.tireWearFactor, driver.tireManagement);
    lapTime += tirePenalty;

    // Randomness based on consistency
    const maxVariance = 0.3 * (1 - driver.consistency / 100);
    const variance = (this.random() * maxVariance * 2 - maxVariance);
    lapTime += variance;

    return lapTime;
  }

  generateRandomEvent(lap: number, driverName: string, consistency: number): RaceEvent | null {
    const roll = this.random() * 100;

    // Lower consistency = higher chance of events
    const eventChance = 5 + (1 - consistency / 100) * 10;

    if (roll > eventChance) return null;

    const events: Partial<RaceEvent>[] = [
      { message: `${driverName} sets a personal best sector!`, type: 'success' },
      { message: `Yellow flag in sector 2. ${driverName} holds position.`, type: 'warning' },
      { message: `${driverName} is complaining about tire vibrations.`, type: 'warning' },
      { message: `Engine temperature rising for ${driverName}.`, type: 'danger' },
      { message: `${driverName} makes a clean overtake into turn 1!`, type: 'success' },
      { message: `Box this lap, ${driverName}. Confirm.`, type: 'info' }
    ];

    const event = events[Math.floor(this.random() * events.length)];
    return {
      lap,
      message: event.message!,
      type: event.type as any
    };
  }

  private getFuelModeImpact(mode: FuelMode): number {
    if (mode === FuelMode.Lean) return -0.5; // Slower but saves fuel
    if (mode === FuelMode.Rich) return 0.4;   // Faster but burns more
    return 0; // Standard
  }

  private getERSImpact(mode: ERSMode, efficiency: number): number {
    let baseImpact = 0;
    if (mode === ERSMode.Off) baseImpact = -0.5;
    if (mode === ERSMode.Attack) baseImpact = 0.6;
    if (mode === ERSMode.Defend) baseImpact = 0.2;
    if (mode === ERSMode.Overtake) baseImpact = 1.2;
    return baseImpact * (0.8 + efficiency * 0.2);
  }

  private calculateTirePenalty(compound: string, wear: number, trackFactor: number, driverTireMgmt: number): number {
    const effectiveWear = wear * (1 - driverTireMgmt / 200);
    const baseDeg = effectiveWear * trackFactor;

    switch (compound.toLowerCase()) {
      case 'soft': return (baseDeg * 1.8) - 0.7;
      case 'medium': return (baseDeg * 1.1);
      case 'hard': return (baseDeg * 0.6) + 0.5;
      default: return baseDeg;
    }
  }

  calculateFuelConsumption(track: Track, mode: FuelMode): number {
    if (mode === FuelMode.Lean) return track.fuelConsumption * 0.9;
    if (mode === FuelMode.Rich) return track.fuelConsumption * 1.2;
    return track.fuelConsumption;
  }
}

export default SimulationEngine;

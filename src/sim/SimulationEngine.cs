using System;
using F1Manager.Data;

namespace F1Manager.Sim
{
    public enum ERSMode { Off, Neutral, Attack, Defend, Overtake }
    public enum FuelMode { Lean, Standard, Rich }

    public class SimulationEngine
    {
        private const float FUEL_PENALTY_PER_KG = 0.033f;
        private const float MAX_CAR_DELTA = 3.0f;
        private const float MAX_DRIVER_DELTA = 1.5f;

        public float CalculateLapTime(Track track, Team team, Driver driver, int currentLap, float fuelKg, string tireCompound, float tireWear, ERSMode ersMode, FuelMode fuelMode)
        {
            float lapTime = track.baseLapTime;

            // Granular Car Performance Calculation
            float carPerformance = (
                team.car.aeroHighSpeed * 0.2f +
                team.car.aeroLowSpeed * 0.2f +
                team.car.powerUnit * 0.3f +
                team.car.ersEfficiency * 0.1f +
                team.car.chassisWeight * 0.2f
            );

            float carDelta = (1.0f - carPerformance) * MAX_CAR_DELTA;
            lapTime += carDelta;

            // Granular Driver Skill Calculation
            float driverSkill = (
                driver.pace * 0.4f +
                driver.experience * 0.2f +
                driver.consistency * 0.2f +
                driver.tireManagement * 0.2f
            ) / 100f;

            float driverDelta = (1.0f - driverSkill) * MAX_DRIVER_DELTA;
            lapTime += driverDelta;

            // Fuel Load and Mode
            lapTime += fuelKg * FUEL_PENALTY_PER_KG;
            lapTime -= GetFuelModeImpact(fuelMode);

            // ERS Impact
            lapTime -= GetERSImpact(ersMode, team.car.ersEfficiency);

            // Tire Performance
            float tirePenalty = CalculateTirePenalty(tireCompound, tireWear, track.tireWearFactor, driver.tireManagement);
            lapTime += tirePenalty;

            // Randomness based on consistency
            Random rnd = new Random();
            float maxVariance = 0.3f * (1.0f - (driver.consistency / 100f));
            float variance = (float)(rnd.NextDouble() * maxVariance * 2 - maxVariance);
            lapTime += variance;

            return lapTime;
        }

        private float GetFuelModeImpact(FuelMode mode)
        {
            return mode switch {
                FuelMode.Lean => -0.5f, // Slower but saves fuel
                FuelMode.Standard => 0f,
                FuelMode.Rich => 0.4f, // Faster but burns more
                _ => 0f
            };
        }

        private float GetERSImpact(ERSMode mode, float efficiency)
        {
            float baseImpact = mode switch {
                ERSMode.Off => -0.5f,
                ERSMode.Neutral => 0f,
                ERSMode.Attack => 0.6f,
                ERSMode.Defend => 0.2f,
                ERSMode.Overtake => 1.2f,
                _ => 0f
            };
            return baseImpact * (0.8f + efficiency * 0.2f);
        }

        private float CalculateTirePenalty(string compound, float wear, float trackFactor, int driverTireMgmt)
        {
            float effectiveWear = wear * (1.0f - (driverTireMgmt / 200f));
            float baseDeg = effectiveWear * trackFactor;

            switch (compound.ToLower())
            {
                case "soft": return (baseDeg * 1.8f) - 0.7f;
                case "medium": return (baseDeg * 1.1f);
                case "hard": return (baseDeg * 0.6f) + 0.5f;
                default: return baseDeg;
            }
        }

        public float CalculateFuelConsumption(Track track, FuelMode mode)
        {
            return mode switch {
                FuelMode.Lean => track.fuelConsumption * 0.9f,
                FuelMode.Standard => track.fuelConsumption,
                FuelMode.Rich => track.fuelConsumption * 1.2f,
                _ => track.fuelConsumption
            };
        }
    }
}

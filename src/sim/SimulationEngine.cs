using System;
using F1Manager.Data;

namespace F1Manager.Sim
{
    public class SimulationEngine
    {
        private const float FUEL_PENALTY_PER_KG = 0.033f; // Seconds per kg
        private const float MAX_CAR_DELTA = 3.0f;        // Max difference between best and worst car
        private const float MAX_DRIVER_DELTA = 1.5f;     // Max difference between best and worst driver

        public float CalculateLapTime(Track track, Team team, Driver driver, int currentLap, float fuelKg, string tireCompound, float tireWear)
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

            // Fuel Load
            lapTime += fuelKg * FUEL_PENALTY_PER_KG;

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

        private float CalculateTirePenalty(string compound, float wear, float trackFactor, int driverTireMgmt)
        {
            // Driver management reduces wear impact
            float effectiveWear = wear * (1.0f - (driverTireMgmt / 200f));
            float baseDeg = effectiveWear * trackFactor;

            switch (compound.ToLower())
            {
                case "soft":
                    return (baseDeg * 1.8f) - 0.7f; // Faster initially, falls off harder
                case "medium":
                    return (baseDeg * 1.1f);
                case "hard":
                    return (baseDeg * 0.6f) + 0.5f; // Slower initially, very durable
                default:
                    return baseDeg;
            }
        }
    }
}

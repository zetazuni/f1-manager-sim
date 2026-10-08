using System;
using System.Collections.Generic;
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

            // Car Performance (Aero/Engine/Chassis average)
            float carPerformance = (team.car.aero + team.car.engine + team.car.chassis) / 3f;
            float carDelta = (1.0f - carPerformance) * MAX_CAR_DELTA;
            lapTime += carDelta;

            // Driver Skill
            float driverSkill = (driver.pace * 0.7f + driver.experience * 0.3f) / 100f;
            float driverDelta = (1.0f - driverSkill) * MAX_DRIVER_DELTA;
            lapTime += driverDelta;

            // Fuel Load
            lapTime += fuelKg * FUEL_PENALTY_PER_KG;

            // Tire Performance
            float tirePenalty = CalculateTirePenalty(tireCompound, tireWear, track.tireWearFactor);
            lapTime += tirePenalty;

            // Randomness (Traffic, small mistakes)
            Random rnd = new Random();
            float variance = (float)(rnd.NextDouble() * 0.2 - 0.1); // +/- 0.1s
            lapTime += variance;

            return lapTime;
        }

        private float CalculateTirePenalty(string compound, float wear, float trackFactor)
        {
            // Simple model: Degradation increases time
            // Soft: Fast but wears quick
            // Hard: Slow but lasts long
            float baseDeg = wear * trackFactor;

            switch (compound.ToLower())
            {
                case "soft":
                    return (baseDeg * 1.5f) - 0.5f; // Faster initially
                case "medium":
                    return (baseDeg * 1.0f);
                case "hard":
                    return (baseDeg * 0.7f) + 0.4f; // Slower initially
                default:
                    return baseDeg;
            }
        }
    }
}

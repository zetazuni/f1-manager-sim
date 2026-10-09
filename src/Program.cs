using System;
using System.Collections.Generic;
using F1Manager.Data;
using F1Manager.Sim;

namespace F1Manager
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("=== F1 Manager Simulator ===");

            // Initialize Data
            var monaco = new Track
            {
                name = "Monaco",
                baseLapTime = 72.0f, // 1:12.000
                tireWearFactor = 0.05f,
                fuelConsumption = 1.2f,
                totalLaps = 78
            };

            var redBull = new Team
            {
                name = "Red Bull Racing",
                budget = 100000000f,
                car = new CarPerformance { aero = 0.95f, engine = 0.92f, chassis = 0.96f, reliability = 0.98f }
            };

            var verstappen = new Driver
            {
                name = "Max Verstappen",
                pace = 98,
                experience = 90,
                consistency = 95,
                adaptability = 96,
                salary = 50000000f
            };

            var simulation = new SimulationEngine();
            var raceManager = new RaceManager();

            float currentFuel = 100.0f; // Starting fuel in kg
            float currentTireWear = 0.0f;

            Console.WriteLine($"Starting Simulation at {monaco.name} for {verstappen.name}...");
            Console.WriteLine("-----------------------------------------");

            for (int lap = 1; lap <= 10; lap++)
            {
                float lapTime = simulation.CalculateLapTime(monaco, redBull, verstappen, lap, currentFuel, "Medium", currentTireWear);

                // Update state
                currentFuel -= monaco.fuelConsumption;
                currentTireWear += 0.02f; // Simple wear increment

                TimeSpan t = TimeSpan.FromSeconds(lapTime);
                string timeStr = string.Format("{0:D2}:{1:D2}.{2:D3}", t.Minutes, t.Seconds, t.Milliseconds);

                Console.WriteLine($"Lap {lap}: {timeStr} | Fuel: {currentFuel:F1}kg | Wear: {currentTireWear*100:F0}%");
            }

            Console.WriteLine("-----------------------------------------");
            Console.WriteLine("Simulation complete.");
        }
    }
}

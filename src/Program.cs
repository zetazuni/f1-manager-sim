using System;
using System.Collections.Generic;
using System.Linq;
using F1Manager.Data;
using F1Manager.Sim;

namespace F1Manager
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("=== F1 Manager Simulator ===");

            // 1. Data Loading
            string dataPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "src", "data", "json", "game_data.json");
            // For this session, we'll use a local instance if file loading fails in the restricted shell

            var monaco = new Track {
                name = "Monaco", baseLapTime = 72.0f, tireWearFactor = 0.05f, fuelConsumption = 1.2f, totalLaps = 78
            };

            var redBull = new Team {
                name = "Red Bull Racing",
                budget = 100000000f,
                car = new CarPerformance {
                    aeroHighSpeed = 0.95f, aeroLowSpeed = 0.92f, powerUnit = 0.98f,
                    ersEfficiency = 0.90f, chassisWeight = 0.96f, reliability = 0.98f
                }
            };

            var drivers = new List<Driver> {
                new Driver { name = "Max Verstappen", pace = 98, experience = 90, consistency = 95, tireManagement = 92, salary = 50000000f }
            };

            // 2. Financial Management
            var finance = new FinancialManager(redBull.budget);
            finance.ProcessSponsorship(15000000f);
            finance.PaySalaries(drivers);

            // 3. Advanced Simulation
            var simulation = new SimulationEngine();

            float currentFuel = 100.0f;
            float currentTireWear = 0.0f;

            Console.WriteLine("\n--- Race Simulation ---");
            for (int lap = 1; lap <= 10; lap++)
            {
                // Dynamic strategy for testing
                ERSMode ers = (lap % 5 == 0) ? ERSMode.Overtake : ERSMode.Neutral;
                FuelMode fuel = (lap > 8) ? FuelMode.Rich : FuelMode.Standard;

                float lapTime = simulation.CalculateLapTime(monaco, redBull, drivers[0], lap, currentFuel, "Medium", currentTireWear, ers, fuel);

                // Update state
                currentFuel -= simulation.CalculateFuelConsumption(monaco, fuel);
                currentTireWear += 0.02f;

                TimeSpan t = TimeSpan.FromSeconds(lapTime);
                Console.WriteLine($"Lap {lap}: {t.Minutes:D2}:{t.Seconds:D2}.{t.Milliseconds:D3} | ERS: {ers} | Fuel: {currentFuel:F1}kg");
            }
        }
    }
}

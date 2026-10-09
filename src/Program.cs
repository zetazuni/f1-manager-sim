using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using F1Manager.Data;
using F1Manager.Sim;

namespace F1Manager
{
    class Program
    {
        static void Main(string[] args)
        {
            Console.WriteLine("=== F1 Manager Simulator ===");

            // Initialize Data - Load from JSON if available, otherwise use defaults
            var drivers = new List<Driver>();
            var teams = new List<Team>();
            var tracks = new List<Track>();

            // Try to load from JSON file
            try
            {
                var dataPath = System.IO.Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "src", "data", "json", "game_data.json");
                if (System.IO.File.Exists(dataPath))
                {
                    var jsonData = System.IO.File.ReadAllText(dataPath);
                    var gameData = System.Text.Json.JsonSerializer.Deserialize<DataManager.GameData>(jsonData);
                    if (gameData != null)
                    {
                        drivers = gameData.drivers;
                        tracks = gameData.tracks;
                        Console.WriteLine($"Loaded {drivers.Count} drivers and {tracks.Count} tracks from JSON.");
                    }
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Could not load JSON data: {ex.Message}. Using default data.");
            }

            // Default data if JSON loading failed
            if (drivers.Count == 0)
            {
                drivers = new List<Driver>
                {
                    new Driver {
                        name = "Max Verstappen",
                        pace = 98,
                        experience = 90,
                        consistency = 95,
                        adaptability = 96,
                        salary = 50000000,
                        overtaking = 95,
                        defending = 92,
                        tireManagement = 92,
                        starts = 94
                    },
                    new Driver {
                        name = "Lewis Hamilton",
                        pace = 97,
                        experience = 99,
                        consistency = 98,
                        adaptability = 95,
                        salary = 45000000,
                        overtaking = 94,
                        defending = 93,
                        tireManagement = 94,
                        starts = 92
                    },
                    new Driver {
                        name = "Charles Leclerc",
                        pace = 96,
                        experience = 85,
                        consistency = 90,
                        adaptability = 92,
                        salary = 30000000,
                        overtaking = 93,
                        defending = 88,
                        tireManagement = 89,
                        starts = 85
                    }
                };
            }

            if (tracks.Count == 0)
            {
                tracks = new List<Track>
                {
                    new Track
                    {
                        name = "Monaco",
                        baseLapTime = 72.0f,
                        tireWearFactor = 0.05f,
                        fuelConsumption = 1.2f,
                        totalLaps = 78,
                        sectors = new TrackSectorData { sector1 = 0.3f, sector2 = 0.4f, sector3 = 0.3f }
                    },
                    new Track
                    {
                        name = "Silverstone",
                        baseLapTime = 92.0f,
                        tireWearFactor = 0.08f,
                        fuelConsumption = 1.8f,
                        totalLaps = 52,
                        sectors = new TrackSectorData { sector1 = 0.25f, sector2 = 0.35f, sector3 = 0.4f }
                    }
                };
            }

            // Create teams with drivers assigned
            var redBull = new Team
            {
                name = "Red Bull Racing",
                budget = 100000000f,
                car = new CarPerformance {
                    aeroHighSpeed = 0.95f,
                    aeroLowSpeed = 0.92f,
                    powerUnit = 0.98f,
                    ersEfficiency = 0.90f,
                    chassisWeight = 0.96f,
                    reliability = 0.98f
                },
                lineup = new List<Driver> { drivers[0] } // Verstappen
            };

            var mercedes = new Team
            {
                name = "Mercedes",
                budget = 95000000f,
                car = new CarPerformance {
                    aeroHighSpeed = 0.93f,
                    aeroLowSpeed = 0.90f,
                    powerUnit = 0.95f,
                    ersEfficiency = 0.88f,
                    chassisWeight = 0.94f,
                    reliability = 0.96f
                },
                lineup = new List<Driver> { drivers[1] } // Hamilton
            };

            var ferrari = new Team
            {
                name = "Ferrari",
                budget = 90000000f,
                car = new CarPerformance {
                    aeroHighSpeed = 0.91f,
                    aeroLowSpeed = 0.89f,
                    powerUnit = 0.93f,
                    ersEfficiency = 0.85f,
                    chassisWeight = 0.92f,
                    reliability = 0.90f
                },
                lineup = new List<Driver> { drivers[2] } // Leclerc
            };

            teams = new List<Team> { redBull, mercedes, ferrari };

            // 1. Financial Management
            var finance = new FinancialManager(redBull.budget);
            finance.ProcessSponsorship(15000000f); // Initial sponsorship

            Console.WriteLine($"Initial Budget: ${finance.GetBudget():N0}");

            // 2. Advanced Simulation
            var simulation = new SimulationEngine();
            var raceManager = new RaceManager();

            // Select Monaco for demo race
            var monaco = tracks.First(t => t.name == "Monaco");
            var currentLap = 0;
            var raceInProgress = false;

            // Simulation parameters
            float currentFuel = 100.0f;
            float currentTireWear = 0.0f;
            ERSMode ersMode = ERSMode.Neutral;
            FuelMode fuelMode = FuelMode.Standard;
            string tireCompound = "Medium";

            Console.WriteLine("\n=== Race Simulation Started ===");
            Console.WriteLine($"Track: {monaco.name} ({monaco.totalLaps} laps)");
            Console.WriteLine("-----------------------------------------");

            // Simple race simulation loop
            while (currentLap < monaco.totalLaps)
            {
                currentLap++;

                // Strategy decisions based on lap and conditions
                if (currentLap == 10)
                {
                    ersMode = ERSMode.Attack;
                    Console.WriteLine($"Lap {currentLap}: Switching to ERS Attack mode");
                }
                else if (currentLap == 20)
                {
                    ersMode = ERSMode.Neutral;
                    Console.WriteLine($"Lap {currentLap}: Returning to ERS Neutral mode");
                }
                else if (currentLap == 30)
                {
                    fuelMode = FuelMode.Rich;
                    tireCompound = "Soft";
                    Console.WriteLine($"Lap {currentLap}: Switching to Soft tires and Rich fuel mix");
                }
                else if (currentLap == 40)
                {
                    ersMode = ERSMode.Defend;
                    Console.WriteLine($"Lap {currentLap}: Switching to ERS Defend mode (tire conservation)");
                }
                else if (currentLap == 50)
                {
                    fuelMode = FuelMode.Lean;
                    tireCompound = "Medium";
                    Console.WriteLine($"Lap {currentLap}: Switching to Medium tires and Lean fuel mix");
                }
                else if (currentLap == 60)
                {
                    ersMode = ERSMode.Overtake;
                    Console.WriteLine($"Lap {currentLap}: Activating ERS Overtake for position!");
                }

                // Simulate lap for all drivers
                var lapTimes = raceManager.RunLap(drivers, teams, monaco, currentLap,
                    new Dictionary<string, float> {
                        { drivers[0].name, currentFuel },
                        { drivers[1].name, currentFuel },
                        { drivers[2].name, currentFuel }
                    });

                // Update state (simplified - using first driver's data for display)
                var driverLapTime = lapTimes[drivers[0].name];
                currentFuel -= monaco.fuelConsumption * GetFuelModeMultiplier(fuelMode);
                currentTireWear += 0.015f * GetTireWearMultiplier(tireCompound, drivers[0].tireManagement);

                // Format and display lap time
                TimeSpan t = TimeSpan.FromSeconds(driverLapTime);
                string timeStr = string.Format("{0:D2}:{1:D2}.{2:D3}", t.Minutes, t.Seconds, t.Milliseconds);

                Console.WriteLine($"Lap {currentLap,2}: {timeStr} | Fuel: {currentFuel,5:F1}kg | Wear: {currentTireWear*100,4:F0}% | ERS: {ersMode} | Fuel: {fuelMode} | Tires: {tireCompound}");

                // Add some random events
                var random = new Random();
                if (random.NextDouble() < 0.02) // 2% chance of incident
                {
                    Console.WriteLine("   >> CAUTION: Incident on track!");
                }

                // Check if we need to pit
                if (currentTireWear > 0.85f && currentLap % 15 == 0)
                {
                    Console.WriteLine("   >> PIT STOP: Changing tires and refueling");
                    currentTireWear = 0.1f; // New tires
                    currentFuel = 100.0f;   // Refuel
                    finance.ProcessSponsorship(500000); // Pit stop sponsorship
                }

                // Slow down simulation for readability
                Thread.Sleep(200);
            }

            Console.WriteLine("-----------------------------------------");
            Console.WriteLine("Race Complete!");
            Console.WriteLine(f"Final Budget: ${finance.GetBudget():N0}");

            // Final financial update
            foreach (var team in teams)
            {
                var totalSalary = team.lineup.Sum(d => d.salary);
                if (finance.GetBudget() >= totalSalary)
                {
                    finance.PaySalaries(team.lineup);
                }
            }

            Console.WriteLine(f"Final Budget after salaries: ${finance.GetBudget():N0}");
            Console.WriteLine("Simulation ended.");
        }

        private static float GetFuelModeMultiplier(FuelMode mode)
        {
            return mode switch {
                FuelMode.Lean => 0.9f,
                FuelMode.Standard => 1.0f,
                FuelMode.Rich => 1.2f,
                _ => 1.0f
            };
        }

        private static float GetTireWearMultiplier(string compound, int tireManagement)
        {
            float baseWear = compound.ToLower() switch {
                "soft" => 0.025f,
                "medium" => 0.015f,
                "hard" => 0.008f,
                _ => 0.015f
            };

            // Better tire management reduces wear
            float managementFactor = 1.0f - (tireManagement / 200.0f);
            return baseWear * managementFactor;
        }
    }
}
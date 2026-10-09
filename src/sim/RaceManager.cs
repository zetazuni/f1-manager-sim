using System.Collections.Generic;
using System.Linq;
using F1Manager.Data;

namespace F1Manager.Sim
{
    public class RaceManager
    {
        private SimulationEngine _engine = new SimulationEngine();

        public Dictionary<string, float> RunLap(List<Driver> drivers, List<Team> teams, Track track, int currentLap, Dictionary<string, float> currentFuel)
        {
            var lapTimes = new Dictionary<string, float>();

            foreach (var driver in drivers)
            {
                var team = teams.FirstOrDefault(t => t.name == driver.name); // Simplified lookup
                if (team == null) continue;

                float fuel = currentFuel[driver.name];

                // Simplified simulation: static tire compound for now
                float lapTime = _engine.CalculateLapTime(track, team, driver, currentLap, fuel, "medium", 0.1f);

                lapTimes[driver.name] = lapTime;

                // Consume fuel
                currentFuel[driver.name] -= track.fuelConsumption;
            }

            return lapTimes;
        }
    }
}

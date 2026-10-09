import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import RaceView from './components/RaceView';
import { mockTeams, mockTracks, mockDrivers } from './data/mockData';
import SimulationEngine from './services/SimulationEngine';
import { ERSMode, FuelMode } from './types';

function App() {
  const [team] = useState(mockTeams[0]);
  const [track] = useState(mockTracks[0]);
  const [driver] = useState(mockDrivers[0]);
  const [sim] = useState(new SimulationEngine());

  const [gameState, setGameState] = useState({
    lap: 0,
    fuel: 100,
    tireWear: 0,
    ersMode: ERSMode.Neutral,
    fuelMode: FuelMode.Standard,
    lapTimes: [],
    isRacing: false
  });

  // Simulation Loop lifted to App level
  useEffect(() => {
    let interval = 0;
    if (gameState.isRacing && gameState.lap < track.totalLaps) {
      interval = window.setInterval(() => {
        setGameState(prev => {
          const lapTime = sim.calculateLapTime(
            track, team, driver, prev.lap + 1, prev.fuel, "Medium", prev.tireWear, prev.ersMode, prev.fuelMode
          );

          const fuelCons = sim.calculateFuelConsumption(track, prev.fuelMode);

          const minutes = Math.floor(lapTime / 60);
          const seconds = (lapTime % 60).toFixed(3);
          const lapStr = `${minutes}:${seconds.padStart(6, '0')}`;

          return {
            ...prev,
            lap: prev.lap + 1,
            fuel: Math.max(0, prev.fuel - fuelCons),
            tireWear: Math.min(1, prev.tireWear + 0.02),
            lapTimes: [...prev.lapTimes, lapStr],
            isRacing: prev.lap + 1 < track.totalLaps
          };
        });
      }, 1000);
    }
    return () => window.clearInterval(interval);
  }, [gameState.isRacing, sim, team, track, driver]);

  // Calculate progress for 3D view (0 to 1)
  const lapProgress = gameState.lap / track.totalLaps;

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans p-4">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-black italic text-red-600 tracking-tighter">F1 MANAGER SIMULATOR</h1>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Dashboard
          team={team}
          track={track}
          driver={driver}
          gameState={gameState}
          setGameState={setGameState}
        />
        <div className="bg-slate-800 rounded-xl shadow-2xl overflow-hidden p-4">
            <h2 className="text-xl font-bold mb-4">Race Track</h2>
            <RaceView lapProgress={lapProgress} />
        </div>
      </div>
    </div>
  );
}

export default App;

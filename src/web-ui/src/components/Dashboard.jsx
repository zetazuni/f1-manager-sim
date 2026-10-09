import React, { useState, useEffect } from 'react';
import SimulationEngine from '../services/SimulationEngine';
import { mockTeams, mockTracks, mockDrivers } from '../data/mockData';
import { ERSMode, FuelMode } from '../types';

const Dashboard = () => {
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
    lapTimes: [], // Removed 'as string[]' for JS compatibility
    isRacing: false
  });

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

  return (
    <div className="p-6 bg-slate-900 text-white min-h-screen font-sans">
      <header className="flex justify-between items-center mb-8 border-b border-slate-700 pb-4">
        <div>
          <h1 className="text-3xl font-black italic text-red-600 tracking-tighter">F1 MANAGER <span className="text-white font-normal not-italic text-sm ml-2">SIMULATOR</span></h1>
          <p className="text-slate-400 text-sm uppercase tracking-widest">{track.name} GP - Lap {gameState.lap}/{track.totalLaps}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-500 uppercase">Team Budget</p>
          <p className="text-xl font-mono text-green-400">${team.budget.toLocaleString()}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Telemetry Column */}
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-xl">
          <h2 className="text-lg font-bold mb-4 border-b border-slate-700 pb-2 flex items-center">
            <span className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></span>
            LIVE TELEMETRY
          </h2>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-xs mb-1 uppercase tracking-wider">
                <span>Fuel Load</span>
                <span className={gameState.fuel < 5 ? 'text-red-500' : ''}>{gameState.fuel.toFixed(1)} kg</span>
              </div>
              <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                <div className="bg-yellow-500 h-full transition-all duration-500" style={{width: `${gameState.fuel}%`}}></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1 uppercase tracking-wider">
                <span>Tyre Wear</span>
                <span>{(gameState.tireWear * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full transition-all duration-500" style={{width: `${gameState.tireWear * 100}%`}}></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-900 p-3 rounded border border-slate-700">
                <p className="text-[10px] text-slate-500 uppercase">Current Tyre</p>
                <p className="font-bold text-yellow-500">MEDIUM</p>
              </div>
              <div className="bg-slate-900 p-3 rounded border border-slate-700">
                <p className="text-[10px] text-slate-500 uppercase">Driver</p>
                <p className="font-bold">{driver.name}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Strategy Column */}
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-xl">
          <h2 className="text-lg font-bold mb-4 border-b border-slate-700 pb-2">RACE STRATEGY</h2>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-slate-500 uppercase block mb-2">ERS Deployment</label>
              <div className="grid grid-cols-3 gap-2">
                {[ERSMode.Neutral, ERSMode.Attack, ERSMode.Overtake].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setGameState(s => ({...s, ersMode: mode}))}
                    className={`text-[10px] py-2 rounded border transition-all ${gameState.ersMode === mode ? 'bg-red-600 border-red-500 font-bold' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-500 uppercase block mb-2">Fuel Mapping</label>
              <div className="grid grid-cols-3 gap-2">
                {[FuelMode.Lean, FuelMode.Standard, FuelMode.Rich].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setGameState(s => ({...s, fuelMode: mode}))}
                    className={`text-[10px] py-2 rounded border transition-all ${gameState.fuelMode === mode ? 'bg-blue-600 border-blue-500 font-bold' : 'bg-slate-900 border-slate-700 hover:border-slate-500'}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={() => setGameState(s => ({...s, isRacing: !s.isRacing}))}
                className={`w-full py-4 rounded font-black tracking-widest uppercase shadow-lg transition-all transform active:scale-95 ${gameState.isRacing ? 'bg-yellow-500 hover:bg-yellow-400 text-slate-900' : 'bg-green-600 hover:bg-green-500 text-white'}`}
              >
                {gameState.isRacing ? 'PAUSE SESSION' : 'START SESSION'}
              </button>
            </div>
          </div>
        </div>

        {/* Lap Times Column */}
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-xl overflow-hidden flex flex-col h-full">
          <h2 className="text-lg font-bold mb-4 border-b border-slate-700 pb-2">TIMING SHEET</h2>
          <div className="flex-1 overflow-y-auto space-y-1 pr-2 scrollbar-thin scrollbar-thumb-slate-600">
            {gameState.lapTimes.slice().reverse().map((time, i) => (
              <div key={i} className="flex justify-between text-sm py-1 border-b border-slate-700/50 font-mono">
                <span className="text-slate-500">L{gameState.lapTimes.length - i}</span>
                <span className={i === 0 ? 'text-purple-400 font-bold' : 'text-white'}>{time}</span>
              </div>
            ))}
            {gameState.lapTimes.length === 0 && (
              <p className="text-slate-500 text-center text-xs py-10 italic">No lap data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <footer className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
          <p className="text-[9px] text-slate-500 uppercase tracking-widest">Car Aero</p>
          <p className="text-lg font-bold">{(team.car.aeroHighSpeed * 100).toFixed(0)}</p>
        </div>
        <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
          <p className="text-[9px] text-slate-500 uppercase tracking-widest">Power Unit</p>
          <p className="text-lg font-bold">{(team.car.powerUnit * 100).toFixed(0)}</p>
        </div>
        <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
          <p className="text-[9px] text-slate-500 uppercase tracking-widest">Reliability</p>
          <p className="text-lg font-bold">{(team.car.reliability * 100).toFixed(0)}</p>
        </div>
        <div className="bg-slate-800/50 p-3 rounded border border-slate-700">
          <p className="text-[9px] text-slate-500 uppercase tracking-widest">Weather</p>
          <p className="text-lg font-bold text-blue-400">DRY</p>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;

import React, { useState, useEffect } from 'react';
import SimulationEngine from '../services/SimulationEngine';
import { mockTeams, mockTracks, mockDrivers } from '../data/mockData';
import { ERSMode, FuelMode } from '../types';
import { playClickSound } from '../services/AudioManager';

const Dashboard = ({ team, track, driver, gameState, setGameState }) => {
  const [sim] = useState(new SimulationEngine());

  const handleAction = (actionFn) => {
    playClickSound();
    actionFn();
  };

  const getButtonClass = (isActive, activeColor) =>
    `py-3 px-6 rounded-md font-bold text-sm tracking-widest uppercase transition-all duration-200 ${
      isActive
        ? `${activeColor} shadow-lg ring-1 ring-white/20`
        : 'bg-slate-700/50 hover:bg-slate-600 text-slate-300'
    }`;

  return (
    <div className="bg-slate-800/80 p-8 rounded-2xl border border-slate-700 shadow-2xl backdrop-blur-sm">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-sm text-slate-400 uppercase tracking-widest mb-1">{track.name} GP</h2>
          <p className="text-3xl font-black italic tracking-tighter">LAP {gameState.lap} / {track.totalLaps}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest">Budget</p>
          <p className="text-2xl font-mono text-green-400">${team.budget.toLocaleString()}</p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Telemetry */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Fuel Load</p>
            <div className="text-xl font-mono text-yellow-400">{gameState.fuel.toFixed(1)} <span className="text-xs text-slate-500">KG</span></div>
          </div>
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Tyre Wear</p>
            <div className="text-xl font-mono text-purple-400">{(gameState.tireWear * 100).toFixed(0)} <span className="text-xs text-slate-500">%</span></div>
          </div>
        </div>

        {/* Strategy Controls */}
        <div className="space-y-4">
          <div className="bg-slate-900/30 p-4 rounded-lg border border-slate-700/50">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">ERS Deployment</p>
            <div className="grid grid-cols-3 gap-2">
              {[ERSMode.Neutral, ERSMode.Attack, ERSMode.Overtake].map(mode => (
                <button
                  key={mode}
                  onClick={() => handleAction(() => setGameState(s => ({...s, ersMode: mode})))}
                  className={getButtonClass(gameState.ersMode === mode, 'bg-red-600 text-white')}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/30 p-4 rounded-lg border border-slate-700/50">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">Fuel Mapping</p>
            <div className="grid grid-cols-3 gap-2">
              {[FuelMode.Lean, FuelMode.Standard, FuelMode.Rich].map(mode => (
                <button
                  key={mode}
                  onClick={() => handleAction(() => setGameState(s => ({...s, fuelMode: mode})))}
                  className={getButtonClass(gameState.fuelMode === mode, 'bg-blue-600 text-white')}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => handleAction(() => setGameState(s => ({...s, isRacing: !s.isRacing})))}
          className={`w-full py-5 rounded-xl font-black tracking-widest uppercase shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] ${
            gameState.isRacing
              ? 'bg-amber-500 hover:bg-amber-400 text-slate-900'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {gameState.isRacing ? 'PAUSE SESSION' : 'START SESSION'}
        </button>
      </div>
    </div>
  );
};

export default Dashboard;

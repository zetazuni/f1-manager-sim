import React from 'react';
import { ERSMode, FuelMode } from '../types';

const Dashboard = ({ team, track, driver, gameState, setGameState }) => {

  return (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">{track.name} GP - Lap {gameState.lap}/{track.totalLaps}</h2>
        <p className="text-green-400 font-mono text-lg">${team.budget.toLocaleString()}</p>
      </div>

      <div className="space-y-4">
        <div className="bg-slate-900 p-4 rounded">
          <p className="text-xs text-slate-500 uppercase">Fuel Load</p>
          <div className="w-full bg-slate-700 h-2 rounded-full mt-1">
            <div className="bg-yellow-500 h-full" style={{width: `${gameState.fuel}%`}}></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <button
                onClick={() => setGameState(s => ({...s, ersMode: ERSMode.Attack}))}
                className={`py-2 px-4 rounded ${gameState.ersMode === ERSMode.Attack ? 'bg-red-600' : 'bg-slate-700'}`}
            >
                ERS Attack
            </button>
            <button
                onClick={() => setGameState(s => ({...s, isRacing: !s.isRacing}))}
                className={`py-2 px-4 rounded ${gameState.isRacing ? 'bg-yellow-600' : 'bg-green-600'}`}
            >
                {gameState.isRacing ? 'Pause' : 'Start'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

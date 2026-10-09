import React from 'react';
import Dashboard from './components/Dashboard';
import { mockTeams, mockTracks, mockDrivers } from './data/mockData';

function App() {
  return (
    <div className="App bg-slate-900 min-h-screen text-white p-4">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-black italic text-red-600 tracking-tighter">F1 MANAGER SIMULATOR</h1>
        <p className="text-slate-400 text-sm uppercase tracking-widest">Professional Formula 1 Management Simulator</p>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
        <Dashboard team={mockTeams[0]} track={mockTracks[0]} driver={mockDrivers[0]} />
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 shadow-xl flex flex-col">
          <h2 className="text-xl font-bold mb-4 border-b border-slate-700 pb-2">Race Track Visualization</h2>
          <div className="flex-1 flex items-center justify-center bg-slate-950 rounded border border-slate-700 p-4">
            <div className="text-slate-500 italic text-center">
              <p className="mb-2">3D F1 Car Visualization</p>
              <p className="text-xs">(Isometric View - Press Left Click + Drag to Rotate)</p>
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-400">
            <p>Camera: Orthographic Isometric</p>
            <p>Controls: Left click + drag to rotate</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

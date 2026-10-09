import React from 'react';
import Dashboard from './components/Dashboard';
import { mockTeams, mockTracks, mockDrivers } from './data/mockData';
import RaceView from './components/RaceView';

function App() {
  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">

      {/* Top Bar */}
      <header className="bg-slate-800 border-b border-slate-700 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          <h1 className="text-3xl font-extrabold tracking-tighter text-red-500">F1 MANAGER</h1>
          <p className="text-sm text-slate-400 uppercase tracking-wider">Professional Formula 1 Management Simulator</p>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

        {/* LEFT: Management Dashboard */}
        <section>
          <Dashboard team={mockTeams[0]} track={mockTracks[0]} driver={mockDrivers[0]} />
        </section>

        {/* RIGHT: 3D Race Visualization */}
        <section className="bg-slate-800 rounded-xl shadow-2xl overflow-hidden">
          <RaceView />
        </section>

      </main>

      {/* Footer / Credits */}
      <footer className="mt-8 text-center text-slate-500 text-xs uppercase tracking-wider">
        <p>F1 Manager Simulator | Data-Driven Web Prototype</p>
      </footer>

    </div>
  );
}

export default App;
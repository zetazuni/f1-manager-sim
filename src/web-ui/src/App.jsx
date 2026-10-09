import React from 'react';
import Dashboard from './components/Dashboard';
import RaceView from './components/RaceView';

function App() {
  return (
    <div className="App bg-slate-900 min-h-screen text-white p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RaceView />
        <Dashboard />
      </div>
    </div>
  );
}

export default App;

import React, { useState, useEffect, useRef } from 'react';
import Dashboard from './components/Dashboard';
import RaceView from './components/RaceView';
import RaceSummaryModal from './components/RaceSummaryModal';
import { mockTeams, mockTracks, mockDrivers } from './data/mockData';
import SimulationEngine from './services/SimulationEngine';
import { ERSMode, FuelMode } from './types';

const LAP_MS = 1000; // one simulated lap per real second

function App() {
  const [team] = useState(mockTeams[0]);
  const [track] = useState(mockTracks[0]);
  const [driver] = useState(mockDrivers[0]);
  const [sim] = useState(() => new SimulationEngine());
  const [summaryClosed, setSummaryClosed] = useState(false);

  const [gameState, setGameState] = useState({
    lap: 0,
    fuel: 100,
    tireWear: 0,
    ersMode: ERSMode.Neutral,
    fuelMode: FuelMode.Standard,
    lapTimes: [],
    isRacing: false,
  });

  // Simulation loop
  useEffect(() => {
    let interval = 0;
    if (gameState.isRacing && gameState.lap < track.totalLaps) {
      interval = window.setInterval(() => {
        setGameState((prev) => {
          const nextLap = prev.lap + 1;
          const lapTime = sim.calculateLapTime(
            track, team, driver, nextLap, prev.fuel, 'Medium', prev.tireWear, prev.ersMode, prev.fuelMode,
          );
          const fuelCons = sim.calculateFuelConsumption(track, prev.fuelMode);
          const isFinished = nextLap >= track.totalLaps;

          const minutes = Math.floor(lapTime / 60);
          const seconds = (lapTime % 60).toFixed(3);
          const lapStr = `${minutes}:${seconds.padStart(6, '0')}`;

          return {
            ...prev,
            lap: nextLap,
            fuel: Math.max(0, prev.fuel - fuelCons),
            tireWear: Math.min(1, prev.tireWear + 0.02),
            lapTimes: [...prev.lapTimes, lapStr],
            isRacing: !isFinished,
          };
        });
      }, LAP_MS);
    }
    return () => window.clearInterval(interval);
  }, [gameState.isRacing, gameState.lap, sim, team, track, driver]);

  // The summary is derived from state: open once the last lap is done, until closed
  const showSummary = gameState.lap >= track.totalLaps && !summaryClosed;

  // Smooth car position for the 3D view: lap count + time since the last lap tick
  const carsRef = useRef([]);
  const lapClock = useRef({ lap: 0, at: 0, frac: 0 });
  useEffect(() => {
    lapClock.current = { lap: gameState.lap, at: performance.now(), frac: 0 };
  }, [gameState.lap]);
  useEffect(() => {
    // pausing freezes the car where it is; resuming continues from there
    const c = lapClock.current;
    if (!gameState.isRacing) c.frac = Math.min(0.999, (performance.now() - c.at) / LAP_MS) * (c.at ? 1 : 0);
    else c.at = performance.now() - c.frac * LAP_MS;
  }, [gameState.isRacing]);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const c = lapClock.current;
      const running = gameState.isRacing && c.lap < track.totalLaps;
      const frac = running ? Math.min(0.999, (performance.now() - c.at) / LAP_MS) : c.frac;
      carsRef.current = [{ id: 'player', color: '#1e3a8a', accent: '#e10600', lapFloat: c.lap + frac, lane: 0 }];
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [gameState.isRacing, track.totalLaps]);

  return (
    <div className="min-h-screen font-sans text-white">
      <header className="sticky top-0 z-header border-b-2 border-f1-red bg-slate-950/90 px-4 py-4 backdrop-blur">
        <h1 className="text-center text-3xl font-black italic tracking-tighter text-f1-red md:text-4xl">
          ZETRACE <span className="text-white">F1 MANAGER</span>
        </h1>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-8 p-4 lg:grid-cols-2">
        <Dashboard team={team} track={track} driver={driver} gameState={gameState} setGameState={setGameState} />
        <section className="panel overflow-hidden p-4">
          <h2 className="mb-4 text-xl font-bold">Race Track</h2>
          <RaceView carsRef={carsRef} focusId="player" />
        </section>
      </main>

      <RaceSummaryModal
        isOpen={showSummary}
        onClose={() => setSummaryClosed(true)}
        finalTimes={gameState.lapTimes}
        totalBudget={team.budget}
      />
    </div>
  );
}

export default App;

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Dashboard from './components/Dashboard';
import RaceView from './components/RaceView';
import TimingTower from './components/TimingTower';
import RaceSummaryModal from './components/RaceSummaryModal';
import SimulationEngine from './services/SimulationEngine';
import { GRID_TEAMS, PLAYER_TEAM_ID, RACE_TRACK } from './data/grid';
import { createRace, startRace, step, snapshot, carPose, setStrategy, PIT_LANE } from './game/raceSim';

// Race seconds per real second at "1x": one ~72 s lap in about 1.2 s.
const BASE_SPEED = 60;
const SNAPSHOT_MS = 200;

const newRace = () => createRace({
  teams: GRID_TEAMS, track: RACE_TRACK, engine: new SimulationEngine(), playerTeamId: PLAYER_TEAM_ID,
});

function App() {
  const [firstRace] = useState(newRace);
  const raceRef = useRef(firstRace);
  const carsRef = useRef([]);
  const [snap, setSnap] = useState(() => snapshot(firstRace));
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [summaryClosed, setSummaryClosed] = useState(false);
  const [focusId, setFocusId] = useState(`${PLAYER_TEAM_ID}-0`);

  // One loop: step the sim, feed the 3D view every frame, refresh React a few times a second
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastSnap = 0;
    const tick = (now) => {
      const race = raceRef.current;
      const dt = Math.min(0.5, (now - last) / 1000); // large cap: race speed must not depend on FPS
      last = now;
      if (running && !race.over) step(race, dt * BASE_SPEED * speed);

      // spread cars across the track when they run close together
      const byDistance = race.cars
        .map((c) => ({ c, ...carPose(race, c) }))
        .map(({ c, lapFloat: lf, inPit }) => ({ c, lf, inPit }))
        .sort((a, b) => b.lf - a.lf);
      let prevLf = Infinity;
      let prevLane = 0;
      carsRef.current = byDistance.map(({ c, lf, inPit }) => {
        let lane = 0;
        if (inPit) return { id: c.id, color: c.color, accent: c.accent, lapFloat: lf, lane: PIT_LANE.lateral };
        if (c.dnf) lane = 6;
        else if (prevLf - lf < 0.012) lane = prevLane === 0 ? (c.grid % 2 ? 1.6 : -1.6) : 0;
        if (!c.dnf) { prevLf = lf; prevLane = lane; }
        return { id: c.id, color: c.color, accent: c.accent, lapFloat: lf, lane };
      });

      if (now - lastSnap > SNAPSHOT_MS) {
        lastSnap = now;
        setSnap(snapshot(race));
        if (race.over) setRunning(false);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, speed]);

  const toggleRun = useCallback(() => {
    const race = raceRef.current;
    startRace(race);
    setRunning((r) => !r && !race.over);
  }, []);

  const changeStrategy = useCallback((carId, change) => {
    setStrategy(raceRef.current, carId, change);
    setSnap(snapshot(raceRef.current));
  }, []);

  const restart = useCallback(() => {
    raceRef.current = newRace();
    setSnap(snapshot(raceRef.current));
    setRunning(false);
    setSummaryClosed(false);
  }, []);

  const playerTeam = GRID_TEAMS.find((t) => t.id === PLAYER_TEAM_ID);
  const showSummary = snap.over && !summaryClosed;

  return (
    <div className="min-h-screen font-sans text-white">
      <header className="sticky top-0 z-header border-b-2 border-f1-red bg-slate-950/90 px-4 py-4 backdrop-blur">
        <h1 className="text-center text-3xl font-black italic tracking-tighter text-f1-red md:text-4xl">
          ZETRACE <span className="text-white">F1 MANAGER</span>
        </h1>
      </header>

      <main className="mx-auto grid max-w-[1800px] grid-cols-1 gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,0.9fr)]">
        <Dashboard
          team={playerTeam}
          track={RACE_TRACK}
          snap={snap}
          running={running}
          speed={speed}
          onToggleRun={toggleRun}
          onSpeed={setSpeed}
          onStrategy={changeStrategy}
          onRestart={restart}
          focusId={focusId}
          onFocus={setFocusId}
        />
        <section className="panel overflow-hidden p-4">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-xl font-bold">{RACE_TRACK.name}</h2>
            <p className="label">Click a driver in the tower to follow them</p>
          </div>
          <RaceView carsRef={carsRef} focusId={focusId} teams={GRID_TEAMS} />
        </section>
        <TimingTower snap={snap} focusId={focusId} onFocus={setFocusId} />
      </main>

      <RaceSummaryModal
        isOpen={showSummary}
        onClose={() => setSummaryClosed(true)}
        onRestart={restart}
        snap={snap}
        trackName={RACE_TRACK.name}
      />
    </div>
  );
}

export default App;

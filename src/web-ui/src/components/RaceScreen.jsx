import React, { useState, useEffect, useRef, useCallback } from 'react';
import Dashboard from './Dashboard';
import RaceView from './RaceView';
import TimingTower from './TimingTower';
import RaceSummaryModal from './RaceSummaryModal';
import SimulationEngine from '../services/SimulationEngine';
import { createRace, startRace, step, snapshot, carPose, setStrategy } from '../game/raceSim';

// Race seconds per real second at "1x": one ~75 s lap in about 1.25 s.
const BASE_SPEED = 60;
const SNAPSHOT_MS = 200;

/**
 * One race of the season. Owns the simulation loop; reports the final
 * snapshot through onFinished when the player continues from the result.
 */
const RaceScreen = ({ teams, playerTeamId, track, gridOrder, roundLabel, speed, onSpeed, quality, onFinished }) => {
  const [firstRace] = useState(() => createRace({
    teams, track, engine: new SimulationEngine(), playerTeamId, gridOrder,
  }));
  const raceRef = useRef(firstRace);
  const carsRef = useRef([]);
  const [snap, setSnap] = useState(() => snapshot(firstRace));
  const [running, setRunning] = useState(false);
  const [summaryClosed, setSummaryClosed] = useState(false);
  const [focusId, setFocusId] = useState(`${playerTeamId}-0`);

  // Simulation clock: a timer, independent of rendering. It steps by the real
  // time that passed (up to 2 s), so a slow frame or a background tab never
  // slows the race down. It also refreshes the React snapshot a few times a second.
  useEffect(() => {
    let last = performance.now();
    let lastSnap = 0;
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(2, (now - last) / 1000);
      last = now;
      const race = raceRef.current;
      window.__zetraceRace = race; // read-only test hook
      if (running && !race.over) step(race, dt * BASE_SPEED * speed);
      if (now - lastSnap > SNAPSHOT_MS) {
        lastSnap = now;
        setSnap(snapshot(race));
        if (race.over) setRunning(false);
      }
    }, 50);
    return () => window.clearInterval(id);
  }, [running, speed]);

  // Visuals: every animation frame, place the cars for the 3D view
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const race = raceRef.current;
      // spread cars across the track when they run close together
      const byDistance = race.cars
        .map((c) => {
          const pose = carPose(race, c);
          return { c, lf: pose.lapFloat, inPit: pose.inPit };
        })
        .sort((a, b) => b.lf - a.lf);
      let prevLf = Infinity;
      let prevLane = 0;
      carsRef.current = byDistance.map(({ c, lf, inPit }) => {
        let lane = 0;
        if (inPit) return { id: c.id, color: c.color, accent: c.accent, lapFloat: lf, lane: race.pit.lateral };
        if (c.dnf) lane = 6;
        else if (prevLf - lf < 0.012) lane = prevLane === 0 ? (c.grid % 2 ? 1.6 : -1.6) : 0;
        if (!c.dnf) { prevLf = lf; prevLane = lane; }
        return { id: c.id, color: c.color, accent: c.accent, lapFloat: lf, lane };
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toggleRun = useCallback(() => {
    const race = raceRef.current;
    startRace(race);
    setRunning((r) => !r && !race.over);
  }, []);

  const changeStrategy = useCallback((carId, change) => {
    setStrategy(raceRef.current, carId, change);
    setSnap(snapshot(raceRef.current));
  }, []);

  const finish = useCallback(() => {
    const race = raceRef.current;
    onFinished(snapshot(race), race.fastest?.carId || null);
  }, [onFinished]);

  const playerTeam = teams.find((t) => t.id === playerTeamId);
  const showSummary = snap.over && !summaryClosed;

  return (
    <>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,0.9fr)]">
        <Dashboard
          team={playerTeam}
          track={track}
          snap={snap}
          running={running}
          speed={speed}
          onToggleRun={toggleRun}
          onSpeed={onSpeed}
          onStrategy={changeStrategy}
          onRestart={finish}
          finishLabel="Continue"
          focusId={focusId}
          onFocus={setFocusId}
        />
        <section className="panel overflow-hidden p-4">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="panel-title">{roundLabel} | {track.name}</h2>
            <p className="label hidden sm:block">Scroll to zoom | click a driver to follow</p>
          </div>
          <RaceView carsRef={carsRef} focusId={focusId} teams={teams} track={track} quality={quality} />
        </section>
        <TimingTower snap={snap} focusId={focusId} onFocus={setFocusId} />
      </div>

      <RaceSummaryModal
        isOpen={showSummary}
        onClose={() => setSummaryClosed(true)}
        onRestart={finish}
        restartLabel="Continue"
        snap={snap}
        trackName={track.name}
      />
    </>
  );
};

export default RaceScreen;

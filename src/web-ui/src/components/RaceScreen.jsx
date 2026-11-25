import React, { useState, useEffect, useRef, useCallback } from 'react';
import Dashboard from './Dashboard';
import RaceView from './RaceView';
import TimingTower from './TimingTower';
import RaceSummaryModal from './RaceSummaryModal';
import StartLights from './StartLights';
import MiniMap from './MiniMap';
import { playLightBeep, playLightsOut } from '../services/AudioManager';
import SimulationEngine from '../services/SimulationEngine';
import { createRace, startRace, step, snapshot, carPose, setStrategy, safetyCarPose, wetnessAt, order, setTeamOrder } from '../game/raceSim';

// Race seconds per real second at "1x": one ~75 s lap in about 1.25 s.
const BASE_SPEED = 60;
const SNAPSHOT_MS = 200;

/**
 * One race of the season. Owns the simulation loop; reports the final
 * snapshot through onFinished when the player continues from the result.
 */
const RaceScreen = ({ teams: teamsAtStart, playerTeamId, track, gridOrder, practice = {}, roundLabel, speed, onSpeed, quality, onFinished }) => {
  // Cars are frozen for the race: upgrades bought mid-race arrive at the next round
  const [teams] = useState(teamsAtStart);
  const [firstRace] = useState(() => createRace({
    teams, track, engine: new SimulationEngine(), playerTeamId, gridOrder, practice,
  }));
  const raceRef = useRef(firstRace);
  const carsRef = useRef([]);
  const weatherRef = useRef(0);
  const [snap, setSnap] = useState(() => snapshot(firstRace));
  const [running, setRunning] = useState(false);
  const [summaryClosed, setSummaryClosed] = useState(false);
  const [focusId, setFocusId] = useState(`${playerTeamId}-0`);
  const [lights, setLights] = useState(null); // start sequence: 0-5 lights, 'out', or null
  const lightTimers = useRef([]);
  useEffect(() => () => lightTimers.current.forEach(clearTimeout), []);

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
    let lastFrame = performance.now();
    const tick = (now = performance.now()) => {
      const frameDt = Math.min(1, (now - lastFrame) / 1000);
      lastFrame = now;
      const race = raceRef.current;
      // spread cars across the track when they run close together
      const byDistance = race.cars
        .map((c) => {
          const pose = carPose(race, c);
          return { c, lf: pose.lapFloat, inPit: pose.inPit, gridLane: pose.gridLane };
        })
        .sort((a, b) => b.lf - a.lf);
      let prevLf = Infinity;
      let prevLane = 0;
      carsRef.current = byDistance.map(({ c, lf, inPit, gridLane }) => {
        let lane = 0;
        // on the grid and through the first metres: staggered grid lanes
        if (gridLane !== undefined && lf < 0.02) return { id: c.id, color: c.color, accent: c.accent, lapFloat: lf, lane: gridLane, isPlayer: c.isPlayer };
        if (inPit) return { id: c.id, color: c.color, accent: c.accent, lapFloat: lf, lane: race.pit.lateral, isPlayer: c.isPlayer };
        if (c.dnf) lane = 6;
        else if (prevLf - lf < 0.012) lane = prevLane === 0 ? (c.grid % 2 ? 1.6 : -1.6) : 0;
        if (!c.dnf) { prevLf = lf; prevLane = lane; }
        return { id: c.id, color: c.color, accent: c.accent, lapFloat: lf, lane, isPlayer: c.isPlayer };
      });
      const sc = safetyCarPose(race);
      if (sc) carsRef.current.push({ id: 'safety-car', lapFloat: sc.lapFloat, lane: 0 });
      const leader = order(race)[0];
      // smooth the wetness over about a second so the light fades instead of stepping
      const target = leader ? wetnessAt(race, leader.lapsDone + 1) : 0;
      weatherRef.current += (target - weatherRef.current) * Math.min(1, frameDt * 1.5);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const toggleRun = useCallback(() => {
    const race = raceRef.current;
    if (race.started) {
      setRunning((r) => !r && !race.over);
      return;
    }
    if (lights !== null) return; // start sequence already running
    // Five red lights, one every 0.6 s, then a random hold before lights out
    const later = (fn, ms) => lightTimers.current.push(setTimeout(fn, ms));
    setLights(0);
    for (let i = 1; i <= 5; i++) later(() => { setLights(i); playLightBeep(); }, i * 600);
    const hold = 3000 + 300 + Math.random() * 900;
    later(() => {
      setLights('out');
      playLightsOut();
      startRace(race);
      setRunning(true);
    }, hold);
    later(() => setLights(null), hold + 1100);
  }, [lights]);

  const changeStrategy = useCallback((carId, change) => {
    setStrategy(raceRef.current, carId, change);
    setSnap(snapshot(raceRef.current));
  }, []);

  const teamOrder = useCallback((o) => {
    setTeamOrder(raceRef.current, playerTeamId, o);
    setSnap(snapshot(raceRef.current));
  }, [playerTeamId]);

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
          onTeamOrder={teamOrder}
          onRestart={finish}
          finishLabel="Continue"
          focusId={focusId}
          onFocus={setFocusId}
        />
        <section className="panel relative overflow-hidden p-4">
          <StartLights lit={lights} />
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="panel-title">{roundLabel} | {track.name}</h2>
            <p className="label hidden sm:block">Scroll to zoom | click a driver to follow</p>
          </div>
          <div className="relative">
            <RaceView carsRef={carsRef} weatherRef={weatherRef} focusId={focusId} teams={teams} track={track} quality={quality} />
            <MiniMap carsRef={carsRef} points={track.points} focusId={focusId} />
          </div>
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

// Race sim self-test. Run in the browser through the Vite dev server:
//   node tools/check-ui.mjs http://localhost:5173/ <outDir> tools/checks/m2-sim.json
// run() returns { pass, failures, stats }.
import SimulationEngine from '../services/SimulationEngine';
import { GRID_TEAMS, PLAYER_TEAM_ID } from '../data/grid';
import { mockTracks } from '../data/mockData';
import { createRace, step, snapshot, lapFloat, setStrategy, FUEL, ERS } from './raceSim';

function runRace(seed, tweak) {
  const race = createRace({ teams: GRID_TEAMS, track: mockTracks[0], engine: new SimulationEngine(), playerTeamId: PLAYER_TEAM_ID, seed });
  if (tweak) tweak(race);
  race.started = true;
  let guard = 0;
  let maxLapFloatJump = 0;
  const prevLf = new Map();
  while (!race.over && guard++ < 200000) {
    step(race, 0.5);
    for (const c of race.cars) {
      const lf = lapFloat(race, c);
      const p = prevLf.get(c.id);
      if (p !== undefined) maxLapFloatJump = Math.max(maxLapFloatJump, Math.abs(lf - p));
      prevLf.set(c.id, lf);
    }
  }
  return { race, snap: snapshot(race), maxLapFloatJump, guard };
}

export function run() {
  const failures = [];
  const ok = (cond, msg) => { if (!cond) failures.push(msg); };

  const seeds = [1, 2, 3, 4, 5];
  const stats = [];
  seeds.forEach((seed) => {
    const { race, snap, maxLapFloatJump } = runRace(seed);
    ok(race.over, `seed ${seed}: race never ended`);
    ok(snap.rows.length === 20, `seed ${seed}: expected 20 rows`);
    const classified = snap.rows.filter((r) => !r.dnf);
    ok(classified.every((r) => r.finished), `seed ${seed}: a running car was not classified`);
    ok(snap.rows[0].lapsDone === 78, `seed ${seed}: winner did ${snap.rows[0].lapsDone} laps`);
    ok(classified.every((r, i) => i === 0 || r.lapsDone <= classified[i - 1].lapsDone), `seed ${seed}: order not by laps`);
    const pts = snap.rows.reduce((a, r) => a + r.points, 0);
    ok(pts === 101 || classified.length < 10, `seed ${seed}: points total ${pts}`);
    const laps = race.cars.filter((c) => c.bestLap).map((c) => c.bestLap);
    ok(laps.every((t) => t > 70 && t < 82), `seed ${seed}: odd best lap ${Math.min(...laps)}-${Math.max(...laps)}`);
    ok(maxLapFloatJump < 0.05, `seed ${seed}: car teleported (jump ${maxLapFloatJump.toFixed(3)})`);
    const passes = race.events.filter((e) => e.message.includes(' passes ')).length;
    const gridChanged = snap.rows.filter((r) => !r.dnf && r.grid !== r.pos).length;
    stats.push({ seed, winner: snap.rows[0].name, dnf: 20 - classified.length, gridChanged, passesLogged: passes });
  });
  ok(stats.some((s) => s.gridChanged > 0), 'no position ever changed from the grid in 5 races');

  // Rich fuel for the whole race should run a player car dry
  const rich = runRace(9, (race) => race.cars.filter((c) => c.isPlayer).forEach((c) => setStrategy(race, c.id, { fuelMode: FUEL.Rich })));
  const richPlayer = rich.race.cars.filter((c) => c.isPlayer);
  ok(richPlayer.every((c) => c.dnf === 'Out of fuel'), `rich fuel all race should run out: ${richPlayer.map((c) => c.dnf).join(',')}`);

  // Overtake ERS should make the player faster on average than Neutral (same seed)
  const neutral = runRace(11);
  const attack = runRace(11, (race) => race.cars.filter((c) => c.isPlayer).forEach((c) => setStrategy(race, c.id, { ersMode: ERS.Overtake, fuelMode: FUEL.Lean })));
  const avgPos = (r) => r.snap.rows.filter((x) => x.isPlayer).reduce((a, x) => a + x.pos, 0) / 2;
  stats.push({ neutralAvgPos: avgPos(neutral), overtakeLeanAvgPos: avgPos(attack) });

  return { pass: failures.length === 0, failures, stats };
}

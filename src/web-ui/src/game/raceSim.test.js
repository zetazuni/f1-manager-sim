// Race sim self-test. Run in the browser through the Vite dev server:
//   node tools/check-ui.mjs http://localhost:5173/ <outDir> tools/checks/m2-sim.json
// run() returns { pass, failures, stats }.
import SimulationEngine from '../services/SimulationEngine';
import { GRID_TEAMS, PLAYER_TEAM_ID } from '../data/grid';
import { mockTracks } from '../data/mockData';
import { createRace, startRace, step, snapshot, lapFloat, setStrategy, FUEL, ERS } from './raceSim';
import { CALENDAR } from '../data/calendar';
import { createSeason, runQualifying, recordRace, advance, standings, raceTrackOf } from './season';

function runRace(seed, tweak) {
  const race = createRace({ teams: GRID_TEAMS, track: mockTracks[0], engine: new SimulationEngine(), playerTeamId: PLAYER_TEAM_ID, seed });
  if (tweak) tweak(race);
  startRace(race);
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
    const classifiedCars = race.cars.filter((c) => c.finished && !c.isPlayer);
    ok(classifiedCars.every((c) => c.stops >= 1), `seed ${seed}: an AI car finished 78 laps without stopping`);
    const aiPenalties = classifiedCars.filter((c) => c.penalty > 0).length;
    ok(aiPenalties <= 2, `seed ${seed}: ${aiPenalties} AI cars broke the two-compound rule`);
    const passes = race.events.filter((e) => e.message.includes(' passes ')).length;
    const gridChanged = snap.rows.filter((r) => !r.dnf && r.grid !== r.pos).length;
    const stopsHist = {};
    race.cars.forEach((c) => { stopsHist[c.stops] = (stopsHist[c.stops] || 0) + 1; });
    stats.push({ seed, winner: snap.rows[0].name, dnf: 20 - classified.length, gridChanged, passesLogged: passes, stopsHist, aiPenalties });
  });
  ok(stats.some((s) => s.gridChanged > 0), 'no position ever changed from the grid in 5 races');

  // Rich fuel for the whole race should run a player car dry
  const rich = runRace(9, (race) => race.cars.filter((c) => c.isPlayer).forEach((c) => setStrategy(race, c.id, { fuelMode: FUEL.Rich })));
  const richPlayer = rich.race.cars.filter((c) => c.isPlayer);
  ok(richPlayer.every((c) => c.dnf === 'Out of fuel'), `rich fuel all race should run out: ${richPlayer.map((c) => c.dnf).join(',')}`);

  // Player never pits: worn tyres must hurt (puncture or penalty) and cost places
  const noStop = runRace(21);
  const ns = noStop.race.cars.filter((c) => c.isPlayer);
  const hurt = ns.every((c) => c.dnf || c.penalty > 0 || c.stops > 0);
  ok(hurt, 'a player car that never pits got away with it');
  // Same race with the engineer (AI) running the player's strategy
  const engineer = runRace(21, (race) => race.cars.filter((c) => c.isPlayer).forEach((c) => setStrategy(race, c.id, { autoAi: true })));
  const posOf = (r, c) => (c.dnf ? 21 : r.snap.rows.find((x) => x.id === c.id).pos);
  const nsAvg = ns.reduce((a, c) => a + posOf(noStop, c), 0) / 2;
  const engAvg = engineer.race.cars.filter((c) => c.isPlayer).reduce((a, c) => a + posOf(engineer, c), 0) / 2;
  ok(engAvg < nsAvg, `engineer strategy (avg P${engAvg}) should beat never pitting (avg P${nsAvg})`);
  stats.push({ noStopAvgPos: nsAvg, engineerAvgPos: engAvg });

  // Overtake ERS should make the player faster on average than Neutral (same seed)
  const neutral = runRace(11);
  const attack = runRace(11, (race) => race.cars.filter((c) => c.isPlayer).forEach((c) => setStrategy(race, c.id, { ersMode: ERS.Overtake, fuelMode: FUEL.Lean })));
  const avgPos = (r) => r.snap.rows.filter((x) => x.isPlayer).reduce((a, x) => a + x.pos, 0) / 2;
  stats.push({ neutralAvgPos: avgPos(neutral), overtakeLeanAvgPos: avgPos(attack) });

  // A full season on every calendar circuit, engineer running the player's cars
  let season = createSeason({ teams: GRID_TEAMS, calendar: CALENDAR, playerTeamId: PLAYER_TEAM_ID, seed: 5 });
  const perTrack = [];
  while (season.phase !== 'done') {
    const cal = CALENDAR[season.round];
    const track = raceTrackOf(cal);
    const engine = new SimulationEngine();
    const quali = runQualifying({ teams: GRID_TEAMS, track, engine, playerTeamId: PLAYER_TEAM_ID, modes: {}, seed: 100 + season.round });
    ok(quali.length === 20 && quali[0].pos === 1, `${cal.id}: qualifying table broken`);
    const race = createRace({ teams: GRID_TEAMS, track, engine, playerTeamId: PLAYER_TEAM_ID, seed: 200 + season.round, gridOrder: quali.map((q) => q.carId) });
    ok(race.cars.find((c) => c.id === quali[0].carId).grid === 0, `${cal.id}: pole sitter not on pole`);
    race.cars.filter((c) => c.isPlayer).forEach((c) => setStrategy(race, c.id, { autoAi: true }));
    startRace(race);
    let guard = 0;
    while (!race.over && guard++ < 200000) step(race, 0.5);
    ok(race.over, `${cal.id}: race never ended`);
    const snap = snapshot(race);
    ok(snap.rows[0].lapsDone === cal.laps, `${cal.id}: winner did ${snap.rows[0].lapsDone}/${cal.laps} laps`);
    const best = Math.min(...race.cars.filter((c) => c.bestLap).map((c) => c.bestLap));
    ok(best > cal.baseLapTime - 4 && best < cal.baseLapTime + 6, `${cal.id}: best lap ${best.toFixed(2)} vs base ${cal.baseLapTime}`);
    const outOfFuel = race.cars.filter((c) => c.dnf === 'Out of fuel').length;
    ok(outOfFuel === 0, `${cal.id}: ${outOfFuel} cars ran out of fuel on Standard mapping`);
    perTrack.push({ track: cal.id, winner: snap.rows[0].name, dnf: snap.rows.filter((r) => r.dnf).length, playerBest: Math.min(...snap.rows.filter((r) => r.isPlayer).map((r) => r.pos)) });
    season = advance(recordRace(season, cal.id, snap.rows, race.fastest?.carId));
  }
  const tables = standings(season, GRID_TEAMS);
  const driverSum = tables.drivers.reduce((a, d) => a + d.points, 0);
  const teamSum = tables.teams.reduce((a, t) => a + t.points, 0);
  ok(driverSum === teamSum, `driver points ${driverSum} != team points ${teamSum}`);
  ok(season.results.length === CALENDAR.length, 'not every round was recorded');
  ok(tables.drivers.every((d, i) => i === 0 || d.points <= tables.drivers[i - 1].points), 'driver table not sorted');
  stats.push({ season: perTrack, champion: tables.drivers[0].name, champPoints: tables.drivers[0].points, totalPoints: driverSum });

  return { pass: failures.length === 0, failures, stats };
}

// Race sim self-test. Run in the browser through the Vite dev server:
//   node tools/check-ui.mjs http://localhost:5173/ <outDir> tools/checks/m2-sim.json
// run() returns { pass, failures, stats }.
import SimulationEngine from '../services/SimulationEngine';
import { GRID_TEAMS, PLAYER_TEAM_ID, CALENDAR } from '../data/season';
import { mockTracks } from '../data/mockData';
import { createRace, startRace, step, snapshot, lapFloat, setStrategy, setTeamOrder, FUEL, ERS } from './raceSim';
import { createSeason, runQualifying, recordRace, advance, standings, raceTrackOf } from './season';
import { teamsWithCars, startProject, carRating } from './factory';
import { teamsForSeason, startOffSeason, signDriver, finishOffSeason, marketList, updateMorale, withMorale } from './career';

const CARS = GRID_TEAMS.length * 2;
const ME = PLAYER_TEAM_ID;
const [MATE_A, MATE_B] = GRID_TEAMS.find((t) => t.id === ME).drivers.map((d) => d.name);

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
    ok(snap.rows.length === CARS, `seed ${seed}: expected ${CARS} rows`);
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
    stats.push({ seed, winner: snap.rows[0].name, dnf: CARS - classified.length, gridChanged, passesLogged: passes, stopsHist, aiPenalties });
  });
  ok(stats.some((s) => s.gridChanged > 0), 'no position ever changed from the grid in 5 races');

  // Rich fuel for the whole race should run a player car dry
  const rich = runRace(9, (race) => race.cars.filter((c) => c.isPlayer).forEach((c) => setStrategy(race, c.id, { fuelMode: FUEL.Rich })));
  const richPlayer = rich.race.cars.filter((c) => c.isPlayer);
  // (a car can crash before it runs dry; every other one must run out)
  ok(richPlayer.every((c) => c.dnf === 'Out of fuel' || c.dnf === 'Crashed') && richPlayer.some((c) => c.dnf === 'Out of fuel'),
    `rich fuel all race should run out: ${richPlayer.map((c) => c.dnf).join(',')}`);

  // Player never pits: worn tyres must hurt (puncture or penalty) and cost places
  const noStop = runRace(21);
  const ns = noStop.race.cars.filter((c) => c.isPlayer);
  const hurt = ns.every((c) => c.dnf || c.penalty > 0 || c.stops > 0);
  ok(hurt, 'a player car that never pits got away with it');
  // Engineer (AI) strategy vs never pitting, averaged over five seeds (crashes
  // make a single race too noisy to compare two cars)
  const posOf = (r, c) => (c.dnf ? 21 : r.snap.rows.find((x) => x.id === c.id).pos);
  let nsSum = 0;
  let engSum = 0;
  [21, 22, 23, 24, 25].forEach((sd) => {
    const a = runRace(sd);
    const b = runRace(sd, (race) => race.cars.filter((c) => c.isPlayer).forEach((c) => setStrategy(race, c.id, { autoAi: true })));
    nsSum += a.race.cars.filter((c) => c.isPlayer).reduce((x, c) => x + posOf(a, c), 0);
    engSum += b.race.cars.filter((c) => c.isPlayer).reduce((x, c) => x + posOf(b, c), 0);
  });
  const nsAvg = nsSum / 10;
  const engAvg = engSum / 10;
  ok(engAvg < nsAvg, `engineer strategy (avg P${engAvg}) should beat never pitting (avg P${nsAvg})`);
  stats.push({ noStopAvgPos: nsAvg, engineerAvgPos: engAvg });

  // Overtake ERS should make the player faster on average than Neutral (same seed)
  const neutral = runRace(11);
  const attack = runRace(11, (race) => race.cars.filter((c) => c.isPlayer).forEach((c) => setStrategy(race, c.id, { ersMode: ERS.Overtake, fuelMode: FUEL.Lean })));
  const avgPos = (r) => r.snap.rows.filter((x) => x.isPlayer).reduce((a, x) => a + x.pos, 0) / 2;
  stats.push({ neutralAvgPos: avgPos(neutral), overtakeLeanAvgPos: avgPos(attack) });

  // Practice programmes and team orders
  const runWith = (seed, practice, tweak) => {
    const race = createRace({ teams: GRID_TEAMS, track: mockTracks[0], engine: new SimulationEngine(), playerTeamId: PLAYER_TEAM_ID, seed, practice });
    race.cars.filter((c) => c.isPlayer).forEach((c) => setStrategy(race, c.id, { autoAi: true }));
    startRace(race);
    let guard = 0;
    while (!race.over && guard++ < 200000) {
      step(race, 0.5);
      if (tweak) tweak(race);
    }
    return race;
  };
  const playerPos = (race) => snapshot(race).rows.filter((r) => r.isPlayer).reduce((x, r) => x + (r.dnf ? CARS + 1 : r.pos), 0) / 2;
  // practice draws no random numbers, so lap 1 of the same seed differs by the bonus only
  const lap1 = (practice) => {
    // on pole, so no car ahead can hold it up and hide the difference
    const gridOrder = [`${ME}-0`, ...GRID_TEAMS.flatMap((t) => t.drivers.map((_, i) => `${t.id}-${i}`)).filter((id) => id !== `${ME}-0`)];
    const race = createRace({ teams: GRID_TEAMS, track: mockTracks[0], engine: new SimulationEngine(), playerTeamId: PLAYER_TEAM_ID, seed: 41, practice, gridOrder });
    startRace(race);
    return race.cars.find((c) => c.id === `${ME}-0`).lapTime;
  };
  const setupGain = lap1({}) - lap1({ [`${ME}-0`]: 'setup' });
  ok(Math.abs(setupGain - 0.18) < 0.01, `setup work should be worth 0.18 s on lap 1, got ${setupGain.toFixed(3)}`);
  const noPrac = playerPos(runWith(41, {}));
  const setupPrac = playerPos(runWith(41, { [`${ME}-0`]: 'setup', [`${ME}-1`]: 'setup' }));

  const holdRace = runWith(44, {}, (race) => setTeamOrder(race, PLAYER_TEAM_ID, 'hold'));
  const teamPasses = holdRace.events.filter((e) => e.message.includes(`${MATE_A} passes ${MATE_B}`) || e.message.includes(`${MATE_B} passes ${MATE_A}`)).length;
  ok(teamPasses === 0, `teammates passed each other ${teamPasses} times under hold`);

  let swapAsked = null;
  let swapDone = false;
  runWith(45, {}, (race) => {
    const [a, b] = race.cars.filter((c) => c.isPlayer && !c.dnf && !c.finished);
    if (!a || !b) return;
    const ahead = a.lapsDone > b.lapsDone || (a.lapsDone === b.lapsDone && a.lapStart < b.lapStart) ? a : b;
    const behind = ahead === a ? b : a;
    if (!swapAsked && a.lapsDone === b.lapsDone && a.lapsDone > 3 && behind.lapStart - ahead.lapStart < 2.5) {
      swapAsked = { ahead: ahead.id, lap: ahead.lapsDone };
      setTeamOrder(race, PLAYER_TEAM_ID, 'swap');
    } else if (swapAsked && !swapDone && behind.lapsDone <= swapAsked.lap + 3 && ahead.id !== swapAsked.ahead) {
      swapDone = true;
    }
  });
  ok(!swapAsked || swapDone, 'swap order did not change the order of the two cars');
  stats.push({ practice: { lap1Gain: +setupGain.toFixed(3), none: noPrac, setup: setupPrac }, holdTeamPasses: teamPasses, swapAsked: !!swapAsked, swapDone });

  // Rain: force a wet race and check that teams react and that it costs time
  const wetStats = [];
  let scBunchChecks = 0;
  let scBunchFails = 0;
  for (const seed of [31, 32, 33, 34, 35, 36]) {
    const track = { ...raceTrackOf(CALENDAR[5]), rainChance: 1 };
    const race = createRace({ teams: GRID_TEAMS, track, engine: new SimulationEngine(), playerTeamId: PLAYER_TEAM_ID, seed });
    race.cars.filter((c) => c.isPlayer).forEach((c) => setStrategy(race, c.id, { autoAi: true }));
    startRace(race);
    let guard = 0;
    let checkedSc = null;
    while (!race.over && guard++ < 200000) {
      step(race, 0.5);
      const leader = race.cars.filter((c) => !c.dnf && !c.finished).sort((a, b) => b.lapsDone - a.lapsDone || a.lapStart - b.lapStart)[0];
      if (race.sc && leader && checkedSc !== race.sc && leader.lapsDone >= race.sc.startLap + 2) {
        checkedSc = race.sc;
        scBunchChecks++;
        const sameLap = race.cars.filter((c) => !c.dnf && !c.finished && c.lapsDone === leader.lapsDone).sort((a, b) => a.lapStart - b.lapStart);
        const spread = sameLap.length > 1 ? sameLap[Math.min(9, sameLap.length - 1)].lapStart - sameLap[0].lapStart : 0;
        if (spread > 14) scBunchFails++;
      }
    }
    ok(race.over, `wet seed ${seed}: race never ended`);
    const rain = race.weather.rain;
    ok(!!rain, `wet seed ${seed}: no rain generated with rainChance 1`);
    const wetUsers = race.cars.filter((c) => c.compoundsUsed.some((k) => k === 'I' || k === 'W')).length;
    if (rain && rain.peak > 0.45) ok(wetUsers >= 12, `wet seed ${seed}: only ${wetUsers} cars fitted wet tyres (peak ${rain.peak.toFixed(2)})`);
    wetStats.push({ seed, peak: rain && +rain.peak.toFixed(2), start: rain && rain.start, wetUsers, safetyCars: race.scCount, crashes: race.cars.filter((c) => c.dnf === 'Crashed').length });
  }
  ok(scBunchFails === 0, `${scBunchFails}/${scBunchChecks} safety car periods did not bunch the field`);
  stats.push({ wet: wetStats, scBunchChecks });

  // A full season on every calendar circuit, engineer running the player's cars
  let season = createSeason({ teams: GRID_TEAMS, calendar: CALENDAR, playerTeamId: PLAYER_TEAM_ID, seed: 5 });
  const perTrack = [];
  while (season.phase !== 'done') {
    const cal = CALENDAR[season.round];
    const track = raceTrackOf(cal);
    const engine = new SimulationEngine();
    // the player buys a medium power unit upgrade whenever the factory has room
    const buy = startProject(season, PLAYER_TEAM_ID, ['powerUnit', 'chassisWeight', 'aeroLowSpeed'][season.round % 3], 'medium');
    if (buy.ok) season = buy.season;
    const raceTeams = teamsWithCars(GRID_TEAMS, season.teams);
    const quali = runQualifying({ teams: raceTeams, track, engine, playerTeamId: PLAYER_TEAM_ID, modes: {}, seed: 100 + season.round });
    ok(quali.length === CARS && quali[0].pos === 1, `${cal.id}: qualifying table broken`);
    const race = createRace({ teams: raceTeams, track, engine, playerTeamId: PLAYER_TEAM_ID, seed: 200 + season.round, gridOrder: quali.map((q) => q.carId) });
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
    season = advance(recordRace(season, cal.id, snap.rows, race.fastest?.carId, GRID_TEAMS, [], race.fastest?.time));
  }
  const tables = standings(season, GRID_TEAMS);
  const driverSum = tables.drivers.reduce((a, d) => a + d.points, 0);
  const teamSum = tables.teams.reduce((a, t) => a + t.points, 0);
  ok(driverSum === teamSum, `driver points ${driverSum} != team points ${teamSum}`);
  ok(season.results.length === CALENDAR.length, 'not every round was recorded');
  ok(CALENDAR.every((c) => season.career.records[c.id]?.lap?.time > 0), 'a circuit has no lap record');
  ok(tables.drivers.every((d, i) => i === 0 || d.points <= tables.drivers[i - 1].points), 'driver table not sorted');
  // finances and development
  const budgets = Object.values(season.teams).map((t) => t.budget);
  ok(budgets.every(Number.isFinite), 'a team budget is not a number');
  const ratingStart = GRID_TEAMS.map((t) => carRating(t.car));
  const ratingEnd = GRID_TEAMS.map((t) => carRating(season.teams[t.id].car));
  const improved = ratingEnd.filter((r, i) => r > ratingStart[i]).length;
  ok(improved >= 6, `only ${improved} teams improved their car over a season`);
  ok(season.ledger.length >= CALENDAR.length * 4, `ledger has ${season.ledger.length} lines`);
  ok(Object.values(season.teams).every((t) => Object.values(t.car).every((v) => v <= 0.995)), 'a car stat broke the ceiling');
  stats.push({ season: perTrack, champion: tables.drivers[0].name, champPoints: tables.drivers[0].points, totalPoints: driverSum,
    playerBudgetEnd: season.teams[PLAYER_TEAM_ID].budget, ratingGain: GRID_TEAMS.map((t, i) => `${t.short} ${(ratingEnd[i] - ratingStart[i]).toFixed(1)}`).join(', ') });

  // Career: off-season, driver market and a second season
  const spread = (sea) => {
    const r = GRID_TEAMS.map((t) => carRating(sea.teams[t.id].car));
    const avg = r.reduce((x, y) => x + y, 0) / r.length;
    return Math.sqrt(r.reduce((x, y) => x + (y - avg) ** 2, 0) / r.length);
  };
  const spreadBefore = spread(season);
  const tablesEnd = standings(season, teamsForSeason(GRID_TEAMS, season));
  const agesBefore = Object.fromEntries(Object.values(season.career.drivers).map((d) => [d.id, d.age]));
  let off = startOffSeason(season, GRID_TEAMS, tablesEnd.teams);
  ok(off.phase === 'market', 'off-season did not open the market');
  ok(Object.values(off.career.drivers).every((d) => d.retired || d.age === agesBefore[d.id] + 1), 'drivers did not age by one year');
  const target = marketList(off.career, PLAYER_TEAM_ID).find((d) => !d.contract);
  const teamPos = tablesEnd.teams.findIndex((t) => t.isPlayer) + 1;
  const signed = signDriver(off, PLAYER_TEAM_ID, target.id, 1, 2, teamPos);
  ok(signed.ok, `could not sign ${target.name}: ${signed.reason}`);
  off = signed.season;
  let season2 = finishOffSeason(off, GRID_TEAMS, PLAYER_TEAM_ID, tablesEnd.teams);
  const seats = Object.values(season2.career.lineups).flat();
  ok(seats.every(Boolean), 'an empty seat after the off-season');
  ok(new Set(seats).size === seats.length, 'a driver sits in two seats');
  ok(season2.career.lineups[PLAYER_TEAM_ID][1] === target.id, 'signed driver is not in the chosen seat');
  ok(season2.career.year === season.career.year + 1, 'year did not advance');
  ok(season2.career.records?.[CALENDAR[0].id]?.winners.length === 1, 'track records did not survive into season 2');
  ok(season2.results.length === 0 && Object.values(season2.driverPoints).every((p) => p === 0), 'points not reset');
  ok(spread(season2) < spreadBefore, `regulation reset did not close the field (${spreadBefore.toFixed(2)} -> ${spread(season2).toFixed(2)})`);
  // race one round of season 2 with the new lineups
  const t2 = teamsForSeason(GRID_TEAMS, season2);
  const r2 = createRace({ teams: t2, track: raceTrackOf(CALENDAR[0]), engine: new SimulationEngine(), playerTeamId: PLAYER_TEAM_ID, seed: 77 });
  startRace(r2);
  let g2 = 0;
  while (!r2.over && g2++ < 200000) step(r2, 0.5);
  ok(r2.over, 'season 2 race did not finish');
  ok(snapshot(r2).rows.some((r) => r.name === target.name), 'new signing did not race');
  season2 = recordRace(season2, CALENDAR[0].id, snapshot(r2).rows, r2.fastest?.carId, t2);
  ok(Number.isFinite(season2.teams[PLAYER_TEAM_ID].budget), 'budget broke in season 2');
  // Morale
  const morales = Object.values(season2.career.drivers).map((d) => d.morale);
  ok(morales.every((m) => m >= 0 && m <= 100), 'morale out of range');
  ok((season2.moraleChanges || []).some((m) => m.after !== m.before), 'morale never changed after a race');
  const rowsNow = snapshot(r2).rows;
  const base = structuredClone(season2);
  const withSwap = structuredClone(season2);
  updateMorale(base, t2, rowsNow, []);
  updateMorale(withSwap, t2, rowsNow, [{ yielded: `${ME}-0`, gained: `${ME}-1` }]);
  const idOf = (sea, seat) => sea.career.lineups[ME][seat];
  ok(withSwap.career.drivers[idOf(withSwap, 0)].morale < base.career.drivers[idOf(base, 0)].morale, 'yielding driver should lose morale');
  ok(withSwap.career.drivers[idOf(withSwap, 1)].morale > base.career.drivers[idOf(base, 1)].morale, 'driver let through should gain morale');
  const happy = withMorale({ ...GRID_TEAMS[0].drivers[0], morale: 95 });
  const sad = withMorale({ ...GRID_TEAMS[0].drivers[0], morale: 15 });
  ok(happy.consistency > sad.consistency && happy.pace > sad.pace, 'morale should change consistency and pace');

  stats.push({ career: { year2: season2.career.year, signed: target.name, spreadBefore: +spreadBefore.toFixed(2), spreadAfter: +spread(season2).toFixed(2), retired: off.offseasonNews } });

  return { pass: failures.length === 0, failures, stats };
}

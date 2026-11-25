// Full-grid race simulation. Pure logic: no React, no PlayCanvas.
//
// Model: one race clock (seconds). Each car knows when it started its current
// lap and how long that lap will take. When the clock passes that time the lap
// is completed and the next lap time is decided immediately, including
// whether the car gets past the car ahead or is held up in dirty air.
// Positions between lines are interpolated, so overtakes decided at the start
// of a lap play out visibly on the 3D track during that lap.

import { POINTS } from '../data/grid';
import { COMPOUNDS, wearPerLap, tyreDelta } from './tyres';
import { makeTrackPath, pitLayout } from './trackPath';

export const ERS = { Neutral: 'Neutral', Attack: 'Attack', Overtake: 'Overtake' };
export const FUEL = { Lean: 'Lean', Standard: 'Standard', Rich: 'Rich' };

const DIRTY_AIR_GAP = 0.3; // s: the closest a car can follow without passing
const GRID_SLOT_LAP = 0.006; // lap fraction between grid slots (shown in 3D)
const GRID_SLOT_TIME = 0.25; // s: lap-1 time lost per grid slot
// Battery change per lap (0-100). A flat battery means Neutral pace.
const BATTERY_PER_LAP = { Neutral: 12, Attack: -9, Overtake: -28 };
const TWO_COMPOUND_PENALTY = 10; // s added at the finish if only one compound was used

/** Small seeded RNG so a race can be replayed in tests. */
export function makeRng(seed = Date.now()) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function formatLap(t) {
  if (!Number.isFinite(t)) return '--';
  const m = Math.floor(t / 60);
  return `${m}:${(t - m * 60).toFixed(3).padStart(6, '0')}`;
}

/**
 * @param {object} o
 * @param {Array} o.teams  grid teams (see data/grid.js)
 * @param {object} o.track { name, baseLapTime, tireWearFactor, fuelConsumption, totalLaps }
 * @param {object} o.engine SimulationEngine instance
 * @param {string} o.playerTeamId
 * @param {number} [o.seed]
 */
export function createRace({ teams, track, engine, playerTeamId, seed, gridOrder = null }) {
  const rng = makeRng(seed);
  const cars = [];
  teams.forEach((team) => {
    team.drivers.forEach((driver, i) => {
      cars.push({
        id: `${team.id}-${i}`,
        driver,
        team,
        color: team.color,
        accent: team.accent,
        isPlayer: team.id === playerTeamId,
        ersMode: ERS.Neutral,
        fuelMode: FUEL.Standard,
        fuel: 100,
        battery: 100,
        tireWear: 0,
        compound: 'M',
        tyreAge: 0,
        compoundsUsed: [],
        stops: 0,
        pitRequest: null,
        pitThisLap: null,
        penalty: 0,
        aiWearLimit: 0,
        teamIndex: teams.indexOf(team),
        lapsDone: 0,
        lapStart: 0,
        lapTime: 0,
        lastLap: null,
        bestLap: null,
        finished: false,
        finishTime: null,
        dnf: null,
        retiredAt: null,
        grid: 0,
        lane: 0,
        crossings: [0],
        passing: null,
      });
    });
  });

  // Starting grid: a quick "qualifying" from one flying lap on low fuel
  const quali = cars.map((c) => ({
    c,
    t: engine.calculateLapTime(track, c.team, c.driver, 1, 10, 'Medium', 0, ERS.Neutral, FUEL.Standard) + (rng() - 0.5) * 0.3,
  }));
  quali.sort((a, b) => a.t - b.t);
  quali.forEach(({ c }, i) => { c.grid = i; });
  // A real qualifying session (season.js) decides the grid when given
  if (gridOrder) {
    const at = new Map(gridOrder.map((id, i) => [id, i]));
    cars.forEach((c) => { c.grid = at.has(c.id) ? at.get(c.id) : cars.length; });
  }
  cars.sort((a, b) => a.grid - b.grid);

  // AI starting tyres and how hard each AI pushes a set before pitting
  cars.forEach((c) => {
    c.aiWearLimit = 0.66 + rng() * 0.16;
    if (!c.isPlayer) {
      const r = rng();
      c.compound = c.grid < 10 ? (r < 0.6 ? 'M' : 'S') : (r < 0.4 ? 'S' : r < 0.75 ? 'M' : 'H');
    }
  });

  const path = makeTrackPath(track.points);
  const race = {
    track, engine, rng, cars,
    trackLength: path.total,
    pit: pitLayout(path.total),
    time: 0,
    started: false,
    leaderFinished: false,
    over: false,
    fastest: null, // { carId, time, lap }
    events: [],
  };
  // Provisional lap-1 times; startRace() fixes them when the lights go out,
  // so the player can still change starting tyres on the grid.
  cars.forEach((c) => {
    c.lapTime = nextLapTime(race, c) + c.grid * GRID_SLOT_TIME;
  });
  return race;
}

/** Lights out: lock starting tyres and plan lap 1. */
export function startRace(race) {
  if (race.started) return;
  race.started = true;
  race.cars.forEach((c) => {
    c.compoundsUsed = [c.compound];
    c.lapTime = nextLapTime(race, c) + c.grid * GRID_SLOT_TIME;
  });
  resolveTraffic(race, race.cars);
}

const ctxFor = (race, c) => ({ track: race.track, driver: c.driver, ersMode: effectiveErs(c), fuelMode: c.fuelMode });

/** ERS mode actually used this lap: needs battery charge. */
export function effectiveErs(c) {
  if (c.ersMode === ERS.Neutral) return ERS.Neutral;
  return c.battery > 0 ? c.ersMode : ERS.Neutral;
}

function nextLapTime(race, c) {
  const { engine, track } = race;
  // engine with fresh Mediums = base pace; the tyre model adds compound + wear
  return engine.calculateLapTime(
    track, c.team, c.driver, c.lapsDone + 1, c.fuel, 'Medium', 0, effectiveErs(c), c.fuelMode,
  ) + tyreDelta(c.compound, c.tireWear);
}

/** Simple AI: spend battery on Attack when it is well charged, and plan pit stops. */
function aiStrategy(race, c, lapsLeft) {
  if (c.isPlayer && !c.autoAi) return; // player cars only when the engineer has control
  if (c.ersMode === ERS.Neutral && c.battery >= 70) c.ersMode = ERS.Attack;
  else if (c.ersMode === ERS.Attack && c.battery <= 20) c.ersMode = ERS.Neutral;

  if (lapsLeft <= 2 || c.pitRequest) return;
  const needsOther = new Set(c.compoundsUsed).size < 2;
  const worn = c.tireWear >= c.aiWearLimit;
  const ruleDeadline = needsOther && lapsLeft <= 6;
  // would the current set make it to the flag?
  const finishesOnThese = c.tireWear + wearPerLap(c.compound, ctxFor(race, c)) * lapsLeft <= c.aiWearLimit + 0.12;
  if (!worn && !ruleDeadline) return;
  if (!needsOther && finishesOnThese) return;
  c.pitRequest = chooseCompound(race, c, lapsLeft);
}

/** Softest compound that reaches the end (or the hardest if none does), respecting the rule. */
export function chooseCompound(race, c, lapsLeft) {
  const used = new Set(c.compoundsUsed);
  const ctx = { track: race.track, driver: c.driver };
  const limit = c.aiWearLimit || 0.75;
  const lasts = (k) => wearPerLap(k, ctx) * lapsLeft <= limit + 0.05;
  let options = ['S', 'M', 'H'];
  if (used.size === 1) {
    const other = options.filter((k) => !used.has(k));
    // if this is the last stop it must be a different compound
    if (other.some(lasts)) options = other;
  }
  return options.find(lasts) || 'H';
}

/** Race order: laps done, then who crossed the line first. */
export function order(race) {
  return [...race.cars].sort((a, b) => {
    if (!!a.dnf !== !!b.dnf) return a.dnf ? 1 : -1;
    if (a.dnf && b.dnf) return b.retiredAt - a.retiredAt;
    if (b.lapsDone !== a.lapsDone) return b.lapsDone - a.lapsDone;
    if (a.finished && b.finished) return (a.finishTime + a.penalty) - (b.finishTime + b.penalty);
    return a.lapStart - b.lapStart;
  });
}

/**
 * Cars that just started a lap, in the order they crossed the line.
 * Walk forward through the cars ahead on the same lap: while the planned lap
 * would bring this car within DIRTY_AIR_GAP of (or past) the next car ahead,
 * roll an overtake. Success = it will pass that car during this lap, then try
 * the next one. Failure = it is held behind at the dirty-air gap.
 */
function resolveTraffic(race, starters) {
  starters.forEach((c) => {
    const sameLap = race.cars
      .filter((o) => !o.dnf && !o.finished && o.lapsDone === c.lapsDone)
      .sort((x, y) => x.lapStart - y.lapStart || x.grid - y.grid);
    let idx = sameLap.indexOf(c) - 1;
    c.passing = null;
    while (idx >= 0) {
      const ahead = sameLap[idx];
      const myEnd = c.lapStart + c.lapTime;
      const aheadEnd = ahead.lapStart + ahead.lapTime;
      if (myEnd >= aheadEnd + DIRTY_AIR_GAP) return; // not catching it this lap

      const skill = (c.driver.overtaking - ahead.driver.defending) / 100;
      const ersBoost = effectiveErs(c) === ERS.Overtake ? 0.25 : effectiveErs(c) === ERS.Attack ? 0.1 : 0;
      const defendBoost = effectiveErs(ahead) === ERS.Overtake ? 0.1 : 0;
      const paceGap = Math.min(0.3, (aheadEnd - myEnd) / 3); // much faster = easier
      const chance = 0.18 + skill + ersBoost - defendBoost + paceGap;
      if (myEnd < aheadEnd && race.rng() < chance) {
        c.passing = ahead.id; // passes during this lap; keep checking the next car
        idx -= 1;
        continue;
      }
      // held up: follow at the dirty-air gap
      c.lapTime = aheadEnd + DIRTY_AIR_GAP + race.rng() * 0.4 - c.lapStart;
      return;
    }
  });
}

function log(race, lap, type, message, carIds = []) {
  race.events.push({ lap, type, message, carIds, time: race.time });
  if (race.events.length > 60) race.events.shift();
}

/** Advance the race clock by dt seconds of race time. */
export function step(race, dt) {
  if (!race.started || race.over) return;
  race.time += dt;
  const { track } = race;

  // Process every line crossing up to race.time, in time order
  for (;;) {
    let next = null;
    for (const c of race.cars) {
      if (c.dnf || c.finished) continue;
      if (c.lapStart + c.lapTime <= race.time && (!next || c.lapStart + c.lapTime < next.lapStart + next.lapTime)) next = c;
    }
    if (!next) break;
    completeLap(race, next, track);
  }

  if (race.cars.every((c) => c.finished || c.dnf)) {
    race.over = true;
    log(race, track.totalLaps, 'info', 'Chequered flag. Race classification is final.');
  }
}

function completeLap(race, c, track) {
  const crossAt = c.lapStart + c.lapTime;
  const lapNo = c.lapsDone + 1;
  const realLap = c.lapTime;
  const before = order(race).filter((o) => !o.dnf);
  const posBefore = before.indexOf(c);

  c.lapsDone = lapNo;
  c.lastLap = realLap;
  if (lapNo > 1 && (c.bestLap === null || realLap < c.bestLap)) c.bestLap = realLap;
  c.fuel = Math.max(0, c.fuel - race.engine.calculateFuelConsumption(track, c.fuelMode));
  const usedErs = effectiveErs(c);
  c.tireWear = Math.min(1, c.tireWear + wearPerLap(c.compound, ctxFor(race, c)));
  c.tyreAge += 1;
  c.pitThisLap = null;
  const wasCharged = c.battery > 0;
  c.battery = Math.max(0, Math.min(100, c.battery + BATTERY_PER_LAP[usedErs]));
  if (c.isPlayer && wasCharged && c.battery === 0 && c.ersMode !== ERS.Neutral) {
    log(race, lapNo, 'warning', `${c.driver.name}: battery is flat, no more deployment until it recharges.`, [c.id]);
  }
  c.lapStart = crossAt;
  c.crossings[lapNo] = crossAt;

  if (lapNo > 1 && (!race.fastest || realLap < race.fastest.time)) {
    race.fastest = { carId: c.id, time: realLap, lap: lapNo };
    if (c.isPlayer || lapNo > 3) log(race, lapNo, 'fastest', `Fastest lap: ${c.driver.name} ${formatLap(realLap)}`, [c.id]);
  }

  // Overtake announcements (only the ones that changed position at the line)
  const posAfter = order(race).filter((o) => !o.dnf).indexOf(c);
  if (c.passing && posAfter < posBefore) {
    const victim = race.cars.find((o) => o.id === c.passing);
    if (victim && (c.isPlayer || victim.isPlayer || posAfter < 3)) {
      log(race, lapNo, c.isPlayer ? 'success' : victim.isPlayer ? 'danger' : 'info',
        `${c.driver.name} passes ${victim.driver.name} for P${posAfter + 1}`, [c.id, victim.id]);
    }
  }
  c.passing = null;

  // Finish: the leader takes the flag after the full distance, everyone else
  // at their next crossing after that
  if (race.leaderFinished || lapNo >= track.totalLaps) {
    if (!race.leaderFinished) {
      race.leaderFinished = true;
      log(race, lapNo, 'success', `${c.driver.name} wins the ${track.name} Grand Prix!`, [c.id]);
    }
    c.finished = true;
    c.finishTime = crossAt;
    if (new Set(c.compoundsUsed).size < 2) {
      c.penalty = TWO_COMPOUND_PENALTY;
      log(race, lapNo, c.isPlayer ? 'danger' : 'info', `${c.driver.name}: ${TWO_COMPOUND_PENALTY} s penalty, only one tyre compound used.`, [c.id]);
    }
    return;
  }

  // Out of fuel
  if (c.fuel <= 0) {
    retire(race, c, 'Out of fuel', lapNo);
    return;
  }
  // Reliability
  const failChance = (1 - c.team.car.reliability) * 0.004;
  if (race.rng() < failChance) {
    retire(race, c, race.rng() < 0.5 ? 'Power unit failure' : 'Hydraulics', lapNo);
    return;
  }
  // Radio warnings for the player
  if (c.isPlayer) {
    const lapsLeft = track.totalLaps - lapNo;
    const need = lapsLeft * race.engine.calculateFuelConsumption(track, c.fuelMode);
    if (need > c.fuel && !c.fuelWarned) {
      c.fuelWarned = true;
      log(race, lapNo, 'warning', `${c.driver.name}: fuel is critical, we need to save. Switch to Lean.`, [c.id]);
    } else if (need <= c.fuel) {
      c.fuelWarned = false;
    }
  }

  const lapsLeft = track.totalLaps - lapNo;
  // Tyre warnings and punctures
  let extra = 0;
  if (c.tireWear > 0.9 && race.rng() < (c.tireWear - 0.9) * 1.5) {
    log(race, lapNo, c.isPlayer ? 'danger' : 'warning', `Puncture for ${c.driver.name}! Limping back to the pits.`, [c.id]);
    extra = 14;
    c.pitRequest = c.pitRequest || chooseCompound(race, c, lapsLeft);
  } else if (c.isPlayer && c.tireWear > 0.7 && !c.tyreWarned) {
    c.tyreWarned = true;
    log(race, lapNo, 'warning', `${c.driver.name}: these ${COMPOUNDS[c.compound].name}s are going off. Box soon.`, [c.id]);
  }
  if (c.isPlayer && lapsLeft === 12 && new Set(c.compoundsUsed).size < 2) {
    log(race, lapNo, 'warning', `${c.driver.name}: remember we still have to run a second compound.`, [c.id]);
  }

  aiStrategy(race, c, lapsLeft);
  if (c.pitRequest) extra += pitStop(race, c, lapNo);
  c.lapTime = nextLapTime(race, c) + extra;
  resolveTraffic(race, [c]);
}

function pitStop(race, c, lapNo) {
  const loss = race.track.pitLoss ?? 20;
  const slow = race.rng() < 0.04;
  const stop = 2.2 + race.rng() * 0.8 + (slow ? 4 + race.rng() * 3 : 0);
  const from = c.compound;
  c.compound = c.pitRequest;
  c.pitRequest = null;
  c.tireWear = 0;
  c.tyreAge = 0;
  c.tyreWarned = false;
  c.stops += 1;
  c.compoundsUsed.push(c.compound);
  c.pitThisLap = { loss, stop };
  if (c.isPlayer || slow) {
    log(race, lapNo, slow ? 'warning' : 'info',
      `${c.driver.name} pits: ${COMPOUNDS[from].name} to ${COMPOUNDS[c.compound].name}, ${stop.toFixed(1)} s stop${slow ? ' (slow stop!)' : ''}.`, [c.id]);
  }
  return loss + stop;
}

function retire(race, c, reason, lapNo) {
  c.dnf = reason;
  c.retiredAt = race.time;
  log(race, lapNo, 'danger', `${c.driver.name} retires: ${reason}.`, [c.id]);
}

/**
 * 3D pose: { lapFloat, inPit }. lapFloat = laps done + fraction of the lap.
 * On a pit lap the first part of the lap is spent in the pit lane: drive to
 * the team's box, stop, drive out, then the rest of the lap at racing speed.
 */
export function carPose(race, c) {
  if (c.dnf) return { lapFloat: c.lapsDone, inPit: false }; // parked where it stopped
  if (c.finished) return { lapFloat: c.lapsDone + Math.min(0.06, (race.time - c.finishTime) / c.lapTime), inPit: false };
  const t = Math.max(0, race.time - c.lapStart);
  if (c.pitThisLap && c.lapsDone > 0) {
    const { loss, stop } = c.pitThisLap;
    const { pit } = race;
    const box = pit.boxFrac(c.teamIndex);
    const pitTime = loss + stop;
    const drive = loss / 2;
    let frac;
    if (t < drive) frac = (t / drive) * box;
    else if (t < drive + stop) frac = box;
    else if (t < pitTime) frac = box + ((t - drive - stop) / drive) * (pit.end - box);
    else frac = pit.end + Math.min(0.9999 - pit.end, ((t - pitTime) / (c.lapTime - pitTime)) * (1 - pit.end));
    return { lapFloat: c.lapsDone + frac, inPit: frac > pit.start * 0.5 && frac < pit.end };
  }
  const frac = Math.min(0.9999, t / c.lapTime);
  if (c.lapsDone === 0) return { lapFloat: -c.grid * GRID_SLOT_LAP + frac * (1 + c.grid * GRID_SLOT_LAP), inPit: false };
  return { lapFloat: c.lapsDone + frac, inPit: false };
}

/** Lap distance only, for callers that do not need the pit flag. */
export const lapFloat = (race, c) => carPose(race, c).lapFloat;

/** Plain snapshot for React (no functions, no shared mutable objects). */
export function snapshot(race) {
  const ordered = order(race);
  const leader = ordered[0];
  return {
    time: race.time,
    started: race.started,
    over: race.over,
    leaderLap: Math.min(race.track.totalLaps, leader ? leader.lapsDone + (race.leaderFinished ? 0 : 1) : 0),
    totalLaps: race.track.totalLaps,
    fastest: race.fastest,
    events: race.events.slice(-8).reverse(),
    rows: ordered.map((c, i) => {
      let gap;
      if (c.dnf) gap = 'DNF';
      else if (i === 0) gap = 'Leader';
      else {
        // time between the leader and this car crossing the same line
        const secs = Math.max(0, c.lapStart - (leader.crossings[c.lapsDone] ?? c.lapStart));
        const ref = leader.lastLap || race.track.baseLapTime;
        const laps = Math.floor(secs / ref);
        gap = laps >= 1 ? `+${laps} LAP${laps > 1 ? 'S' : ''}` : `+${secs.toFixed(1)}`;
      }
      return {
        id: c.id, pos: i + 1, name: c.driver.name, code: c.driver.code, team: c.team.short, color: c.color,
        isPlayer: c.isPlayer, gap, lastLap: c.lastLap, bestLap: c.bestLap, lapsDone: c.lapsDone,
        fuel: c.fuel, fuelPerLap: race.engine.calculateFuelConsumption(race.track, c.fuelMode), battery: c.battery, tireWear: c.tireWear, ersMode: c.ersMode, fuelMode: c.fuelMode,
        dnf: c.dnf, finished: c.finished, grid: c.grid + 1,
        compound: c.compound, tyreAge: c.tyreAge, autoAi: !!c.autoAi, stops: c.stops, pitRequest: c.pitRequest,
        inPit: !!c.pitThisLap && race.time - c.lapStart < c.pitThisLap.loss + c.pitThisLap.stop,
        compoundsUsed: [...new Set(c.compoundsUsed.length ? c.compoundsUsed : [c.compound])], penalty: c.penalty,
        points: race.over && !c.dnf ? POINTS[i] || 0 : 0,
      };
    }),
  };
}

/**
 * Player strategy change; takes effect from the next lap.
 * pitRequest: 'S' | 'M' | 'H' to box at the end of this lap, null to cancel.
 * compound: starting tyre (only before the start).
 */
export function setStrategy(race, carId, { ersMode, fuelMode, pitRequest, compound, autoAi }) {
  const c = race.cars.find((o) => o.id === carId);
  if (!c || c.dnf || c.finished) return;
  if (ersMode) c.ersMode = ersMode;
  if (fuelMode) c.fuelMode = fuelMode;
  if (autoAi !== undefined) c.autoAi = autoAi;
  if (pitRequest !== undefined) {
    c.pitRequest = pitRequest;
    if (pitRequest) log(race, c.lapsDone + 1, 'info', `Box, box, ${c.driver.name}. ${COMPOUNDS[pitRequest].name}s are ready.`, [c.id]);
  }
  if (compound && !race.started) {
    c.compound = compound;
    c.lapTime = nextLapTime(race, c) + c.grid * GRID_SLOT_TIME;
  }
}

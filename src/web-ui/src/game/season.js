// Season: calendar progress, qualifying, points and championships.
// Pure data in and out (no React, no PlayCanvas). Everything stored here is
// plain JSON so a career can be saved later.

import { POINTS } from '../data/grid';
import { makeRng } from './raceSim';
import { createTeamStates, settleRound } from './factory';
import { createCareer, updateMorale } from './career';

export const QUALI_MODE = { Safe: 'Safe', Push: 'Push' };
const PUSH_GAIN = 0.25; // s found by pushing
const PUSH_RISK = 0.15; // chance the push lap is deleted (track limits)

/** Turn a calendar entry into the track object the simulation expects. */
export const raceTrackOf = (t) => ({
  id: t.id, name: t.name, env: t.env, points: t.points, totalLaps: t.laps, baseLapTime: t.baseLapTime,
  tireWearFactor: t.tireWearFactor, fuelConsumption: t.fuelConsumption, pitLoss: t.pitLoss, rainChance: t.rainChance ?? 0,
  sectors: { sector1: 0.33, sector2: 0.34, sector3: 0.33 },
});

export const carIdsOf = (teams) => teams.flatMap((t) => t.drivers.map((_, i) => `${t.id}-${i}`));

export function createSeason({ teams, calendar, playerTeamId, seed = Date.now() }) {
  const ids = carIdsOf(teams);
  return {
    version: 1,
    seed,
    playerTeamId,
    calendar: calendar.map((t) => t.id),
    round: 0, // index into calendar
    phase: 'preview', // preview -> quali -> race -> results -> (next round) preview, or 'done'
    quali: null, // [{ carId, time, deleted, mode }]
    results: [], // per round: { trackId, rows: [{ carId, pos, points, dnf, fastest }] }
    driverPoints: Object.fromEntries(ids.map((id) => [id, 0])),
    teamPoints: Object.fromEntries(teams.map((t) => [t.id, 0])),
    teams: createTeamStates(teams, playerTeamId), // budgets, developed cars, projects
    ledger: [], // player money in and out: { round, label, amount ($M) }
    news: [], // messages from the last round (upgrades fitted, sponsor bonus)
    career: createCareer(teams), // year, driver registry, lineups, history
  };
}

const carById = (teams, carId) => {
  const cut = carId.lastIndexOf('-');
  const team = teams.find((t) => t.id === carId.slice(0, cut));
  return { team, driver: team?.drivers[Number(carId.slice(cut + 1))] };
};

/**
 * One flying lap each on low fuel and fresh softs.
 * modes: { [carId]: 'Safe' | 'Push' } for the player's cars (AI picks its own).
 */
export function runQualifying({ teams, track, engine, playerTeamId, modes = {}, seed }) {
  const rng = makeRng(seed);
  engine.random = rng;
  const rows = carIdsOf(teams).map((carId) => {
    const { team, driver } = carById(teams, carId);
    const isPlayer = team.id === playerTeamId;
    const mode = isPlayer ? modes[carId] || QUALI_MODE.Safe : rng() < 0.35 ? QUALI_MODE.Push : QUALI_MODE.Safe;
    let time = engine.calculateLapTime(track, team, driver, 1, 8, 'Soft', 0, 'Neutral', 'Standard') - 0.9 + (rng() - 0.5) * 0.35;
    let deleted = false;
    if (mode === QUALI_MODE.Push) {
      time -= PUSH_GAIN * (0.6 + rng() * 0.8);
      const risk = PUSH_RISK * (1.4 - driver.consistency / 100);
      if (rng() < risk) deleted = true;
    }
    return { carId, time, deleted, mode, isPlayer, name: driver.name, code: driver.code, team: team.short, color: team.color };
  });
  rows.sort((a, b) => (a.deleted - b.deleted) || a.time - b.time);
  return rows.map((r, i) => ({ ...r, pos: i + 1 }));
}

/**
 * Add a finished race (snapshot rows from raceSim) to the season. With `teams`
 * it also settles money and car development for the round (factory.js).
 */
export function recordRace(season, trackId, rows, fastestCarId, teams = null, swaps = []) {
  const next = structuredClone(season);
  const out = rows.map((r) => {
    let points = r.dnf ? 0 : POINTS[r.pos - 1] || 0;
    const fastest = r.id === fastestCarId;
    if (fastest && !r.dnf && r.pos <= 10) points += 1;
    return { carId: r.id, pos: r.pos, points, dnf: r.dnf || null, fastest };
  });
  out.forEach((r) => {
    next.driverPoints[r.carId] = (next.driverPoints[r.carId] || 0) + r.points;
    const teamId = r.carId.slice(0, r.carId.lastIndexOf('-'));
    next.teamPoints[teamId] = (next.teamPoints[teamId] || 0) + r.points;
  });
  next.results.push({ trackId, rows: out });
  next.phase = 'results';
  if (teams && next.teams) {
    const byId = new Map(out.map((r) => [r.carId, r]));
    settleRound(next, rows.map((r) => ({ id: r.id, pos: r.pos, grid: r.grid, dnf: r.dnf, points: byId.get(r.id)?.points || 0 })), teams);
    next.moraleChanges = updateMorale(next, teams, rows, swaps);
  }
  return next;
}

/** Move on after the results screen. */
export function advance(season) {
  const next = structuredClone(season);
  next.quali = null;
  if (next.round + 1 >= next.calendar.length) {
    next.phase = 'done';
  } else {
    next.round += 1;
    next.phase = 'preview';
  }
  return next;
}

/** Championship tables, best first. Ties broken by wins, then seconds, ... */
export function standings(season, teams) {
  const finishes = (carIds) => {
    const counts = Array(20).fill(0);
    season.results.forEach((res) => res.rows.forEach((r) => {
      if (carIds.includes(r.carId) && !r.dnf && r.pos <= 20) counts[r.pos - 1] += 1;
    }));
    return counts;
  };
  const tiebreak = (a, b) => {
    for (let i = 0; i < 20; i++) if (a.finishes[i] !== b.finishes[i]) return b.finishes[i] - a.finishes[i];
    return 0;
  };
  const drivers = carIdsOf(teams).map((carId) => {
    const { team, driver } = carById(teams, carId);
    return {
      carId, name: driver.name, code: driver.code, team: team.name, teamShort: team.short, color: team.color,
      isPlayer: team.id === season.playerTeamId, points: season.driverPoints[carId] || 0, finishes: finishes([carId]),
    };
  }).sort((a, b) => b.points - a.points || tiebreak(a, b));
  const teamRows = teams.map((t) => ({
    teamId: t.id, name: t.name, short: t.short, color: t.color, isPlayer: t.id === season.playerTeamId,
    points: season.teamPoints[t.id] || 0, finishes: finishes(t.drivers.map((_, i) => `${t.id}-${i}`)),
  })).sort((a, b) => b.points - a.points || tiebreak(a, b));
  return {
    drivers: drivers.map((d, i) => ({ ...d, pos: i + 1, wins: d.finishes[0], podiums: d.finishes[0] + d.finishes[1] + d.finishes[2] })),
    teams: teamRows.map((t, i) => ({ ...t, pos: i + 1, wins: t.finishes[0] })),
  };
}

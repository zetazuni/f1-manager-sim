// Multi-season career: driver registry, lineups, contracts, the off-season
// (ageing, retirements, driver market, regulation reset). Plain JSON state.
//
// Seats stay as car ids (`team-0`, `team-1`) inside a season; the lineup
// decides which driver sits in each seat and only changes between seasons.

import { FREE_AGENTS, GRID_PROFILES, FIRST_YEAR } from '../data/season';
import { makeRng } from './raceSim';
import { teamsWithCars, carRating } from './factory';

export { FIRST_YEAR };
export const VACANT = {
  id: null, name: 'Vacant seat', code: '---', age: 0, potential: 0, pace: 70, consistency: 70, experience: 0,
  adaptability: 70, overtaking: 70, defending: 70, tireManagement: 70, starts: 70, salary: 0, vacant: true,
};
const M = 1e6;

const slug = (name) => name.toLowerCase().replace(/[^a-z]+/g, '-');

/** Overall driver rating 0-100. */
export const driverRating = (d) => Math.round(
  d.pace * 0.4 + d.consistency * 0.2 + d.experience * 0.15 + d.tireManagement * 0.1 + d.overtaking * 0.1 + d.defending * 0.05,
);

/** Salary a driver asks for, $M per year. Weaker teams must pay more. */
export function salaryAsk(driver, teamPos = 5) {
  const r = driverRating(driver);
  const base = Math.max(0.8, 0.8 + ((r - 78) / 18) ** 3 * 28);
  return +(base * (1 + (teamPos - 1) * 0.04)).toFixed(1);
}

export function createCareer(teams) {
  const drivers = {};
  const lineups = {};
  teams.forEach((t) => {
    lineups[t.id] = t.drivers.map((d, i) => {
      const id = slug(d.name);
      const [age, potential] = GRID_PROFILES[d.code] || [27, 88];
      drivers[id] = { ...d, id, age, potential, morale: 70, contract: { teamId: t.id, years: 1 + ((i + t.id.length) % 3) } };
      return id;
    });
  });
  FREE_AGENTS.forEach((d) => {
    const id = slug(d.name);
    drivers[id] = { ...d, id, morale: 65, contract: null };
  });
  return { year: FIRST_YEAR, drivers, lineups, history: [] };
}

/** Grid teams with this season's lineups and developed cars. */
export function teamsForSeason(teams, season) {
  const withCars = teamsWithCars(teams, season.teams);
  if (!season.career) return withCars;
  return withCars.map((t) => ({
    ...t,
    // an empty seat (retirement, or a driver signed away in the market) shows
    // as a placeholder until the off-season fills it
    drivers: season.career.lineups[t.id].map((id) => (id ? season.career.drivers[id] : VACANT)),
  }));
}

/** Morale words and colours for the UI. */
export const moraleLabel = (m) => (m >= 82 ? 'Great' : m >= 66 ? 'Good' : m >= 45 ? 'Okay' : 'Low');

/**
 * Morale (0-100) changes the driver for the race: up to +-5 consistency and
 * +-1 pace around a neutral 60.
 */
export function withMorale(driver) {
  const m = driver.morale ?? 65;
  const k = (m - 60) / 40; // -1.5 .. +1
  return {
    ...driver,
    consistency: Math.max(40, Math.min(99, Math.round(driver.consistency + k * 5))),
    pace: Math.max(40, Math.min(99, +(driver.pace + k * 1).toFixed(1))),
  };
}

/**
 * After a race: morale follows the result against what the car should
 * achieve, points, crashes, and team orders; then drifts back toward 65.
 * rows: race snapshot rows; swaps: [{ yielded: carId, gained: carId }].
 */
export function updateMorale(season, teams, rows, swaps = []) {
  const career = season.career;
  if (!career) return [];
  const ranks = teams
    .map((t) => ({ id: t.id, r: carRating(season.teams[t.id].car) }))
    .sort((a, b) => b.r - a.r)
    .map((x) => x.id);
  const changes = [];
  const driverOf = (carId) => {
    const cut = carId.lastIndexOf('-');
    const id = career.lineups[carId.slice(0, cut)]?.[Number(carId.slice(cut + 1))];
    return id ? career.drivers[id] : null;
  };
  rows.forEach((r) => {
    const d = driverOf(r.id);
    if (!d) return;
    const teamId = r.id.slice(0, r.id.lastIndexOf('-'));
    const expected = (ranks.indexOf(teamId) + 1) * 2 - 0.5;
    let delta = 0;
    if (r.dnf === 'Crashed') delta -= 5;
    else if (r.dnf) delta -= 1; // not their fault
    else {
      delta += Math.max(-7, Math.min(7, (expected - r.pos) * 1.1));
      if (r.pos <= 10) delta += 2;
      if (r.pos === 1) delta += 4;
    }
    swaps.forEach((s) => {
      if (s.yielded === r.id) delta -= 7;
      if (s.gained === r.id) delta += 2;
    });
    const before = d.morale ?? 65;
    let m = before + delta;
    m += (65 - m) * 0.1; // drift toward neutral
    d.morale = Math.round(Math.max(5, Math.min(100, m)));
    changes.push({ carId: r.id, name: d.name, before, after: d.morale });
  });
  return changes;
}

/** Drivers the player can sign: free agents and drivers whose contract ends. */
export function marketList(career, playerTeamId) {
  return Object.values(career.drivers)
    .filter((d) => !d.retired && (!d.contract || (d.contract.years <= 0 && d.contract.teamId !== playerTeamId)))
    .sort((a, b) => driverRating(b) - driverRating(a));
}

/**
 * Season over: points history, constructors prize money, ageing, contracts.
 * Returns the career in the 'market' phase; the player then signs drivers and
 * calls finishOffSeason.
 */
export function startOffSeason(season, teams, constructorsTable) {
  const next = structuredClone(season);
  const career = next.career;
  const rng = makeRng((season.seed || 7) + career.year);

  // constructors prize money ($M): champions get the most
  constructorsTable.forEach((t, i) => {
    const prize = +(18 - i * 1.6).toFixed(1);
    next.teams[t.teamId].budget = +(next.teams[t.teamId].budget + prize).toFixed(2);
    if (t.isPlayer) next.ledger.push({ round: season.calendar.length, label: `Constructors prize (P${i + 1})`, amount: prize });
  });

  career.history.push({
    year: career.year,
    champion: null, // filled by the caller with names (keeps this module data-only)
    constructors: constructorsTable.map((t) => ({ teamId: t.teamId, points: t.points })),
  });

  // ageing: young drivers grow toward potential, veterans decline
  const news = [];
  Object.values(career.drivers).forEach((d) => {
    if (d.retired) return;
    d.age += 1;
    const grow = (v) => Math.min(99, v + Math.max(0, Math.round((d.potential - v) * (0.25 + rng() * 0.2))));
    if (d.age <= 26) {
      d.pace = grow(d.pace);
      d.consistency = grow(d.consistency);
      d.overtaking = grow(d.overtaking);
    }
    d.experience = Math.min(99, d.experience + 3 + Math.round(rng() * 3));
    if (d.age >= 33) {
      const drop = Math.round(rng() * 2 + (d.age - 32));
      d.pace = Math.max(60, d.pace - drop);
      d.overtaking = Math.max(60, d.overtaking - drop);
    }
    d.adaptability = Math.round((d.pace + d.experience) / 2);
    d.starts = Math.round((d.pace + d.consistency) / 2);
    if (d.contract) d.contract.years -= 1;
    if (d.age >= 37 && rng() < 0.5) {
      d.retired = true;
      news.push(`${d.name} retires at ${d.age}.`);
    }
  });
  // retired drivers leave their seats empty
  Object.keys(career.lineups).forEach((teamId) => {
    career.lineups[teamId] = career.lineups[teamId].map((id) => (career.drivers[id].retired ? null : id));
  });
  next.phase = 'market';
  next.offseasonNews = news;
  return next;
}

/** Player signs a driver into seat `seat` (0 or 1). Returns { ok, season, reason }. */
export function signDriver(season, playerTeamId, driverId, seat, years, teamPos) {
  const next = structuredClone(season);
  const career = next.career;
  const d = career.drivers[driverId];
  if (!d || d.retired) return { ok: false, reason: 'Driver not available' };
  const ask = salaryAsk(d, teamPos);
  const sigining = +(ask * 0.5).toFixed(1); // signing bonus paid now
  if (next.teams[playerTeamId].budget < sigining) return { ok: false, reason: `Signing bonus of $${sigining}M is more than the budget` };
  const old = career.lineups[playerTeamId][seat];
  if (old && old !== driverId) {
    const od = career.drivers[old];
    od.contract = null; // released to the market
  }
  // remove from any previous seat (re-signing your own driver, or moving seats)
  Object.keys(career.lineups).forEach((t) => {
    career.lineups[t] = career.lineups[t].map((id) => (id === driverId ? null : id));
  });
  career.lineups[playerTeamId][seat] = driverId;
  d.contract = { teamId: playerTeamId, years };
  d.salary = Math.round(ask * M);
  d.morale = Math.min(100, (d.morale ?? 65) + 6); // a new deal lifts spirits
  next.teams[playerTeamId].budget = +(next.teams[playerTeamId].budget - sigining).toFixed(2);
  next.ledger.push({ round: 0, label: `Signed ${d.name} (${years} yr, bonus)`, amount: -sigining });
  return { ok: true, season: next };
}

/**
 * AI teams keep or replace drivers, empty player seats are filled from the
 * market, cars are reset toward the field, and the next season starts.
 */
export function finishOffSeason(season, teams, playerTeamId, constructorsTable) {
  const next = structuredClone(season);
  const career = next.career;
  const rng = makeRng((season.seed || 7) + career.year * 3);
  const posOf = (teamId) => constructorsTable.findIndex((t) => t.teamId === teamId) + 1;

  // AI: re-sign or replace drivers whose contracts ended, best teams pick first
  const pool = () => marketList(career, '__none__').filter((d) => !Object.values(career.lineups).flat().includes(d.id) || (d.contract && d.contract.years <= 0));
  constructorsTable.map((t) => t.teamId).filter((id) => id !== playerTeamId).forEach((teamId) => {
    career.lineups[teamId] = career.lineups[teamId].map((id) => {
      const cur = id ? career.drivers[id] : null;
      if (cur && cur.contract && cur.contract.years > 0) return id;
      // compare the current driver with the best affordable alternative
      const budget = next.teams[teamId].budget;
      const options = pool().filter((d) => d.id !== id && !Object.values(career.lineups).flat().includes(d.id) && salaryAsk(d, posOf(teamId)) * 0.5 <= budget);
      const best = options[0];
      if (cur && (!best || driverRating(cur) >= driverRating(best) - 2 || rng() < 0.5)) {
        cur.contract = { teamId, years: 1 + Math.floor(rng() * 3) };
        return id;
      }
      if (!best) return id;
      if (cur) cur.contract = null;
      best.contract = { teamId, years: 1 + Math.floor(rng() * 3) };
      best.salary = Math.round(salaryAsk(best, posOf(teamId)) * M);
      return best.id;
    });
  });
  // player's own expired drivers that were not re-signed leave; empty seats get the best cheap driver
  career.lineups[playerTeamId] = career.lineups[playerTeamId].map((id) => {
    const cur = id ? career.drivers[id] : null;
    if (cur && cur.contract && cur.contract.teamId === playerTeamId && cur.contract.years > 0) return id;
    if (cur) cur.contract = null;
    const free = pool().filter((d) => !Object.values(career.lineups).flat().includes(d.id));
    const pick = free.sort((a, b) => salaryAsk(a) - salaryAsk(b) || driverRating(b) - driverRating(a))[0];
    if (!pick) return id;
    pick.contract = { teamId: playerTeamId, years: 1 };
    pick.salary = Math.round(salaryAsk(pick, posOf(playerTeamId)) * M);
    return pick.id;
  });

  // regulation reset: the field closes up by 40 %
  const keys = Object.keys(next.teams[teams[0].id].car);
  keys.forEach((k) => {
    const avg = teams.reduce((s, t) => s + next.teams[t.id].car[k], 0) / teams.length;
    teams.forEach((t) => {
      const c = next.teams[t.id].car;
      c[k] = +(avg + (c[k] - avg) * 0.6).toFixed(4);
    });
  });
  teams.forEach((t) => {
    next.teams[t.id].projects = [];
    next.teams[t.id].budget = +(next.teams[t.id].budget + (t.budget / M) * 0.15).toFixed(2); // new season funding
  });

  // fresh season
  const ids = teams.flatMap((t) => t.drivers.map((_, i) => `${t.id}-${i}`));
  career.year += 1;
  next.round = 0;
  next.phase = 'preview';
  next.quali = null;
  next.results = [];
  next.news = [];
  next.offseasonNews = [];
  next.driverPoints = Object.fromEntries(ids.map((id) => [id, 0]));
  next.teamPoints = Object.fromEntries(teams.map((t) => [t.id, 0]));
  return next;
}

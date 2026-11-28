// Factory and finances: car development projects, money in and out per round,
// and AI teams developing their cars. Pure data in and out (JSON-safe).

import { makeRng } from './raceSim';

export const AREAS = [
  { key: 'aeroHighSpeed', label: 'High-speed aero', hint: 'Fast corners and straights' },
  { key: 'aeroLowSpeed', label: 'Low-speed aero', hint: 'Slow corners and traction' },
  { key: 'powerUnit', label: 'Power unit', hint: 'The biggest single effect on lap time' },
  { key: 'ersEfficiency', label: 'ERS', hint: 'Deployment strength' },
  { key: 'chassisWeight', label: 'Chassis weight', hint: 'Lighter car, faster everywhere' },
  { key: 'reliability', label: 'Reliability', hint: 'Fewer mechanical retirements' },
];

export const TIERS = {
  small: { key: 'small', label: 'Small', gain: 0.015, cost: 3, rounds: 1, risk: 0 },
  medium: { key: 'medium', label: 'Medium', gain: 0.03, cost: 6.5, rounds: 2, risk: 0 },
  major: { key: 'major', label: 'Major', gain: 0.055, cost: 12, rounds: 3, risk: 0.2 },
};

export const CAPACITY = 2; // projects the factory can run at once
export const CEILING = 0.995;
const RUNNING_COST = 1.2; // $M per round: staff, travel, freight
const SEASON_LENGTH_FOR_SALARY = 24; // salaries are yearly; a real year has ~24 races

export const SPONSOR_GOALS = [
  { key: 'both-points', label: 'Both cars in the points', reward: 2 },
  { key: 'top5', label: 'A car in the top 5', reward: 2.5 },
  { key: 'climb', label: 'Gain 5 places from the grid with one car', reward: 1.5 },
  { key: 'finish-both', label: 'Both cars see the flag', reward: 1 },
  { key: 'podium', label: 'A podium finish', reward: 4 },
];

const M = 1e6;

/** Cost in $M of an upgrade, more expensive close to the ceiling. */
export function projectCost(tierKey, value) {
  return +(TIERS[tierKey].cost * (1 + Math.max(0, value - 0.88) * 8)).toFixed(2);
}

export function createTeamStates(teams, playerTeamId) {
  return Object.fromEntries(teams.map((t) => [t.id, {
    budget: +((t.budget / M) * 0.3).toFixed(2), // development budget in $M
    car: { ...t.car },
    projects: [], // { id, area, tier, gain, roundsLeft, risk }
    isPlayer: t.id === playerTeamId,
  }]));
}

/** Teams as the race needs them: grid data with the developed car. */
export function teamsWithCars(teams, teamStates) {
  if (!teamStates) return teams;
  return teams.map((t) => ({ ...t, car: { ...teamStates[t.id].car }, budget: Math.round(teamStates[t.id].budget * M) }));
}

/**
 * Start a project. Returns { ok, season, reason }.
 * Money is paid up front; the gain arrives after `rounds` races.
 */
export function startProject(season, teamId, areaKey, tierKey) {
  const ts = season.teams[teamId];
  const tier = TIERS[tierKey];
  if (!ts || !tier) return { ok: false, reason: 'Unknown project' };
  if (ts.projects.length >= CAPACITY) return { ok: false, reason: 'The factory is busy: finish a project first' };
  if (ts.projects.some((p) => p.area === areaKey)) return { ok: false, reason: 'That area already has a project running' };
  const value = ts.car[areaKey];
  if (value >= CEILING) return { ok: false, reason: 'This area is at the limit of the regulations' };
  const cost = projectCost(tierKey, value);
  if (ts.budget < cost) return { ok: false, reason: `Not enough budget ($${cost}M needed)` };
  const next = structuredClone(season);
  const t = next.teams[teamId];
  t.budget = +(t.budget - cost).toFixed(2);
  t.projects.push({ id: `${areaKey}-${next.round}-${tierKey}`, area: areaKey, tier: tierKey, gain: tier.gain, roundsLeft: tier.rounds, rounds: tier.rounds, risk: tier.risk, cost });
  if (t.isPlayer) next.ledger.push({ round: next.round + 1, label: `${tier.label} ${AREAS.find((a) => a.key === areaKey).label} project`, amount: -cost });
  return { ok: true, season: next };
}

/** The sponsor objective for a round (rotates through the list). */
export const sponsorGoalFor = (round) => SPONSOR_GOALS[round % SPONSOR_GOALS.length];

function goalMet(goal, mine) {
  const finished = mine.filter((r) => !r.dnf);
  switch (goal.key) {
    case 'both-points': return mine.length === 2 && mine.every((r) => !r.dnf && r.pos <= 10);
    case 'top5': return finished.some((r) => r.pos <= 5);
    case 'climb': return finished.some((r) => r.grid - r.pos >= 5);
    case 'finish-both': return finished.length === 2;
    case 'podium': return finished.some((r) => r.pos <= 3);
    default: return false;
  }
}

/**
 * After a race: pay out, charge costs, advance projects, let AI teams develop.
 * rows = race snapshot rows ({ id, pos, grid, dnf, points }), mutates `season` (a clone).
 */
export function settleRound(season, rows, teams) {
  const rng = makeRng((season.seed || 1) + season.round * 97 + 13);
  const news = [];
  teams.forEach((team) => {
    const ts = season.teams[team.id];
    const mine = rows.filter((r) => r.id.startsWith(`${team.id}-`));
    const points = mine.reduce((a, r) => a + (r.points || 0), 0);
    const prize = 1.5 + 0.3 * points;
    const sponsor = ts.isPlayer ? 2.5 : +(team.budget / M * 0.025).toFixed(2);
    const salaries = +(team.drivers.reduce((a, d) => a + d.salary, 0) / M / SEASON_LENGTH_FOR_SALARY).toFixed(2);
    let delta = prize + sponsor - salaries - RUNNING_COST;
    if (ts.isPlayer) {
      const r = season.round + 1;
      season.ledger.push({ round: r, label: `Prize money (${points} pts)`, amount: +prize.toFixed(2) });
      season.ledger.push({ round: r, label: team.sponsor ? `Title sponsor: ${team.sponsor}` : 'Title sponsor', amount: sponsor });
      const goal = sponsorGoalFor(season.round);
      if (goalMet(goal, mine)) {
        delta += goal.reward;
        season.ledger.push({ round: r, label: `Sponsor bonus: ${goal.label}`, amount: goal.reward });
        news.push({ type: 'success', text: `Sponsor bonus earned: ${goal.label} (+$${goal.reward}M)` });
      }
      season.ledger.push({ round: r, label: 'Driver salaries', amount: -salaries });
      season.ledger.push({ round: r, label: 'Running costs', amount: -RUNNING_COST });
    }
    ts.budget = +(ts.budget + delta).toFixed(2);

    // advance projects
    ts.projects = ts.projects.filter((p) => {
      p.roundsLeft -= 1;
      if (p.roundsLeft > 0) return true;
      let gain = p.gain;
      let failed = false;
      if (p.risk && rng() < p.risk) { gain /= 2; failed = true; }
      ts.car[p.area] = +Math.min(CEILING, ts.car[p.area] + gain).toFixed(4);
      if (ts.isPlayer) {
        const label = AREAS.find((a) => a.key === p.area).label;
        news.push(failed
          ? { type: 'warning', text: `${label} upgrade arrived, but correlation issues halved the gain (+${(gain * 100).toFixed(1)})` }
          : { type: 'success', text: `${label} upgrade fitted (+${(gain * 100).toFixed(1)})` });
      }
      return false;
    });
  });

  // AI development: start projects on their weakest areas when they can afford it
  teams.forEach((team) => {
    const ts = season.teams[team.id];
    if (ts.isPlayer) return;
    for (let k = 0; k < 2 && ts.projects.length < CAPACITY; k++) {
      const free = AREAS.filter((a) => !ts.projects.some((p) => p.area === a.key) && ts.car[a.key] < CEILING);
      if (!free.length) break;
      // weakest area first, with a little randomness
      free.sort((a, b) => ts.car[a.key] + rng() * 0.02 - (ts.car[b.key] + rng() * 0.02));
      const area = free[0].key;
      const tierKey = ts.budget > 30 ? 'major' : ts.budget > 14 ? 'medium' : 'small';
      const cost = projectCost(tierKey, ts.car[area]);
      if (ts.budget < cost * 1.4 || rng() < 0.25) break;
      ts.budget = +(ts.budget - cost).toFixed(2);
      const tier = TIERS[tierKey];
      ts.projects.push({ id: `${area}-${season.round}-${tierKey}`, area, tier: tierKey, gain: tier.gain, roundsLeft: tier.rounds, rounds: tier.rounds, risk: tier.risk, cost });
    }
  });
  season.news = news;
}

/** Overall car rating 0-100 (same weights as the lap time model). */
export function carRating(car) {
  const perf = car.aeroHighSpeed * 0.2 + car.aeroLowSpeed * 0.2 + car.powerUnit * 0.3 + car.ersEfficiency * 0.1 + car.chassisWeight * 0.2;
  return Math.round(perf * 1000) / 10;
}

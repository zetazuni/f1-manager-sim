// Factory and finances. Six car parts go through research, then manufacturing;
// every car needs one of each, so spares matter when a car crashes. Nine
// facilities can be upgraded. The race simulation still reads the same car
// numbers: they are derived here as "start of season value + what parts add".
// Pure data in and out (JSON-safe).

import { makeRng } from './raceSim';

/** The numbers the simulation reads. Power unit and ERS come from the engine supplier. */
export const STATS = [
  { key: 'aeroHighSpeed', label: 'High-speed aero' },
  { key: 'aeroLowSpeed', label: 'Low-speed aero' },
  { key: 'powerUnit', label: 'Power unit' },
  { key: 'ersEfficiency', label: 'ERS' },
  { key: 'chassisWeight', label: 'Chassis weight' },
  { key: 'reliability', label: 'Reliability' },
];

/** Car parts the team designs and builds. `adds` = share of the part's gain per stat. */
export const PARTS = [
  { key: 'frontWing', label: 'Front wing', hint: 'Turn-in and slow corners', adds: { aeroLowSpeed: 0.5, aeroHighSpeed: 0.25 }, room: 'wind', aero: true, crash: 1 },
  { key: 'rearWing', label: 'Rear wing', hint: 'Fast corners and straights', adds: { aeroHighSpeed: 0.45 }, room: 'wind', aero: true, crash: 0.55 },
  { key: 'underfloor', label: 'Underfloor', hint: 'The biggest aero gain', adds: { aeroHighSpeed: 0.6, aeroLowSpeed: 0.6 }, room: 'wind', aero: true, crash: 0.45 },
  { key: 'sidepods', label: 'Sidepods', hint: 'Cooling and reliability', adds: { reliability: 0.35, aeroHighSpeed: 0.2 }, room: 'factory', aero: true, crash: 0.3 },
  { key: 'suspension', label: 'Suspension', hint: 'Grip over kerbs and slow corners', adds: { aeroLowSpeed: 0.55, reliability: 0.15 }, room: 'rig', aero: false, crash: 0.5 },
  { key: 'chassis', label: 'Chassis', hint: 'Lighter and stiffer', adds: { chassisWeight: 1, reliability: 0.2 }, room: 'factory', aero: false, crash: 0.15 },
];

/** Size of a development step. Costs in $M, times in races. */
export const SIZES = {
  small: { key: 'small', label: 'Small', gain: 0.015, cost: 1.8, research: 1, unit: 0.6, build: 1, risk: 0 },
  medium: { key: 'medium', label: 'Medium', gain: 0.03, cost: 3.8, research: 2, unit: 1.1, build: 1, risk: 0 },
  major: { key: 'major', label: 'Major', gain: 0.055, cost: 7, research: 3, unit: 1.9, build: 2, risk: 0.2 },
};

/** Upgradable buildings (ids match the headquarters rooms). */
export const FACILITIES = [
  { id: 'lobby', label: 'Atrium', effect: 'Fans and guests: +$0.3M sponsor money a race per level' },
  { id: 'wind', label: 'Wind tunnel', effect: 'Aero research: a race quicker at level 2, 15% cheaper at level 3' },
  { id: 'power', label: 'Powertrain lab', effect: 'Power unit and ERS +0.4 per level' },
  { id: 'factory', label: 'Composites floor', effect: 'Parts 15% cheaper at level 2, built a race quicker and a third line at level 3' },
  { id: 'bay', label: 'Race bay', effect: 'Pit stops 0.4 s quicker per level' },
  { id: 'rig', label: 'Reliability rig', effect: 'Reliability +0.5 per level, new parts fail less often' },
  { id: 'sim', label: 'Race simulator', effect: 'Practice setup work worth 20% more per level' },
  { id: 'hub', label: 'Team hub', effect: 'A third research slot at level 3, happier drivers' },
  { id: 'board', label: 'Board room', effect: 'Title sponsor pays $0.6M more a race per level' },
];
export const MAX_LEVEL = 3;
export const FACILITY_STEPS = { 2: { cost: 6, rounds: 2 }, 3: { cost: 12, rounds: 3 } };
export const MAX_WORKS = 2;

export const CEILING = 0.995;
const PATCHED = -0.012; // a car without a proper part runs a repaired one
const SPARE_COST = 0.5; // an extra copy of an original part
const RUNNING_COST = 1.2; // $M per round: staff, travel, freight
const SEASON_LENGTH_FOR_SALARY = 24; // salaries are yearly; a real year has ~24 races
const M = 1e6;

export const SPONSOR_GOALS = [
  { key: 'both-points', label: 'Both cars in the points', reward: 2 },
  { key: 'top5', label: 'A car in the top 5', reward: 2.5 },
  { key: 'climb', label: 'Gain 5 places from the grid with one car', reward: 1.5 },
  { key: 'finish-both', label: 'Both cars see the flag', reward: 1 },
  { key: 'podium', label: 'A podium finish', reward: 4 },
];

const round2 = (v) => +v.toFixed(2);
const partOf = (key) => PARTS.find((p) => p.key === key);
const level = (ts, id) => ts.facilities?.[id] ?? 1;

// units = copies of the current specification the team owns (two cars need two)
const freshPart = () => ({ version: 0, gain: 0, prevGain: PATCHED, units: 3, last: 1 });

/** Gain of the part fitted to `seat`: the current one while there are enough copies. */
export function fittedGain(part, seat) {
  const order = part.last === 0 ? [1, 0] : [0, 1]; // the car that last crashed waits
  return order.indexOf(seat) < part.units ? part.gain : part.prevGain;
}

/** Car numbers for one seat (or the full current specification when seat is null). */
export function seatStats(ts, seat = null) {
  const car = { ...ts.base };
  PARTS.forEach((p) => {
    const part = ts.parts[p.key];
    const gain = seat === null ? part.gain : fittedGain(part, seat);
    Object.entries(p.adds).forEach(([stat, share]) => { car[stat] += share * gain; });
  });
  car.powerUnit += 0.004 * (level(ts, 'power') - 1);
  car.ersEfficiency += 0.004 * (level(ts, 'power') - 1);
  car.reliability += 0.005 * (level(ts, 'rig') - 1);
  Object.keys(car).forEach((k) => { car[k] = +Math.max(0.5, Math.min(CEILING, car[k])).toFixed(4); });
  return car;
}

const refresh = (ts) => {
  ts.car = seatStats(ts);
  return ts;
};

export function newTeamState(car, budget, isPlayer) {
  return refresh({
    budget,
    base: { ...car },
    car: { ...car },
    parts: Object.fromEntries(PARTS.map((p) => [p.key, freshPart()])),
    research: [], // { part, size, roundsLeft, rounds, cost }
    designs: {}, // part -> { size, gain, risk }: researched, waiting to be built
    builds: [], // { kind: 'upgrade'|'spares', part, qty, roundsLeft, rounds, gain, risk, cost }
    facilities: Object.fromEntries(FACILITIES.map((f) => [f.id, 1])),
    works: [], // { id, to, roundsLeft, rounds, cost }
    isPlayer,
  });
}

export function createTeamStates(teams, playerTeamId) {
  return Object.fromEntries(teams.map((t) => [t.id, newTeamState(t.car, round2((t.budget / M) * 0.3), t.id === playerTeamId)]));
}

/** Bring a team saved by the old six-area system up to date, refunding unfinished work. */
export function migrateTeamState(ts) {
  if (ts.parts) return ts;
  const refund = (ts.projects || []).reduce((s, p) => s + (p.cost || 0), 0);
  const next = newTeamState(ts.car, round2(ts.budget + refund), ts.isPlayer);
  Object.keys(ts).forEach((k) => { delete ts[k]; });
  return Object.assign(ts, next);
}

/** Teams as the race needs them: developed numbers, per car, plus facility bonuses. */
export function teamsWithCars(teams, states) {
  if (!states) return teams;
  return teams.map((t) => {
    const ts = states[t.id];
    return {
      ...t,
      car: { ...ts.car },
      seatCars: [seatStats(ts, 0), seatStats(ts, 1)],
      pitBonus: 0.4 * (level(ts, 'bay') - 1),
      setupBonus: 1 + 0.2 * (level(ts, 'sim') - 1),
      budget: Math.round(ts.budget * M),
    };
  });
}

// ---- what things cost and how long they take --------------------------------

export function researchQuote(ts, partKey, sizeKey) {
  const size = SIZES[sizeKey];
  const aero = partOf(partKey).aero;
  const wind = level(ts, 'wind');
  const nearLimit = 1 + Math.max(0, ts.parts[partKey].gain - 0.04) * 8; // later steps cost more
  return {
    cost: round2(size.cost * nearLimit * (aero && wind >= 3 ? 0.85 : 1)),
    rounds: Math.max(1, size.research - (aero && wind >= 2 ? 1 : 0)),
  };
}

export function buildQuote(ts, sizeKey, qty) {
  const factory = level(ts, 'factory');
  const unit = (sizeKey ? SIZES[sizeKey].unit : SPARE_COST) * (factory >= 2 ? 0.85 : 1);
  const rounds = sizeKey ? SIZES[sizeKey].build : 1;
  return { cost: round2(unit * qty), rounds: Math.max(1, rounds - (factory >= 3 ? 1 : 0)) };
}

export const researchSlots = (ts) => (level(ts, 'hub') >= 3 ? 3 : 2);
export const buildSlots = (ts) => (level(ts, 'factory') >= 3 ? 3 : 2);

/** The size of the step that made the part now on the car (for spare prices). */
const sizeOfPart = (part) => (part.version === 0 ? null : part.size || 'small');

// ---- orders. Each returns { ok, season, reason } ------------------------------

function order(season, teamId, check) {
  if (!season.teams[teamId]) return { ok: false, reason: 'Unknown team' };
  const next = structuredClone(season);
  const ts = next.teams[teamId];
  const result = check(ts);
  if (result.reason) return { ok: false, reason: result.reason };
  if (ts.budget < result.cost) return { ok: false, reason: `Not enough budget ($${result.cost}M needed)` };
  ts.budget = round2(ts.budget - result.cost);
  result.apply();
  if (ts.isPlayer) next.ledger.push({ round: next.round + 1, label: result.label, amount: -result.cost });
  return { ok: true, season: next };
}

export function startResearch(season, teamId, partKey, sizeKey) {
  return order(season, teamId, (ts) => {
    const part = partOf(partKey);
    const size = SIZES[sizeKey];
    if (!part || !size) return { reason: 'Unknown project' };
    if (ts.research.some((r) => r.part === partKey)) return { reason: 'That part is already being researched' };
    if (ts.designs[partKey]) return { reason: 'Build the design you already have first' };
    if (ts.builds.some((b) => b.part === partKey && b.kind === 'upgrade')) return { reason: 'The new part is still being built' };
    if (ts.research.length >= researchSlots(ts)) return { reason: 'The design office is full' };
    const quote = researchQuote(ts, partKey, sizeKey);
    return {
      cost: quote.cost,
      label: `${part.label} research (${size.label.toLowerCase()})`,
      apply: () => ts.research.push({ part: partKey, size: sizeKey, roundsLeft: quote.rounds, rounds: quote.rounds, cost: quote.cost }),
    };
  });
}

/** Manufacture a researched design: qty 2 fits both cars, more are spares. */
export function orderBuild(season, teamId, partKey, qty) {
  return order(season, teamId, (ts) => {
    const design = ts.designs[partKey];
    if (!design) return { reason: 'No design is ready for that part' };
    if (ts.builds.length >= buildSlots(ts)) return { reason: 'Every production line is busy' };
    const quote = buildQuote(ts, design.size, qty);
    return {
      cost: quote.cost,
      label: `${partOf(partKey).label}: building ${qty}`,
      apply: () => {
        ts.builds.push({ kind: 'upgrade', part: partKey, qty, size: design.size, gain: design.gain, risk: design.risk, roundsLeft: quote.rounds, rounds: quote.rounds, cost: quote.cost });
        delete ts.designs[partKey];
      },
    };
  });
}

/** More copies of the part currently on the car. */
export function orderSpares(season, teamId, partKey, qty = 1) {
  return order(season, teamId, (ts) => {
    const part = ts.parts[partKey];
    if (!part) return { reason: 'Unknown part' };
    if (ts.builds.some((b) => b.part === partKey && b.kind === 'spares')) return { reason: 'Spares are already on the way' };
    if (ts.builds.length >= buildSlots(ts)) return { reason: 'Every production line is busy' };
    if (part.units + qty > 6) return { reason: 'The store is full' };
    const quote = buildQuote(ts, sizeOfPart(part), qty);
    return {
      cost: quote.cost,
      label: `${partOf(partKey).label}: ${qty} spare${qty > 1 ? 's' : ''}`,
      apply: () => ts.builds.push({ kind: 'spares', part: partKey, qty, version: part.version, roundsLeft: quote.rounds, rounds: quote.rounds, cost: quote.cost }),
    };
  });
}

export function upgradeFacility(season, teamId, id) {
  return order(season, teamId, (ts) => {
    const facility = FACILITIES.find((f) => f.id === id);
    if (!facility) return { reason: 'Unknown facility' };
    const to = level(ts, id) + 1;
    if (to > MAX_LEVEL) return { reason: 'Already at the top level' };
    if (ts.works.some((w) => w.id === id)) return { reason: 'Builders are already in there' };
    if (ts.works.length >= MAX_WORKS) return { reason: 'Only two building sites at once' };
    const step = FACILITY_STEPS[to];
    return {
      cost: step.cost,
      label: `${facility.label}: level ${to} building work`,
      apply: () => ts.works.push({ id, to, roundsLeft: step.rounds, rounds: step.rounds, cost: step.cost }),
    };
  });
}

// ---- after a race --------------------------------------------------------------

/** Parts a crash breaks: nearly always the front wing, sometimes more. */
function crashDamage(rng) {
  return PARTS.filter((p) => rng() < p.crash * (p.crash === 1 ? 1 : 0.8)).map((p) => p.key);
}

function advanceWork(ts, rng, news) {
  const say = (type, text) => ts.isPlayer && news.push({ type, text });
  const tick = (list, done) => list.filter((item) => {
    item.roundsLeft -= 1;
    if (item.roundsLeft > 0) return true;
    done(item);
    return false;
  });
  ts.research = tick(ts.research, (r) => {
    const size = SIZES[r.size];
    ts.designs[r.part] = { size: r.size, gain: +(ts.parts[r.part].gain + size.gain).toFixed(4), risk: size.risk };
    say('success', `${partOf(r.part).label} research finished: the design is ready to build`);
  });
  ts.builds = tick(ts.builds, (b) => {
    const part = ts.parts[b.part];
    const label = partOf(b.part).label;
    if (b.kind === 'spares') {
      if (b.version === part.version) {
        part.units += b.qty;
        say('success', `${label}: ${b.qty} spare${b.qty > 1 ? 's' : ''} arrived`);
      } else say('warning', `${label}: the spares were for the old part and went to the museum`);
      return;
    }
    let gain = b.gain;
    const risk = b.risk * (level(ts, 'rig') >= 3 ? 0.4 : level(ts, 'rig') >= 2 ? 0.7 : 1);
    const failed = risk && rng() < risk;
    if (failed) gain = +((gain + part.gain) / 2).toFixed(4);
    part.prevGain = part.gain;
    part.gain = gain;
    part.size = b.size;
    part.version += 1;
    part.units = b.qty;
    say(failed ? 'warning' : 'success', failed ? `New ${label.toLowerCase()} fitted, but it only gives half of what was promised` : `New ${label.toLowerCase()} fitted${b.qty < 2 ? ' to one car only' : ''}`);
  });
  ts.works = tick(ts.works, (w) => {
    ts.facilities[w.id] = w.to;
    say('success', `${FACILITIES.find((f) => f.id === w.id).label} is now level ${w.to}`);
  });
}

/** AI teams: research the weakest part, build it, keep a spare, sometimes build. */
function aiOrders(season, teamId, rng) {
  let s = season;
  const act = (result) => {
    if (result.ok) s = result.season;
  };
  const ts = () => s.teams[teamId];
  Object.keys(ts().designs).forEach((part) => act(orderBuild(s, teamId, part, 3)));
  PARTS.forEach((p) => {
    if (ts().parts[p.key].units < 3 && ts().budget > 4) act(orderSpares(s, teamId, p.key, 3 - Math.max(0, ts().parts[p.key].units)));
  });
  for (let k = ts().research.length; k < 2 && rng() > 0.2; k++) {
    const free = PARTS.filter((p) => !ts().research.some((r) => r.part === p.key) && !ts().designs[p.key] && ts().parts[p.key].gain < 0.12);
    if (!free.length) break;
    free.sort((a, b) => ts().parts[a.key].gain - ts().parts[b.key].gain + (rng() - 0.5) * 0.03);
    const size = ts().budget > 30 ? 'major' : ts().budget > 14 ? 'medium' : 'small';
    if (ts().budget < researchQuote(ts(), free[0].key, size).cost * 2) break;
    act(startResearch(s, teamId, free[0].key, size));
  }
  if (ts().budget > 35 && !ts().works.length && rng() < 0.2) {
    const options = FACILITIES.filter((f) => level(ts(), f.id) < MAX_LEVEL);
    if (options.length) act(upgradeFacility(s, teamId, options[Math.floor(rng() * options.length)].id));
  }
  return s;
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
 * After a race: pay out, charge costs, repair crash damage from the spares,
 * advance every project and let the AI teams place orders.
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
    const sponsor = round2((ts.isPlayer ? 2.5 : (team.budget / M) * 0.025) + 0.6 * (level(ts, 'board') - 1) + 0.3 * (level(ts, 'lobby') - 1));
    const salaries = round2(team.drivers.reduce((a, d) => a + d.salary, 0) / M / SEASON_LENGTH_FOR_SALARY);
    let delta = prize + sponsor - salaries - RUNNING_COST;
    if (ts.isPlayer) {
      const r = season.round + 1;
      season.ledger.push({ round: r, label: `Prize money (${points} pts)`, amount: round2(prize) });
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
    ts.budget = round2(ts.budget + delta);

    // crash damage comes out of the stock before anything new arrives
    mine.filter((r) => r.dnf === 'Crashed').forEach((r) => {
      const seat = Number(r.id.slice(r.id.lastIndexOf('-') + 1));
      const broken = crashDamage(rng);
      const short = [];
      broken.forEach((key) => {
        const part = ts.parts[key];
        part.units = Math.max(0, part.units - 1);
        part.last = seat;
        if (part.units < 2) short.push(partOf(key).label.toLowerCase());
      });
      if (ts.isPlayer && broken.length) {
        news.push({ type: 'warning', text: `Crash damage: ${broken.map((k) => partOf(k).label.toLowerCase()).join(', ')} destroyed` });
        if (short.length) news.push({ type: 'warning', text: `No spare ${short.join(' or ')}: a car runs an older or repaired part until more are built` });
      }
    });
    advanceWork(ts, rng, news);
  });

  teams.forEach((team) => {
    if (season.teams[team.id].isPlayer) return;
    Object.assign(season, aiOrders(season, team.id, rng));
  });
  teams.forEach((team) => refresh(season.teams[team.id]));
  season.news = news;
}

/**
 * New regulations: the field closes up, parts and designs start again (money for
 * unfinished work comes back), buildings stay.
 */
export function regulationReset(states, teams) {
  const keys = Object.keys(states[teams[0].id].car);
  keys.forEach((k) => {
    const avg = teams.reduce((s, t) => s + states[t.id].car[k], 0) / teams.length;
    teams.forEach((t) => {
      states[t.id].base[k] = +(avg + (states[t.id].car[k] - avg) * 0.6).toFixed(4);
    });
  });
  teams.forEach((t) => {
    const ts = states[t.id];
    const refund = [...ts.research, ...ts.builds].reduce((s, x) => s + x.cost, 0);
    // the facility bonuses are already inside the closed-up numbers
    ts.base.powerUnit -= 0.004 * (level(ts, 'power') - 1);
    ts.base.ersEfficiency -= 0.004 * (level(ts, 'power') - 1);
    ts.base.reliability -= 0.005 * (level(ts, 'rig') - 1);
    ts.parts = Object.fromEntries(PARTS.map((p) => [p.key, freshPart()]));
    ts.research = [];
    ts.designs = {};
    ts.builds = [];
    ts.budget = round2(ts.budget + refund + (t.budget / M) * 0.15); // refund plus new season funding
    refresh(ts);
  });
}

/** One number for the whole car, for rankings. */
export function carRating(car) {
  const perf = car.aeroHighSpeed * 0.2 + car.aeroLowSpeed * 0.2 + car.powerUnit * 0.3 + car.ersEfficiency * 0.1 + car.chassisWeight * 0.2;
  return Math.round(perf * 1000) / 10;
}

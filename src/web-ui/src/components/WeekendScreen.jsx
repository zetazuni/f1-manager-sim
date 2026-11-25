import React from 'react';
import TrackMap from './TrackMap';
import { ENVIRONMENTS } from '../game/environments';
import { QUALI_MODE } from '../game/season';
import { formatLap } from '../game/raceSim';

const rating = (value, low, high) => {
  const t = Math.max(0, Math.min(1, (value - low) / (high - low)));
  return Math.round(1 + t * 4);
};
const Pips = ({ n, color = 'bg-f1-red' }) => (
  <span className="inline-flex gap-1">
    {[1, 2, 3, 4, 5].map((i) => <span key={i} className={`h-2 w-4 rounded-sm ${i <= n ? color : 'bg-line-2'}`} />)}
  </span>
);

const Stat = ({ label, children }) => (
  <div className="rounded-lg border border-line bg-ink/50 px-3 py-2">
    <p className="label">{label}</p>
    <div className="mt-1 font-display text-lg font-bold">{children}</div>
  </div>
);

/** Track card used on the preview screen. */
export const TrackCard = ({ track, round, total }) => {
  const env = ENVIRONMENTS[track.env];
  return (
    <div className="panel overflow-hidden">
      <div className="grid gap-0 md:grid-cols-[1.1fr_1fr]">
        <div className="relative flex items-center justify-center p-6" style={{ background: `radial-gradient(circle at 50% 40%, ${env.ground}55, transparent 70%)` }}>
          <TrackMap points={track.points} className="h-64 w-full max-w-md drop-shadow-[0_0_18px_rgba(225,6,0,0.35)]" width={4.5} />
          <span className="absolute left-4 top-4 rounded bg-ink/80 px-2 py-1 font-display text-xs font-bold uppercase tracking-widest text-data">{env.label}</span>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <p className="label">Round {round} of {total} | {track.country}</p>
            <h2 className="display text-4xl italic leading-tight">{track.name}</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Race distance">{track.laps} laps</Stat>
            <Stat label="Reference lap">{formatLap(track.baseLapTime)}</Stat>
            <Stat label="Tyre wear"><Pips n={rating(track.tireWearFactor, 0.035, 0.07)} /></Stat>
            <Stat label="Fuel use"><Pips n={rating(track.fuelConsumption, 1.5, 1.9)} color="bg-yellow-400" /></Stat>
            <Stat label="Pit lane loss">{track.pitLoss} s</Stat>
            <Stat label="Overtaking"><Pips n={track.env === 'city' || track.env === 'night' ? 2 : track.env === 'desert' ? 5 : 3} color="bg-data" /></Stat>
            <Stat label="Rain chance">{Math.round((track.rainChance ?? 0) * 100)}%</Stat>
            <Stat label="Environment">{env.label}</Stat>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PreviewPanel = ({ track, round, total, players, modes, onMode, onQualify }) => (
  <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
    <TrackCard track={track} round={round} total={total} />
    <div className="panel space-y-4 p-5">
      <h3 className="panel-title">Qualifying plan</h3>
      <p className="text-sm text-muted">
        One flying lap each. <b className="text-slate-200">Push</b> finds about a quarter of a second but risks a deleted lap for track limits,
        which sends the car to the back of the grid.
      </p>
      {players.map((p) => (
        <div key={p.carId} className="rounded-lg border border-line bg-panel-2/60 p-3">
          <p className="mb-2 font-display text-lg font-bold uppercase">{p.name}</p>
          <div className="grid grid-cols-2 gap-2">
            {[QUALI_MODE.Safe, QUALI_MODE.Push].map((m) => (
              <button
                key={m}
                type="button"
                data-quali={`${p.carId}-${m}`}
                onClick={() => onMode(p.carId, m)}
                className={`chip ${modes[p.carId] === m ? (m === 'Push' ? 'bg-f1-red text-white' : 'bg-slate-600 text-white') : 'chip-off'}`}
              >
                {m === 'Safe' ? 'Safe lap' : 'Push lap'}
              </button>
            ))}
          </div>
        </div>
      ))}
      <button type="button" data-testid="qualify" onClick={onQualify} className="btn btn-primary w-full py-4 text-base">
        Run qualifying
      </button>
    </div>
  </div>
);

export const QualiPanel = ({ quali, track, onRace }) => {
  const pole = quali[0];
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="panel p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="panel-title">Qualifying | {track.name}</h3>
          <p className="text-xs text-muted">Pole: <b className="text-gold">{pole.name}</b> {formatLap(pole.time)}</p>
        </div>
        <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2" data-testid="quali-table">
          {quali.map((q) => (
            <div key={q.carId} className={`flex items-center gap-3 border-t border-line py-1.5 font-mono text-xs ${q.isPlayer ? 'bg-data/10' : ''}`}>
              <span className="w-6 text-right font-bold">{q.pos}</span>
              <span className="h-3 w-1 rounded-sm" style={{ background: q.color }} />
              <span className={`flex-1 ${q.isPlayer ? 'font-bold text-white' : 'text-slate-300'}`}>{q.name}</span>
              <span className="text-muted">{q.team}</span>
              <span className={`w-20 text-right ${q.deleted ? 'text-red-400' : q.pos === 1 ? 'text-purple-300' : ''}`}>
                {q.deleted ? 'DELETED' : q.pos === 1 ? formatLap(q.time) : `+${(q.time - pole.time).toFixed(3)}`}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="panel flex flex-col gap-4 p-5">
        <h3 className="panel-title">Grid set</h3>
        <TrackMap points={track.points} className="h-48 w-full" width={4} />
        {quali.filter((q) => q.isPlayer).map((q) => (
          <p key={q.carId} className="text-sm">
            <b className="font-display text-lg uppercase">{q.name}</b> starts <b className="text-data">P{q.pos}</b>
            {q.deleted && <span className="text-red-400"> (lap deleted for track limits)</span>}
            {q.mode === 'Push' && !q.deleted && <span className="text-emerald-400"> (push lap paid off)</span>}
          </p>
        ))}
        <p className="text-xs text-muted">Pick starting tyres on the race screen before lights out.</p>
        <button type="button" data-testid="to-race" onClick={onRace} className="btn btn-go mt-auto w-full py-4 text-base">
          To the grid
        </button>
      </div>
    </div>
  );
};

export const ResultsPanel = ({ result, track, table, teamsTable, isLast, onNext, nameOf }) => (
  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
    <div className="panel p-5">
      <h3 className="panel-title mb-4">Result | {track.name}</h3>
      <div data-testid="round-result">
        {result.rows.map((r) => {
          const who = nameOf(r.carId);
          return (
            <div key={r.carId} className={`flex items-center gap-3 border-t border-line py-1.5 font-mono text-xs ${who.isPlayer ? 'bg-data/10' : ''}`}>
              <span className="w-8 text-right font-bold">{r.dnf ? 'DNF' : r.pos}</span>
              <span className="h-3 w-1 rounded-sm" style={{ background: who.color }} />
              <span className={`flex-1 ${who.isPlayer ? 'font-bold text-white' : 'text-slate-300'}`}>{who.name}</span>
              {r.fastest && <span className="rounded bg-purple-500/30 px-1.5 text-[10px] text-purple-200">FASTEST LAP</span>}
              <span className="w-10 text-right font-bold text-emerald-400">{r.points ? `+${r.points}` : ''}</span>
            </div>
          );
        })}
      </div>
    </div>
    <div className="space-y-5">
      <div className="panel p-5">
        <h3 className="panel-title mb-3">Drivers</h3>
        {table.slice(0, 8).map((d) => (
          <div key={d.carId} className={`flex items-center gap-3 border-t border-line py-1.5 text-sm ${d.isPlayer ? 'text-data' : ''}`}>
            <span className="w-5 text-right font-mono text-xs">{d.pos}</span>
            <span className="h-3 w-1 rounded-sm" style={{ background: d.color }} />
            <span className="flex-1">{d.name}</span>
            <span className="font-mono font-bold">{d.points}</span>
          </div>
        ))}
      </div>
      <div className="panel p-5">
        <h3 className="panel-title mb-3">Teams</h3>
        {teamsTable.slice(0, 5).map((t) => (
          <div key={t.teamId} className={`flex items-center gap-3 border-t border-line py-1.5 text-sm ${t.isPlayer ? 'text-data' : ''}`}>
            <span className="w-5 text-right font-mono text-xs">{t.pos}</span>
            <span className="h-3 w-1 rounded-sm" style={{ background: t.color }} />
            <span className="flex-1">{t.name}</span>
            <span className="font-mono font-bold">{t.points}</span>
          </div>
        ))}
      </div>
      <button type="button" data-testid="next-round" onClick={onNext} className="btn btn-primary w-full py-4 text-base">
        {isLast ? 'Season finale' : 'Next round'}
      </button>
    </div>
  </div>
);

export const SeasonDone = ({ table, teamsTable, onNewSeason }) => {
  const champ = table[0];
  const champTeam = teamsTable[0];
  const me = table.filter((d) => d.isPlayer);
  const myTeam = teamsTable.find((t) => t.isPlayer);
  return (
    <div className="panel relative overflow-hidden p-8 text-center">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(251,191,36,0.18),transparent_60%)]" />
      <p className="label">Season complete</p>
      <h2 className="display mt-2 text-5xl italic">World Champion</h2>
      <p className="mt-4 font-display text-4xl font-bold uppercase" style={{ color: champ.color }}>{champ.name}</p>
      <p className="text-muted">{champ.team} | {champ.points} points | {champ.wins} wins</p>
      <p className="mt-6 font-display text-xl font-bold uppercase">Constructors: <span style={{ color: champTeam.color }}>{champTeam.name}</span> ({champTeam.points})</p>
      <div className="mx-auto mt-6 max-w-md rounded-lg border border-line bg-ink/60 p-4 text-sm">
        <p className="mb-2 panel-title justify-center">Your season</p>
        {me.map((d) => <p key={d.carId}>{d.name}: P{d.pos} with {d.points} points</p>)}
        <p className="mt-1 text-data">Team: P{myTeam.pos} with {myTeam.points} points</p>
      </div>
      <button type="button" data-testid="new-season" onClick={onNewSeason} className="btn btn-primary mt-8 px-10 py-4 text-base">
        Start a new season
      </button>
    </div>
  );
};

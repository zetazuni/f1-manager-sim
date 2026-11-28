import React from 'react';
import TrackMap from './TrackMap';
import CircuitView from './CircuitView';
import { ENVIRONMENTS } from '../game/environments';
import { QUALI_MODE } from '../game/season';
import { formatLap, PRACTICE } from '../game/raceSim';
import MoraleMeter from './MoraleMeter';
import Face from './Face';

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
export const TrackCard = ({ track, round, total, teams, quality }) => {
  const env = ENVIRONMENTS[track.env];
  return (
    <div className="panel overflow-hidden">
      <div className="grid gap-0 md:grid-cols-[1.45fr_1fr]">
        <div className="relative min-w-0">
          <CircuitView track={track} teams={teams} quality={quality} className="h-72 md:h-full md:min-h-[430px]" />
          <span className="absolute left-3 top-3 rounded bg-ink/80 px-2 py-1 font-display text-xs font-bold text-data">{env.label}</span>
        </div>
        <div className="space-y-4 p-6">
          <div>
            <p className="label">Round {round} of {total} | {track.country}</p>
            <h2 className="display text-4xl leading-tight">{track.name}</h2>
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

export const PreviewPanel = ({ track, round, total, teams, quality, briefing = null, players, modes, onMode, practice = {}, onPractice = () => {}, onQualify }) => (
  <div className="screen-enter grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
    <div className="min-w-0 space-y-5">
      <TrackCard track={track} round={round} total={total} teams={teams} quality={quality} />
      {briefing}
    </div>
    <div className="panel space-y-4 p-5">
      <h3 className="panel-title">Practice and qualifying</h3>
      <p className="text-sm text-muted">
        One flying lap each. <b className="text-cream/90">Push</b> finds about a quarter of a second but risks a deleted lap for track limits,
        which sends the car to the back of the grid.
      </p>
      {players.map((p) => (
        <div key={p.carId} className="rounded-lg border border-line bg-panel-2/60 p-3">
          <p className="mb-2 flex items-center gap-2 font-display text-lg font-bold"><Face name={p.name} className="h-14 w-14" />{p.name}</p>
          <p className="label mb-1">Practice programme</p>
          <div className="mb-2 grid grid-cols-3 gap-2">
            {Object.values(PRACTICE).map((pr) => (
              <button
                key={pr.key}
                type="button"
                title={pr.effect}
                data-practice={`${p.carId}-${pr.key}`}
                onClick={() => onPractice(p.carId, pr.key)}
                className={`chip px-1 text-[11px] ${practice[p.carId] === pr.key ? 'bg-data text-slate-900' : 'chip-off'}`}
              >
                {pr.label}
              </button>
            ))}
          </div>
          <p className="mb-2 text-[11px] text-muted">{PRACTICE[practice[p.carId]]?.effect || 'Pick a programme'}</p>
          <p className="label mb-1">Qualifying lap</p>
          <div className="grid grid-cols-2 gap-2">
            {[QUALI_MODE.Safe, QUALI_MODE.Push].map((m) => (
              <button
                key={m}
                type="button"
                data-quali={`${p.carId}-${m}`}
                onClick={() => onMode(p.carId, m)}
                className={`chip ${modes[p.carId] === m ? (m === 'Push' ? 'bg-rose text-ink' : 'bg-lantern text-ink') : 'chip-off'}`}
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
    <div className="screen-enter grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
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
              <span className={`flex flex-1 items-center gap-2 ${q.isPlayer ? 'font-bold text-white' : 'text-cream/75'}`}><Face name={q.name} className="h-6 w-6" />{q.name}</span>
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
        <TrackMap pitSide={track.pitSide} points={track.points} className="h-48 w-full" width={4} />
        {quali.filter((q) => q.isPlayer).map((q) => (
          <p key={q.carId} className="text-sm">
            <b className="font-display text-lg">{q.name}</b> starts <b className="text-data">P{q.pos}</b>
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

export const ResultsPanel = ({ result, track, table, teamsTable, isLast, onNext, nameOf, moraleChanges = [] }) => (
  <div className="screen-enter grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
    <div className="panel p-5">
      <h3 className="panel-title mb-4">Result | {track.name}</h3>
      <div data-testid="round-result">
        {result.rows.map((r) => {
          const who = nameOf(r.carId);
          return (
            <div key={r.carId} className={`flex items-center gap-3 border-t border-line py-1.5 font-mono text-xs ${who.isPlayer ? 'bg-data/10' : ''}`}>
              <span className="w-8 text-right font-bold">{r.dnf ? 'DNF' : r.pos}</span>
              <span className="h-3 w-1 rounded-sm" style={{ background: who.color }} />
              <span className={`flex flex-1 items-center gap-2 ${who.isPlayer ? 'font-bold text-white' : 'text-cream/75'}`}><Face name={who.name} className="h-6 w-6" />{who.name}</span>
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
            <span className="flex flex-1 items-center gap-2"><Face name={d.name} className="h-6 w-6" />{d.name}</span>
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
      {moraleChanges.filter((m) => nameOf(m.carId).isPlayer).length > 0 && (
        <div className="panel p-5" data-testid="morale-changes">
          <h3 className="panel-title mb-3">Morale after the race</h3>
          {moraleChanges.filter((m) => nameOf(m.carId).isPlayer).map((m) => (
            <div key={m.carId} className="flex items-center justify-between border-t border-line py-1.5 text-sm">
              <span>{m.name}</span>
              <span className="flex items-center gap-3">
                <span className={`font-mono text-xs ${m.after >= m.before ? 'text-emerald-400' : 'text-red-400'}`}>
                  {m.after >= m.before ? '+' : ''}{m.after - m.before}
                </span>
                <MoraleMeter value={m.after} />
              </span>
            </div>
          ))}
        </div>
      )}
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
      <h2 className="display mt-2 text-5xl">World Champion</h2>
      <Face name={champ.name} className="mx-auto mt-4 h-28 w-28" />
      <p className="mt-4 font-display text-4xl font-bold" style={{ color: champ.color }}>{champ.name}</p>
      <p className="text-muted">{champ.team} | {champ.points} points | {champ.wins} wins</p>
      <p className="mt-6 font-display text-xl font-bold">Constructors: <span style={{ color: champTeam.color }}>{champTeam.name}</span> ({champTeam.points})</p>
      <div className="mx-auto mt-6 max-w-md rounded-lg border border-line bg-ink/60 p-4 text-sm">
        <p className="mb-2 panel-title justify-center">Your season</p>
        {me.map((d) => <p key={d.carId}>{d.name}: P{d.pos} with {d.points} points</p>)}
        <p className="mt-1 text-data">Team: P{myTeam.pos} with {myTeam.points} points</p>
      </div>
      <button type="button" data-testid="new-season" onClick={onNewSeason} className="btn btn-primary mt-8 px-10 py-4 text-base">
        Go to the driver market
      </button>
    </div>
  );
};

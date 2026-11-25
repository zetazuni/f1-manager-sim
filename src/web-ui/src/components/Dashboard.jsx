import React from 'react';
import { ERS, FUEL, formatLap } from '../game/raceSim';
import { playClickSound } from '../services/AudioManager';
import { COMPOUNDS, COMPOUND_KEYS } from '../game/tyres';
import TyreBadge from './TyreBadge';

const EVENT_COLOR = {
  danger: 'text-red-400',
  success: 'text-emerald-400',
  warning: 'text-amber-300',
  fastest: 'text-purple-400',
  info: 'text-slate-200',
};

const SPEEDS = [1, 2, 4];

const pill = (active, activeClass) =>
  `rounded-md px-2 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors duration-150 ${
    active ? `${activeClass} text-white shadow-lg ring-1 ring-white/20` : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600'
  }`;

const Bar = ({ value, color, label }) => (
  <div>
    <div className="mb-1 flex justify-between text-[10px] uppercase tracking-widest text-slate-500">
      <span>{label}</span>
      <span className="font-mono text-slate-300">{value.toFixed(0)}</span>
    </div>
    <div className="h-1.5 overflow-hidden rounded bg-slate-900">
      <div className={`h-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  </div>
);

const DriverCard = ({ row, totalLaps, started, focused, onFocus, onStrategy }) => {
  const locked = row.dnf || row.finished;
  const need = Math.max(0, totalLaps - row.lapsDone) * row.fuelPerLap;
  const act = (change) => { playClickSound(); onStrategy(row.id, change); };
  return (
    <div className={`rounded-lg border bg-slate-900/40 p-4 ${focused ? 'border-sky-400/70' : 'border-slate-700'}`} data-testid="driver-card">
      <button type="button" onClick={() => onFocus(row.id)} className="mb-3 flex w-full items-baseline justify-between gap-2 text-left">
        <span>
          <span className="mr-2 font-mono text-2xl font-black italic">P{row.pos}</span>
          <span className="font-bold">{row.name}</span>
        </span>
        <span className="font-mono text-xs text-slate-400">
          {row.dnf ? <span className="text-red-400">DNF: {row.dnf}</span> : `${row.gap} | last ${formatLap(row.lastLap)}`}
        </span>
      </button>

      <div className="mb-3 flex items-center gap-3 rounded-md bg-slate-950/50 px-3 py-2">
        <TyreBadge compound={row.compound} size="lg" />
        <div className="flex-1 text-xs">
          <p className="font-bold">{COMPOUNDS[row.compound].name} <span className="font-normal text-slate-400">| {row.tyreAge} laps old</span></p>
          <p className="text-slate-500">
            Stops {row.stops} | used {row.compoundsUsed.map((k) => COMPOUNDS[k].name).join(', ')}
            {row.compoundsUsed.length < 2 && started && <span className="text-amber-300"> | needs a 2nd compound</span>}
          </p>
        </div>
        {row.inPit && <span className="rounded bg-amber-400 px-2 py-0.5 text-[10px] font-black text-slate-900">IN PIT</span>}
        {!row.inPit && row.pitRequest && <span className="animate-pulse rounded bg-sky-500 px-2 py-0.5 text-[10px] font-black">BOX THIS LAP</span>}
      </div>

      <div className="mb-2 grid grid-cols-3 gap-3">
        <Bar label="Fuel kg" value={row.fuel} color="bg-yellow-400" />
        <Bar label="Battery" value={row.battery} color="bg-sky-400" />
        <Bar label="Tyre wear" value={row.tireWear * 100} color="bg-purple-400" />
      </div>
      <p className={`mb-3 text-[11px] ${need > row.fuel && !locked ? 'text-amber-300' : 'text-slate-500'}`}>
        Fuel to finish at this mapping: <span className="font-mono">{need.toFixed(1)} kg</span>
      </p>

      <fieldset disabled={locked} className="space-y-2 disabled:opacity-40">
        <div className="grid grid-cols-[4.5rem_1fr_1fr_1fr] items-center gap-2">
          <span className="label">ERS</span>
          {[ERS.Neutral, ERS.Attack, ERS.Overtake].map((m) => (
            <button key={m} type="button" onClick={() => act({ ersMode: m })} className={pill(row.ersMode === m, 'bg-f1-red')}>{m}</button>
          ))}
        </div>
        <div className="grid grid-cols-[4.5rem_1fr_1fr_1fr] items-center gap-2">
          <span className="label">{started ? 'Box for' : 'Start on'}</span>
          {COMPOUND_KEYS.map((k) => {
            const active = started ? row.pitRequest === k : row.compound === k;
            return (
              <button
                key={k}
                type="button"
                data-pit={k}
                onClick={() => act(started ? { pitRequest: row.pitRequest === k ? null : k } : { compound: k })}
                className={`${pill(active, 'bg-slate-500')} flex items-center justify-center gap-1.5`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: COMPOUNDS[k].color }} />
                {COMPOUNDS[k].name}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-[4.5rem_1fr_1fr_1fr] items-center gap-2">
          <span className="label">Fuel</span>
          {[FUEL.Lean, FUEL.Standard, FUEL.Rich].map((m) => (
            <button key={m} type="button" onClick={() => act({ fuelMode: m })} className={pill(row.fuelMode === m, 'bg-blue-600')}>{m}</button>
          ))}
        </div>
      </fieldset>
      <label className="mt-3 flex cursor-pointer items-center gap-2 text-[11px] text-slate-400">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 accent-sky-500"
          checked={row.autoAi}
          disabled={locked}
          onChange={(e) => onStrategy(row.id, { autoAi: e.target.checked })}
        />
        Engineer strategy (the team plans pit stops and ERS for this car)
      </label>
    </div>
  );
};

const Dashboard = ({ team, track, snap, running, speed, onToggleRun, onSpeed, onStrategy, onRestart, focusId, onFocus }) => {
  // fixed order (driver 1, driver 2) so buttons never swap under the cursor when positions change
  const players = snap.rows.filter((r) => r.isPlayer).sort((a, b) => a.id.localeCompare(b.id));
  const lapText = snap.over ? 'FINISHED' : `LAP ${snap.started ? snap.leaderLap : 0} / ${snap.totalLaps}`;

  return (
    <div className="panel space-y-6 p-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="label mb-1 text-sm text-slate-400">{track.name} GP | {team.name}</h2>
          <p className="text-3xl font-black italic tracking-tighter" data-testid="lap">{lapText}</p>
        </div>
        <div className="text-right">
          <p className="label">Budget</p>
          <p className="font-mono text-2xl text-green-400">${team.budget.toLocaleString()}</p>
        </div>
      </div>

      {/* Race radio: real events from the race */}
      <div className="min-h-[96px] rounded-lg border border-slate-700 bg-black/40 p-4">
        <p className="label mb-2">Race Radio</p>
        {snap.events.length ? (
          <ul className="space-y-1">
            {snap.events.slice(0, 3).map((e, i) => (
              <li key={`${e.time}-${i}`} className={`text-sm ${EVENT_COLOR[e.type] || 'text-slate-200'} ${i ? 'opacity-60' : ''}`}>
                <span className="font-bold">L{e.lap}:</span> {e.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm italic text-slate-500">{snap.started ? 'All quiet on the radio.' : 'Lights out when you are ready.'}</p>
        )}
      </div>

      <div className="space-y-4">
        {players.map((row) => (
          <DriverCard key={row.id} row={row} totalLaps={snap.totalLaps} started={snap.started} focused={focusId === row.id} onFocus={onFocus} onStrategy={onStrategy} />
        ))}
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-3">
        {snap.over ? (
          <button type="button" onClick={onRestart} className="rounded-xl bg-f1-red py-4 font-black uppercase tracking-widest shadow-xl hover:bg-f1-red-dark">
            New race
          </button>
        ) : (
          <button
            type="button"
            data-testid="run"
            onClick={() => { playClickSound(); onToggleRun(); }}
            className={`rounded-xl py-4 font-black uppercase tracking-widest shadow-xl transition-transform hover:scale-[1.01] active:scale-[0.99] ${
              running ? 'bg-amber-500 text-slate-900 hover:bg-amber-400' : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }`}
          >
            {running ? 'Pause' : snap.started ? 'Resume' : 'Start race'}
          </button>
        )}
        <div className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/40 p-1" role="group" aria-label="Race speed">
          {SPEEDS.map((s) => (
            <button key={s} type="button" data-speed={s} onClick={() => onSpeed(s)} className={pill(speed === s, 'bg-slate-500')}>
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

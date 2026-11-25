import React from 'react';
import { ERS, FUEL, formatLap } from '../game/raceSim';
import { playClickSound } from '../services/AudioManager';
import { COMPOUNDS, COMPOUND_KEYS, WET_KEYS } from '../game/tyres';
import TyreBadge from './TyreBadge';

const EVENT_COLOR = {
  danger: 'text-red-400',
  success: 'text-emerald-400',
  warning: 'text-amber-300',
  fastest: 'text-purple-400',
  info: 'text-slate-200',
};
const EVENT_DOT = {
  danger: 'bg-red-500',
  success: 'bg-emerald-400',
  warning: 'bg-amber-300',
  fastest: 'bg-purple-400',
  info: 'bg-slate-400',
};

const SPEEDS = [1, 2, 4];

const chip = (active, activeClass) => `chip ${active ? `${activeClass} text-white shadow-lg ring-1 ring-white/20` : 'chip-off'}`;

const Bar = ({ value, color, label, warn = false }) => (
  <div>
    <div className="mb-1 flex justify-between text-[10px] uppercase tracking-widest text-muted">
      <span>{label}</span>
      <span className={`font-mono ${warn ? 'text-amber-300' : 'text-slate-200'}`}>{value.toFixed(0)}</span>
    </div>
    <div className="h-1.5 overflow-hidden rounded-full bg-ink">
      <div className={`h-full rounded-full ${color} transition-[width] duration-300`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  </div>
);

const DriverCard = ({ row, totalLaps, started, focused, onFocus, onStrategy }) => {
  const locked = row.dnf || row.finished;
  const need = Math.max(0, totalLaps - row.lapsDone) * row.fuelPerLap;
  const act = (change) => { playClickSound(); onStrategy(row.id, change); };
  return (
    <div
      className={`rounded-lg border bg-panel-2/60 p-4 transition-colors ${focused ? 'border-data/60 shadow-[0_0_0_1px_rgb(34_211_238/0.25)]' : 'border-line'}`}
      data-testid="driver-card"
    >
      <button type="button" onClick={() => onFocus(row.id)} className="mb-3 flex w-full items-center justify-between gap-2 text-left">
        <span className="flex items-baseline gap-3">
          <span className="font-display text-3xl font-bold italic leading-none">P{row.pos}</span>
          <span>
            <span className="block font-display text-lg font-bold uppercase leading-tight tracking-wide">{row.name}</span>
            <span className="text-[11px] text-muted">from P{row.grid} {row.pos < row.grid ? `(+${row.grid - row.pos})` : ''}</span>
          </span>
        </span>
        <span className="text-right font-mono text-xs text-slate-400">
          {row.dnf ? <span className="text-red-400">DNF: {row.dnf}</span> : (
            <>
              <span className="block text-slate-200">{row.gap}</span>
              <span>last {formatLap(row.lastLap)}</span>
            </>
          )}
        </span>
      </button>

      <div className="mb-3 flex items-center gap-3 rounded-md border border-line bg-ink/60 px-3 py-2">
        <TyreBadge compound={row.compound} size="lg" />
        <div className="flex-1 text-xs">
          <p className="font-bold">{COMPOUNDS[row.compound].name} <span className="font-normal text-muted">| {row.tyreAge} laps old</span></p>
          <p className="text-muted">
            Stops {row.stops} | used {row.compoundsUsed.map((k) => COMPOUNDS[k].name).join(', ')}
            {row.compoundsUsed.length < 2 && started && !locked && <span className="text-amber-300"> | needs a 2nd compound</span>}
          </p>
        </div>
        {row.inPit && <span className="rounded bg-amber-400 px-2 py-0.5 font-display text-[11px] font-bold text-slate-900">IN PIT</span>}
        {!row.inPit && row.pitRequest && <span className="animate-pulse rounded bg-data px-2 py-0.5 font-display text-[11px] font-bold text-slate-900">BOX THIS LAP</span>}
      </div>

      <div className="mb-2 grid grid-cols-3 gap-3">
        <Bar label="Fuel kg" value={row.fuel} color="bg-yellow-400" warn={need > row.fuel && !locked} />
        <Bar label="Battery" value={row.battery} color="bg-data" warn={row.battery < 15} />
        <Bar label="Tyre wear" value={row.tireWear * 100} color={row.tireWear > 0.7 ? 'bg-red-500' : 'bg-purple-400'} warn={row.tireWear > 0.7} />
      </div>
      <p className={`mb-3 text-[11px] ${need > row.fuel && !locked ? 'text-amber-300' : 'text-muted'}`}>
        Fuel to finish at this mapping: <span className="font-mono">{need.toFixed(1)} kg</span>
      </p>

      <fieldset disabled={locked} className="space-y-2 disabled:opacity-40">
        <div className="grid grid-cols-[4.5rem_1fr_1fr_1fr] items-center gap-2">
          <span className="label">ERS</span>
          {[ERS.Neutral, ERS.Attack, ERS.Overtake].map((m) => (
            <button key={m} type="button" onClick={() => act({ ersMode: m })} className={chip(row.ersMode === m, 'bg-f1-red')}>{m}</button>
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
                className={`${chip(active, 'bg-slate-600')} flex items-center justify-center gap-1.5`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: COMPOUNDS[k].color }} />
                {COMPOUNDS[k].name}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-[4.5rem_1fr_1fr_1fr] items-center gap-2">
          <span className="label">Wet tyres</span>
          {WET_KEYS.map((k) => {
            const active = started ? row.pitRequest === k : row.compound === k;
            return (
              <button
                key={k}
                type="button"
                data-pit={k}
                onClick={() => act(started ? { pitRequest: row.pitRequest === k ? null : k } : { compound: k })}
                className={`${chip(active, 'bg-slate-600')} flex items-center justify-center gap-1.5`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: COMPOUNDS[k].color }} />
                {k === 'I' ? 'Inter' : 'Wet'}
              </button>
            );
          })}
          <span />
        </div>
        <div className="grid grid-cols-[4.5rem_1fr_1fr_1fr] items-center gap-2">
          <span className="label">Fuel</span>
          {[FUEL.Lean, FUEL.Standard, FUEL.Rich].map((m) => (
            <button key={m} type="button" onClick={() => act({ fuelMode: m })} className={chip(row.fuelMode === m, 'bg-blue-600')}>{m}</button>
          ))}
        </div>
      </fieldset>
      <label className="mt-3 flex cursor-pointer items-center gap-2 text-[11px] text-muted">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 accent-cyan-400"
          checked={row.autoAi}
          disabled={locked}
          onChange={(e) => onStrategy(row.id, { autoAi: e.target.checked })}
        />
        Engineer strategy (the team plans pit stops and ERS for this car)
      </label>
    </div>
  );
};

const conditionOf = (w) => (w < 0.05 ? 'Dry' : w < 0.26 ? 'Damp' : w < 0.6 ? 'Wet' : 'Heavy rain');

/** Current conditions, wetness and the radar forecast. */
const WeatherStrip = ({ wetness = 0, forecast }) => {
  const label = conditionOf(wetness);
  const icon = wetness < 0.05 ? (forecast ? 'cloud' : 'sun') : 'rain';
  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-ink/50 px-3 py-2" data-testid="weather">
      <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        {icon === 'sun' && (<><circle cx="12" cy="12" r="4" className="text-amber-300" stroke="#fcd34d" /><path stroke="#fcd34d" d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></>)}
        {icon !== 'sun' && <path stroke="#cbd5e1" d="M7 17a4 4 0 1 1 .8-7.9A5.5 5.5 0 0 1 18.5 11 3 3 0 0 1 18 17z" />}
        {icon === 'rain' && <path stroke="#60a5fa" d="M8 20l1-2M12 21l1-2M16 20l1-2" />}
      </svg>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-sm font-bold uppercase tracking-wider">{label}</span>
          <span className="text-[11px] text-muted">{forecast ? `Radar: rain from about lap ${forecast.from}` : wetness > 0.05 ? 'Track wetness' : 'No rain on the radar'}</span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-panel-2">
          <div className="h-full rounded-full bg-blue-400" style={{ width: `${Math.round(wetness * 100)}%` }} />
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ team, track, snap, running, speed, onToggleRun, onSpeed, onStrategy, onTeamOrder = () => {}, onRestart, finishLabel = 'New race', focusId, onFocus }) => {
  // fixed order (driver 1, driver 2) so buttons never swap under the cursor when positions change
  const players = snap.rows.filter((r) => r.isPlayer).sort((a, b) => a.id.localeCompare(b.id));
  const lapText = snap.over ? 'FINISHED' : `LAP ${snap.started ? snap.leaderLap : 0} / ${snap.totalLaps}`;
  const progress = snap.over ? 100 : snap.started ? ((snap.leaderLap - 1) / snap.totalLaps) * 100 : 0;

  return (
    <div className="panel space-y-5 p-5">
      <div>
        <div className="flex items-end justify-between">
          <div>
            <p className="label mb-1">{track.name} | {team.name}</p>
            <p className="font-display text-4xl font-bold italic leading-none tracking-tight" data-testid="lap">{lapText}</p>
          </div>
          <div className="text-right">
            <p className="label">Budget</p>
            <p className="font-mono text-xl text-emerald-400">${(team.budget / 1e6).toFixed(1)}M</p>
          </div>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-ink">
          <div className="h-full bg-gradient-to-r from-f1-red to-orange-400 transition-[width] duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {snap.safetyCar && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-400/60 bg-amber-400/15 px-4 py-2.5" data-testid="sc-banner">
          <span className="animate-pulse rounded bg-amber-400 px-2 py-0.5 font-display text-sm font-bold tracking-widest text-slate-900">SAFETY CAR</span>
          <span className="text-xs text-amber-100">No overtaking. The field closes up and pit stops cost about half as much.</span>
        </div>
      )}

      <WeatherStrip wetness={snap.wetness} forecast={snap.rainForecast} />

      {/* Race radio: real events from the race */}
      <div className="min-h-[104px] rounded-lg border border-line bg-ink/70 p-4">
        <p className="panel-title mb-2 text-xs">Race radio</p>
        {snap.events.length ? (
          <ul className="space-y-1.5">
            {snap.events.slice(0, 3).map((e, i) => (
              <li key={`${e.time}-${i}`} className={`flex items-start gap-2 text-sm ${EVENT_COLOR[e.type] || 'text-slate-200'} ${i ? 'opacity-60' : ''}`}>
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${EVENT_DOT[e.type] || 'bg-slate-400'}`} />
                <span><span className="font-mono text-xs text-muted">L{e.lap}</span> {e.message}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm italic text-muted">{snap.started ? 'All quiet on the radio.' : 'Lights out when you are ready.'}</p>
        )}
      </div>

      <div className="space-y-3">
        {players.map((row) => (
          <DriverCard key={row.id} row={row} totalLaps={snap.totalLaps} started={snap.started} focused={focusId === row.id} onFocus={onFocus} onStrategy={onStrategy} />
        ))}
      </div>

      {snap.started && !snap.over && (
        <div className="rounded-lg border border-line bg-ink/50 p-3" data-testid="team-orders">
          <p className="label mb-2">Team orders</p>
          <div className="grid grid-cols-3 gap-2">
            {[['race', 'Let them race'], ['hold', 'Hold positions']].map(([o, label]) => (
              <button
                key={o}
                type="button"
                data-order={o}
                onClick={() => { playClickSound(); onTeamOrder(o); }}
                className={chip((snap.teamOrders?.[team.id] || 'race') === o, 'bg-slate-600')}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              data-order="swap"
              onClick={() => { playClickSound(); onTeamOrder('swap'); }}
              className={chip(!!snap.swapPending?.[team.id], 'bg-amber-500')}
              title="The car ahead lets its teammate through when they are within 3 seconds"
            >
              {snap.swapPending?.[team.id] ? 'Swap pending' : 'Swap cars'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-[1fr_auto] gap-3">
        {snap.over ? (
          <button type="button" data-testid="continue" onClick={onRestart} className="btn btn-primary py-4 text-base">
            {finishLabel}
          </button>
        ) : (
          <button
            type="button"
            data-testid="run"
            onClick={() => { playClickSound(); onToggleRun(); }}
            className={`btn py-4 text-base ${running ? 'bg-amber-500 text-slate-900 hover:bg-amber-400' : 'btn-go'}`}
          >
            {running ? 'Pause' : snap.started ? 'Resume' : 'Lights out'}
          </button>
        )}
        <div className="flex items-center gap-1 rounded-lg border border-line bg-ink/60 p-1" role="group" aria-label="Race speed">
          {SPEEDS.map((s) => (
            <button key={s} type="button" data-speed={s} onClick={() => onSpeed(s)} className={chip(speed === s, 'bg-slate-600')}>
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

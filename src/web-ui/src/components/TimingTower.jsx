import React from 'react';
import { formatLap } from '../game/raceSim';

const TimingTower = ({ snap, focusId, onFocus }) => (
  <aside className="panel p-4 lg:col-span-2 2xl:col-span-1">
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="text-xl font-bold">Timing</h2>
      {snap.fastest && (
        <p className="text-[11px] text-purple-300">
          Fastest {formatLap(snap.fastest.time)} (L{snap.fastest.lap})
        </p>
      )}
    </div>
    <table className="w-full border-collapse font-mono text-xs" data-testid="tower">
      <thead>
        <tr className="label text-left">
          <th className="py-1 pr-2">Pos</th>
          <th className="py-1 pr-2">Driver</th>
          <th className="py-1 pr-2 text-right">Gap</th>
          <th className="hidden py-1 pr-2 text-right sm:table-cell">Last</th>
          <th className="py-1 text-right">Grid</th>
        </tr>
      </thead>
      <tbody>
        {snap.rows.map((r) => {
          const moved = r.grid - r.pos;
          const isFastest = snap.fastest?.carId === r.id;
          return (
            <tr
              key={r.id}
              onClick={() => onFocus(r.id)}
              className={`cursor-pointer border-t border-slate-700/60 hover:bg-white/5 ${
                r.isPlayer ? 'bg-sky-500/10' : ''
              } ${focusId === r.id ? 'outline outline-1 -outline-offset-1 outline-sky-400/70' : ''} ${r.dnf ? 'text-slate-500' : ''}`}
            >
              <td className="py-1.5 pr-2 font-bold">{r.pos}</td>
              <td className="py-1.5 pr-2">
                <span className="mr-2 inline-block h-3 w-1 rounded-sm align-middle" style={{ background: r.color }} />
                <span className={r.isPlayer ? 'font-bold text-white' : ''}>{r.code}</span>
                <span className="ml-2 hidden text-slate-500 md:inline">{r.team}</span>
              </td>
              <td className="py-1.5 pr-2 text-right">{r.gap}</td>
              <td className={`hidden py-1.5 pr-2 text-right sm:table-cell ${isFastest ? 'text-purple-400' : ''}`}>{formatLap(r.lastLap)}</td>
              <td className={`py-1.5 text-right ${moved > 0 ? 'text-emerald-400' : moved < 0 ? 'text-red-400' : 'text-slate-500'}`}>
                {moved > 0 ? `+${moved}` : moved < 0 ? moved : '='}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </aside>
);

export default TimingTower;

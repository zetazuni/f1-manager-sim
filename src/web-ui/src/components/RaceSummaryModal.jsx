import React from 'react';
import { formatLap } from '../game/raceSim';

const RaceSummaryModal = ({ isOpen, onClose, onRestart, restartLabel = 'NEW RACE', snap, trackName }) => {
  if (!isOpen) return null;
  const teamPoints = snap.rows.filter((r) => r.isPlayer).reduce((a, r) => a + r.points, 0);

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="panel flex max-h-[90vh] w-full max-w-xl flex-col bg-panel p-6">
        <p className="label">Race result</p>
        <h2 className="display text-3xl italic text-white">{trackName}</h2>
        <p className="mb-4 text-sm text-slate-400">
          Your team scored <span className="font-bold text-emerald-400">{teamPoints} points</span>.
          {snap.fastest && <> Fastest lap {formatLap(snap.fastest.time)}.</>}
        </p>
        <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-line bg-ink/70 p-3">
          <table className="w-full font-mono text-xs" data-testid="classification">
            <tbody>
              {snap.rows.map((r) => (
                <tr key={r.id} className={`border-t border-slate-800 ${r.isPlayer ? 'text-sky-300' : 'text-slate-300'}`}>
                  <td className="py-1 pr-2 font-bold">{r.dnf ? 'DNF' : r.pos}</td>
                  <td className="py-1 pr-2">
                    <span className="mr-2 inline-block h-3 w-1 rounded-sm align-middle" style={{ background: r.color }} />
                    {r.name}
                  </td>
                  <td className="py-1 pr-2 text-slate-500">{r.team}</td>
                  <td className="py-1 pr-2 text-right">{r.dnf ? r.dnf : r.gap}</td>
                  <td className="py-1 text-right font-bold">{r.points ? `+${r.points}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} className="btn btn-ghost">
            Back to race
          </button>
          <button type="button" data-testid="modal-continue" onClick={onRestart} className="btn btn-primary">
            {restartLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RaceSummaryModal;

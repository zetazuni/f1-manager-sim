import React from 'react';

const toSeconds = (s) => {
  const [m, sec] = s.split(':');
  return Number(m) * 60 + Number(sec);
};

const RaceSummaryModal = ({ isOpen, onClose, finalTimes, totalBudget }) => {
  if (!isOpen) return null;
  const best = finalTimes.length ? finalTimes.reduce((a, b) => (toSeconds(b) < toSeconds(a) ? b : a)) : 'N/A';

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-xl border border-slate-600 bg-slate-800 p-8 shadow-2xl">
        <h2 className="mb-4 text-2xl font-black italic text-white">RACE FINISHED</h2>
        <div className="space-y-4">
          <p className="text-slate-300">Race classification complete.</p>
          <div className="space-y-1 rounded bg-slate-900 p-4 font-mono text-sm">
            <p>Laps completed: {finalTimes.length}</p>
            <p>Best lap: <span className="text-purple-400">{best}</span></p>
            <p>Final budget: ${totalBudget.toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="w-full rounded bg-f1-red py-3 font-bold hover:bg-f1-red-dark">
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

export default RaceSummaryModal;

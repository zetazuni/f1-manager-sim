import React from 'react';

const RaceSummaryModal = ({ isOpen, onClose, finalTimes, totalBudget }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-slate-800 p-8 rounded-xl border border-slate-600 shadow-2xl max-w-md w-full">
        <h2 className="text-2xl font-black text-white mb-4">RACE FINISHED</h2>
        <div className="space-y-4">
          <p className="text-slate-300">Race classification complete.</p>
          <div className="bg-slate-900 p-4 rounded text-sm font-mono">
            <p>Final Budget: ${totalBudget.toLocaleString()}</p>
          </div>
          <button
            onClick={onClose}
            className="w-full bg-red-600 py-3 rounded font-bold hover:bg-red-500"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};

export default RaceSummaryModal;

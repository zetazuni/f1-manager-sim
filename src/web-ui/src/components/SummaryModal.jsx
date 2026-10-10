import React from 'react';

const SummaryModal = ({ lapTimes, budget, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-800 p-8 rounded-2xl border border-red-500 shadow-2xl max-w-lg w-full">
        <h2 className="text-3xl font-black italic text-white mb-6 uppercase tracking-tighter border-b border-slate-700 pb-4">Race Result</h2>
        <div className="space-y-4 mb-8">
            <p className="text-slate-400">Total Laps: {lapTimes.length}</p>
            <p className="text-slate-400">Final Budget: ${budget.toLocaleString()}</p>
            <p className="text-slate-400">Best Lap: {lapTimes.length > 0 ? lapTimes[0] : 'N/A'}</p>
        </div>
        <button 
            onClick={onClose}
            className="w-full py-4 bg-red-600 hover:bg-red-500 rounded-xl font-bold uppercase tracking-widest text-white transition-all"
        >
            CLOSE
        </button>
      </div>
    </div>
  );
};

export default SummaryModal;

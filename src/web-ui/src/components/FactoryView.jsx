import React from 'react';

const FactoryView = ({ team }) => {
  return (
    <div className="p-6 bg-slate-800 rounded-lg border border-slate-700">
      <h2 className="text-2xl font-bold mb-4">Factory & Development</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-slate-900 rounded border border-slate-700">
          <h3 className="font-bold">Aero Upgrade</h3>
          <p className="text-sm">Current: {team.car.aeroHighSpeed.toFixed(2)}</p>
          <button className="mt-2 bg-blue-600 px-3 py-1 rounded text-xs">Research (-$5M)</button>
        </div>
        <div className="p-4 bg-slate-900 rounded border border-slate-700">
          <h3 className="font-bold">Engine Upgrade</h3>
          <p className="text-sm">Current: {team.car.powerUnit.toFixed(2)}</p>
          <button className="mt-2 bg-blue-600 px-3 py-1 rounded text-xs">Develop (-$8M)</button>
        </div>
      </div>
    </div>
  );
};

export default FactoryView;

import React from 'react';

const Row = ({ pos, color, name, sub, points, wins, highlight, leaderPoints }) => (
  <tr className={`border-t border-line ${highlight ? 'bg-data/10 text-white' : 'text-slate-300'}`}>
    <td className="py-2 pr-3 text-right font-mono text-xs font-bold">{pos}</td>
    <td className="py-2 pr-3">
      <span className="flex items-center gap-2">
        <span className="h-4 w-1 rounded-sm" style={{ background: color }} />
        <span className={highlight ? 'font-bold' : ''}>{name}</span>
        {sub && <span className="text-xs text-muted">{sub}</span>}
      </span>
    </td>
    <td className="py-2 pr-3 text-right font-mono text-xs text-muted">{wins || ''}</td>
    <td className="w-40 py-2">
      <span className="flex items-center gap-2">
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink">
          <span className="block h-full rounded-full" style={{ width: `${leaderPoints ? (points / leaderPoints) * 100 : 0}%`, background: color }} />
        </span>
        <span className="w-9 text-right font-mono font-bold">{points}</span>
      </span>
    </td>
  </tr>
);

const StandingsView = ({ table, teamsTable, roundsDone, total }) => (
  <div className="grid gap-5 xl:grid-cols-2">
    <section className="panel p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="panel-title">Drivers championship</h3>
        <span className="label">after {roundsDone} of {total} rounds</span>
      </div>
      <table className="w-full text-sm" data-testid="driver-standings">
        <thead>
          <tr className="label text-left"><th className="pb-1 pr-3 text-right">Pos</th><th className="pb-1">Driver</th><th className="pb-1 pr-3 text-right">Wins</th><th className="pb-1 text-right">Points</th></tr>
        </thead>
        <tbody>
          {table.map((d) => (
            <Row key={d.carId} pos={d.pos} color={d.color} name={d.name} sub={d.teamShort} points={d.points} wins={d.wins} highlight={d.isPlayer} leaderPoints={table[0].points} />
          ))}
        </tbody>
      </table>
    </section>
    <section className="panel h-fit p-5">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="panel-title">Constructors championship</h3>
        <span className="label">2 cars score</span>
      </div>
      <table className="w-full text-sm" data-testid="team-standings">
        <thead>
          <tr className="label text-left"><th className="pb-1 pr-3 text-right">Pos</th><th className="pb-1">Team</th><th className="pb-1 pr-3 text-right">Wins</th><th className="pb-1 text-right">Points</th></tr>
        </thead>
        <tbody>
          {teamsTable.map((t) => (
            <Row key={t.teamId} pos={t.pos} color={t.color} name={t.name} points={t.points} wins={t.wins} highlight={t.isPlayer} leaderPoints={teamsTable[0].points} />
          ))}
        </tbody>
      </table>
    </section>
  </div>
);

export default StandingsView;

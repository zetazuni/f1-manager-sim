import React from 'react';
import Face from './Face';
import MoraleMeter from './MoraleMeter';
import TrackRecords from './TrackRecords';
import { sponsorGoalFor } from '../game/factory';

/** Where we stand going into the weekend, all from the career data. */
const Briefing = ({ season, track, table }) => {
  const leader = table.drivers[0];
  const last = season.results[season.results.length - 1];
  const mine = table.drivers.filter((d) => d.isPlayer);
  const goal = sponsorGoalFor(season.round);
  const team = table.teams.find((t) => t.isPlayer);
  return (
    <div className="grid gap-5 lg:grid-cols-3" data-testid="briefing">
      <section className="panel p-5">
        <h3 className="panel-title mb-3">Our drivers</h3>
        {mine.map((d) => {
          const [teamId, seat] = [d.carId.slice(0, d.carId.lastIndexOf('-')), Number(d.carId.slice(d.carId.lastIndexOf('-') + 1))];
          const person = season.career?.drivers[season.career.lineups[teamId]?.[seat]];
          const before = last?.rows.find((r) => r.carId === d.carId);
          return (
            <div key={d.carId} className="flex items-center gap-3 border-t border-line py-2">
              <Face name={d.name} className="h-11 w-11" />
              <div className="min-w-0 flex-1">
                <p className="font-display font-bold">{d.name}</p>
                <p className="text-xs text-muted">
                  P{d.pos} | {d.points} pts{leader.points > d.points ? ` | ${leader.points - d.points} behind` : ''}
                  {before ? ` | last race ${before.dnf ? 'DNF' : `P${before.pos}`}` : ''}
                </p>
              </div>
              {person && <MoraleMeter value={person.morale} />}
            </div>
          );
        })}
        <p className="mt-3 text-sm text-muted">Team: P{team?.pos} with {team?.points} points</p>
        <p className="text-sm">Sponsor wants: <b className="text-lantern">{goal.label}</b> (${goal.reward}M)</p>
      </section>
      <section className="panel p-5">
        <h3 className="panel-title mb-3">Title race</h3>
        {table.drivers.slice(0, 6).map((d) => (
          <div key={d.carId} className={`flex items-center gap-3 border-t border-line py-1.5 text-sm ${d.isPlayer ? 'text-data' : ''}`}>
            <span className="w-5 text-right font-mono text-xs">{d.pos}</span>
            <span className="h-3 w-1 rounded-sm" style={{ background: d.color }} />
            <Face name={d.name} className="h-6 w-6" />
            <span className="flex-1">{d.name}</span>
            <span className="font-mono font-bold">{d.points}</span>
          </div>
        ))}
      </section>
      <section className="panel p-5">
        <TrackRecords trackId={track.id} career={season.career} />
      </section>
    </div>
  );
};

export default Briefing;

import React from 'react';
import { formatLap } from '../game/raceSim';
import { TRACK_HISTORY } from '../data/season';
import Face from './Face';

const Holder = ({ label, entry }) => (
  <div className="rounded-lg border border-line bg-ink/50 px-3 py-2">
    <p className="label">{label}</p>
    {entry ? (
      <>
        <p className="mt-1 font-mono text-lg font-bold">{formatLap(entry.time)}</p>
        <p className="flex items-center gap-2 text-xs text-muted"><Face name={entry.driver} className="h-6 w-6" />{entry.driver} | {entry.team} | {entry.year}</p>
      </>
    ) : (
      <p className="mt-1 text-sm text-muted">Not set yet</p>
    )}
  </div>
);

/** What has happened at one circuit: this career, and real results if the season pack has them. */
const TrackRecords = ({ trackId, career }) => {
  const mine = career?.records?.[trackId];
  const past = [...(TRACK_HISTORY[trackId] || [])].sort((a, b) => b.year - a.year);
  return (
    <section className="space-y-4" data-testid="track-records">
      <div>
        <h3 className="panel-title mb-2">Records in your career</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          <Holder label="Lap record (race)" entry={mine?.lap} />
          <Holder label="Best pole lap" entry={mine?.pole} />
        </div>
        {mine?.winners?.length ? (
          <table className="z-rows mt-2 w-full text-sm">
            <thead><tr className="label text-left"><th className="pb-1">Year</th><th className="pb-1">Winner</th><th className="pb-1">Team</th></tr></thead>
            <tbody>
              {mine.winners.map((w) => (
                <tr key={`${w.year}-${w.driver}`} className="border-t border-line">
                  <td className="py-1 font-mono">{w.year}</td>
                  <td className="py-1"><span className="flex items-center gap-2"><Face name={w.driver} className="h-6 w-6" />{w.driver}</span></td>
                  <td className="py-1 text-muted">{w.team}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-2 text-sm text-muted">No race here yet in this career.</p>
        )}
      </div>
      {past.length > 0 && (
        <div data-testid="real-history">
          <h3 className="panel-title mb-2">Real results</h3>
          <table className="z-rows w-full text-sm">
            <thead><tr className="label text-left"><th className="pb-1">Year</th><th className="pb-1">Winner</th><th className="pb-1">Pole</th><th className="pb-1">Fastest lap</th></tr></thead>
            <tbody>
              {past.map((h) => (
                <tr key={h.year} className="border-t border-line">
                  <td className="py-1 font-mono">{h.year}</td>
                  <td className="py-1"><b>{h.winner}</b> <span className="text-xs text-muted">{h.team}</span></td>
                  <td className="py-1 text-muted">{h.pole}</td>
                  <td className="py-1 text-muted">{h.fastest}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default TrackRecords;

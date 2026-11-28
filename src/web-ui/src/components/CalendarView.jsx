import React, { useEffect, useState } from 'react';
import TrackMap from './TrackMap';
import TrackRecords from './TrackRecords';
import { TrackCard } from './WeekendScreen';
import { ENVIRONMENTS } from '../game/environments';

/** Preview of one round: the same track card as race week, plus its records. */
const TrackModal = ({ track, round, total, teams, career, quality, onClose }) => {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-modal overflow-y-auto bg-black/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={track.name} onClick={onClose}>
      <div className="mx-auto max-w-6xl space-y-4" data-testid="track-modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-end">
          <button type="button" className="btn btn-ghost bg-panel px-4 py-2 text-sm" data-testid="track-close" onClick={onClose}>Close</button>
        </div>
        <TrackCard track={track} round={round} total={total} teams={teams} quality={quality} />
        <div className="panel bg-panel p-5">
          <TrackRecords trackId={track.id} career={career} />
        </div>
      </div>
    </div>
  );
};

const CalendarView = ({ calendar, round, results, nameOf, seasonDone, teams, career, quality }) => {
  const [open, setOpen] = useState(null);
  return (
    <>
      <div className="screen-enter grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="calendar">
        {calendar.map((t, i) => {
          const res = results[i];
          const winner = res ? nameOf(res.rows.find((r) => r.pos === 1)?.carId) : null;
          const status = res ? 'done' : i === round && !seasonDone ? 'next' : 'upcoming';
          return (
            <button
              type="button"
              key={t.id}
              data-track={t.id}
              onClick={() => setOpen(i)}
              className={`panel relative cursor-pointer overflow-hidden p-4 text-left transition-transform hover:-translate-y-0.5 hover:ring-1 hover:ring-lantern/60 ${status === 'next' ? 'ring-1 ring-lantern/60' : ''} ${status === 'upcoming' ? 'opacity-80' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="label">Round {i + 1} | {t.country}</p>
                  <h3 className="display text-xl leading-tight">{t.name}</h3>
                  <p className="text-xs text-muted">{ENVIRONMENTS[t.env].label} | {t.laps} laps</p>
                </div>
                <span className={`rounded px-2 py-0.5 font-display text-[11px] font-bold ${status === 'done' ? 'bg-data/15 text-data' : status === 'next' ? 'bg-gradient-to-r from-lantern to-rose text-ink' : 'bg-line-2 text-muted'}`}>
                  {status === 'done' ? 'Done' : status === 'next' ? 'Next' : 'Upcoming'}
                </span>
              </div>
              <TrackMap pitSide={t.pitSide} points={t.points} className="my-3 h-36 w-full" width={4} stroke={status === 'done' ? '#94a3b8' : '#e2e8f0'} />
              <p className="text-sm">
                {winner ? <>Winner: <b style={{ color: winner.color }}>{winner.name}</b></> : <span className="text-muted">Not raced yet. Click for the preview.</span>}
              </p>
            </button>
          );
        })}
      </div>
      {open !== null && (
        <TrackModal track={calendar[open]} round={open + 1} total={calendar.length} teams={teams} career={career} quality={quality} onClose={() => setOpen(null)} />
      )}
    </>
  );
};

export default CalendarView;

import React from 'react';
import TrackMap from './TrackMap';
import { ENVIRONMENTS } from '../game/environments';

const CalendarView = ({ calendar, round, results, nameOf, seasonDone }) => (
  <div className="screen-enter grid gap-4 sm:grid-cols-2 xl:grid-cols-3" data-testid="calendar">
    {calendar.map((t, i) => {
      const res = results[i];
      const winner = res ? nameOf(res.rows.find((r) => r.pos === 1)?.carId) : null;
      const status = res ? 'done' : i === round && !seasonDone ? 'next' : 'upcoming';
      return (
        <article
          key={t.id}
          className={`panel relative overflow-hidden p-4 ${status === 'next' ? 'ring-1 ring-lantern/60' : ''} ${status === 'upcoming' ? 'opacity-80' : ''}`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="label">Round {i + 1} | {t.country}</p>
              <h3 className="display text-xl leading-tight">{t.name}</h3>
              <p className="text-xs text-muted">{ENVIRONMENTS[t.env].label} | {t.laps} laps</p>
            </div>
            <span className={`rounded px-2 py-0.5 font-display text-[11px] font-bold ${
 status === 'done' ? 'bg-data/15 text-data' : status === 'next' ? 'bg-gradient-to-r from-lantern to-rose text-ink' : 'bg-line-2 text-muted'
 }`}
            >
              {status === 'done' ? 'Done' : status === 'next' ? 'Next' : 'Upcoming'}
            </span>
          </div>
          <TrackMap points={t.points} className="my-3 h-36 w-full" width={4} stroke={status === 'done' ? '#94a3b8' : '#e2e8f0'} />
          <p className="text-sm">
            {winner ? <>Winner: <b style={{ color: winner.color }}>{winner.name}</b></> : <span className="text-muted">Not raced yet</span>}
          </p>
        </article>
      );
    })}
  </div>
);

export default CalendarView;

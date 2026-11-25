import React from 'react';
import TrackMap from './TrackMap';
import { CALENDAR } from '../data/calendar';

/** Opening screen: continue the saved career or start a new one. */
const TitleScreen = ({ saveInfo, onContinue, onNew }) => (
  <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6" data-testid="title">
    {/* faint circuit outlines drifting behind the logo */}
    <div className="pointer-events-none absolute inset-0 grid grid-cols-3 gap-10 p-10 opacity-[0.07]">
      {CALENDAR.map((t) => <TrackMap key={t.id} points={t.points} className="h-full w-full" width={3} showPit={false} />)}
    </div>
    <div className="pointer-events-none absolute -left-40 top-1/3 h-[480px] w-[480px] rounded-full bg-f1-red/20 blur-3xl" />
    <div className="pointer-events-none absolute -right-40 bottom-0 h-[420px] w-[420px] rounded-full bg-data/10 blur-3xl" />

    <div className="relative w-full max-w-xl text-center">
      <div className="mx-auto mb-6 grid h-20 w-20 place-items-center rounded-2xl bg-f1-red font-display text-5xl font-bold italic shadow-[0_0_60px_rgba(225,6,0,0.55)]">Z</div>
      <h1 className="font-display text-6xl font-bold italic tracking-wide sm:text-7xl">ZETRACE</h1>
      <p className="mt-1 font-display text-sm uppercase tracking-[0.6em] text-muted">F1 Manager</p>
      <p className="mx-auto mt-6 max-w-md text-slate-300">
        Run Zetrace Racing from the pit wall: strategy, tyres and weather on race day, upgrades in the factory, and drivers on the market.
      </p>

      <div className="mx-auto mt-10 grid max-w-sm gap-3">
        {saveInfo && (
          <button type="button" data-testid="continue-career" onClick={onContinue} className="btn btn-primary py-4 text-base">
            Continue
            <span className="font-sans text-xs font-normal normal-case tracking-normal opacity-80">{saveInfo}</span>
          </button>
        )}
        <button type="button" data-testid="new-career" onClick={onNew} className={`btn py-4 text-base ${saveInfo ? 'btn-ghost' : 'btn-primary'}`}>
          {saveInfo ? 'New career (replaces the save)' : 'Start your career'}
        </button>
      </div>
      <p className="mt-8 text-[11px] text-muted">Fictional teams, drivers and circuits. Your career is saved in this browser.</p>
    </div>
  </div>
);

export default TitleScreen;

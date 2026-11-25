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
    <div className="pointer-events-none absolute -left-40 top-1/3 h-[480px] w-[480px] rounded-full bg-lantern/20 blur-3xl" />
    <div className="pointer-events-none absolute -right-40 bottom-0 h-[420px] w-[420px] rounded-full bg-rose/15 blur-3xl" />

    <div className="relative w-full max-w-xl text-center">
      <div className="lamp-glow mx-auto mb-6 grid h-20 w-20 place-items-center rounded-3xl bg-f1-red font-display text-5xl font-bold">Z</div>
      <h1 className="display bg-gradient-to-b from-cream via-cream to-lantern bg-clip-text pb-2 text-7xl text-transparent sm:text-8xl">Zetrace</h1>
      <p className="font-display text-base font-medium text-muted">an F1 manager for quiet evenings</p>
      <p className="mx-auto mt-6 max-w-md text-cream/75">
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

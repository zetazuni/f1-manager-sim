import React, { useState } from 'react';
import TrackMap from './TrackMap';
import Logo from './Logo';
import { CALENDAR, DISCLAIMER, GRID_TEAMS, PLAYER_TEAM_ID } from '../data/season';

/** Opening screen: continue the saved career or start a new one. */
const TitleScreen = ({ saveInfo, onContinue, onNew }) => {
  const [teamId, setTeamId] = useState(PLAYER_TEAM_ID);
  const team = GRID_TEAMS.find((t) => t.id === teamId) || GRID_TEAMS[0];
  return (
  <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-6" data-testid="title">
    {/* faint circuit outlines drifting behind the logo */}
    <div className="pointer-events-none absolute inset-0 grid grid-cols-3 gap-10 p-10 opacity-[0.07]">
      {CALENDAR.slice(0, 9).map((t) => <TrackMap key={t.id} points={t.points} className="h-full w-full" width={3} showPit={false} />)}
    </div>
    <div className="pointer-events-none absolute -left-40 top-1/3 h-[480px] w-[480px] rounded-full bg-lantern/20 blur-3xl" />
    <div className="pointer-events-none absolute -right-40 bottom-0 h-[420px] w-[420px] rounded-full bg-rose/15 blur-3xl" />

    <div className="relative w-full max-w-xl text-center">
      <Logo className="mx-auto mb-4 h-32 w-32 drop-shadow-[0_0_34px_rgba(225,6,0,0.5)]" />
      <h1 className="display bg-gradient-to-b from-cream via-cream to-lantern bg-clip-text pb-2 text-7xl text-transparent sm:text-8xl">Zetrace</h1>
      <p className="font-display text-base font-medium text-muted">an F1 manager for quiet evenings</p>
      <p className="mx-auto mt-6 max-w-md text-cream/75">
        Run {team.name} from the pit wall: strategy, tyres and weather on race day, upgrades in the factory, and drivers on the market.
      </p>

      <div className="mx-auto mt-10 grid max-w-sm gap-3">
        {saveInfo && (
          <button type="button" data-testid="continue-career" onClick={onContinue} className="btn btn-primary py-4 text-base">
            Continue
            <span className="font-sans text-xs font-normal normal-case tracking-normal opacity-80">{saveInfo}</span>
          </button>
        )}
        <button type="button" data-testid="new-career" onClick={() => onNew(teamId)} className={`btn py-4 text-base ${saveInfo ? 'btn-ghost' : 'btn-primary'}`}>
          {saveInfo ? 'New career (replaces the save)' : 'Start your career'}
        </button>
        <label className="label flex items-center justify-center gap-2">
          New career team
          <select data-testid="team-select" value={teamId} onChange={(e) => setTeamId(e.target.value)} className="rounded-lg border border-line bg-panel px-2 py-1 text-sm text-cream">
            {GRID_TEAMS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
      </div>
      <p className="mt-8 text-[11px] text-muted">{DISCLAIMER} Your career is saved on this computer.</p>
    </div>
  </div>
  );
};

export default TitleScreen;

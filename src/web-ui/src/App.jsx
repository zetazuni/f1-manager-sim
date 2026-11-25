import React, { useState, useCallback, useMemo } from 'react';
import RaceScreen from './components/RaceScreen';
import StandingsView from './components/StandingsView';
import CalendarView from './components/CalendarView';
import FactoryView from './components/FactoryView';
import { PreviewPanel, QualiPanel, ResultsPanel, SeasonDone } from './components/WeekendScreen';
import SimulationEngine from './services/SimulationEngine';
import { GRID_TEAMS, PLAYER_TEAM_ID } from './data/grid';
import { CALENDAR } from './data/calendar';
import { createSeason, runQualifying, recordRace, advance, standings, raceTrackOf, QUALI_MODE } from './game/season';
import { startProject, teamsWithCars } from './game/factory';

const TABS = [
  { id: 'weekend', label: 'Race weekend' },
  { id: 'hq', label: 'Team HQ' },
  { id: 'standings', label: 'Standings' },
  { id: 'calendar', label: 'Calendar' },
];

const newSeason = () => {
  const season = createSeason({ teams: GRID_TEAMS, calendar: CALENDAR, playerTeamId: PLAYER_TEAM_ID });
  // Test hook: ?round=N opens round N (1-based) to check a circuit quickly
  const r = Number(new URLSearchParams(window.location.search).get('round'));
  if (r >= 1 && r <= CALENDAR.length) season.round = r - 1;
  return season;
};

function App() {
  const [season, setSeason] = useState(newSeason);
  const [tab, setTab] = useState('weekend');
  const [speed, setSpeed] = useState(1);
  const [quality] = useState('high');
  const playerTeam = GRID_TEAMS.find((t) => t.id === PLAYER_TEAM_ID);
  const playerCars = playerTeam.drivers.map((d, i) => ({ carId: `${PLAYER_TEAM_ID}-${i}`, name: d.name }));
  const [modes, setModes] = useState(() => Object.fromEntries(playerCars.map((p) => [p.carId, QUALI_MODE.Safe])));

  const calTrack = CALENDAR[Math.min(season.round, CALENDAR.length - 1)];
  const track = useMemo(() => raceTrackOf(calTrack), [calTrack]);
  const table = useMemo(() => standings(season, GRID_TEAMS), [season]);
  const done = season.phase === 'done';
  // grid teams with this season's developed cars and budgets
  const raceTeams = useMemo(() => teamsWithCars(GRID_TEAMS, season.teams), [season.teams]);

  const nameOf = useCallback((carId) => {
    if (!carId) return { name: '-', color: '#64748b', isPlayer: false };
    const cut = carId.lastIndexOf('-');
    const team = GRID_TEAMS.find((t) => t.id === carId.slice(0, cut));
    const driver = team.drivers[Number(carId.slice(cut + 1))];
    return { name: driver.name, color: team.color, isPlayer: team.id === PLAYER_TEAM_ID };
  }, []);

  const qualify = () => {
    const quali = runQualifying({
      teams: raceTeams, track, engine: new SimulationEngine(), playerTeamId: PLAYER_TEAM_ID, modes, seed: Date.now(),
    });
    setSeason((s) => ({ ...s, phase: 'quali', quali }));
  };
  const toRace = () => setSeason((s) => ({ ...s, phase: 'race' }));
  const onFinished = useCallback((snap, fastestCarId) => {
    setSeason((s) => recordRace(s, CALENDAR[s.round].id, snap.rows, fastestCarId, GRID_TEAMS));
    setTab('weekend');
  }, []);
  const next = () => setSeason((s) => advance(s));
  const startUpgrade = (area, tier) => {
    const res = startProject(season, PLAYER_TEAM_ID, area, tier);
    if (res.ok) setSeason(res.season);
    return res;
  };
  const restartSeason = () => {
    setSeason(newSeason());
    setTab('weekend');
  };

  const roundLabel = `Round ${season.round + 1}/${CALENDAR.length}`;
  const phaseSteps = ['preview', 'quali', 'race', 'results'];

  return (
    <div className="min-h-screen font-sans text-slate-100">
      <header className="sticky top-0 z-header border-b border-line bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-x-6 px-4">
          <div className="flex items-center gap-3 py-3">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-f1-red font-display text-xl font-bold italic shadow-[0_0_20px_rgba(225,6,0,0.5)]">Z</span>
            <div className="leading-none">
              <p className="font-display text-xl font-bold italic tracking-wide">ZETRACE</p>
              <p className="font-display text-[10px] uppercase tracking-[0.35em] text-muted">F1 Manager</p>
            </div>
          </div>
          <nav className="flex" aria-label="Main">
            {TABS.map((t) => (
              <button key={t.id} type="button" data-tab={t.id} onClick={() => setTab(t.id)} className={`tab ${tab === t.id ? 'tab-active' : ''}`}>
                {t.label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4 py-2 text-right">
            {!done && (
              <ol className="hidden items-center gap-1 md:flex" aria-label="Weekend progress">
                {phaseSteps.map((p, i) => {
                  const idx = phaseSteps.indexOf(season.phase);
                  return (
                    <li key={p} className={`rounded px-2 py-0.5 font-display text-[11px] font-bold uppercase tracking-widest ${
                      i === idx ? 'bg-f1-red text-white' : i < idx ? 'text-emerald-400' : 'text-muted'
                    }`}
                    >
                      {p === 'preview' ? 'Preview' : p === 'quali' ? 'Qualifying' : p === 'race' ? 'Race' : 'Results'}
                    </li>
                  );
                })}
              </ol>
            )}
            <div>
              <p className="label">{done ? 'Season complete' : roundLabel}</p>
              <p className="font-display text-sm font-bold uppercase tracking-wider">{done ? 'Final standings' : calTrack.name}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] p-4">
        {tab === 'standings' && (
          <StandingsView table={table.drivers} teamsTable={table.teams} roundsDone={season.results.length} total={CALENDAR.length} />
        )}
        {tab === 'hq' && (
          <FactoryView season={season} teams={GRID_TEAMS} playerTeamId={PLAYER_TEAM_ID} onStart={startUpgrade} />
        )}
        {tab === 'calendar' && (
          <CalendarView calendar={CALENDAR} round={season.round} results={season.results} nameOf={nameOf} seasonDone={done} />
        )}
        {tab === 'weekend' && (
          <>
            {done && <SeasonDone table={table.drivers} teamsTable={table.teams} onNewSeason={restartSeason} />}
            {season.phase === 'preview' && (
              <PreviewPanel
                track={calTrack}
                round={season.round + 1}
                total={CALENDAR.length}
                players={playerCars}
                modes={modes}
                onMode={(carId, m) => setModes((x) => ({ ...x, [carId]: m }))}
                onQualify={qualify}
              />
            )}
            {season.phase === 'quali' && <QualiPanel quali={season.quali} track={calTrack} onRace={toRace} />}
            {season.phase === 'results' && (
              <ResultsPanel
                result={season.results[season.results.length - 1]}
                track={calTrack}
                table={table.drivers}
                teamsTable={table.teams}
                isLast={season.round + 1 >= CALENDAR.length}
                onNext={next}
                nameOf={nameOf}
              />
            )}
          </>
        )}
        {/* The race stays mounted while browsing other tabs so it keeps running */}
        {season.phase === 'race' && (
          <div className={tab === 'weekend' ? '' : 'hidden'}>
            <RaceScreen
              key={`race-${season.round}`}
              teams={raceTeams}
              playerTeamId={PLAYER_TEAM_ID}
              track={track}
              gridOrder={season.quali?.map((q) => q.carId)}
              roundLabel={roundLabel}
              speed={speed}
              onSpeed={setSpeed}
              quality={quality}
              onFinished={onFinished}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;

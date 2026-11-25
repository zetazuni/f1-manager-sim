import React, { useState, useCallback, useMemo, useEffect } from 'react';
import RaceScreen from './components/RaceScreen';
import StandingsView from './components/StandingsView';
import CalendarView from './components/CalendarView';
import FactoryView from './components/FactoryView';
import SettingsDialog from './components/SettingsDialog';
import { PreviewPanel, QualiPanel, ResultsPanel, SeasonDone } from './components/WeekendScreen';
import SimulationEngine from './services/SimulationEngine';
import { GRID_TEAMS, PLAYER_TEAM_ID } from './data/grid';
import { CALENDAR } from './data/calendar';
import { createSeason, runQualifying, recordRace, advance, standings, raceTrackOf, QUALI_MODE } from './game/season';
import { startProject, teamsWithCars } from './game/factory';
import { saveCareer, loadCareer, clearCareer, loadSettings, saveSettings } from './game/storage';
import { setSoundEnabled } from './services/AudioManager';

const TABS = [
  { id: 'weekend', label: 'Race weekend' },
  { id: 'hq', label: 'Team HQ' },
  { id: 'standings', label: 'Standings' },
  { id: 'calendar', label: 'Calendar' },
];

// Test hook: ?round=N opens round N (1-based) of a fresh season, ignoring any save
const testRound = () => {
  const r = Number(new URLSearchParams(window.location.search).get('round'));
  return r >= 1 && r <= CALENDAR.length ? r : null;
};

const newSeason = () => {
  const season = createSeason({ teams: GRID_TEAMS, calendar: CALENDAR, playerTeamId: PLAYER_TEAM_ID });
  const r = testRound();
  if (r) season.round = r - 1;
  return season;
};

/** Saved career when there is one (and no test hook), otherwise a new season. */
const initialCareer = () => {
  const saved = testRound() ? null : loadCareer({ teams: GRID_TEAMS, playerTeamId: PLAYER_TEAM_ID });
  return saved ? { season: saved.season, modes: saved.modes || null } : { season: newSeason(), modes: null };
};

function App() {
  const [boot] = useState(initialCareer);
  const [season, setSeason] = useState(boot.season);
  const [tab, setTab] = useState('weekend');
  const [settings, setSettings] = useState(loadSettings);
  const [speed, setSpeed] = useState(settings.speed);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const playerTeam = GRID_TEAMS.find((t) => t.id === PLAYER_TEAM_ID);
  const playerCars = playerTeam.drivers.map((d, i) => ({ carId: `${PLAYER_TEAM_ID}-${i}`, name: d.name }));
  const defaultModes = () => Object.fromEntries(playerCars.map((p) => [p.carId, QUALI_MODE.Safe]));
  const [modes, setModes] = useState(() => boot.modes || defaultModes());

  // Autosave the career whenever it changes
  useEffect(() => {
    saveCareer({ season, modes });
  }, [season, modes]);
  // Persist settings and apply sound
  useEffect(() => {
    saveSettings(settings);
    setSoundEnabled(settings.sound);
  }, [settings]);
  // patch = only the changed fields; merged into the latest settings so quick
  // successive changes never overwrite each other
  const changeSettings = (patch) => {
    if (patch.speed !== undefined) setSpeed(patch.speed);
    setSettings((cur) => ({ ...cur, ...patch }));
  };

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
  const resetCareer = () => {
    clearCareer();
    setSeason(newSeason());
    setModes(defaultModes());
    setTab('weekend');
    setSettingsOpen(false);
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
            <button
              type="button"
              aria-label="Settings"
              title="Settings"
              data-testid="settings-open"
              onClick={() => setSettingsOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-line-2 bg-panel-2 text-slate-300 hover:bg-line-2 hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
              </svg>
            </button>
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
              quality={settings.quality}
              onFinished={onFinished}
            />
          </div>
        )}
      </main>

      <SettingsDialog
        open={settingsOpen}
        settings={settings}
        onChange={changeSettings}
        onClose={() => setSettingsOpen(false)}
        onResetCareer={resetCareer}
      />
    </div>
  );
}

export default App;

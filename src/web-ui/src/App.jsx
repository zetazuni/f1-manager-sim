import React, { useState, useCallback, useMemo, useEffect } from 'react';
import RaceScreen from './components/RaceScreen';
import StandingsView from './components/StandingsView';
import CalendarView from './components/CalendarView';
import FactoryView from './components/FactoryView';
import SettingsDialog from './components/SettingsDialog';
import OffSeasonScreen from './components/OffSeasonScreen';
import TitleScreen from './components/TitleScreen';
import { PreviewPanel, QualiPanel, ResultsPanel, SeasonDone } from './components/WeekendScreen';
import SimulationEngine from './services/SimulationEngine';
import { GRID_TEAMS, PLAYER_TEAM_ID } from './data/grid';
import { CALENDAR } from './data/calendar';
import { createSeason, runQualifying, recordRace, advance, standings, raceTrackOf, QUALI_MODE } from './game/season';
import { startProject } from './game/factory';
import { teamsForSeason, startOffSeason, signDriver, finishOffSeason } from './game/career';
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
  return saved
    ? { season: saved.season, modes: saved.modes || null, practice: saved.practice || null, hasSave: true }
    : { season: newSeason(), modes: null, practice: null, hasSave: false };
};

function App() {
  const [boot] = useState(initialCareer);
  const [season, setSeason] = useState(boot.season);
  const [tab, setTab] = useState('weekend');
  const [settings, setSettings] = useState(loadSettings);
  const [speed, setSpeed] = useState(settings.speed);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const seatIds = [0, 1].map((i) => `${PLAYER_TEAM_ID}-${i}`);
  const defaultModes = () => Object.fromEntries(seatIds.map((id) => [id, QUALI_MODE.Safe]));
  const [modes, setModes] = useState(() => boot.modes || defaultModes());
  const defaultPractice = () => Object.fromEntries(seatIds.map((id) => [id, 'setup']));
  const [practice, setPractice] = useState(() => boot.practice || defaultPractice());
  // Title screen on every load (skipped by the ?round=N and ?notitle=1 test hooks)
  const [onTitle, setOnTitle] = useState(() => {
    const q = new URLSearchParams(window.location.search);
    return !testRound() && q.get('notitle') !== '1';
  });

  // Autosave the career whenever it changes
  useEffect(() => {
    if (!onTitle) saveCareer({ season, modes, practice });
  }, [season, modes, practice, onTitle]);
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
  // Test hook: ?rain=1 forces a rain spell in every race
  const track = useMemo(() => {
    const t = raceTrackOf(calTrack);
    if (new URLSearchParams(window.location.search).get('rain') === '1') t.rainChance = 1;
    return t;
  }, [calTrack]);
  // grid teams with this season's lineups, developed cars and budgets
  const seasonTeams = useMemo(() => teamsForSeason(GRID_TEAMS, season), [season]);
  const raceTeams = seasonTeams;
  const table = useMemo(() => standings(season, seasonTeams), [season, seasonTeams]);
  const done = season.phase === 'done';
  const inMarket = season.phase === 'market';
  const year = season.career?.year;
  const playerCars = seasonTeams.find((t) => t.id === PLAYER_TEAM_ID).drivers.map((d, i) => ({ carId: seatIds[i], name: d?.name || 'Empty seat' }));

  const nameOf = useCallback((carId) => {
    if (!carId) return { name: '-', color: '#64748b', isPlayer: false };
    const cut = carId.lastIndexOf('-');
    const team = seasonTeams.find((t) => t.id === carId.slice(0, cut));
    const driver = team?.drivers[Number(carId.slice(cut + 1))];
    return { name: driver?.name || '-', color: team?.color || '#64748b', isPlayer: team?.id === PLAYER_TEAM_ID };
  }, [seasonTeams]);

  const qualify = () => {
    const quali = runQualifying({
      teams: raceTeams, track, engine: new SimulationEngine(), playerTeamId: PLAYER_TEAM_ID, modes, seed: Date.now(),
    });
    setSeason((s) => ({ ...s, phase: 'quali', quali }));
  };
  const toRace = () => setSeason((s) => ({ ...s, phase: 'race' }));
  const onFinished = useCallback((snap, fastestCarId) => {
    setSeason((s) => recordRace(s, CALENDAR[s.round].id, snap.rows, fastestCarId, teamsForSeason(GRID_TEAMS, s), snap.swapLog || []));
    setTab('weekend');
  }, []);
  const next = () => setSeason((s) => advance(s));
  const startUpgrade = (area, tier) => {
    const res = startProject(season, PLAYER_TEAM_ID, area, tier);
    if (res.ok) setSeason(res.season);
    return res;
  };
  // Season finale -> off-season driver market -> next season
  const toOffSeason = () => {
    setSeason((s) => {
      const tables = standings(s, teamsForSeason(GRID_TEAMS, s));
      const next = startOffSeason(s, GRID_TEAMS, tables.teams);
      const h = next.career.history[next.career.history.length - 1];
      h.champion = tables.drivers[0].name;
      h.constructorsChampion = tables.teams[0].name;
      return next;
    });
    setTab('weekend');
  };
  const teamPos = table.teams.findIndex((t) => t.isPlayer) + 1;
  const sign = (driverId, seat, years) => {
    const res = signDriver(season, PLAYER_TEAM_ID, driverId, seat, years, teamPos);
    if (res.ok) setSeason(res.season);
    return res;
  };
  const startNextSeason = () => {
    setSeason((s) => finishOffSeason(s, GRID_TEAMS, PLAYER_TEAM_ID, standings(s, teamsForSeason(GRID_TEAMS, s)).teams));
    setTab('weekend');
  };
  const resetCareer = () => {
    clearCareer();
    setSeason(newSeason());
    setModes(defaultModes());
    setPractice(defaultPractice());
    setTab('weekend');
    setSettingsOpen(false);
  };

  const roundLabel = `Round ${season.round + 1}/${CALENDAR.length}`;
  const phaseSteps = ['preview', 'quali', 'race', 'results'];

  if (onTitle) {
    const info = boot.hasSave ? `${season.career?.year ?? ''} season, ${season.phase === 'market' ? 'driver market' : season.phase === 'done' ? 'finale' : `round ${season.round + 1} of ${CALENDAR.length}`}` : null;
    return (
      <TitleScreen
        saveInfo={info}
        onContinue={() => setOnTitle(false)}
        onNew={() => { resetCareer(); setOnTitle(false); }}
      />
    );
  }

  return (
    <div className="min-h-screen font-sans text-cream">
      <header className="sticky top-0 z-header border-b border-line bg-ink/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-x-6 px-4">
          <div className="flex items-center gap-3 py-3">
            <span className="lamp-glow grid h-9 w-9 place-items-center rounded-xl bg-f1-red font-display text-xl font-bold">Z</span>
            <div className="leading-none">
              <p className="display text-2xl leading-none text-cream">Zetrace</p>
              <p className="text-[11px] text-muted/80">F1 manager</p>
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
            {!done && !inMarket && (
              <ol className="hidden items-center gap-1 md:flex" aria-label="Weekend progress">
                {phaseSteps.map((p, i) => {
                  const idx = phaseSteps.indexOf(season.phase);
                  return (
                    <li key={p} className={`rounded px-2 py-0.5 font-display text-[11px] font-bold ${
 i === idx ? 'bg-gradient-to-r from-lantern to-rose text-ink' : i < idx ? 'text-data' : 'text-muted/70'
 }`}
                    >
                      {p === 'preview' ? 'Preview' : p === 'quali' ? 'Qualifying' : p === 'race' ? 'Race' : 'Results'}
                    </li>
                  );
                })}
              </ol>
            )}
            <div>
              <p className="label">{year} | {done ? 'Season complete' : inMarket ? 'Off-season' : roundLabel}</p>
              <p className="font-display text-sm font-bold">{done ? 'Final standings' : inMarket ? 'Driver market' : calTrack.name}</p>
            </div>
            <button
              type="button"
              aria-label="Settings"
              title="Settings"
              data-testid="settings-open"
              onClick={() => setSettingsOpen(true)}
              className="grid h-9 w-9 place-items-center rounded-lg border border-line-2 bg-panel-2 text-cream/75 hover:bg-line-2 hover:text-white"
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
        <div key={`${tab}-${season.phase}-${season.round}`}>
        {tab === 'standings' && (
          <StandingsView table={table.drivers} teamsTable={table.teams} roundsDone={season.results.length} total={CALENDAR.length} />
        )}
        {tab === 'hq' && (
          <FactoryView season={season} teams={seasonTeams} playerTeamId={PLAYER_TEAM_ID} onStart={startUpgrade} />
        )}
        {tab === 'calendar' && (
          <CalendarView calendar={CALENDAR} round={season.round} results={season.results} nameOf={nameOf} seasonDone={done} />
        )}
        {tab === 'weekend' && (
          <>
            {done && <SeasonDone table={table.drivers} teamsTable={table.teams} onNewSeason={toOffSeason} />}
            {inMarket && (
              <OffSeasonScreen season={season} playerTeamId={PLAYER_TEAM_ID} teamPos={teamPos} onSign={sign} onStart={startNextSeason} teamName={(id) => GRID_TEAMS.find((t) => t.id === id)?.name || id} />
            )}
            {season.phase === 'preview' && (
              <PreviewPanel
                track={calTrack}
                round={season.round + 1}
                total={CALENDAR.length}
                players={playerCars}
                modes={modes}
                onMode={(carId, m) => setModes((x) => ({ ...x, [carId]: m }))}
                practice={practice}
                onPractice={(carId, p) => setPractice((x) => ({ ...x, [carId]: p }))}
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
                moraleChanges={season.moraleChanges || []}
              />
            )}
          </>
        )}
        </div>
        {/* The race stays mounted while browsing other tabs so it keeps running */}
        {season.phase === 'race' && (
          <div className={tab === 'weekend' ? '' : 'hidden'}>
            <RaceScreen
              key={`race-${season.round}`}
              teams={raceTeams}
              playerTeamId={PLAYER_TEAM_ID}
              track={track}
              gridOrder={season.quali?.map((q) => q.carId)}
              practice={practice}
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

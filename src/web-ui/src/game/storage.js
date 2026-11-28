// Career save in localStorage. The season is plain JSON already, so saving is
// a JSON round trip plus a version check and a small migration step.

import { createTeamStates } from './factory';
import { createCareer } from './career';
import { PACK_ID } from '../data/season';

// each season pack keeps its own career
const KEY = `zetrace.career.v1${PACK_ID ? `.${PACK_ID}` : ''}`;
const SETTINGS_KEY = 'zetrace.settings.v1';
export const SAVE_VERSION = 1;

export const DEFAULT_SETTINGS = { quality: 'high', sound: true, music: 'normal', speed: 1 };

const store = () => {
  try {
    return window.localStorage;
  } catch {
    return null; // private mode or blocked storage: the game still runs, just without saves
  }
};

export function saveCareer(data) {
  const s = store();
  if (!s) return false;
  try {
    s.setItem(KEY, JSON.stringify({ version: SAVE_VERSION, savedAt: new Date().toISOString(), ...data }));
    return true;
  } catch {
    return false; // quota full
  }
}

/**
 * Load and migrate a saved career. Returns null when there is none or it is
 * unreadable. A race in progress cannot be resumed mid-race, so a save taken
 * during a race goes back to the grid (qualifying already done).
 */
export function loadCareer({ teams, playerTeamId }) {
  const s = store();
  if (!s) return null;
  let data;
  try {
    data = JSON.parse(s.getItem(KEY) || 'null');
  } catch {
    return null;
  }
  if (!data || typeof data !== 'object' || !data.season) return null;
  if (data.version > SAVE_VERSION) return null; // saved by a newer build
  const season = data.season;
  if (!Array.isArray(season.calendar) || typeof season.round !== 'number') return null;
  // migrations for saves made before the factory existed
  if (!season.teams) season.teams = createTeamStates(teams, playerTeamId);
  if (!season.ledger) season.ledger = [];
  if (!season.news) season.news = [];
  if (!season.career) season.career = createCareer(teams);
  Object.values(season.career.drivers).forEach((d) => { if (d.morale === undefined) d.morale = 68; });
  if (season.phase === 'race') season.phase = season.quali ? 'quali' : 'preview';
  return { ...data, season };
}

export function clearCareer() {
  store()?.removeItem(KEY);
}

export function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(store()?.getItem(SETTINGS_KEY) || '{}') || {}) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    store()?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch { /* ignore */ }
}

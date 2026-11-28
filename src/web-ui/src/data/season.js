// The season the game plays. The repository ships a fictional one. A private,
// git-ignored file at data/local/season.js can replace any part of it
// (tools/install-desktop.ps1 copies it in from a folder outside the repo).

import * as grid from './grid';
import * as calendar from './calendar';
import * as agents from './freeAgents';

const found = import.meta.glob('./local/season.js', { eager: true });
const local = Object.values(found)[0] || {};
const pick = (key, fallback) => local[key] ?? fallback;

export const PACK_ID = pick('PACK_ID', '');
export const GRID_TEAMS = pick('GRID_TEAMS', grid.GRID_TEAMS);
export const PLAYER_TEAM_ID = pick('PLAYER_TEAM_ID', grid.PLAYER_TEAM_ID);
export const CALENDAR = pick('CALENDAR', calendar.CALENDAR);
export const FREE_AGENTS = pick('FREE_AGENTS', agents.FREE_AGENTS);
export const GRID_PROFILES = pick('GRID_PROFILES', agents.GRID_PROFILES);
export const FIRST_YEAR = pick('FIRST_YEAR', 2026);
export const FASTEST_LAP_BONUS = pick('FASTEST_LAP_BONUS', true);
export const FACES = pick('FACES', {}); // driver code -> image URL
export const DISCLAIMER = pick('DISCLAIMER', 'Fictional teams, drivers and circuits.');

# F1 Manager Simulator - Project Details

## Project Overview
A realistic and fun Formula 1 Management Simulator.

## Directory and Environment
- **Primary Working Directory**: `S:\Zetrace by Zetazuni`
- **Platform**: Windows 11
- **GitHub Repository**: [https://github.com/zetazuni/f1-manager-sim](https://github.com/zetazuni/f1-manager-sim)

## Workflow & Development Log
- **2026-10-09**: Project initialized. Created `PROJECT_DETAILS.md`.
- **2026-10-09**: Initialized core simulation engine. Created `src/data/Models.cs` and `src/sim/SimulationEngine.cs`.
- **2026-10-09**: Added `RaceManager.cs` and `Program.cs`.
- **2026-10-09**: Enhanced simulation engine and data models. Created `src/data/json/game_data.json`.
- **2026-10-09**: 
  - Added `src/data/DataManager.cs` for JSON data loading.
  - Added `src/sim/FinancialManager.cs` for financial/sponsorship management.
  - Expanded `SimulationEngine.cs` with ERS and Fuel Mode strategy mechanics.
  - Updated `Program.cs` to integrate Finance + Advanced Simulation.
- **2026-10-09**: Initialized React-based web UI (`src/web-ui`) with Vite and Tailwind CSS.
- **2026-10-09**: Created TypeScript port of simulation logic (`src/web-ui/src/types/`, `src/web-ui/src/services/`).
- **2026-10-09**: Integrated TypeScript simulation with React UI in `Dashboard.jsx`.
- **2026-10-09**: Selected PlayCanvas for lightweight 3D visualization in browser.
- **2026-10-09**: Implemented orthographic/isometric camera view with detailed procedural environment (grandstands, hillstands, paddock).
- **2026-10-09**: Moved F1 car GLB model to `public/assets/` for browser loading.
- **2026-10-09**: Enhanced CLI simulation with full race weekend simulation, strategy, and financial management.
- **2026-11-15**: Race radio events on the dashboard.
- **2026-11-25**: M1 layers and graphics recheck (Tailwind v4 actually loaded, CSS layers, z-index scale, rebuilt PlayCanvas scene, C# engine builds on .NET 8). Milestones now tracked in `docs/ROADMAP.md`.
- **2026-11-26**: M4 season (6 circuits, qualifying, championships), Standings and Calendar screens, pit wall theme, per-circuit 3D environments.
- **2026-11-26**: M3 tyres and pit stops (compounds, wear cliff, punctures, pit lane and garages in 3D, AI strategy, engineer toggle); merged meshes cut draw calls from 1071 to 53.
- **2026-11-25**: M2 full grid race (20 cars, race clock sim, overtakes, ERS battery, timing tower, results with points).

## Concept Details
- **Team Management**: Recruitment of drivers and staff.
- **Car Development**: Engineering upgrades (Aero High/Low Speed, Power Unit, Chassis Weight, ERS Efficiency).
- **Race Strategy**: Tire management (informed by driver management stat), ERS deployment modes, fuel mode adjustments.
- **Financials**: Sponsorship income and driver salary management.
- **Physics Simulation**: Realistic lap time calculation based on granular stats, tire degradation, ERS, and fuel load.

## Files & Packages
### Backend (.NET 8)
- `F1Manager.csproj` - .NET project file
- `src/Program.cs` - CLI entry point with full race simulation
- `src/data/Models.cs` - Data models for drivers, tracks, teams, cars
- `src/data/DataManager.cs` - JSON serialization helper
- `src/data/json/game_data.json` - External game data
- `src/sim/SimulationEngine.cs` - Lap time calculation engine with ERS/Fuel strategies
- `src/sim/RaceManager.cs` - Multi-driver race orchestration
- `src/sim/FinancialManager.cs` - Financial/budget management

### Frontend (React + TypeScript + PlayCanvas)
- `src/web-ui/package.json` - UI dependencies (React, PlayCanvas, Tailwind)
- `src/web-ui/src/types/index.ts` - TypeScript interfaces matching C# models
- `src/web-ui/src/services/SimulationEngine.ts` - TS port of simulation logic
- `src/web-ui/src/services/FinancialManager.ts` - TS port of financial logic
- `src/web-ui/src/data/mockData.ts` - Mock data for UI
- `src/web-ui/src/components/Dashboard.jsx` - Management dashboard with live telemetry
- `src/web-ui/src/components/RaceView.jsx` - 3D race view (PlayCanvas): auto-fit isometric camera, scroll zoom, reads car positions from a ref every frame
- `src/web-ui/src/game/trackPath.js` - circuit spline, distance lookup (`pointAt(lapFraction, lateral)`)
- `src/web-ui/src/game/raceSim.js` - full-grid race simulation (pure logic) + `raceSim.test.js`
- `src/web-ui/src/data/grid.js` - fictional 10-team grid, points table, race track
- `src/web-ui/src/components/TimingTower.jsx` - live timing
- `src/web-ui/src/game/tyres.js` - tyre compounds and wear model
- `src/web-ui/src/game/meshBuilder.js` - merges coloured boxes into one mesh (one draw call)
- `src/web-ui/src/game/season.js` - season, qualifying, points, standings
- `src/web-ui/src/game/environments.js` - per-circuit look and props
- `src/web-ui/src/data/calendar.js` - the 6 circuits
- `src/web-ui/src/components/RaceScreen.jsx`, `WeekendScreen.jsx`, `StandingsView.jsx`, `CalendarView.jsx`, `TrackMap.jsx` - screens
- `tools/validate-tracks.mjs` - layout checks for every circuit
- `src/web-ui/src/game/scene.js` - track ribbon mesh, kerbs, buildings, trees, low-poly car
- `tools/check-ui.mjs` - headless Edge check: `node tools/check-ui.mjs http://localhost:4317/ <outDir> tools/checks/m2-race.json` (sim test needs the dev server: `tools/checks/m2-sim.json`)
- `src/web-ui/src/App.jsx` - Main UI application
- `src/web-ui/src/index.css` - Tailwind v4 entry; theme tokens incl. z-index scale; all custom CSS inside layers
- `src/web-ui/vite.config.js` - Vite configuration

## Environment Notes
- Blender 5.2.2 LTS is connected but the MCP addon needs a manual refresh in Blender Preferences → Add-ons.
- Unity is not required for this implementation.
- All 3D rendering happens in-browser via PlayCanvas.

## Test hooks
- `?round=N` in the URL opens round N of a new season (quick circuit check).
- `window.__zetrace` (3D app) and `window.__zetraceRace` (live race) are read-only hooks for the headless checks.

## How to run
- Web UI: `cd src/web-ui && npm install && npm run dev` (build: `npm run build`, preview: `npx vite preview`)
- C# CLI: `dotnet run --project F1Manager.csproj` (.NET 8)
- Roadmap and milestone status: `docs/ROADMAP.md`

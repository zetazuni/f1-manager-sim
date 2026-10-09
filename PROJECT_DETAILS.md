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

## Concept Details
- **Team Management**: Recruitment of drivers and staff.
- **Car Development**: Engineering upgrades (Aero High/Low Speed, Power Unit, Chassis Weight, ERS Efficiency).
- **Race Strategy**: Tire management (informed by driver management stat), ERS deployment modes, fuel mode adjustments.
- **Financials**: Sponsorship income and driver salary management.
- **Physics Simulation**: Realistic lap time calculation based on granular stats, tire degradation, ERS, and fuel load.

## Files & Packages
### Backend (.NET 7)
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
- `src/web-ui/src/components/RaceView.jsx` - 3D race visualization with:
  - Orthographic/isometric camera
  - Procedural track environment (grandstands, hillstands, paddock)
  - GLB model loading for F1 car
  - Environment lighting and materials
- `src/web-ui/src/App.jsx` - Main UI application
- `src/web-ui/vite.config.js` - Vite configuration

## Environment Notes
- Blender 5.2.2 LTS is connected but the MCP addon needs a manual refresh in Blender Preferences → Add-ons.
- Unity is not required for this implementation.
- All 3D rendering happens in-browser via PlayCanvas.
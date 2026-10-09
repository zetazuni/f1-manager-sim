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

## Concept Details
- **Team Management**: Recruitment of drivers and staff.
- **Car Development**: Engineering upgrades (Aero High/Low Speed, Power Unit, Chassis Weight, ERS Efficiency).
- **Race Strategy**: Tire management (informed by driver management stat), ERS deployment modes, fuel mode adjustments.
- **Financials**: Sponsorship income and driver salary management.
- **Physics Simulation**: Realistic lap time calculation based on granular stats, tire degradation, ERS, and fuel load.

## Files & Packages
### Project Files
- `src/data/Models.cs` - Data models for drivers, tracks, teams, cars
- `src/data/DataManager.cs` - JSON serialization helper
- `src/data/json/game_data.json` - External game data
- `src/sim/SimulationEngine.cs` - Lap time calculation engine
- `src/sim/RaceManager.cs` - Multi-driver race orchestration
- `src/sim/FinancialManager.cs` - Financial/budget management
- `src/Program.cs` - CLI entry point
- `F1Manager.csproj` - .NET project file
- `PROJECT_DETAILS.md` - Project documentation (this file)

### Unity Assets
- `Assets/Scripts/Data/` - Unity integration stubs (to be added)
- `Assets/Scripts/Simulation/` - Unity integration stubs (to be added)
- `Assets/Scripts/Manager/` - Unity integration stubs (to be added)

### Environment Notes
- Blender 5.2.2 LTS is connected but the MCP addon needs a manual refresh in Blender Preferences → Add-ons.
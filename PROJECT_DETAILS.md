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
- **2026-10-09**: Expanded data models with granular stats (`overtaking`, `powerUnit`, `ersEfficiency` etc.), created `src/data/json/game_data.json` for external data, and refined simulation math in `SimulationEngine.cs` to incorporate driver consistency/tire management.

## Concept Details
- **Team Management**: Recruitment of drivers and staff.
- **Car Development**: Engineering upgrades (Aero High/Low Speed, Power Unit, Chassis Weight, ERS Efficiency).
- **Race Strategy**: Tire management (informed by driver management stat), pit stop timing, fuel usage.
- **Physics Simulation**: Realistic lap time calculation based on granular stats, tire degradation moderated by driver skill, and consistency-based random variance.

# Zetrace F1 Manager

A browser Formula 1 team-manager game. You run Zetrace Racing from the pit wall:
race strategy, tyres and weather on race day, upgrades and money in the factory,
and drivers on the market, across as many seasons as you like.

All teams, drivers and circuits are fictional.

## Features

- **Race day**: 20 cars on a 3D track (PlayCanvas). Lap times come from a simulation
  model (car, driver, fuel, tyres, ERS, weather), not from animation.
- **Strategy**: ERS modes with a battery, fuel mapping, Soft/Medium/Hard plus
  Intermediate and Wet tyres, pit stops, the two-compound rule, team orders.
- **Race drama**: rain spells with a radar forecast, spins and crashes, safety car.
- **Season**: 6 circuits with their own layouts and environments, practice
  programmes, qualifying, points, driver and constructor championships.
- **Team HQ**: car development projects, budget, sponsors, prize money; AI teams develop too.
- **Careers**: driver ageing, contracts, a driver market, regulation resets, more seasons.
- **Presentation**: Overview, Chase and TV cameras, live mini-map, start lights,
  pit wall themed interface, autosave, settings.

## Run it

```bash
cd src/web-ui
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
```

## Checks

```bash
node tools/validate-tracks.mjs        # every circuit layout is valid
# with the dev server running (npm run dev -- --port 5317):
node tools/check-ui.mjs "http://localhost:5317/?notitle=1" out tools/checks/m2-sim.json   # simulation, season and career tests
node tools/check-ui.mjs "http://localhost:5317/" out tools/checks/m10-title.json         # title, practice, team orders
```

`tools/check-ui.mjs` drives headless Edge or Chrome over the DevTools protocol,
saves screenshots and fails on any console error. The other files in
`tools/checks/` cover pit stops, a full race weekend, Team HQ, saves, weather,
the driver market and the cameras.

A C# console version of the lap-time engine lives in `src/` (`dotnet run --project F1Manager.csproj`, .NET 8).

Milestones and design notes: [`docs/ROADMAP.md`](docs/ROADMAP.md).

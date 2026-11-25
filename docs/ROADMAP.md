# Zetrace Roadmap

The playable game is the web UI in `src/web-ui` (React + Tailwind v4 + PlayCanvas).
The C# engine in `src/` is a console prototype that shares the same lap-time model.

Status key: DONE, IN PROGRESS, NEXT, LATER.

## M1 Layers and graphics recheck (DONE, 2026-11-25)

- Tailwind v4 was installed but never loaded, so the whole dashboard rendered unstyled. Now loaded through `@tailwindcss/vite` and `@import "tailwindcss"`.
- CSS cascade layers: the old unlayered `* { margin: 0; padding: 0 }` reset beat every Tailwind utility. All custom CSS now lives in `@layer base` / `@layer components` (see the comment at the top of `src/index.css`).
- Stacking order is defined once as theme tokens: canvas 0, hud 10, header 20, modal 50 (`z-hud`, `z-header`, `z-modal`). The header used to be `z-index: 1000` above the `z-50` modal.
- Leftover Vite template CSS (`#root` fixed width, centred text, white light-mode background) removed.
- 3D view rebuilt: correct canvas resolution plus resize handling (it used to render at 300x150 and stretch), track as a spline ribbon mesh with kerbs, edge lines, run-off, start gantry and chequered line, real shadows, a code-built low-poly car (the old `f1_car.glb` was the 1.6 KB Khronos sample cube scaled to 1 cm), camera auto-fit to the circuit, scroll zoom that follows the player car.
- The car now drives continuously round each lap instead of jumping 1/78 of a circle per lap.
- C# engine: never compiled (duplicate compile items, Python `f"..."` strings, API mismatches, JSON fields not bound, wrong team lookup) and targeted .NET 7 which is not installed. Now builds on .NET 8 and runs a full race.
- `tools/check-ui.mjs`: headless Edge check over CDP (screenshots, console errors, scripted steps).

## M2 Full grid race (DONE, 2026-11-25)

- 10 fictional teams, 20 cars (`src/data/grid.js`). The player runs Zetrace Racing (2 drivers); the other 9 teams are AI.
- `src/game/raceSim.js`: one race clock; each car has its own lap times from `SimulationEngine`. Overtakes are rolled at the start of each lap (overtaking vs defending skill, ERS, pace gap); a failed roll keeps the car in dirty air 0.3 to 0.7 s behind. Passes then play out visibly in 3D during the lap.
- Grid from a quick one-lap qualifying; lap-1 grid slot offsets.
- ERS battery: Neutral +12 per lap, Attack -9, Overtake -28; a flat battery means Neutral pace. AI uses Attack when charged.
- Fuel: Rich all race runs the car dry (DNF "Out of fuel"); fuel-to-finish readout and radio warning. Small reliability DNF chance.
- Finish rules: leader takes the flag after full distance, everyone else at their next crossing.
- UI: player panel with per-driver ERS/fuel, race speed 1x/2x/4x, live timing tower (gap, last lap, fastest lap, grid +/-; click to follow a car), radio feed of real race events, result modal with points and New race.
- Tests: `src/game/raceSim.test.js` (5 seeded races + fuel and ERS balance checks), `tools/checks/m2-race.json` (full race in the real app).

## M3 Tyres and pit stops (NEXT)

- Tyre wear is tracked (Overtake wears 30% faster) but barely affects pace yet: make it matter here.

- Soft / Medium / Hard compounds with different pace and wear.
- Pit button per player driver with compound choice; pit lane time loss.
- Two-compound rule; AI pit strategy.
- Cars visibly enter the pit lane in 3D.

## M4 Race weekend and season (LATER)

- Several circuits (different spline layouts in `src/game/trackPath.js`).
- Qualifying sets the grid.
- Championship standings for drivers and teams across a calendar.

## M5 Factory and finances (LATER)

- `FactoryView` upgrades spend budget and change car stats (aero, power unit, ERS, weight, reliability).
- Sponsors, prize money by position, driver salaries between races.

## M6 Save, settings and polish (LATER)

- Save/load career in localStorage.
- Settings (sound, quality), audio pass, mobile layout check.
- Deploy only when asked (Netlify costs credits).

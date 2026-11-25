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

## M3 Tyres and pit stops (DONE, 2026-11-26)

- `src/game/tyres.js`: Soft / Medium / Hard (pace -0.9 / 0 / +0.7 s), wear per lap scaled by track, driver tyre management, ERS and fuel mode; time loss grows with wear squared plus a cliff above 80 %; punctures possible above 90 %.
- Pit stops: box request served at the line; pit lane loss (track `pitLoss`, default 20 s) plus a 2.2 to 3 s stop, 4 % chance of a slow stop.
- Two-compound rule: 10 s added at the finish if only one compound was used.
- AI: personal wear limit, picks the softest compound that reaches the flag, respects the rule. Most AI cars two-stop, some one-stop.
- Player: starting tyre on the grid, Box for Soft/Medium/Hard (press again to cancel), tyre warnings, "Engineer strategy" toggle hands a car to the AI.
- 3D: pit lane with entry and exit ramps, pit wall, team-coloured garages; cars drive in, stop at their own garage and rejoin.
- Graphics performance: static scenery and every car are now merged vertex-colour meshes (`src/game/meshBuilder.js`): 1071 draw calls down to 53. Race speed no longer depends on frame rate.

## M4 Race weekend, season and new look (DONE, 2026-11-26)

- Calendar of 6 fictional circuits (`src/data/calendar.js`), each with its own layout, laps, tyre wear, fuel use, pit loss and environment. `tools/validate-tracks.mjs` checks every layout (no crossings, 16+ units clearance, straight pit section, garages clear of the track).
- Pit lane now defined in track units (`pitLayout()` in `trackPath.js`), so it fits any circuit.
- Weekend flow: preview (track card, Safe or Push qualifying per driver) -> qualifying (one flying lap; Push gains about 0.25 s, risks a deleted lap) -> race -> results -> next round; season finale with champions.
- `src/game/season.js`: qualifying, points (+1 fastest lap in the top 10), driver and team championships with tie-breaks, plain JSON state ready for saving.
- Screens: Race weekend, Standings, Calendar (mini track maps from the real spline). The race keeps running while you browse other tabs.
- New "pit wall" theme: carbon panels, Zetrace red, cyan data colour, Bahnschrift condensed headings, shared `btn`/`chip`/`tab`/`panel-title` classes in `index.css`.
- 3D environments (`src/game/environments.js`): forest, desert, city street circuit with walls, coast with sea and boats, night race with floodlights and lit windows, alpine with snowy mountains. Grandstands with crowds and sponsor boards everywhere. Light, ambient, sky and fog per circuit.
- Fixes: garage doors faced away from the track; canvas size stuck at 0 after a hidden tab; sim clock now a timer independent of frame rate; material cleanup after the device was destroyed blocked the results screen.
- `tools/check-ui.mjs`: `waitFor` steps, hard time limit, and it now kills the whole headless browser tree (369 orphaned browsers had piled up).
- Tests: full 6-round season in `raceSim.test.js`; `tools/checks/m4-weekend.json` drives a whole weekend in the real app.

## M5 Factory and finances (DONE, 2026-11-26)

- `src/game/factory.js`: six development areas (high/low-speed aero, power unit, ERS, chassis weight, reliability), three tiers (Small +1.5 / 1 race, Medium +3.0 / 2 races, Major +5.5 / 3 races with a 20 % risk the gain is halved), two projects at once, costs rise near the 99.5 ceiling.
- Money per round: prize (1.5 + 0.3 per point, $M), title sponsor, a rotating sponsor objective (both cars in the points, top 5, +5 places, both finish, podium), driver salaries and running costs. Player starts with a $30M development budget.
- AI teams develop their weakest areas when they can afford it, so the order changes over a season.
- Developed cars feed qualifying and races (`teamsWithCars`); cars are frozen for the duration of a race.
- Team HQ tab: budget, car rating and rank, factory slots, sponsor objective, bullet chart of our car vs grid best and average (with table view and hover details; series colour validated with the dataviz validator), projects in progress, upgrade catalogue, ledger.
- Tests: season test buys upgrades and checks budgets, ledger, ceiling and that cars improve; `tools/checks/m5-hq.json` buys upgrades in the real app and races a round.

## M6 Save, settings and polish (DONE, 2026-11-26)

- Career autosave in localStorage (`src/game/storage.js`) after every change, with a version check and a migration for older saves. A save taken during a race resumes on the grid.
- Settings dialog (gear in the header): graphics quality (High / Medium / Low: shadows, shadow resolution, pixel ratio), sound on/off, default race speed, and a two-step career reset inside the dialog. Settings are kept in their own storage key.
- Start sequence: five red lights with beeps, a random hold, then lights out.
- Audio: one shared AudioContext (the old code made a new one per click, which browsers cap), new light, lights-out and radio sounds, all synthesised in code.
- Zetrace favicon.
- Test: `tools/checks/m6-save.json` reloads the page twice to prove the career and settings survive, runs the start lights and the career reset.

## M7 Race day drama (DONE, 2026-11-26)

- Weather (`makeWeather` in `raceSim.js`): each circuit has a rain chance (desert 5 % to alpine 45 %). A rain spell ramps up over 3 laps, holds, and dries over 6; peak wetness varies. The radar forecast is a few laps off on purpose.
- Tyres (`tyres.js`): Intermediate and Wet compounds. Each tyre has an ideal wetness with a quadratic penalty away from it, giving real crossovers (slick to inter at about 26 % wetness, inter to wet at about 83 %). Wet tyres overheat on a dry track. Using a wet tyre satisfies the two-compound rule. Wet-weather skill uses driver adaptability.
- AI looks two laps ahead and switches tyre family when it is clearly faster.
- Driver errors: spins (6 to 12 s) and crashes, more likely for inconsistent drivers, in the wet and on the wrong tyre.
- Safety car after crashes (75 %) or a car stopped on track (30 %): 3 to 5 laps, the field closes up to 0.8 s gaps, no overtaking, pit stops cost 55 %. About a third of races see one.
- 3D: safety car model (white, amber light bar) leads the pack; rain streaks, darker and greyer light, glossy wet asphalt, fading over about a second.
- UI: safety car banner and SC badge in the tower, weather strip (conditions, wetness, radar forecast), Box for Inter / Wet buttons, rain chance on the track card. Radio warnings for rain and wrong tyres.
- Tests: forced-rain races (every car must switch to wet tyres when it is properly wet), safety car bunching check; `tools/checks/m7-weather.json` (`?rain=1` test hook).

## M8 Driver market and contracts (NEXT)

- Driver contracts with lengths and salaries; offers at the end of a season; AI teams sign drivers too.
- Multi-season careers: new season keeps cars (with a regulation reset), budgets and contracts.

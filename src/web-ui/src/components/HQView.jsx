import React, { useEffect, useRef, useState } from 'react';
import { createStage, reducedMotion } from '../game/stage';
import { ROOMS, buildHQ, shot } from '../game/hq';
import { AREAS, TIERS } from '../game/factory';

const SHOT_SECONDS = 6;
const NAV = [{ id: 'campus', label: 'Campus' }, ...ROOMS];

/**
 * 3D headquarters. `room` is the room asked for by the page; null means the
 * automatic tour, which cuts between rooms and angles.
 */
const HQView = ({ team, state, room, onRoom, quality = 'high' }) => {
  const canvasRef = useRef(null);
  const roomRef = useRef(room);
  const [shown, setShown] = useState(room || 'campus');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  const color = team?.color;
  const accent = team?.accent;
  useEffect(() => {
    let stage;
    try {
      stage = createStage(canvasRef.current, {
        quality, sky: '#130f24', ambient: '#a59cc0', ambientLevel: 0.85, sun: { color: '#ffe6c4', intensity: 1.15, pitch: 52, yaw: 24 }, shadowDistance: 160,
      });
    } catch {
      setFailed(true);
      return undefined;
    }
    const hq = buildHQ(stage.app, { color, accent });
    const still = reducedMotion();
    const pos = [...shot('campus').pos];
    const at = [...shot('campus').at];
    let fov = 44;
    let clock = 0;
    let current = null;
    let angle = 0;
    let tourStep = 0;
    const tour = ['campus', ...ROOMS.map((r) => r.id)];

    let last = performance.now();
    stage.app.on('update', () => {
      // real elapsed time: a slow machine still arrives on schedule
      const now = performance.now();
      const dt = Math.min(0.5, (now - last) / 1000);
      last = now;
      if (!still) hq.update(Math.min(dt, 0.1));
      clock += dt;
      let cut = false;
      const asked = roomRef.current;
      const target = asked || tour[tourStep % tour.length];
      if (target !== current) {
        cut = true; // a new room is a film cut, not a flight through walls
        current = target;
        angle = asked ? 0 : Math.floor(tourStep / tour.length);
        clock = 0;
        setShown(target);
      } else if (clock > SHOT_SECONDS && !still) {
        clock = 0;
        if (asked) angle += 1; // stay in the room, change the angle
        else tourStep += 1;
        if (asked) setShown(target);
      }
      const want = shot(current, angle);
      // glide towards the shot, with a slow push-in while it holds
      if (cut && !still) {
        for (let i = 0; i < 3; i++) {
          pos[i] = want.at[i] + (want.pos[i] - want.at[i]) * 1.18;
          at[i] = want.at[i];
        }
        fov = want.fov;
      }
      const k = still ? 1 : 1 - Math.exp(-dt * 2.6);
      const push = still ? 0 : Math.min(1, clock / SHOT_SECONDS) * 0.08;
      for (let i = 0; i < 3; i++) {
        pos[i] += (want.pos[i] + (want.at[i] - want.pos[i]) * push - pos[i]) * k;
        at[i] += (want.at[i] - at[i]) * k;
      }
      fov += (want.fov - fov) * k;
      stage.look(pos, at, fov);
    });
    window.__zetraceHQ = () => ({ room: current, asked: roomRef.current, camera: pos.map((v) => Math.round(v)) }); // read-only test hook
    return () => {
      delete window.__zetraceHQ;
      hq.dropCarCache();
      stage.destroy();
    };
  }, [color, accent, quality]);

  if (failed) return null;
  const info = ROOMS.find((r) => r.id === shown);
  return (
    <section className="panel relative overflow-hidden" data-testid="hq-view" data-live={shown}>
      <canvas ref={canvasRef} className="block h-[360px] w-full bg-black lg:h-[520px]" />
      <div key={shown} className="hq-cut pointer-events-none absolute inset-0 bg-ink" aria-hidden="true" />
      <div className="pointer-events-none absolute left-3 top-3 z-hud max-w-xs rounded-xl border border-line bg-ink/75 p-3 backdrop-blur">
        <p className="label">{room ? 'Now viewing' : 'Auto tour'}</p>
        <p className="display text-2xl leading-tight" data-testid="hq-room">{info?.label || 'Campus'}</p>
        {info?.areas.map((key) => {
          const project = state.projects.find((p) => p.area === key);
          return (
            <p key={key} className="mt-1 text-xs text-cream/80">
              {AREAS.find((a) => a.key === key).label}: <b className="font-mono">{(state.car[key] * 100).toFixed(1)}</b>
              {project && <span className="text-lantern"> | {TIERS[project.tier].label} upgrade, {project.roundsLeft} race{project.roundsLeft > 1 ? 's' : ''} left</span>}
            </p>
          );
        })}
        {shown === 'board' && <p className="mt-1 text-xs text-cream/80">Budget: <b className="font-mono text-emerald-400">${state.budget.toFixed(1)}M</b></p>}
        {shown === 'hub' && <p className="mt-1 text-xs text-cream/80">Simulator, strategy table and trophy shelf</p>}
        {shown === 'campus' && <p className="mt-1 text-xs text-cream/80">{state.projects.length} project{state.projects.length === 1 ? '' : 's'} in development</p>}
      </div>
      <nav className="absolute inset-x-2 bottom-2 z-hud flex flex-wrap justify-center gap-1 rounded-xl bg-ink/80 p-1.5 backdrop-blur" aria-label="Headquarters rooms">
        <button type="button" data-room="tour" onClick={() => onRoom(null)} className={`chip px-3 py-1.5 text-xs ${room === null ? 'bg-data text-ink' : 'chip-off'}`}>Auto tour</button>
        {NAV.map((r) => {
          const busy = r.areas?.some((a) => state.projects.some((p) => p.area === a));
          return (
            <button key={r.id} type="button" data-room={r.id} onClick={() => onRoom(r.id)} className={`chip relative px-3 py-1.5 text-xs ${room === r.id ? 'bg-lantern text-ink' : 'chip-off'}`}>
              {r.label}
              {busy && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-rose align-middle" title="Upgrade in development" />}
            </button>
          );
        })}
      </nav>
    </section>
  );
};

export default HQView;

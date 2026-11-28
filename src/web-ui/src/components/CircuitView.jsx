import React, { useEffect, useRef, useState } from 'react';
import TrackMap from './TrackMap';
import { createStage, reducedMotion } from '../game/stage';
import { buildCircuit } from '../game/scene';
import { makeTrackPath } from '../game/trackPath';
import { ENVIRONMENTS } from '../game/environments';

const VIEWS = [['orbit', '3D orbit'], ['fly', 'Flyover'], ['top', 'From above'], ['map', 'Map']];

/** The circuit in 3D (no cars): slow orbit, a low flyover lap, or straight down. */
const CircuitView = ({ track, teams = [], quality = 'high', className = 'h-72 lg:h-[420px]' }) => {
  const canvasRef = useRef(null);
  const [view, setView] = useState('orbit');
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);
  const show3d = view !== 'map';

  useEffect(() => {
    if (!show3d || !canvasRef.current) return undefined;
    const theme = ENVIRONMENTS[track.env] || ENVIRONMENTS.forest;
    let stage;
    try {
      stage = createStage(canvasRef.current, {
        quality, sky: theme.sky, ambient: theme.ambient, ambientLevel: theme.ambientLevel * 2.2, sun: theme.sun, shadowDistance: 520, farClip: 1400,
      });
    } catch {
      setView('map'); // no WebGL: the flat map still works
      return undefined;
    }
    const path = makeTrackPath(track.points);
    buildCircuit(stage.app, path, { teams, env: track.env, seed: track.id.length * 7 + 3, pitSide: track.pitSide });
    const xs = path.points.map((p) => p.x);
    const zs = path.points.map((p) => p.z);
    const mid = [(Math.min(...xs) + Math.max(...xs)) / 2, 0, (Math.min(...zs) + Math.max(...zs)) / 2];
    const radius = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs)) / 2;

    let angle = 0.8;
    let lap = 0;
    const still = reducedMotion();
    stage.app.on('update', (dt) => {
      const mode = viewRef.current;
      if (!still) {
        angle += dt * 0.09;
        lap = (lap + dt * 0.032) % 1;
      }
      if (mode === 'fly') {
        const from = path.pointAt(lap - 14 / path.total);
        const to = path.pointAt(lap + 22 / path.total);
        stage.look([from.x, 11, from.z], [to.x, 0, to.z], 58);
      } else if (mode === 'top') {
        stage.look([mid[0], radius * 2.9, mid[2] + 1], mid, 42);
      } else {
        const d = radius * 1.75;
        stage.look([mid[0] + Math.cos(angle) * d, radius * 1.05, mid[2] + Math.sin(angle) * d], [mid[0], -radius * 0.12, mid[2]], 40);
      }
    });
    window.__zetracePreview = () => ({ track: track.id, view: viewRef.current }); // read-only test hook
    return () => {
      delete window.__zetracePreview;
      stage.destroy();
    };
  }, [track, teams, quality, show3d]);

  return (
    <div className="relative" data-testid="circuit-view">
      {show3d ? (
        <canvas ref={canvasRef} className={`block w-full bg-black ${className}`} />
      ) : (
        <div className={`flex w-full items-center justify-center p-6 ${className}`}>
          <TrackMap pitSide={track.pitSide} points={track.points} className="h-full w-full drop-shadow-[0_0_18px_rgba(225,6,0,0.35)]" width={4.5} />
        </div>
      )}
      <div className="absolute bottom-2 left-2 z-hud flex flex-wrap gap-1 rounded-lg bg-ink/75 p-1 backdrop-blur" role="group" aria-label="Circuit view">
        {VIEWS.map(([id, label]) => (
          <button key={id} type="button" data-view={id} onClick={() => setView(id)} className={`chip px-2.5 py-1 text-[11px] ${view === id ? 'bg-lantern text-ink' : 'chip-off'}`}>
            {label}
          </button>
        ))}
      </div>
      {show3d && (
        <div className="pointer-events-none absolute right-2 top-2 z-hud w-28 rounded-lg border border-line bg-ink/70 p-2">
          <TrackMap pitSide={track.pitSide} points={track.points} className="h-auto w-full" width={6} />
        </div>
      )}
    </div>
  );
};

export default CircuitView;

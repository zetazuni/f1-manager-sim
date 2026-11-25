import React, { useEffect, useRef, useState } from 'react';
import * as pc from 'playcanvas';
import { makeTrackPath } from '../game/trackPath';
import { buildCircuit, buildCar, buildSafetyCar, buildRain, clearMaterialCache, clearCarMeshCache } from '../game/scene';
import { ENVIRONMENTS } from '../game/environments';

const col = (hex, k = 1) => {
  const c = new pc.Color();
  c.fromString(hex);
  return new pc.Color(c.r * k, c.g * k, c.b * k);
};

/**
 * 3D race view.
 * `carsRef.current` is read every frame: [{ id, color, accent, lapFloat, lane }]
 * lapFloat = laps done + fraction of the current lap (2.25 = a quarter into lap 3).
 * Reading a ref (not props) keeps the cars moving smoothly between React renders,
 * and the PlayCanvas app is created once instead of on every prop change.
 */
const RaceView = ({ carsRef, weatherRef = null, focusId = null, teams = [], track = null, quality = 'high' }) => {
  const canvasRef = useRef(null);
  const [cameraMode, setCameraMode] = useState('overview');
  const modeRef = useRef('overview');
  useEffect(() => {
    modeRef.current = cameraMode;
  }, [cameraMode]);
  const focusRef = useRef(focusId);
  useEffect(() => {
    focusRef.current = focusId;
  }, [focusId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const app = new pc.Application(canvas, {
      mouse: new pc.Mouse(canvas),
      touch: new pc.TouchDevice(canvas),
      graphicsDeviceOptions: { antialias: true },
    });
    // CSS controls the canvas size; PlayCanvas matches its draw buffer to it.
    app.setCanvasFillMode(pc.FILLMODE_NONE);
    app.setCanvasResolution(pc.RESOLUTION_AUTO);
    // Low quality renders at 1x pixel ratio; high allows up to 2x on sharp screens
    app.graphicsDevice.maxPixelRatio = quality === 'high' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    const theme = ENVIRONMENTS[track?.env] || ENVIRONMENTS.forest;
    app.scene.ambientLight = col(theme.ambient, theme.ambientLevel * 2.2);
    // distance fog in the sky colour gives depth to the far edge of the map
    try {
      if (app.scene.fog && typeof app.scene.fog === 'object') {
        app.scene.fog.type = pc.FOG_LINEAR;
        app.scene.fog.color = col(theme.sky);
        app.scene.fog.start = 230;
        app.scene.fog.end = 420;
      }
    } catch { /* fog is optional */ }
    app.start();

    // Size only the drawing buffer; CSS keeps control of the on-screen size.
    // (app.resizeCanvas would write the size into the inline style, and a size
    // of 0 while the race tab is hidden would then stick.)
    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      app.graphicsDevice.resizeCanvas(w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    // Isometric orthographic camera
    const camera = new pc.Entity('camera');
    camera.addComponent('camera', {
      projection: pc.PROJECTION_ORTHOGRAPHIC,
      toneMapping: pc.TONEMAP_ACES,
      gammaCorrection: pc.GAMMA_SRGB,
      clearColor: col(theme.sky),
      nearClip: 1,
      farClip: 600,
    });
    app.root.addChild(camera);

    // Sun with real shadows
    const sun = new pc.Entity('sun');
    sun.addComponent('light', {
      type: 'directional',
      color: col(theme.sun.color),
      intensity: theme.sun.intensity,
      castShadows: quality !== 'low',
      shadowDistance: 420,
      shadowResolution: quality === 'high' ? 2048 : 1024,
      shadowBias: 0.2,
      normalOffsetBias: 0.05,
    });
    sun.setEulerAngles(theme.sun.pitch, theme.sun.yaw, 0);
    app.root.addChild(sun);

    const path = makeTrackPath(track?.points);
    const circuit = buildCircuit(app, path, { teams, env: track?.env || 'forest', seed: (track?.id || 'x').length * 7 + 3 });

    // Weather: rain streaks, dimmer greyer light, glossy wet asphalt
    const rain = buildRain(app);
    const asphaltMat = circuit.findByName('asphalt')?.render?.meshInstances?.[0]?.material || null;
    const dryAsphalt = asphaltMat ? { diffuse: asphaltMat.diffuse.clone(), gloss: asphaltMat.gloss } : null;
    const drySky = col(theme.sky);
    const wetSky = col('#5b6676');
    const dryAmbient = col(theme.ambient, theme.ambientLevel * 2.2);
    let shownWet = -1;
    let rainT = 0;
    const applyWeather = (w, dt) => {
      rainT += dt;
      rain.entity.enabled = w > 0.04;
      if (rain.entity.enabled) {
        rain.entity.setLocalPosition(0, -((rainT * (35 + w * 25)) % 60), 0);
      }
      if (Math.abs(w - shownWet) < 0.02) return;
      shownWet = w;
      rain.material.opacity = 0.2 + w * 0.5;
      rain.material.update();
      sun.light.intensity = theme.sun.intensity * (1 - 0.55 * w);
      const sky = new pc.Color().lerp(drySky, wetSky, Math.min(1, w * 1.4));
      camera.camera.clearColor = sky;
      app.scene.ambientLight = new pc.Color().lerp(dryAmbient, col('#6b7280', 0.9), w * 0.6);
      if (asphaltMat && dryAsphalt) {
        asphaltMat.gloss = dryAsphalt.gloss + w * 0.55;
        asphaltMat.diffuse = new pc.Color().lerp(dryAsphalt.diffuse, col('#1a1d22'), w * 0.7);
        asphaltMat.update();
      }
    };

    // Auto-fit: project the track into the camera's view plane and size the
    // orthographic view so the whole circuit fits the canvas, whatever its shape.
    const fwd = new pc.Vec3(-1, -1, -1).normalize();
    const right = new pc.Vec3().cross(fwd, pc.Vec3.UP).normalize();
    const up = new pc.Vec3().cross(right, fwd).normalize();
    let minX = Infinity; let maxX = -Infinity; let minY = Infinity; let maxY = -Infinity;
    path.points.forEach((p) => {
      for (const [ox, oz] of [[p.nx * 6, p.nz * 6], [-p.nx * 6, -p.nz * 6]]) {
        const v = new pc.Vec3(p.x + ox, 0, p.z + oz);
        minX = Math.min(minX, v.dot(right)); maxX = Math.max(maxX, v.dot(right));
        minY = Math.min(minY, v.dot(up)); maxY = Math.max(maxY, v.dot(up));
      }
    });
    const fitCenter = new pc.Vec3()
      .add(right.clone().mulScalar((minX + maxX) / 2))
      .add(up.clone().mulScalar((minY + maxY) / 2));
    const fitHeight = () => {
      const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
      return Math.max((maxY - minY) / 2, (maxX - minX) / 2 / aspect) * 1.08;
    };

    // Car entities are created per id on first sight and removed when the id disappears
    const carEntities = new Map();
    let zoom = 1; // 1 = whole circuit, smaller = closer
    const onWheel = (e) => {
      e.preventDefault();
      zoom = Math.min(1.4, Math.max(0.2, zoom * (e.deltaY > 0 ? 1.1 : 0.9)));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    camera.camera.orthoHeight = fitHeight();

    const look = new pc.Vec3();
    // chase / TV camera state
    let lastMode = 'overview';
    const camPos = new pc.Vec3();
    const camAim = new pc.Vec3();
    const want = new pc.Vec3();
    const aim = new pc.Vec3();
    let tvActive = null;
    // eight trackside camera towers, on the outside of the lap
    const tvCams = Array.from({ length: 8 }, (_, i) => {
      const p = path.pointAt(i / 8 + 0.06, -16);
      return { x: p.x, y: 7, z: p.z };
    });
    app.on('update', (dt) => {
      const cars = carsRef?.current || [];
      const seen = new Set();
      cars.forEach((c) => {
        seen.add(c.id);
        let ent = carEntities.get(c.id);
        if (!ent) {
          ent = c.id === 'safety-car' ? buildSafetyCar(app) : buildCar(app, c.color, c.accent);
          carEntities.set(c.id, ent);
        }
        // ease toward the wanted lane so cars swing out smoothly instead of jumping
        const lane = ent.lane === undefined ? (c.lane || 0) : ent.lane + ((c.lane || 0) - ent.lane) * Math.min(1, dt * 4);
        ent.lane = lane;
        const p = path.pointAt(c.lapFloat, lane);
        ent.setLocalPosition(p.x, 0.05, p.z);
        ent.setLocalEulerAngles(0, p.heading, 0);
      });
      carEntities.forEach((ent, id) => {
        if (!seen.has(id)) {
          ent.destroy();
          carEntities.delete(id);
        }
      });

      applyWeather(weatherRef?.current || 0, dt);

      const cam = camera.camera;
      const focus = focusRef.current ? carEntities.get(focusRef.current) : null;
      const mode = focus ? modeRef.current : 'overview';
      if (mode !== lastMode) {
        lastMode = mode;
        if (mode === 'overview') {
          cam.projection = pc.PROJECTION_ORTHOGRAPHIC;
          cam.nearClip = 1;
        } else {
          cam.projection = pc.PROJECTION_PERSPECTIVE;
          cam.nearClip = 0.3;
        }
      }

      if (mode === 'overview') {
        // Smooth zoom; when zoomed in, the camera slides toward the focused car
        const wanted = fitHeight() * zoom;
        cam.orthoHeight += (wanted - cam.orthoHeight) * Math.min(1, dt * 8);
        const follow = Math.max(0, Math.min(1, (1 - cam.orthoHeight / fitHeight()) / 0.6));
        look.copy(fitCenter);
        if (focus) look.lerp(fitCenter, focus.getPosition(), follow);
        camera.setPosition(look.x + 110, look.y + 110, look.z + 110);
        camera.lookAt(look);
        return;
      }

      const carPos = focus.getPosition();
      const nose = focus.forward.clone().mulScalar(-1); // models point +Z, PlayCanvas forward is -Z
      if (mode === 'chase') {
        cam.fov = 48;
        want.copy(carPos).sub(nose.clone().mulScalar(11)).add(new pc.Vec3(0, 4.2, 0));
        aim.copy(carPos).add(nose.clone().mulScalar(9)).add(new pc.Vec3(0, 0.8, 0));
        // Rigid follow: cars move ~230 units per real second at 1x, so any
        // positional smoothing would leave the camera far behind the car.
        camPos.copy(want);
        camAim.copy(aim);
        camera.setPosition(camPos);
        camera.lookAt(camAim);
        return;
      }

      // TV: fixed trackside cameras, cut to the one nearest the focused car
      let best = tvCams[0];
      let bestD = Infinity;
      tvCams.forEach((c) => {
        const d = (c.x - carPos.x) ** 2 + (c.z - carPos.z) ** 2;
        if (d < bestD) { bestD = d; best = c; }
      });
      if (best !== tvActive) tvActive = best;
      cam.fov = Math.max(12, Math.min(40, 900 / Math.sqrt(bestD + 1)));
      camAim.copy(carPos);
      camera.setPosition(best.x, best.y, best.z);
      camera.lookAt(camAim);
    });

    // Test hook (read-only): lets the headless check confirm the scene is alive
    window.__zetrace = { app, carEntities };

    return () => {
      canvas.removeEventListener('wheel', onWheel);
      ro.disconnect();
      app.destroy();
      clearMaterialCache();
      clearCarMeshCache();
      if (window.__zetrace?.app === app) delete window.__zetrace;
    };
  }, [carsRef, weatherRef, teams, track, quality]);

  return (
    <div className="relative">
      <canvas ref={canvasRef} className="h-[420px] w-full rounded-lg bg-black shadow-inner lg:h-[600px]" />
      <div className="absolute left-2 top-2 z-hud flex gap-1 rounded-lg bg-ink/75 p-1 backdrop-blur" role="group" aria-label="Camera">
        {[['overview', 'Overview'], ['chase', 'Chase'], ['tv', 'TV']].map(([id, label]) => (
          <button
            key={id}
            type="button"
            data-camera={id}
            onClick={() => setCameraMode(id)}
            className={`chip px-2.5 py-1 text-[11px] ${cameraMode === id ? 'bg-lantern text-ink' : 'chip-off'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="pointer-events-none absolute bottom-2 right-3 z-hud text-[10px] text-muted/80">
        {cameraMode === 'overview' ? 'Scroll to zoom' : 'Following the selected driver'}
      </p>
    </div>
  );
};

export default RaceView;

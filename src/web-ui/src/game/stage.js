// A small 3D stage shared by the showcase views (circuit preview, team HQ):
// app and canvas sizing, camera, sun, soft reflections and clean teardown.

import * as pc from 'playcanvas';
import { clearMaterialCache } from './scene';

export const colour = (hex, k = 1) => {
  const c = new pc.Color();
  c.fromString(hex);
  return new pc.Color(c.r * k, c.g * k, c.b * k);
};

export const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/**
 * A painted sky-and-floor cubemap for reflective paint and wet surfaces. It is
 * a fixed picture of a sky, not a mirror of the scene.
 */
export function skyCubemap(device, sky = '#9cc3e6', floor = '#2b2f36') {
  const size = 64;
  const face = (kind) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const g = canvas.getContext('2d');
    if (kind === 'up') g.fillStyle = sky;
    else if (kind === 'down') g.fillStyle = floor;
    else {
      const grad = g.createLinearGradient(0, 0, 0, size);
      grad.addColorStop(0, sky);
      grad.addColorStop(0.48, '#fff4e0');
      grad.addColorStop(0.55, floor);
      grad.addColorStop(1, floor);
      g.fillStyle = grad;
    }
    g.fillRect(0, 0, size, size);
    if (kind === 'up') {
      // two soft "softbox" lights so paintwork catches highlights
      g.fillStyle = 'rgba(255,255,255,0.9)';
      g.fillRect(8, 10, 48, 8);
      g.fillRect(8, 44, 48, 8);
    }
    return canvas;
  };
  const tex = new pc.Texture(device, { width: size, height: size, cubemap: true, mipmaps: true });
  tex.setSource([face('side'), face('side'), face('up'), face('down'), face('side'), face('side')]);
  return tex;
}

export function createStage(canvas, { quality = 'high', sky = '#1a1430', ambient = '#8f86ab', ambientLevel = 0.9, sun = { color: '#ffe6c4', intensity: 1.3, pitch: 48, yaw: 30 }, shadowDistance = 200, farClip = 800 } = {}) {
  const app = new pc.Application(canvas, { graphicsDeviceOptions: { antialias: true } });
  app.setCanvasFillMode(pc.FILLMODE_NONE);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  app.graphicsDevice.maxPixelRatio = quality === 'high' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  app.scene.ambientLight = colour(ambient, ambientLevel);
  app.start();

  const resize = () => {
    if (canvas.clientWidth && canvas.clientHeight) app.graphicsDevice.resizeCanvas(canvas.clientWidth, canvas.clientHeight);
  };
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  resize();

  const camera = new pc.Entity('camera');
  camera.addComponent('camera', { toneMapping: pc.TONEMAP_ACES, gammaCorrection: pc.GAMMA_SRGB, clearColor: colour(sky), nearClip: 0.5, farClip, fov: 45 });
  app.root.addChild(camera);

  const light = new pc.Entity('sun');
  light.addComponent('light', {
    type: 'directional', color: colour(sun.color), intensity: sun.intensity,
    castShadows: quality !== 'low', shadowDistance, shadowResolution: quality === 'high' ? 2048 : 1024,
    shadowBias: 0.2, normalOffsetBias: 0.05,
  });
  light.setEulerAngles(sun.pitch, sun.yaw, 0);
  app.root.addChild(light);

  return {
    app,
    camera,
    /** Place the camera at `pos` looking at `at` (plain [x, y, z] arrays). */
    look(pos, at, fov) {
      camera.setPosition(pos[0], pos[1], pos[2]);
      camera.lookAt(at[0], at[1], at[2]);
      if (fov) camera.camera.fov = fov;
    },
    destroy() {
      observer.disconnect();
      const device = app.graphicsDevice;
      app.destroy();
      clearMaterialCache(device);
    },
  };
}

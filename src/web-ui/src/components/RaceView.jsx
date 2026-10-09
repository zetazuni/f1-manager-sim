import React, { useEffect, useRef } from 'react';
import * as pc from 'playcanvas';

const RaceView = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // 1. Setup Application
    const app = new pc.Application(canvasRef.current, {
      mouse: new pc.Mouse(canvasRef.current),
      touch: new pc.TouchDevice(canvasRef.current),
    });

    app.start();

    // 2. Setup Orthographic Camera for Isometric View
    const camera = new pc.Entity();
    camera.addComponent('camera', {
      projection: pc.PROJECTION_ORTHOGRAPHIC,
      orthoHeight: 5,
      clearColor: new pc.Color(0.1, 0.1, 0.1),
    });
    // Isometric angle: 35.264 degrees elevation, 45 degrees rotation
    camera.setPosition(10, 10, 10);
    camera.lookAt(0, 0, 0);
    app.root.addChild(camera);

    // 3. Lighting
    const light = new pc.Entity();
    light.addComponent('light', { type: 'directional', intensity: 1 });
    light.setEulerAngles(45, 45, 0);
    app.root.addChild(light);

    // 4. Load F1 Car Model
    const container = new pc.Entity();
    app.addComponent('container', new pc.ContainerHandler(app));

    app.assets.loadFromUrl('/assets/f1_car.glb', 'container', (err, asset) => {
        if (!err) {
            const entity = asset.resource.instantiateRenderEntity();
            entity.setLocalScale(0.01, 0.01, 0.01); // Scale as needed based on model
            app.root.addChild(entity);
        } else {
            console.error('Error loading GLB:', err);
            // Fallback: Box if model fails
            const box = new pc.Entity();
            box.addComponent('model', { type: 'box' });
            app.root.addChild(box);
        }
    });

    // Handle Window Resize
    const resize = () => app.resizeCanvas();
    window.addEventListener('resize', resize);

    return () => {
      window.removeEventListener('resize', resize);
      app.destroy();
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-96 bg-black rounded-lg" />;
};

export default RaceView;

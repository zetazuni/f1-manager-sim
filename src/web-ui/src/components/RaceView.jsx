import React, { useEffect, useRef } from 'react';
import * as pc from 'playcanvas';

const RaceView = ({ lapProgress }) => {
  const canvasRef = useRef(null);
  const carEntity = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // 1. Setup Application
    const app = new pc.Application(canvasRef.current, {
      mouse: new pc.Mouse(canvasRef.current),
      touch: new pc.TouchDevice(canvasRef.current),
    });
    app.start();

    // 2. Setup Isometric Camera (Orthographic)
    const camera = new pc.Entity();
    camera.addComponent('camera', {
      projection: pc.PROJECTION_ORTHOGRAPHIC,
      orthoHeight: 40,
      clearColor: new pc.Color(0.05, 0.05, 0.1)
    });
    camera.setPosition(50, 60, 50);
    camera.lookAt(0, 0, 0);
    app.root.addChild(camera);

    // 3. Lighting
    const ambient = new pc.Entity();
    ambient.addComponent('light', { type: 'ambient', intensity: 0.4, color: new pc.Color(0.2, 0.2, 0.3) });
    app.root.addChild(ambient);
    const sun = new pc.Entity();
    sun.addComponent('light', { type: 'directional', intensity: 0.8, color: new pc.Color(1, 0.95, 0.8), shadow: true });
    sun.setEulerAngles(-30, 45, 0);
    app.root.addChild(sun);

    // 4. Ground & Track
    const ground = new pc.Entity();
    ground.addComponent('model', { type: 'plane', material: new pc.StandardMaterial() });
    ground.setLocalScale(80, 1, 80);
    ground.setPosition(0, -1, 0);
    ground.model.material.diffuse = new pc.Color(0.1, 0.5, 0.1);
    app.root.addChild(ground);

    // 5. Procedural Environment (Grandstands, Paddock etc)
    const addBlock = (x, y, z, width, height, depth, color) => {
      const entity = new pc.Entity();
      entity.setLocalPosition(x, y, z);
      entity.setLocalScale(width, height, depth);
      const model = entity.addComponent('model');
      model.type = 'box';
      const mat = new pc.StandardMaterial();
      mat.diffuse = color;
      model.material = mat;
      app.root.addChild(entity);
      return entity;
    };
    addBlock(-20, 5, -5, 8, 3, 20, new pc.Color(0.6, 0.6, 0.6));
    addBlock(30, 2, -20, 20, 2, 10, new pc.Color(0.4, 0.4, 0.4));

    // 6. F1 Car Model
    const carContainer = new pc.Entity();
    app.root.addChild(carContainer);
    carEntity.current = carContainer;

    app.assets.loadFromUrl('/assets/f1_car.glb', 'carModel', (err, asset) => {
        if (!err && asset.resource) {
            const renderEntity = asset.resource.instantiateRenderEntity();
            renderEntity.setLocalScale(0.01, 0.01, 0.01);
            carContainer.addChild(renderEntity);
        } else {
            const box = new pc.Entity();
            box.addComponent('model', { type: 'box' });
            box.setLocalScale(2, 0.5, 4);
            carContainer.addChild(box);
        }
    });

    return () => app.destroy();
  }, []);

  // Animate car position based on lapProgress
  useEffect(() => {
    if (carEntity.current) {
        // Simple track circuit simulation (X, Z movement)
        const radius = 20;
        const angle = lapProgress * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        carEntity.current.setLocalPosition(x, 1, z);
        carEntity.current.lookAt(x + Math.cos(angle + 0.1) * radius, 1, z + Math.sin(angle + 0.1) * radius);
    }
  }, [lapProgress]);

  return <canvas ref={canvasRef} className="w-full h-[600px] bg-black rounded-lg" />;
};

export default RaceView;

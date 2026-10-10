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
      clearColor: new pc.Color(0.02, 0.02, 0.05) // Darker background
    });
    camera.setPosition(60, 60, 60);
    camera.lookAt(0, 0, 0);
    app.root.addChild(camera);

    // 3. Lighting
    const ambient = new pc.Entity();
    ambient.addComponent('light', { type: 'ambient', intensity: 0.3, color: new pc.Color(0.2, 0.2, 0.4) });
    app.root.addChild(ambient);
    const sun = new pc.Entity();
    sun.addComponent('light', { type: 'directional', intensity: 1.2, color: new pc.Color(1, 1, 0.9), shadow: true });
    sun.setEulerAngles(-45, 45, 0);
    app.root.addChild(sun);

    // 4. Ground & Track Surface
    const ground = new pc.Entity();
    ground.addComponent('model', { type: 'plane' });
    ground.setLocalScale(200, 1, 200);
    ground.setPosition(0, -0.1, 0);
    const groundMat = new pc.StandardMaterial();
    groundMat.diffuse = new pc.Color(0.05, 0.1, 0.05);
    ground.model.material = groundMat;
    app.root.addChild(ground);

    // Add a Grid surface for better "Game" feel
    const grid = new pc.Entity();
    grid.addComponent('model', { type: 'plane' });
    grid.setLocalScale(100, 1, 100);
    grid.setPosition(0, 0, 0);
    const gridMat = new pc.StandardMaterial();
    gridMat.diffuse = new pc.Color(0.1, 0.1, 0.15);
    gridMat.emissive = new pc.Color(0.1, 0.1, 0.2);
    gridMat.opacity = 0.5;
    gridMat.blendType = pc.BLEND_NORMAL;
    grid.model.material = gridMat;
    app.root.addChild(grid);

    // 5. Procedural Track Circle
    const createTrackSegment = (x, z, size) => {
        const seg = new pc.Entity();
        seg.addComponent('model', { type: 'box' });
        seg.setLocalScale(size, 0.1, size);
        seg.setLocalPosition(x, 0.05, z);
        const mat = new pc.StandardMaterial();
        mat.diffuse = new pc.Color(0.2, 0.2, 0.2); // Asphalt
        seg.model.material = mat;
        app.root.addChild(seg);
    };

    // Draw a basic circular track path
    for(let i=0; i<32; i++) {
        const angle = (i/32) * Math.PI * 2;
        createTrackSegment(Math.cos(angle) * 20, Math.sin(angle) * 20, 4);
    }

    // 6. Environment
    const addBlock = (x, y, z, w, h, d, color) => {
      const entity = new pc.Entity();
      entity.setLocalPosition(x, y, z);
      entity.setLocalScale(w, h, d);
      entity.addComponent('model', { type: 'box' });
      const mat = new pc.StandardMaterial();
      mat.diffuse = color;
      entity.model.material = mat;
      app.root.addChild(entity);
    };

    // Grandstand
    addBlock(-35, 3, 0, 10, 6, 40, new pc.Color(0.5, 0.5, 0.5));
    // Pit Building
    addBlock(0, 2, -30, 40, 4, 10, new pc.Color(0.7, 0.1, 0.1));

    // 7. F1 Car Model
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
            box.setLocalScale(1.5, 0.5, 3);
            const mat = new pc.StandardMaterial();
            mat.diffuse = new pc.Color(1, 0, 0);
            box.model.material = mat;
            carContainer.addChild(box);
        }
    });

    return () => app.destroy();
  }, []);

  useEffect(() => {
    if (carEntity.current) {
        const radius = 20;
        const angle = lapProgress * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        carEntity.current.setLocalPosition(x, 0.5, z);
        carEntity.current.setEulerAngles(0, -lapProgress * 360 - 90, 0);
    }
  }, [lapProgress]);

  return <canvas ref={canvasRef} className="w-full h-[600px] bg-black rounded-lg shadow-inner" />;
};

export default RaceView;

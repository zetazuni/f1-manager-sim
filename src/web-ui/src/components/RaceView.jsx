import React, { useEffect, useRef } from 'react';
import * as pc from 'playcanvas';

const RaceView = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const app = new pc.Application(canvasRef.current, {
      mouse: new pc.Mouse(canvasRef.current),
      touch: new pc.TouchDevice(canvasRef.current)
    });
    app.start();

    // 1. Setup Isometric Camera (Orthographic)
    const camera = new pc.Entity();
    camera.addComponent('camera', {
      projection: pc.PROJECTION_ORTHOGRAPHIC,
      orthoHeight: 40,
      clearColor: new pc.Color(0.05, 0.05, 0.1) // Dark blueish track background
    });
    camera.setPosition(50, 60, 50);
    camera.lookAt(0, 0, 0);
    app.root.addChild(camera);

    // 2. Ambient & Directional Lighting for "Day" atmosphere
    const ambient = new pc.Entity();
    ambient.addComponent('light', { type: 'ambient', intensity: 0.4, color: new pc.Color(0.2, 0.2, 0.3) });
    app.root.addChild(ambient);

    const sun = new pc.Entity();
    sun.addComponent('light', { type: 'directional', intensity: 0.8, color: new pc.Color(1, 0.95, 0.8), shadow: true });
    sun.setEulerAngles(-30, 45, 0);
    app.root.addChild(sun);

    // 3. Ground & Track Surface
    // Ground Plane
    const ground = new pc.Entity();
    ground.addComponent('model', { type: 'plane', material: new pc.StandardMaterial() });
    ground.setLocalScale(80, 1, 80);
    ground.setPosition(0, -1, 0);
    // Simple grass checkered pattern via material parameters
    ground.model.material.diffuse = new pc.Color(0.1, 0.5, 0.1);
    ground.model.material.specular = new pc.Color(0, 0, 0);
    ground.model.material.emissive = new pc.Color(0, 0, 0);
    app.root.addChild(ground);

    // 4. Procedural Environment Builder
    // This function creates a "block" entity with given dimensions and color
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

    // 5. Add Grandstands (Tiered seating)
    // Main Grandstand on the left side of the start/finish line
    // Tier 1
    addBlock(-20, 5, -5, 8, 3, 20, new pc.Color(0.6, 0.6, 0.6)); // Concrete grey
    // Tier 2
    addBlock(-12, 8, -5, 8, 3, 20, new pc.Color(0.7, 0.7, 0.7));
    // Tier 3 (Roof area implied by height)
    addBlock(-4, 11, -5, 8, 3, 20, new pc.Color(0.8, 0.8, 0.8));

    // 6. Add Hillstands (Embankments)
    // Left hill
    addBlock(20, 0, -10, 15, 5, 30, new pc.Color(0.3, 0.5, 0.1)); // Green hill
    // Right hill
    addBlock(-20, 0, -10, 15, 5, 30, new pc.Color(0.3, 0.5, 0.1));

    // 7. Add Paddock Area (Bottom right)
    // Paddock fences and buildings blocks
    addBlock(30, 2, -20, 20, 2, 10, new pc.Color(0.4, 0.4, 0.4)); // Fences/ Walls
    addBlock(45, 1, -25, 10, 3, 8, new pc.Color(0.5, 0.5, 0.5)); // Small buildings

    // 8. Add the F1 Car (GLB Loader)
    const carEntity = new pc.Entity();
    carEntity.setName('PlayerCar');
    app.root.addChild(carEntity);

    // Load the F1 Car GLB model
    // The path is relative to the web root served by Vite/PlayCanvas.
    // Ensure f1_car.glb is in public/assets/
    app.assets.loadFromUrl('/assets/f1_car.glb', 'carModel', (err, asset) => {
      if (!err && asset.resource) {
        // Instantiate the glb model
        const renderEntity = asset.resource.instantiateRenderEntity();
        renderEntity.setName('F1Car_Render');
        // Scale the car to be reasonable size next to our blocks (which are ~units)
        renderEntity.setLocalScale(0.01, 0.01, 0.01);
        renderEntity.setLocalPosition(0, 1, -10); // Start position on the grid
        carEntity.addComponent('model').model = renderEntity.model;
        app.root.addChild(renderEntity);
      } else {
        console.warn("GLB not found, using placeholder car cube.");
        // Fallback: A simple box car
        const fallbackCar = new pc.Entity();
        fallbackCar.setLocalScale(2, 0.5, 4);
        fallbackCar.setLocalPosition(0, 1, -10);
        fallbackCar.addComponent('model', { type: 'box' });
        fallbackCar.model.material.diffuse = new pc.Color(1, 0, 0); // Red placeholder
        app.root.addChild(fallbackCar);
      }
    });

    // 6. Orbit Controls Enable (Mouse drag to rotate)
    // PlayCanvas handles this naturally if mouse is enabled in the init options above.

    return () => {
      app.destroy();
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-[600px] bg-gradient-to-b from-slate-900 via-slate-800 to-slate-700" />;
};

export default RaceView;
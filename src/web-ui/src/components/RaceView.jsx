import React, { useEffect, useRef } from 'react';
import * as pc from 'playcanvas';

const RaceView = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Create PlayCanvas Application
    const app = new pc.Application(canvasRef.current, {
        mouse: new pc.Mouse(canvasRef.current),
        touch: new pc.TouchDevice(canvasRef.current)
    });

    app.start();

    // Create Camera
    const camera = new pc.Entity();
    camera.addComponent('camera', { clearColor: new pc.Color(0.1, 0.1, 0.1) });
    camera.setPosition(0, 5, 10);
    camera.lookAt(0, 0, 0);
    app.root.addChild(camera);

    // Create Light
    const light = new pc.Entity();
    light.addComponent('light');
    light.rotate(45, 0, 0);
    app.root.addChild(light);

    // Placeholder: Add Car (Will replace with GLTF later)
    const box = new pc.Entity();
    box.addComponent('model', { type: 'box' });
    app.root.addChild(box);

    return () => {
      app.destroy();
    };
  }, []);

  return <canvas ref={canvasRef} className="w-full h-96 bg-black rounded-lg" />;
};

export default RaceView;

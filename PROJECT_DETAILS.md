# PlayCanvas Asset Pipeline for F1 Manager

## Implementation Plan
1. **Engine**: PlayCanvas (runtime via CDN).
2. **Setup**: Add PlayCanvas engine dependency to `src/web-ui/package.json`.
3. **Integration**: Create a `RaceView` component that mounts a PlayCanvas application into a DOM element.
4. **Asset Workflow**: Blender -> GLTF -> PlayCanvas.

## Workflow Log
- **2026-10-09**: Decided on 3D browser-native visualization using PlayCanvas.
- **2026-10-09**: Workflow established: Download CC0 GLB F1 car model, place in `public/assets/`, load via PlayCanvas `ContainerHandler`.
- **2026-10-09**: Designing orthographic/isometric camera view with Orbit controls.

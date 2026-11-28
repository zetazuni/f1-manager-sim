import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/bricolage-grotesque/standard.css'
import './index.css'
import App from './App.jsx'
import { bindDesktopKeys } from './services/desktop.js'

bindDesktopKeys()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Desktop app: close the splash once the first screen is on show
// (fonts loaded, at least 1.8 s so the splash never just flickers).
if (window.__TAURI_INTERNALS__) {
  const shownFor = 1800;
  const start = performance.now();
  document.fonts.ready.then(() => {
    const wait = Math.max(0, shownFor - (performance.now() - start));
    setTimeout(() => {
      import('@tauri-apps/api/core').then(({ invoke }) => invoke('app_ready')).catch(() => {});
    }, wait);
  });
}

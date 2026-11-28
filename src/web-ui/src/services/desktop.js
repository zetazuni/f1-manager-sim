// Desktop app (Tauri) only. In a browser every call does nothing.
export const isDesktop = typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;

const call = (cmd, args) => {
  if (!isDesktop) return;
  import('@tauri-apps/api/core').then(({ invoke }) => invoke(cmd, args)).catch(() => {});
};

export const toggleFullscreen = () => call('set_fullscreen');
export const quitGame = () => call('quit_app');

/** F11 flips fullscreen; Esc leaves it (unless a dialog is open). */
export const bindDesktopKeys = () => {
  if (!isDesktop) return;
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F11') {
      e.preventDefault();
      toggleFullscreen();
    } else if (e.key === 'Escape' && !document.querySelector('[role=dialog]')) {
      call('set_fullscreen', { on: false });
    }
  });
};

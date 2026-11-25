import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // PlayCanvas alone is ~2 MB; keep it in its own chunk so app code stays small.
    chunkSizeWarningLimit: 2500,
    rolldownOptions: {
      output: {
        codeSplitting: { groups: [{ name: 'playcanvas', test: /node_modules[/\\]playcanvas/ }] },
      },
    },
  },
})

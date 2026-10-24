import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const frontendDir = fileURLToPath(new URL('.', import.meta.url));

/**
 * The React app is not run on its own dev server: the Express server
 * (backend/src/server.js) loads Vite in middleware mode during development and
 * serves frontend/dist in production, so the app and /api share one port.
 */
export default defineConfig({
  root: frontendDir,
  envDir: fileURLToPath(new URL('..', import.meta.url)), // read VITE_* vars from the root .env
  plugins: [react(), tailwindcss()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});

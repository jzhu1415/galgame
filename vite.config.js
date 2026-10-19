import { defineConfig } from 'vite';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gameStatisticsPlugin } from './scripts/game-statistics-plugin.mjs';

const projectRoot = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [gameStatisticsPlugin()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(projectRoot, 'index.html'),
        iceMap: resolve(projectRoot, 'ice-map.html'),
        frogEscapeMap: resolve(projectRoot, 'frog-escape-map.html'),
      },
    },
  },
});

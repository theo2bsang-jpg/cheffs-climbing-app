import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import baseConfig from './vite.config.js';

export default defineConfig({
  ...baseConfig,
  plugins: [
    ...(baseConfig.plugins || []),
    visualizer({
      filename: 'dist/bundle-analysis.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    })
  ]
});

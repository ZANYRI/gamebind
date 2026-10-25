import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base: './' ensures all assets (.fbx, textures, .inputactions, JS/CSS bundles)
// load properly on GitHub Pages regardless of repository subpath name.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
  },
});

import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import path from 'node:path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // separate cache dirs let several dev servers run side by side (VITE_CACHE_DIR=node_modules/.vite-x)
  cacheDir: process.env.VITE_CACHE_DIR ?? 'node_modules/.vite',
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  build: { chunkSizeWarningLimit: 4000 },
})

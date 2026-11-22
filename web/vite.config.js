import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // The app lives at /app/; the landing page is served at / (redirect to /landing/).
  base: '/app/',
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } }
  },
  build: { outDir: '../server/public', emptyOutDir: true }
})

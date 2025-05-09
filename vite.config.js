import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext', // Ensures you're using modern JS features
    outDir: 'dist', // The output directory for your build (default is dist)
  },
  server: {
    port: 3000, // Custom dev server port
    open: true, // Automatically opens the browser when the server starts
  },
})

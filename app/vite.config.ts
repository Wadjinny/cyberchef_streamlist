import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(() => ({
  // For GitHub Pages project sites, assets must be served from "/<repo>/".
  // The workflow sets VITE_BASE accordingly (e.g. "/cyberchef_streamlist/").
  base: process.env.VITE_BASE ?? '/',
  plugins: [react()],
  server: {
    port: 5173,
  },
}))

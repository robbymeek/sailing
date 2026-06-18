import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    // Let BrowserStack Local's tunnel host reach `vite dev` for real-device
    // cross-device testing. Dev-server only — no effect on the production build.
    allowedHosts: ['bs-local.com', '.bs-local.com', '.browserstack.com'],
  },
  preview: {
    // Same, for `vite preview` (serves the production build over the tunnel — the
    // faithful cross-device test: no StrictMode double-mount, optimized assets).
    allowedHosts: ['bs-local.com', '.bs-local.com', '.browserstack.com'],
  },
})

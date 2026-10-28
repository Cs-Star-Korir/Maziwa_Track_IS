import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Vite reads the same .env as the server, but only VITE_ settings reach the browser,
  // so database passwords and JWT_SECRET stay on the server.
})

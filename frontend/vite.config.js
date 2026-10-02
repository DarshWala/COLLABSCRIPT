import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],        // keep whatever plugins your file already has
  server: { fs: { allow: [".."] } },
})
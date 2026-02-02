import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@attendance': path.resolve(__dirname, './src/attendance_system'),
    },
  },
  server: {
    fs: {
      allow: [
        // search up for workspace root
        '..',
      ],
    },
  },
})

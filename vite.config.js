import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In local development, calls to /api are forwarded to the Python backend
// running on port 8000. On Vercel, the same /api path goes to the Python function.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})

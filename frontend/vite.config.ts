import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Geliştirmede /api istekleri backend'e (localhost:4000) yönlendirilir; CORS gerekmez.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:4000' },
  },
})

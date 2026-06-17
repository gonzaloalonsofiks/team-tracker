import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/azdo': {
        target: 'https://analytics.dev.azure.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/azdo/, ''),
        secure: true,
      },
    },
  },
})

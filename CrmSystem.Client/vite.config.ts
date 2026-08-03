import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      // Bypass ngrok browser warning interception for ALL responses (HTML, JSON, assets)
      'ngrok-skip-browser-warning': 'true',
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5072',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Forward the skip-warning header to backend proxy requests too
            proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
          });
        }
      },
      '/uploads': {
        target: 'http://localhost:5072',
        changeOrigin: true,
        secure: false
      }
    }
  }
})

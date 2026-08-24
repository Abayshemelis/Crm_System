/// <reference types="vite/client" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const env = loadEnv('', process.cwd());

const proxyConfig = {
  '/api': {
    target: env.VITE_API_BASE || 'http://localhost:5073',
    changeOrigin: true,
    secure: false,
    configure: (proxy: any) => {
      proxy.on('proxyReq', (proxyReq: any) => {
        proxyReq.setHeader('ngrok-skip-browser-warning', 'true');
      });
      proxy.on('error', () => {});
    }
  },
  '/uploads': {
    target: env.VITE_API_BASE || 'http://localhost:5073',
    changeOrigin: true,
    secure: false,
    configure: (proxy: any) => {
      proxy.on('error', () => {});
    }
  },
  '/hubs': {
    target: env.VITE_API_BASE || 'http://localhost:5073',
    changeOrigin: true,
    secure: false,
    ws: true,
    configure: (proxy: any) => {
      proxy.on('error', () => {});
    }
  }
};

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'CRM System',
        short_name: 'CRM',
        description: 'Next-gen Customer Relationship Management system',
        theme_color: '#ffffff',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5 MB
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'ngrok-skip-browser-warning': 'true',
    },
    proxy: proxyConfig
  },
  preview: {
    host: true,
    port: 5173,
    allowedHosts: true,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'ngrok-skip-browser-warning': 'true',
    },
    proxy: proxyConfig
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          signalr: ['@microsoft/signalr'],
          icons: ['lucide-react']
        }
      }
    }
  }
})

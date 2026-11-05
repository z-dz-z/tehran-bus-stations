import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          maplibre: ['maplibre-gl'],
          vendor: ['react', 'react-dom', 'lucide-react']
        }
      }
    }
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'mapbox-gl-rtl-text.js',
        'data/transit-data.json'
      ],
      manifest: {
        name: 'اتوبوس تهران | Tehran Bus Live ETA',
        short_name: 'اتوبوس تهران',
        description: 'نقشه و زمان ورود اتوبوس‌های تهران به صورت زنده و آفلاین',
        theme_color: '#10b981',
        background_color: '#ffffff',
        display: 'standalone',
        dir: 'rtl',
        lang: 'fa',
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
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('/data/transit-data.json'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'transit-static-data',
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            urlPattern: ({ url }) => url.origin.includes('application2.irantracking.com'),
            handler: 'NetworkOnly'
          },
          {
            urlPattern: ({ url }) => url.origin.includes('tiles.openfreemap.org'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ]
});

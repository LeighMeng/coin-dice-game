import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { cloudflare } from "@cloudflare/vite-plugin";

// Auto-detect base path: '/' locally, '/repo-name/' on GitHub Pages
const base = process.env.GITHUB_REPOSITORY
  ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/`
  : '/';

export default defineConfig({
  base,
  plugins: [VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['icon-512.png', 'icon-192.png'],
    manifest: {
      name: '币与骰之径 · Coin & Dice: Path of Fate',
      short_name: '币与骰之径',
      description: '以硬币与骰子为武器，穿越36关命运之境，主宰城堡的命运 RPG 策略游戏。',
      theme_color: '#0f0a1e',
      background_color: '#0f0a1e',
      display: 'standalone',
      orientation: 'portrait',
      start_url: base,
      scope: base,
      lang: 'zh-CN',
      categories: ['games', 'entertainment'],
      icons: [
        {
          src: 'icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any maskable'
        },
        {
          src: 'icon-512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable'
        }
      ]
    },
    workbox: {
      // Cache all game assets for offline play
      globPatterns: ['**/*.{js,css,html,png,jpg,svg,ico,woff,woff2}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-cache',
            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            cacheableResponse: { statuses: [0, 200] }
          }
        },
        {
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'gstatic-fonts-cache',
            expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            cacheableResponse: { statuses: [0, 200] }
          }
        }
      ]
    },
    devOptions: {
      enabled: true  // Show PWA behavior in dev mode too
    }
  }), cloudflare()]
});
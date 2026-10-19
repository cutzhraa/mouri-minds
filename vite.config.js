import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['conan.jpg', 'heiji.jpg', 'kid.jpg'], // aset gambar yang ingin di-cache
      manifest: {
        name: 'MouriMinds - Learn Japanese',
        short_name: 'MouriMinds',
        description: 'Aplikasi Belajar Bahasa Jepang',
        theme_color: '#020617',
        background_color: '#020617',
        display: 'standalone',
        icons: [
          {
            src: '/images/conan.jpg',
            sizes: '192x192',
            type: 'image/jpeg',
            purpose: 'any maskable'
          },
          {
            src: '/images/conan.jpg',
            sizes: '512x512',
            type: 'image/jpeg',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ]
})
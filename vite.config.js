import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt', // <--- Ubah dari 'autoUpdate' menjadi 'prompt'
      includeAssets: ['conan.png', 'heiji.jpg', 'kid.jpg'],
      manifest: {
        name: 'MouriMinds - Learn Japanese',
        short_name: 'MouriMinds',
        description: 'Aplikasi Belajar Bahasa Jepang',
        theme_color: '#020617',
        background_color: '#020617',
        display: 'standalone',
        icons: [
          {
            src: '/images/conan.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/images/conan.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
})
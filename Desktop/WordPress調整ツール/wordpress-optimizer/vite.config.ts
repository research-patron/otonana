import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', '@mui/material', '@emotion/react', '@emotion/styled'],
          editor: ['@tinymce/tinymce-react', 'tinymce'],
          firebase: ['firebase/app', 'firebase/firestore', 'firebase/functions', 'firebase/auth'],
        }
      }
    }
  },
  server: {
    port: 3001,
    open: true,
    fs: {
      allow: ['..']
    }
  },
  publicDir: 'public',
  define: {
    global: 'globalThis',
  }
})

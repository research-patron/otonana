import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

// Plugin to copy post directory and DUGA content to dist
const copyPostPlugin = () => ({
  name: 'copy-post',
  closeBundle() {
    const copyDirectory = (src, dest) => {
      if (!existsSync(dest)) {
        mkdirSync(dest, { recursive: true })
      }
      
      const files = readdirSync(src)
      files.forEach(file => {
        const srcPath = join(src, file)
        const destPath = join(dest, file)
        
        if (statSync(srcPath).isDirectory()) {
          copyDirectory(srcPath, destPath)
        } else {
          copyFileSync(srcPath, destPath)
        }
      })
    }
    
    // Copy FANZA blog posts
    const sourceDir = 'public/post'
    const targetDir = 'dist/post'
    if (existsSync(sourceDir)) {
      copyDirectory(sourceDir, targetDir)
      console.log('✅ FANZA blog posts copied to dist/post')
    }

    // Copy DUGA content
    const dugaSourceDir = 'public/duga'
    const dugaTargetDir = 'dist/duga'
    if (existsSync(dugaSourceDir)) {
      copyDirectory(dugaSourceDir, dugaTargetDir)
      console.log('✅ DUGA content copied to dist/duga')
    }
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), copyPostPlugin()],
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: false,
    open: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      overlay: true
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  }
})

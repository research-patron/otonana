import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: 'localhost', // localhostを明示的に指定
    port: 5173,
    strictPort: false, // ポートが使用中の場合は別のポートを使う
    open: true, // ブラウザを自動的に開く
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      overlay: true
    }
  }
})

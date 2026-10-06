import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // npm run dev에서는 Vercel Function이 실행되지 않으므로
    // /api 요청을 배포된 사이트로 넘겨 실제 데이터를 받아온다
    proxy: {
      '/api': {
        target: 'https://jeonsi-gallae.vercel.app',
        changeOrigin: true,
      },
    },
  },
})

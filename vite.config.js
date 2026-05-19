import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/from-zero-to-investor/',
  plugins: [react(), tailwindcss()],
})

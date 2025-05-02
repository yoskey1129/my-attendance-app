import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  base: '/my-attendance-app/', // Add base path for GitHub Pages
  plugins: [vue()],
})

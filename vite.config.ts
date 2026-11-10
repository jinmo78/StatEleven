import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages는 https://<user>.github.io/StatEleven/ 경로로 서비스되므로 빌드 시 base 경로 지정
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/StatEleven/' : '/',
  plugins: [react(), tailwindcss()],
}));

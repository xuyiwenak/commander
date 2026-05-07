import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  // Commander 使用专属域名，根路径访问
  base: '/',
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://localhost:42002',
        changeOrigin: true,
      },
      '/begreat-admin': {
        target: 'http://localhost:41002',
        changeOrigin: true,
      },
    },
  },
});

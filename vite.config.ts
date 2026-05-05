import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  // 生产部署在 Nginx /admin/ 子路径下
  base: '/admin/',
  server: {
    port: 5174,
    proxy: {
      '/begreat-admin': {
        target: 'http://localhost:41002',
        changeOrigin: true,
      },
    },
  },
});

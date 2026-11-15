import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // also reachable from a phone on the same Wi-Fi (http://<your-pc-ip>:5173)
    proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } },
  },
});

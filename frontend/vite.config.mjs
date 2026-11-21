import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// API_URL bisa diganti (dipakai tes E2E yang menjalankan backend di port terpisah).
const apiUrl = process.env.API_URL || 'http://localhost:3001';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': apiUrl,
      '/uploads': apiUrl
    }
  }
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../static/dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/app-state': 'http://127.0.0.1:8000',
      '/snapshot': 'http://127.0.0.1:8000',
      '/send': 'http://127.0.0.1:8000',
      '/new-chat': 'http://127.0.0.1:8000',
      '/stop': 'http://127.0.0.1:8000',
      '/chat-history': 'http://127.0.0.1:8000',
      '/select-chat': 'http://127.0.0.1:8000',
      '/set-mode': 'http://127.0.0.1:8000',
      '/set-model': 'http://127.0.0.1:8000',
      '/api': 'http://127.0.0.1:8000',
    },
  },
});

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// During development the Vite server proxies /api to the Spring Boot backend, so the browser
// sees a single origin and the session + XSRF cookies work without cross-site settings.
const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8080';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: backendUrl, changeOrigin: false },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': { target: backendUrl, changeOrigin: false },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    css: false,
    restoreMocks: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/main.tsx', 'src/tests/**', 'src/**/*.d.ts'],
      reporter: ['text', 'html'],
    },
  },
});

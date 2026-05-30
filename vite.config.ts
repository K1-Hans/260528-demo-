import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Local demo — served via `npm run dev` / `npm run preview`. Base '/'.
export default defineConfig({
  plugins: [react()],
  server: { port: 5180, host: true },
  preview: { port: 5180, host: true },
});

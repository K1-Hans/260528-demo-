import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// AI 质检中台 demo — 纯前端 mock，`npm run dev` / `npm run preview`。Base '/'。
export default defineConfig({
  plugins: [react()],
  server: { port: 5182, host: true },
  preview: { port: 5182, host: true },
});

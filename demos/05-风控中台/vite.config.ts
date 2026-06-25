import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// AI 风控中台 demo — 纯前端 mock，`npm run dev` / `npm run preview`。Base '/'。
export default defineConfig({
  plugins: [react()],
  server: { port: 5185, host: true },
  preview: { port: 5185, host: true },
});

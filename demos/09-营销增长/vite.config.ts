import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// AI 营销增长中台 demo — 纯前端 mock，`npm run dev` / `npm run preview`。Base '/'。
export default defineConfig({
  plugins: [react()],
  server: { port: 5189, host: true },
  preview: { port: 5189, host: true },
});

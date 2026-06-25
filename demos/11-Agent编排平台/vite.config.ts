import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// AI Agent 编排平台 demo — 纯前端 mock，`npm run dev` / `npm run preview`。Base '/'。
export default defineConfig({
  plugins: [react()],
  server: { port: 5191, host: true },
  preview: { port: 5191, host: true },
});

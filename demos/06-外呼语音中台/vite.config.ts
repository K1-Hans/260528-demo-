import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// AI 外呼/语音中台 demo — 纯前端 mock，`npm run dev` / `npm run preview`。Base '/'。
export default defineConfig({
  plugins: [react()],
  server: { port: 5186, host: true },
  preview: { port: 5186, host: true },
});

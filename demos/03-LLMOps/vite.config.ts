import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 云枢 LLMOps 运营中台 demo — 纯前端 mock，`npm run dev` / `npm run preview`。Base '/'。
export default defineConfig({
  plugins: [react()],
  server: { port: 5183, host: true },
  preview: { port: 5183, host: true },
});

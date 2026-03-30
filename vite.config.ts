import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.SERPER_API_KEY': JSON.stringify(env.SERPER_API_KEY),
        'process.env.INFOSIMPLES_API_KEY': JSON.stringify(env.INFOSIMPLES_API_KEY),
        'process.env.DATAJUD_API_KEY': JSON.stringify(env.DATAJUD_API_KEY),
        'process.env.SERPAPI_KEY': JSON.stringify(env.SERPAPI_KEY),
        'process.env.GITHUB_TOKEN': JSON.stringify(env.GITHUB_TOKEN),
        'process.env.CORESIGNAL_API_KEY': JSON.stringify(env.CORESIGNAL_API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

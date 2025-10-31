import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import string from 'vite-plugin-string';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: '', // ou './' se estiver usando subpasta

    plugins: [
      react(),
      string({
        include: ['**/*.txt'],
      }),
    ],

    define: {
      'process.env.VITE_OPENROUTER_API_KEY': JSON.stringify(env.VITE_OPENROUTER_API_KEY),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      __API_BASE__: JSON.stringify(env.VITE_API_URL || env.NEXT_PUBLIC_API_URL || ''),
    },

    optimizeDeps: {
      exclude: ['lucide-react'],
    },

    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
      extensions: ['.js', '.ts', '.jsx', '.tsx', '.json', '.txt'],
    },

    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        },
      },
    },

    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});

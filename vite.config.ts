import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import string from 'vite-plugin-string';
import { compression } from 'vite-plugin-compression2';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Só define __API_BASE__ se houver valor nas envs
  const apiBase = env.VITE_API_URL || env.NEXT_PUBLIC_API_URL || '';

  const define: Record<string, any> = {
    'process.env.VITE_OPENROUTER_API_KEY': JSON.stringify(env.VITE_OPENROUTER_API_KEY),
    'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL),
    'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
  };

  if (apiBase) {
    define.__API_BASE__ = JSON.stringify(apiBase);
  }

  return {
    base: '',

    plugins: [
      react(),
      string({ include: ['**/*.txt'] }),
      // Brotli compression (better than gzip)
      compression({
        algorithm: 'brotliCompress',
        exclude: [/\.(br)$/, /\.(gz)$/],
        threshold: 10240, // Only compress files > 10KB
        deleteOriginFile: false,
        compressionOptions: {
          level: 11 // Maximum compression
        }
      }),
      // Gzip compression (fallback for old browsers)
      compression({
        algorithm: 'gzip',
        exclude: [/\.(br)$/, /\.(gz)$/],
        threshold: 10240,
        deleteOriginFile: false,
      }),
    ],

    define,

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
          target: apiBase || 'https://ecobackend888.onrender.com',
          changeOrigin: true,
          secure: false, // Mudado para false para aceitar certificados SSL remotos
          rewrite: (path) => path,
          configure: (proxy, _options) => {
            proxy.on('error', (err, _req, _res) => {
              console.log('proxy error', err);
            });
            proxy.on('proxyReq', (proxyReq, req, _res) => {
              console.log('Sending Request to the Target:', req.method, req.url);
            });
            proxy.on('proxyRes', (proxyRes, req, _res) => {
              console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
            });
          },
        },
        '/health': {
          target: apiBase || 'https://ecobackend888.onrender.com',
          changeOrigin: true,
          secure: false,
        },
      },
    },

    build: {
      outDir: 'dist',
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            // Separate vendor chunks for better caching
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'nivo-charts': ['@nivo/bar', '@nivo/line', '@nivo/core'],
            'framer-motion': ['framer-motion'],
            'supabase': ['@supabase/supabase-js'],
            'date-utils': ['date-fns'],
          },
        },
      },
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 600,
    },
  };
});

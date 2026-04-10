import { defineConfig, loadEnv, type PluginOption } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import string from 'vite-plugin-string';
import { compression } from 'vite-plugin-compression2';

export default defineConfig(async ({ mode }) => {
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

  // 🚀 BUNDLE ANALYZER: Ativo apenas em modo analyze
  const isAnalyze = mode === 'analyze';

  // 🚀 BUNDLE ANALYZER: Import dinâmico apenas se necessário
  let analyzerPlugin: PluginOption[] = [];
  if (isAnalyze) {
    try {
      const { visualizer } = await import('rollup-plugin-visualizer');
      analyzerPlugin = [
        visualizer({
          open: true, // Abre automaticamente no browser
          filename: 'dist/stats.html', // Onde salvar o report
          gzipSize: true, // Mostra tamanho gzipped
          brotliSize: true, // Mostra tamanho brotli
          template: 'treemap', // Tipo de visualização (treemap, sunburst, network)
          title: 'Ecotopia Bundle Analysis', // Título do report
        }),
      ];
    } catch (err) {
      console.warn('⚠️ rollup-plugin-visualizer não instalado.');
      console.warn('💡 Rode: npm install -D rollup-plugin-visualizer');
    }
  }

  return {
    base: '/',

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
      // 🚀 BUNDLE ANALYZER: Adiciona plugin se modo analyze
      ...analyzerPlugin,
    ],

    define,

    // 🚀 PERFORMANCE: Otimizar deps para melhor build
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'framer-motion',
        '@supabase/supabase-js',
        'mixpanel-browser',
      ],
      exclude: ['lucide-react'], // Tree-shaking automático
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

      // 🚀 PERFORMANCE: Minificação com esbuild (mais rápido que terser!)
      minify: 'esbuild',

      // Remove console.logs em produção via esbuild
      esbuild: {
        drop: ['console', 'debugger'], // Remove console.* e debugger
      },

      rollupOptions: {
        output: {
          manualChunks: {
            // 🚀 PERFORMANCE: Chunks otimizados para caching
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'framer-motion': ['framer-motion'],
            'supabase': ['@supabase/supabase-js'],

            // 🆕 OPTIMIZATION #6: Index chunk splitting
            'recharts': ['recharts'], // Charts library (~378 KB) - Used in Memory pages
            'analytics': ['mixpanel-browser'], // Analytics (~50-80 KB)
            'http-client': ['axios'], // HTTP client (~100 KB)

            'date-utils': ['date-fns'],

            // Lazy loaded chunks (só carregam quando necessário)
            'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
            // ✅ MARKDOWN LAZY: Lazy loaded via LazyMarkdownRenderer (economia: -117 KB / -36 KB gzip)
            'markdown': ['react-markdown'],
            'audio': ['wavesurfer.js', '@wavesurfer/react'],
            'icons': ['lucide-react', 'react-icons'],
          },
        },
      },

      // 🚀 PERFORMANCE: Chunks menores para melhor caching
      chunkSizeWarningLimit: 400,
    },
  };
});

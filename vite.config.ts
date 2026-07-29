import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {nodePolyfills} from 'vite-plugin-node-polyfills';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      nodePolyfills(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg'],
        workbox: {
          maximumFileSizeToCacheInBytes: 5000000, // 5MB
        },
        manifest: {
          name: 'Solana GOLD Dashboard',
          short_name: 'Solana GOLD',
          description: 'Solana-based MLM smart contract investment dashboard',
          theme_color: '#1a1a1a',
          background_color: '#1a1a1a',
          display: 'standalone',
          icons: [
            {
              src: 'icon.svg',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: 'icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml'
            },
            {
              src: 'icon.svg',
              sizes: '512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || ''),
      'import.meta.env.VITE_WALLETCONNECT_PROJECT_ID': JSON.stringify(
        process.env.VITE_WALLETCONNECT_PROJECT_ID ||
        process.env.WALLETCONNECT_PROJECT_ID ||
        env.VITE_WALLETCONNECT_PROJECT_ID ||
        env.WALLETCONNECT_PROJECT_ID ||
        ''
      ),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'whatwg-fetch': path.resolve(__dirname, './src/empty.ts'),
        'cross-fetch': path.resolve(__dirname, './src/fetch-mock.ts'),
      },
    },
    optimizeDeps: {
      esbuildOptions: {
        target: 'esnext'
      }
    },
    build: {
      target: 'esnext',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            mui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
            solana: ['@solana/web3.js', '@solana/wallet-adapter-base', '@solana/wallet-adapter-react', '@solana/wallet-adapter-react-ui', '@solana/wallet-adapter-wallets', '@solana/spl-token'],
            firebase: ['firebase/app', 'firebase/database'],
            reown: ['@reown/appkit', '@reown/appkit-adapter-solana']
          }
        }
      }
    }
  };
});

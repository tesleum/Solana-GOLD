import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(),
      nodePolyfills(),
    ],
    define: {
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
        target: 'esnext',
      },
    },
    build: {
      target: 'esnext',
      sourcemap: false,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            mui: ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
            solana: ['@solana/web3.js', '@solana/wallet-adapter-base', '@solana/wallet-adapter-react', '@solana/wallet-adapter-react-ui', '@solana/wallet-adapter-wallets', '@solana/spl-token'],
            firebase: ['firebase/app', 'firebase/database'],
            reown: ['@reown/appkit', '@reown/appkit-adapter-solana'],
          },
        },
      },
    },
  };
});

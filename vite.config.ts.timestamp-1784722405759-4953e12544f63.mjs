// vite.config.ts
import react from "file:///app/applet/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
import { defineConfig, loadEnv } from "file:///app/applet/node_modules/vite/dist/node/index.js";
import { nodePolyfills } from "file:///app/applet/node_modules/vite-plugin-node-polyfills/dist/index.js";
import { VitePWA } from "file:///app/applet/node_modules/vite-plugin-pwa/dist/index.js";
var __vite_injected_original_dirname = "/app/applet";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    plugins: [
      react(),
      nodePolyfills(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["icon.svg"],
        workbox: {
          maximumFileSizeToCacheInBytes: 5e6
          // 5MB
        },
        manifest: {
          name: "Solana GOLD Dashboard",
          short_name: "Solana GOLD",
          description: "Solana-based MLM smart contract investment dashboard",
          theme_color: "#1a1a1a",
          background_color: "#1a1a1a",
          display: "standalone",
          icons: [
            {
              src: "icon.svg",
              sizes: "192x192",
              type: "image/svg+xml"
            },
            {
              src: "icon.svg",
              sizes: "512x512",
              type: "image/svg+xml"
            },
            {
              src: "icon.svg",
              sizes: "512x512",
              type: "image/svg+xml",
              purpose: "any maskable"
            }
          ]
        }
      })
    ],
    define: {
      "process.env.GEMINI_API_KEY": JSON.stringify(process.env.GEMINI_API_KEY || env.GEMINI_API_KEY || ""),
      "import.meta.env.VITE_WALLETCONNECT_PROJECT_ID": JSON.stringify(
        process.env.VITE_WALLETCONNECT_PROJECT_ID || process.env.WALLETCONNECT_PROJECT_ID || env.VITE_WALLETCONNECT_PROJECT_ID || env.WALLETCONNECT_PROJECT_ID || ""
      )
    },
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src"),
        "whatwg-fetch": path.resolve(__vite_injected_original_dirname, "./src/empty.ts"),
        "cross-fetch": path.resolve(__vite_injected_original_dirname, "./src/fetch-mock.ts")
      }
    },
    optimizeDeps: {
      esbuildOptions: {
        target: "esnext"
      }
    },
    build: {
      target: "esnext",
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "react-router-dom"],
            mui: ["@mui/material", "@mui/icons-material", "@emotion/react", "@emotion/styled"],
            solana: ["@solana/web3.js", "@solana/wallet-adapter-base", "@solana/wallet-adapter-react", "@solana/wallet-adapter-react-ui", "@solana/wallet-adapter-wallets", "@solana/spl-token"],
            firebase: ["firebase/app", "firebase/database"],
            reown: ["@reown/appkit", "@reown/appkit-adapter-solana"]
          }
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvYXBwL2FwcGxldFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL2FwcC9hcHBsZXQvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL2FwcC9hcHBsZXQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQge2RlZmluZUNvbmZpZywgbG9hZEVudn0gZnJvbSAndml0ZSc7XG5pbXBvcnQge25vZGVQb2x5ZmlsbHN9IGZyb20gJ3ZpdGUtcGx1Z2luLW5vZGUtcG9seWZpbGxzJztcbmltcG9ydCB7IFZpdGVQV0EgfSBmcm9tICd2aXRlLXBsdWdpbi1wd2EnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHttb2RlfSkgPT4ge1xuICBjb25zdCBlbnYgPSBsb2FkRW52KG1vZGUsICcuJywgJycpO1xuICByZXR1cm4ge1xuICAgIHBsdWdpbnM6IFtcbiAgICAgIHJlYWN0KCksIFxuICAgICAgbm9kZVBvbHlmaWxscygpLFxuICAgICAgVml0ZVBXQSh7XG4gICAgICAgIHJlZ2lzdGVyVHlwZTogJ2F1dG9VcGRhdGUnLFxuICAgICAgICBpbmNsdWRlQXNzZXRzOiBbJ2ljb24uc3ZnJ10sXG4gICAgICAgIHdvcmtib3g6IHtcbiAgICAgICAgICBtYXhpbXVtRmlsZVNpemVUb0NhY2hlSW5CeXRlczogNTAwMDAwMCwgLy8gNU1CXG4gICAgICAgIH0sXG4gICAgICAgIG1hbmlmZXN0OiB7XG4gICAgICAgICAgbmFtZTogJ1NvbGFuYSBHT0xEIERhc2hib2FyZCcsXG4gICAgICAgICAgc2hvcnRfbmFtZTogJ1NvbGFuYSBHT0xEJyxcbiAgICAgICAgICBkZXNjcmlwdGlvbjogJ1NvbGFuYS1iYXNlZCBNTE0gc21hcnQgY29udHJhY3QgaW52ZXN0bWVudCBkYXNoYm9hcmQnLFxuICAgICAgICAgIHRoZW1lX2NvbG9yOiAnIzFhMWExYScsXG4gICAgICAgICAgYmFja2dyb3VuZF9jb2xvcjogJyMxYTFhMWEnLFxuICAgICAgICAgIGRpc3BsYXk6ICdzdGFuZGFsb25lJyxcbiAgICAgICAgICBpY29uczogW1xuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBzcmM6ICdpY29uLnN2ZycsXG4gICAgICAgICAgICAgIHNpemVzOiAnMTkyeDE5MicsXG4gICAgICAgICAgICAgIHR5cGU6ICdpbWFnZS9zdmcreG1sJ1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHtcbiAgICAgICAgICAgICAgc3JjOiAnaWNvbi5zdmcnLFxuICAgICAgICAgICAgICBzaXplczogJzUxMng1MTInLFxuICAgICAgICAgICAgICB0eXBlOiAnaW1hZ2Uvc3ZnK3htbCdcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIHNyYzogJ2ljb24uc3ZnJyxcbiAgICAgICAgICAgICAgc2l6ZXM6ICc1MTJ4NTEyJyxcbiAgICAgICAgICAgICAgdHlwZTogJ2ltYWdlL3N2Zyt4bWwnLFxuICAgICAgICAgICAgICBwdXJwb3NlOiAnYW55IG1hc2thYmxlJ1xuICAgICAgICAgICAgfVxuICAgICAgICAgIF1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICBdLFxuICAgIGRlZmluZToge1xuICAgICAgJ3Byb2Nlc3MuZW52LkdFTUlOSV9BUElfS0VZJzogSlNPTi5zdHJpbmdpZnkocHJvY2Vzcy5lbnYuR0VNSU5JX0FQSV9LRVkgfHwgZW52LkdFTUlOSV9BUElfS0VZIHx8ICcnKSxcbiAgICAgICdpbXBvcnQubWV0YS5lbnYuVklURV9XQUxMRVRDT05ORUNUX1BST0pFQ1RfSUQnOiBKU09OLnN0cmluZ2lmeShcbiAgICAgICAgcHJvY2Vzcy5lbnYuVklURV9XQUxMRVRDT05ORUNUX1BST0pFQ1RfSUQgfHxcbiAgICAgICAgcHJvY2Vzcy5lbnYuV0FMTEVUQ09OTkVDVF9QUk9KRUNUX0lEIHx8XG4gICAgICAgIGVudi5WSVRFX1dBTExFVENPTk5FQ1RfUFJPSkVDVF9JRCB8fFxuICAgICAgICBlbnYuV0FMTEVUQ09OTkVDVF9QUk9KRUNUX0lEIHx8XG4gICAgICAgICcnXG4gICAgICApLFxuICAgIH0sXG4gICAgcmVzb2x2ZToge1xuICAgICAgYWxpYXM6IHtcbiAgICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICAgICAgJ3doYXR3Zy1mZXRjaCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYy9lbXB0eS50cycpLFxuICAgICAgICAnY3Jvc3MtZmV0Y2gnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMvZmV0Y2gtbW9jay50cycpLFxuICAgICAgfSxcbiAgICB9LFxuICAgIG9wdGltaXplRGVwczoge1xuICAgICAgZXNidWlsZE9wdGlvbnM6IHtcbiAgICAgICAgdGFyZ2V0OiAnZXNuZXh0J1xuICAgICAgfVxuICAgIH0sXG4gICAgYnVpbGQ6IHtcbiAgICAgIHRhcmdldDogJ2VzbmV4dCcsXG4gICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgIG91dHB1dDoge1xuICAgICAgICAgIG1hbnVhbENodW5rczoge1xuICAgICAgICAgICAgdmVuZG9yOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICdyZWFjdC1yb3V0ZXItZG9tJ10sXG4gICAgICAgICAgICBtdWk6IFsnQG11aS9tYXRlcmlhbCcsICdAbXVpL2ljb25zLW1hdGVyaWFsJywgJ0BlbW90aW9uL3JlYWN0JywgJ0BlbW90aW9uL3N0eWxlZCddLFxuICAgICAgICAgICAgc29sYW5hOiBbJ0Bzb2xhbmEvd2ViMy5qcycsICdAc29sYW5hL3dhbGxldC1hZGFwdGVyLWJhc2UnLCAnQHNvbGFuYS93YWxsZXQtYWRhcHRlci1yZWFjdCcsICdAc29sYW5hL3dhbGxldC1hZGFwdGVyLXJlYWN0LXVpJywgJ0Bzb2xhbmEvd2FsbGV0LWFkYXB0ZXItd2FsbGV0cycsICdAc29sYW5hL3NwbC10b2tlbiddLFxuICAgICAgICAgICAgZmlyZWJhc2U6IFsnZmlyZWJhc2UvYXBwJywgJ2ZpcmViYXNlL2RhdGFiYXNlJ10sXG4gICAgICAgICAgICByZW93bjogWydAcmVvd24vYXBwa2l0JywgJ0ByZW93bi9hcHBraXQtYWRhcHRlci1zb2xhbmEnXVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfTtcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFtTixPQUFPLFdBQVc7QUFDck8sT0FBTyxVQUFVO0FBQ2pCLFNBQVEsY0FBYyxlQUFjO0FBQ3BDLFNBQVEscUJBQW9CO0FBQzVCLFNBQVMsZUFBZTtBQUp4QixJQUFNLG1DQUFtQztBQU16QyxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFDLEtBQUksTUFBTTtBQUN0QyxRQUFNLE1BQU0sUUFBUSxNQUFNLEtBQUssRUFBRTtBQUNqQyxTQUFPO0FBQUEsSUFDTCxTQUFTO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTixjQUFjO0FBQUEsTUFDZCxRQUFRO0FBQUEsUUFDTixjQUFjO0FBQUEsUUFDZCxlQUFlLENBQUMsVUFBVTtBQUFBLFFBQzFCLFNBQVM7QUFBQSxVQUNQLCtCQUErQjtBQUFBO0FBQUEsUUFDakM7QUFBQSxRQUNBLFVBQVU7QUFBQSxVQUNSLE1BQU07QUFBQSxVQUNOLFlBQVk7QUFBQSxVQUNaLGFBQWE7QUFBQSxVQUNiLGFBQWE7QUFBQSxVQUNiLGtCQUFrQjtBQUFBLFVBQ2xCLFNBQVM7QUFBQSxVQUNULE9BQU87QUFBQSxZQUNMO0FBQUEsY0FDRSxLQUFLO0FBQUEsY0FDTCxPQUFPO0FBQUEsY0FDUCxNQUFNO0FBQUEsWUFDUjtBQUFBLFlBQ0E7QUFBQSxjQUNFLEtBQUs7QUFBQSxjQUNMLE9BQU87QUFBQSxjQUNQLE1BQU07QUFBQSxZQUNSO0FBQUEsWUFDQTtBQUFBLGNBQ0UsS0FBSztBQUFBLGNBQ0wsT0FBTztBQUFBLGNBQ1AsTUFBTTtBQUFBLGNBQ04sU0FBUztBQUFBLFlBQ1g7QUFBQSxVQUNGO0FBQUEsUUFDRjtBQUFBLE1BQ0YsQ0FBQztBQUFBLElBQ0g7QUFBQSxJQUNBLFFBQVE7QUFBQSxNQUNOLDhCQUE4QixLQUFLLFVBQVUsUUFBUSxJQUFJLGtCQUFrQixJQUFJLGtCQUFrQixFQUFFO0FBQUEsTUFDbkcsaURBQWlELEtBQUs7QUFBQSxRQUNwRCxRQUFRLElBQUksaUNBQ1osUUFBUSxJQUFJLDRCQUNaLElBQUksaUNBQ0osSUFBSSw0QkFDSjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxTQUFTO0FBQUEsTUFDUCxPQUFPO0FBQUEsUUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsUUFDcEMsZ0JBQWdCLEtBQUssUUFBUSxrQ0FBVyxnQkFBZ0I7QUFBQSxRQUN4RCxlQUFlLEtBQUssUUFBUSxrQ0FBVyxxQkFBcUI7QUFBQSxNQUM5RDtBQUFBLElBQ0Y7QUFBQSxJQUNBLGNBQWM7QUFBQSxNQUNaLGdCQUFnQjtBQUFBLFFBQ2QsUUFBUTtBQUFBLE1BQ1Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxPQUFPO0FBQUEsTUFDTCxRQUFRO0FBQUEsTUFDUixlQUFlO0FBQUEsUUFDYixRQUFRO0FBQUEsVUFDTixjQUFjO0FBQUEsWUFDWixRQUFRLENBQUMsU0FBUyxhQUFhLGtCQUFrQjtBQUFBLFlBQ2pELEtBQUssQ0FBQyxpQkFBaUIsdUJBQXVCLGtCQUFrQixpQkFBaUI7QUFBQSxZQUNqRixRQUFRLENBQUMsbUJBQW1CLCtCQUErQixnQ0FBZ0MsbUNBQW1DLGtDQUFrQyxtQkFBbUI7QUFBQSxZQUNuTCxVQUFVLENBQUMsZ0JBQWdCLG1CQUFtQjtBQUFBLFlBQzlDLE9BQU8sQ0FBQyxpQkFBaUIsOEJBQThCO0FBQUEsVUFDekQ7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K

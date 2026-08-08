import { createAppKit } from '@reown/appkit/react';
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react';
import { solana, solanaTestnet, solanaDevnet } from '@reown/appkit/networks';
import { PhantomWalletAdapter, SolflareWalletAdapter, SafePalWalletAdapter, TrustWalletAdapter } from '@solana/wallet-adapter-wallets';

// Set up Solana Adapter
const solanaWeb3JsAdapter = new SolanaAdapter({
  wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter(), new SafePalWalletAdapter(), new TrustWalletAdapter()]
});

export const projectId = (() => {
  const envId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID;
  if (envId && envId !== 'undefined' && envId !== 'null' && envId !== '') {
    return envId;
  }
  return '1de4bfbf68bf6d5b0606dcf1f618a8b1';
})();

export const isSampleProjectId = projectId === '1de4bfbf68bf6d5b0606dcf1f618a8b1';
export const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

if (isSampleProjectId && !isLocalhost) {
  console.warn(
    '⚠️ SOLANA GOLD WARNING: You are running in production with the default/sample WalletConnect Project ID. ' +
    'WalletConnect connections will fail on non-localhost domains. ' +
    'Please register a free Project ID at https://cloud.reown.com and set the VITE_WALLETCONNECT_PROJECT_ID ' +
    'or WALLETCONNECT_PROJECT_ID environment variable in Railway.'
  );
}

const metadata = {
  name: 'Solana Gold',
  description: 'Solana Gold Mining & Rewards',
  url: window.location.origin, 
  icons: ['https://www.svgrepo.com/show/268816/coin-gold.svg']
};

export const appKit = createAppKit({
  adapters: [solanaWeb3JsAdapter],
  networks: [solana, solanaDevnet, solanaTestnet],
  metadata: metadata,
  projectId,
  features: {
    analytics: true,
    email: false,
    socials: false,
  },
  featuredWalletIds: [
    'a7972cf5b883e409728472472472472472472472472472472472472472472472', // Phantom
    '1ca0bdd4747578705b1939af023d120677c64fe6ca76add81fda36e350605e79', // Solflare
    '4622a43cf3b596ac65a1d011c3a64f114f16444724a02c58eb9975b3b3b3eafc', // Trust Wallet
    'c57ca0a7e4ee511c980279dfc8413a6164f1ac350e224a317109026aeb46d187', // MetaMask
    '9e172a5a2283a0ad402923e4c27806f6e5223e7a022b7c6246419087c2b3e83b', // SafePal
  ]
});

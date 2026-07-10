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
    analytics: true
  }
});

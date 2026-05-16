import { createAppKit } from '@reown/appkit/react';
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react';
import { solana, solanaTestnet, solanaDevnet } from '@reown/appkit/networks';
import { PhantomWalletAdapter, SolflareWalletAdapter, SafePalWalletAdapter, TrustWalletAdapter } from '@solana/wallet-adapter-wallets';

// Set up Solana Adapter
const solanaWeb3JsAdapter = new SolanaAdapter({
  wallets: [new PhantomWalletAdapter(), new SolflareWalletAdapter(), new SafePalWalletAdapter(), new TrustWalletAdapter()]
});

export const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '1de4bfbf68bf6d5b0606dcf1f618a8b1';

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

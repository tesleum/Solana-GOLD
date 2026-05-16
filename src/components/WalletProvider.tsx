import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { PhantomWalletAdapter, SolflareWalletAdapter, SafePalWalletAdapter, TrustWalletAdapter, WalletConnectWalletAdapter } from '@solana/wallet-adapter-wallets';
import { SolanaMobileWalletAdapter, createDefaultAddressSelector, createDefaultAuthorizationResultCache, createDefaultWalletNotFoundHandler } from '@solana-mobile/wallet-adapter-mobile';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';

export function AppWalletProvider({ children }: { children: React.ReactNode }) {
    const network = WalletAdapterNetwork.Mainnet;
    const tatumApiKey = import.meta.env.VITE_TATUM_API_KEY;
    const providedRpc = import.meta.env.VITE_RPC_URL;
    
    const endpoint = useMemo(() => {
        if (tatumApiKey) {
            return `https://solana-mainnet.gateway.tatum.io/?apikey=${tatumApiKey}`;
        }
        if (providedRpc && providedRpc !== '28be1705fb1ae9e78fad0951ca4287fed1af417aa227bfd3828594ddc9845c58') {
            if (providedRpc.startsWith('http')) return providedRpc;
            // The providedRPC might be an Alchemy or Helius key, let's just use mainnet if we don't know
            return `https://api.mainnet-beta.solana.com`;
        }
        return 'https://api.mainnet-beta.solana.com';
    }, [tatumApiKey, providedRpc]);

    const wsEndpoint = useMemo(() => {
        if (endpoint.startsWith('https://')) {
            return endpoint.replace('https://', 'wss://');
        }
        if (endpoint.startsWith('http://')) {
            return endpoint.replace('http://', 'ws://');
        }
        return undefined;
    }, [endpoint]);
    
    // Config for caching and reliability using modern websocket cache approach
    const connectionConfig = useMemo(() => {
        const config: any = {
            commitment: 'confirmed',
            disableRetryOnRateLimit: false,
        };
        
        if (wsEndpoint) {
            config.wsEndpoint = wsEndpoint;
        }
        
        return config;
    }, [wsEndpoint]);

    const wallets = useMemo(() => [
        new SolanaMobileWalletAdapter({
            addressSelector: createDefaultAddressSelector(),
            appIdentity: {
                name: 'Solana Gold',
                uri: window.location.origin,
                icon: 'https://www.svgrepo.com/show/268816/coin-gold.svg',
            },
            authorizationResultCache: createDefaultAuthorizationResultCache(),
            cluster: network,
            onWalletNotFound: createDefaultWalletNotFoundHandler(),
        }),
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter(),
        new SafePalWalletAdapter(),
        new TrustWalletAdapter(),
    ], [network]);

    return (
        <ConnectionProvider endpoint={endpoint} config={connectionConfig}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    {children}
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
}

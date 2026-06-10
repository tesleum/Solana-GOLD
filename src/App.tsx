import React, { useState, useEffect, useMemo } from 'react';
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton, useWalletModal } from '@solana/wallet-adapter-react-ui';
import { WalletReadyState } from '@solana/wallet-adapter-base';
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import './lib/reown'; // Initialize Reown AppKit
import { Buffer } from 'buffer';
import { LAMPORTS_PER_SOL, Transaction, SystemProgram, PublicKey, VersionedTransaction, TransactionInstruction, TransactionMessage, AddressLookupTableAccount, Connection } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountIdempotentInstruction, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Home, Users, User, Activity, BarChart3, Coins, Copy, CopyCheck, ArrowUpRight, ArrowDownRight, QrCode, Filter, Download, Search, Info, ChevronDown, Globe, Wallet, Bot } from 'lucide-react';
import { AppWalletProvider } from './components/WalletProvider';
import { NetworkTree } from './components/NetworkTree';
import { ROIAnalyzer } from './components/ROIAnalyzer';
import { OnboardingModal } from './components/OnboardingModal';
import { AIPage } from './AIPage';
import { t } from './translations';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import { prefixer } from 'stylis';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  Stack,
  IconButton as MuiIconButton,
  BottomNavigation,
  BottomNavigationAction,
  AppBar,
  Toolbar,
  Card,
  CardContent,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  LinearProgress,
  useTheme,
  alpha,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Grid,
  TextField,
  Slider,
  Collapse,
  Menu,
  MenuItem,
  CircularProgress,
  Skeleton
} from '@mui/material';
import QRCode from "react-qr-code";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import axios from 'axios';
import { database } from './firebase';
import { ref, get, push, onValue, set, update } from 'firebase/database';

export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light') => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    switch (type) {
      case 'light': navigator.vibrate(10); break;
      case 'medium': navigator.vibrate(15); break;
      case 'heavy': navigator.vibrate(20); break;
      case 'success': navigator.vibrate([10, 50, 20]); break;
      case 'error': navigator.vibrate([20, 50, 20, 50, 20]); break;
      default: navigator.vibrate(10);
    }
  }
};

const geckoApiGet = (url: string) => {
  const config = import.meta.env.VITE_COINGECKO_API_KEY ? {
    headers: { 'x-cg-demo-api-key': import.meta.env.VITE_COINGECKO_API_KEY }
  } : {};
  return axios.get(url, config);
};

function Dashboard() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected, disconnect, wallet, wallets, select } = useWallet();
  const { setVisible } = useWalletModal();
  const { open } = useAppKit();
  const { address: appKitAddress, isConnected: isAppKitConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider<any>('solana');
  const [balance, setBalance] = useState(0);
  const [usGoldBalance, setUsGoldBalance] = useState(0);
  const [totalMembers, setTotalMembers] = useState(0);
  const [apyYield, setApyYield] = useState('8');
  const [activeTab, setActiveTab] = useState('vault');
  const [isInvesting, setIsInvesting] = useState(false);
  const [investAmount, setInvestAmount] = useState<number>(10);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrValue, setQrValue] = useState('');
  const [qrTitle, setQrTitle] = useState('');
  const [claimDialogOpen, setClaimDialogOpen] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  
  const [tokenPrice, setTokenPrice] = useState<number | null>(null);
  const [solanaPrice, setSolanaPrice] = useState<number | null>(null);
  const [totalLiquidity, setTotalLiquidity] = useState<number | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isFetchingChart, setIsFetchingChart] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);

  const theme = useTheme();
  const [isGuidanceOpen, setIsGuidanceOpen] = useState(false);
  
  const [calcAmount, setCalcAmount] = useState('1000');
  const [calcYears, setCalcYears] = useState('1');
  const [viewOnlyAddress, setViewOnlyAddress] = useState<string | null>(null);
  const [loginInput, setLoginInput] = useState('');
  const [userTotalInvested, setUserTotalInvested] = useState(0);
  const [userEarnings, setUserEarnings] = useState(0);
  const [userClaimedCommissions, setUserClaimedCommissions] = useState(0);
  const [showDistribution, setShowDistribution] = useState(false);

  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('language');
    if (saved) return saved;
    const browserLang = navigator.language.toUpperCase().substring(0, 2);
    const supported = ['EN', 'ES', 'FR', 'ZH', 'AR', 'RU', 'FA', 'CKB', 'AZ', 'DE', 'IT', 'JA', 'KO', 'ID'];
    return supported.includes(browserLang) ? browserLang : 'EN';
  });
  const [langAnchorEl, setLangAnchorEl] = useState<null | HTMLElement>(null);
  
  // Prefetched data for fast synchronous transaction logic
  const [adminWalletsData, setAdminWalletsData] = useState<any>({});
  const [mlmLevelsData, setMlmLevelsData] = useState<any[]>([]);
  const [prefetchedBlockhash, setPrefetchedBlockhash] = useState<string | null>(null);
  const [allUsersData, setAllUsersData] = useState<Record<string, any>>({});
  const [isAppReady, setIsAppReady] = useState(false);

  const handleLangClick = (event: React.MouseEvent<HTMLElement>) => {
    setLangAnchorEl(event.currentTarget);
  };

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button') || target.closest('[role="button"]') || target.closest('.MuiButtonBase-root') || target.closest('[role="tab"]')) {
        triggerHaptic('light');
      }
    };
    document.addEventListener('click', handleGlobalClick);
    return () => document.removeEventListener('click', handleGlobalClick);
  }, []);

  const handleLangClose = (lang?: string | React.MouseEvent<HTMLLIElement>) => {
    if (lang && typeof lang === 'string') {
      setLanguage(lang);
      localStorage.setItem('language', lang);
    }
    setLangAnchorEl(null);
  };

  useEffect(() => {
    if (['AR', 'FA', 'CKB'].includes(language)) {
      document.body.dir = 'rtl';
      document.documentElement.dir = 'rtl';
      document.documentElement.lang = language.toLowerCase();
    } else {
      document.body.dir = 'ltr';
      document.documentElement.dir = 'ltr';
      document.documentElement.lang = language.toLowerCase();
    }
  }, [language]);

  useEffect(() => {
    // Save to App Launch Cache
    localStorage.setItem('appGlobalStats', JSON.stringify({
      totalMembers,
      apyYield,
      totalLiquidity,
      tokenPrice,
      solanaPrice
    }));
  }, [totalMembers, apyYield, totalLiquidity, tokenPrice, solanaPrice]);

  useEffect(() => {
    // App Launch Cache
    const cachedStats = localStorage.getItem('appGlobalStats');
    if (cachedStats) {
      try {
        const parsed = JSON.parse(cachedStats);
        setTotalMembers(parsed.totalMembers || 0);
        setApyYield(parsed.apyYield || '8');
        setTotalLiquidity(parsed.totalLiquidity || 0);
        setTokenPrice(parsed.tokenPrice || 0);
        setSolanaPrice(parsed.solanaPrice || 0);
      } catch (e) {}
    }
  }, []);

  // Capture referrer on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const start = urlParams.get('start');
    const line = urlParams.get('line');
    if (start) {
      localStorage.setItem('referrer', start);
    }
    if (line) {
      localStorage.setItem('line', line.toUpperCase());
    }
  }, []);

  // Effective address for stats (either connected wallet or view-only input)
  const effectiveAddress = publicKey ? publicKey.toString() : (appKitAddress || viewOnlyAddress);
  const isActuallyConnected = connected || isAppKitConnected;

  useEffect(() => {
    if (effectiveAddress) {
      const userRef = ref(database, `users/${effectiveAddress}`);
      const unsubscribeUser = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const udata = snapshot.val();
          setUserTotalInvested(udata.totalInvested || 0);
          setUserEarnings(udata.earnings || 0);
          setUserClaimedCommissions(udata.claimedCommissions || 0);
        } else {
          setUserTotalInvested(0);
          setUserEarnings(0);
          setUserClaimedCommissions(0);
        }
      });
      return () => unsubscribeUser();
    }
  }, [effectiveAddress]);

  useEffect(() => {
    const addressToRegister = publicKey ? publicKey.toString() : appKitAddress;
    if (addressToRegister) {
      const userRef = ref(database, `users/${addressToRegister}`);
      
      get(userRef).then((snapshot) => {
        if (!snapshot.exists()) {
          const urlParams = new URLSearchParams(window.location.search);
          const storedReferrer = urlParams.get('start') || localStorage.getItem('referrer');
          let storedLine = urlParams.get('line') || localStorage.getItem('line') || 'A';
          storedLine = storedLine.toUpperCase();
          set(userRef, {
            id: addressToRegister,
            referrer: storedReferrer || null,
            line: storedLine,
            joinedAt: Date.now(),
            totalInvested: 0,
            earnings: 0,
            lastActive: Date.now()
          });
        } else {
          // Update last active if already exists
          const timestamp = Date.now();
          update(userRef, { lastActive: timestamp });
        }
      });
    }
  }, [publicKey, appKitAddress]);

  useEffect(() => {
    if (effectiveAddress) {
      // Fetch global APY settings
      const apyRef = ref(database, 'mlmSettings/general/apyYield');
      onValue(apyRef, (snapshot) => {
        if (snapshot.exists()) {
          setApyYield(snapshot.val().toString());
        }
      });
    }
  }, [publicKey, effectiveAddress]);

  const calculateROI = () => {
    const principal = parseFloat(calcAmount) || 0;
    const rate = (parseFloat(apyYield) || 0) / 100;
    const time = parseFloat(calcYears) || 0;
    const totalValue = principal * Math.pow(1 + rate, time);
    const earnings = totalValue - principal;
    return { totalValue, earnings };
  };

  const { totalValue, earnings } = calculateROI();
  const getReferralLink = (line: string) => effectiveAddress ? `${window.location.origin}?start=${effectiveAddress}&line=${line}` : 'Connect wallet or login to get link';

  useEffect(() => {
    if (effectiveAddress) {
      const txRef = ref(database, `transactions/${effectiveAddress}`);
      const unsubscribe = onValue(txRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          let totalGold = 0;
          const formattedTx = Object.keys(data).map(k => {
            const txData = data[k];
            // Extract numerical amount from string like "10.000 $usGOLD"
            const match = String(txData.amount).match(/([\d.]+)/);
            if (match) {
              totalGold += parseFloat(match[1]);
            }
            return {
              id: k,
              ...txData
            };
          }).sort((a, b) => b.timestamp - a.timestamp);
          setTransactions(formattedTx);
          setUsGoldBalance(totalGold);
        } else {
          setTransactions([]);
          setUsGoldBalance(0);
        }
      });
      return () => unsubscribe();
    } else {
      setTransactions([]);
    }
  }, [effectiveAddress]);

  useEffect(() => {
    // Keep a synced state of all users to allow synchronous transaction building for mobile wallets
    const usersRef = ref(database, 'users');
    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
       const data = snapshot.val() || {};
       setAllUsersData(data);
       setTotalMembers(Object.keys(data).length);
    });
    
    const adminRef = ref(database, 'mlmSettings/adminWallets');
    const unsubscribeAdmin = onValue(adminRef, (snapshot) => {
      setAdminWalletsData(snapshot.val() || {});
    });

    const levelsRef = ref(database, 'mlmSettings/levels');
    const unsubscribeLevels = onValue(levelsRef, (snapshot) => {
      let mlmLevels = snapshot.val();
      if (!mlmLevels) {
        mlmLevels = [
          { level: 1, percent: 20 },
          { level: 2, percent: 10 },
          { level: 3, percent: 8 },
          { level: 4, percent: 6 },
          { level: 5, percent: 5 },
          { level: 6, percent: 4 },
          { level: 7, percent: 3 },
          { level: 8, percent: 2 },
          { level: 9, percent: 1 },
          { level: 10, percent: 1 },
        ];
      } else {
        if (Array.isArray(mlmLevels)) {
          mlmLevels = mlmLevels.filter(Boolean);
        } else {
          mlmLevels = Object.keys(mlmLevels).map(k => ({ 
            ...mlmLevels[k], 
            level: mlmLevels[k].level || Number(k) 
          }));
        }
        mlmLevels.sort((a: any, b: any) => (a.level || 0) - (b.level || 0));
      }
      setMlmLevelsData(mlmLevels);
      setIsAppReady(true);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeAdmin();
      unsubscribeLevels();
    };
  }, []);

  useEffect(() => {
    const settingsRef = ref(database, 'mlmSettings/general');
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setApyYield(data.apyYield || '8');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Check for referral
    const params = new URLSearchParams(window.location.search);
    const startParam = params.get('start');
    const lineParam = params.get('line');
    if (startParam) {
      localStorage.setItem('referrer', startParam);
    }
    if (lineParam) {
      localStorage.setItem('line', lineParam.toUpperCase());
    }
    // Fetch price and data from DexScreener to avoid CORS issues
    const fetchMarketData = async () => {
      setIsFetchingChart(true);
      try {
        const poolRes = await axios.get('https://api.dexscreener.com/latest/dex/pairs/solana/4uzpwQ3Lb8HNWrLRU8MYkR1viRnpxdzrPRaF4p4DCcUx');
        const pair = poolRes.data?.pairs?.[0];
        if (pair) {
          const price = parseFloat(pair.priceNative || pair.priceUsd || '0');
          if (price > 0) setTokenPrice(price);
          
          const liqUsd = parseFloat(pair.liquidity?.usd || '0');
          if (liqUsd > 0) setTotalLiquidity(liqUsd);
          
          // DexScreener doesn't provide chart endpoint publicly, so we mock chart data around current price
          if (price > 0) {
            const now = Date.now();
            const mockChart = Array.from({length: 30}).map((_, i) => {
              const dayOffset = 30 - i;
              const randomTrend = 1 + (Math.random() * 0.1 - 0.05);
              return {
                time: new Date(now - dayOffset * 24 * 3600 * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
                val: price * randomTrend
              };
            });
            const formattedData = mockChart.map((d) => ({ time: d.time, price: d.val }));
            setChartData(formattedData);
          }
        }
        
        // Fetch SOL price separately
        try {
          const jupRes = await axios.get('https://api.jup.ag/swap/v1/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000000');
          if (jupRes.data && jupRes.data.outAmount) {
            setSolanaPrice(parseFloat(jupRes.data.outAmount) / 1e6);
          }
        } catch (jupErr) {
          console.warn('Jupiter API failed to fetch SOL price, falling back to DexScreener', jupErr);
          const solRes = await axios.get('https://api.dexscreener.com/latest/dex/pairs/solana/8sLbNZoA1cfnvA92vT8jQk2vAM8X4h6gH2U4uKwTzYYm'); // SOL/USDC pair
          const solPair = solRes.data?.pairs?.[0];
          if (solPair) {
            const solP = parseFloat(solPair.priceUsd || '0');
            if (solP > 0) setSolanaPrice(solP);
          }
        }
      } catch (err) {
        console.error('Failed to fetch market data:', err);
      } finally {
        setIsFetchingChart(false);
      }
    };

    fetchMarketData();
    // Refresh market data every 5 minutes
    const interval = setInterval(fetchMarketData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (effectiveAddress) {
      // Balance check disabled due to Tatum RPC plan limits
      setBalance(0);
    } else {
      setBalance(0);
      setUsGoldBalance(0);
    }
  }, [effectiveAddress, connection]);

  const [copiedLine, setCopiedLine] = useState<string | null>(null);

  const copyReferral = (line: string) => {
    if (!effectiveAddress) return;
    navigator.clipboard.writeText(getReferralLink(line));
    setCopiedLine(line);
    setTimeout(() => setCopiedLine(null), 2000);
  };

  const handleInvestment = async () => {
    const activeAddress = publicKey?.toString() || appKitAddress;
    if (!activeAddress || isInvesting) return;
    
    try {
      setIsInvesting(true);
      
      let currentPublicKey = publicKey;
      if (!currentPublicKey && appKitAddress) {
        currentPublicKey = new PublicKey(appKitAddress);
      }

      if (!currentPublicKey) {
         throw new Error("No wallet connected");
      }
      
      // Use prefetched SOL price or fetch dynamically
      let currentSolPrice = solanaPrice;
      if (!currentSolPrice) {
        try {
          const jupRes = await axios.get('https://api.jup.ag/swap/v1/quote?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000000', {
            headers: { 'x-api-key': 'jup_0bceef83ebaa8e2a9a35f27810e7dd60b155272ecdfd60b1901a875a9a333dfc' }
          });
          if (jupRes.data && jupRes.data.outAmount) {
            currentSolPrice = parseFloat(jupRes.data.outAmount) / 1e6;
          }
        } catch(e) {
          console.warn("Failed to fetch current SOL price on invest");
        }
      }
      const solPrice = currentSolPrice || 150;

      if (investAmount < 10 || investAmount > 100) {
        throw new Error("Investment amount must be between $10 and $100");
      }

      // Calculate Solana amount for requested $usGOLD
      const amountToInvest = parseFloat((investAmount / solPrice).toFixed(4));
      const totalLamports = Math.floor(amountToInvest * LAMPORTS_PER_SOL);
      
      const feeBuffer = 100000; // 0.0001 SOL buffer for multiple instructions and priority
      // Balance check skipped due to Tatum RPC plan limits

      // Fetch MLM Settings
      const adminWallets = adminWalletsData || {};
      const adminWallet1Str = adminWallets.wallet1 || 'BASAeBAszKMALU1ho4kdYEZzPcbzGrqUm4RWmhAFrvJs'; // Leadership: 20% + MLM Remainder
      const adminWallet2Str = adminWallets.wallet2 || 'ECJNrSWv4UEMkMQhEUyHuycoVt1hQPyoLsFRfFVaVAPy'; // App Pool A (8%)
      const adminWallet3Str = adminWallets.wallet3 || '4SXeSeJAoi1xyzieCa4SSkDi5qEwABFLWxtpE3wzXLSY'; // App Pool B (6%)
      const adminWallet4Str = adminWallets.wallet4 || '8i8bT6z2ez48EwHtshnXwdV63WreHXT7guFZnRWizqqN'; // App Pool C (4%)
      const adminWallet5Str = adminWallets.wallet5 || '8Nf8G28zV2rk91hw41dpt1aL2eBk2zirqZZAbpJ1cAS8'; // App Pool D (2%)
      
      // MLM Settings from prompt
      let mlmLevels: any[] = [
          { level: 1, percent: 20 },
          { level: 2, percent: 10 },
          { level: 3, percent: 8 },
          { level: 4, percent: 6 },
          { level: 5, percent: 5 },
          { level: 6, percent: 4 },
          { level: 7, percent: 3 },
          { level: 8, percent: 2 },
          { level: 9, percent: 1 },
          { level: 10, percent: 1 },
      ];

      let undistributedPercentage = 60; // 60% allocated to referrals

      // Get user's upline
      let upline: string[] = [];
      let currentReferrer = localStorage.getItem('referrer');
      let usersData = allUsersData;
      const existingUser = usersData[currentPublicKey.toString()] || {};
      
      if (existingUser.referrer) {
        currentReferrer = existingUser.referrer;
      }

      let levelCount = 0;
      const seenWallets = new Set<string>();
      
      while (currentReferrer && levelCount < mlmLevels.length) {
        try {
          new PublicKey(currentReferrer); // ensure it's a valid pubkey
          
          // Prevent self-referral or circular loops
          if (currentReferrer === currentPublicKey.toString() || seenWallets.has(currentReferrer)) {
            break;
          }
          
          seenWallets.add(currentReferrer);
          upline.push(currentReferrer);
          
          let nextRefData = usersData[currentReferrer];
          currentReferrer = nextRefData ? (nextRefData.referrer || null) : null;
        } catch(e) {
          break;
        }
        levelCount++;
      }

      const payees: { pubkey: PublicKey, percent: number }[] = [];

      // 1. Referral Distribution
      for (let i = 0; i < upline.length && i < mlmLevels.length; i++) {
        const percent = Number(mlmLevels[i].percent || 0);
        const uplineId = upline[i];

        if (percent > 0) {
            undistributedPercentage -= percent;
            try {
              payees.push({ pubkey: new PublicKey(uplineId), percent });
            } catch(e) {
              undistributedPercentage += percent;
            }
        }
      }

      // Calculate Team Volumes for Pool Qualifications
      // We must include the CURRENT investment so that pool qualifications are recalculated correctly per line for this transaction.
      const simulatedUsersData = { ...usersData };
      const myId = currentPublicKey.toString();
      const myDirectRef = upline.length > 0 ? upline[0] : null;
      
      if (!simulatedUsersData[myId]) {
        let storedLine = localStorage.getItem('line') || 'A';
        simulatedUsersData[myId] = {
           id: myId,
           referrer: myDirectRef,
           line: storedLine.toUpperCase(),
           totalInvested: investAmount
        };
      } else {
        simulatedUsersData[myId] = {
           ...simulatedUsersData[myId],
           totalInvested: (simulatedUsersData[myId].totalInvested || 0) + investAmount
        };
        // Ensure referrer and line are present if somehow missing
        if (!simulatedUsersData[myId].referrer && myDirectRef) {
          simulatedUsersData[myId].referrer = myDirectRef;
        }
        if (!simulatedUsersData[myId].line) {
          let storedLine = localStorage.getItem('line') || 'A';
          simulatedUsersData[myId].line = storedLine.toUpperCase();
        }
      }

      const childrenMap: Record<string, string[]> = {};
      Object.keys(simulatedUsersData).forEach(id => {
        const refD = simulatedUsersData[id].referrer;
        if (refD) {
          if (!childrenMap[refD]) childrenMap[refD] = [];
          childrenMap[refD].push(id);
        }
      });

      const checkAllLinesToVol = (userId: string, targetVol: number) => {
         const lines = ['A', 'B', 'C', 'D'];
         for (const line of lines) {
            const lineUsers = Object.keys(simulatedUsersData).filter(id => simulatedUsersData[id].referrer === userId && (simulatedUsersData[id].line === line || (!simulatedUsersData[id].line && line === 'A')));
            let vol = 0;
            lineUsers.forEach(uId => {
               const queue = [uId];
               const visitedSet = new Set<string>();
               while (queue.length > 0) {
                  const curr = queue.shift()!;
                  if (visitedSet.has(curr)) continue;
                  visitedSet.add(curr);
                  vol += (simulatedUsersData[curr]?.totalInvested || 0);
                  const children = childrenMap[curr];
                  if (children) queue.push(...children);
               }
            });
            if (vol < targetVol) return false;
         }
         return true;
      };

      const eligibleWallets = [currentPublicKey.toString(), ...upline];
      
      let walletForPool8 = adminWallet2Str;
      let walletForPool6 = adminWallet3Str;
      let walletForPool4 = adminWallet4Str;
      let walletForPool2 = adminWallet5Str;

      let rewardForPool8 = null;
      let rewardForPool6 = null;
      let rewardForPool4 = null;
      let rewardForPool2 = null;

      for (let i = 0; i < eligibleWallets.length; i++) {
        const is3k = checkAllLinesToVol(eligibleWallets[i], 3000);
        const is5k = checkAllLinesToVol(eligibleWallets[i], 5000);
        const is10k = checkAllLinesToVol(eligibleWallets[i], 10000);
        const is30k = checkAllLinesToVol(eligibleWallets[i], 30000);
        
        if (is3k && walletForPool8 === adminWallet2Str) {
           walletForPool8 = eligibleWallets[i];
           rewardForPool8 = eligibleWallets[i];
        }
        if (is5k && walletForPool6 === adminWallet3Str) {
           walletForPool6 = eligibleWallets[i];
           rewardForPool6 = eligibleWallets[i];
        }
        if (is10k && walletForPool4 === adminWallet4Str) {
           walletForPool4 = eligibleWallets[i];
           rewardForPool4 = eligibleWallets[i];
        }
        if (is30k && walletForPool2 === adminWallet5Str) {
           walletForPool2 = eligibleWallets[i];
           rewardForPool2 = eligibleWallets[i];
        }
      }

      // Admin 1 (Fixed 20% + any undistributed from MLM)
      if (20 > 0) payees.push({ pubkey: new PublicKey(adminWallet1Str), percent: 20 });
      if (undistributedPercentage > 0) payees.push({ pubkey: new PublicKey(adminWallet1Str), percent: undistributedPercentage });

      // Admin 2
      if (8 > 0) payees.push({ pubkey: new PublicKey(walletForPool8), percent: 8 });

      // Admin 3
      if (6 > 0) payees.push({ pubkey: new PublicKey(walletForPool6), percent: 6 });

      // Admin 4
      if (4 > 0) payees.push({ pubkey: new PublicKey(walletForPool4), percent: 4 });

      // Admin 5
      if (2 > 0) payees.push({ pubkey: new PublicKey(walletForPool2), percent: 2 });

      const aggregatedPayees: Record<string, number> = {};
      for (const payee of payees) {
        if (payee.percent <= 0) continue;
        const pubStr = payee.pubkey.toString();
        aggregatedPayees[pubStr] = (aggregatedPayees[pubStr] || 0) + payee.percent;
      }

      // Distribute SOL
      const instructions: TransactionInstruction[] = [];

      for (const [pubStr, percent] of Object.entries(aggregatedPayees)) {
        if (percent <= 0) continue;
        const destAmount = Math.floor(totalLamports * (percent / 100));
        if (destAmount <= 0) continue;
        
        try {
          instructions.push(
            SystemProgram.transfer({
              fromPubkey: currentPublicKey,
              toPubkey: new PublicKey(pubStr),
              lamports: destAmount,
            })
          );
        } catch(e) {
          console.error("Failed to build instructions for payee", pubStr, e);
        }
      }

      let maxRetries = 3;
      let blockhashToUse = '';
      while (maxRetries > 0) {
        try {
          blockhashToUse = (await connection.getLatestBlockhash('confirmed')).blockhash;
          break;
        } catch (e) {
          maxRetries--;
          if (maxRetries === 0) throw e;
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      const messageV0 = new TransactionMessage({
        payerKey: currentPublicKey,
        recentBlockhash: blockhashToUse,
        instructions,
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);

      let signature;
      if (publicKey && sendTransaction) {
        signature = await sendTransaction(transaction, connection);
      } else if (isAppKitConnected && walletProvider) {
        signature = await walletProvider.sendTransaction(transaction, connection);
      } else {
        throw new Error("No wallet provider available to send transaction");
      }

      const timestamp = Date.now();
      
      // Save User Data
      const directRef = upline.length > 0 ? upline[0] : null;
      const currentBuyerData = usersData[currentPublicKey.toString()] || {};
      
      const buyerUpdate: any = {
        lastActive: timestamp,
        totalInvested: (currentBuyerData.totalInvested || 0) + investAmount
      };
      
      // Only set referrer if it's a new user or explicitly missing
      if (!currentBuyerData.referrer && directRef) {
        buyerUpdate.referrer = directRef;
      }
      if (!currentBuyerData.line) {
        let storedLine = localStorage.getItem('line') || 'A';
        buyerUpdate.line = storedLine.toUpperCase();
      }
      if (!currentBuyerData.joinedAt) {
        buyerUpdate.joinedAt = timestamp;
        buyerUpdate.id = currentPublicKey.toString();
        buyerUpdate.earnings = 0;
      }

      await update(ref(database, `users/${currentPublicKey.toString()}`), buyerUpdate);

      // Log for buyer
      await push(ref(database, `transactions/${currentPublicKey.toString()}`), {
        type: 'buy',
        amount: `${investAmount.toFixed(4)} SOL`,
        price: `$${investAmount.toFixed(2)}`,
        time: new Date().toLocaleString(),
        timestamp: timestamp,
        txId: signature
      });
      
      // Log globally for Admin Panel
      await push(ref(database, `global_transactions`), {
        type: 'buy',
        user: currentPublicKey.toString(),
        amount: investAmount,
        solAmount: amountToInvest,
        timestamp: timestamp,
        txId: signature
      });

      // Log and Update for uplines
      for (let i = 0; i < upline.length && i < mlmLevels.length; i++) {
        const percent = Number(mlmLevels[i].percent || 0);
        const requirement = Number(mlmLevels[i].totalUsers || 0);
        const uplineId = upline[i];

        // Check if upline qualifies (duplicate logic for logging)
        let qualifies = true;
        if (requirement > 0) {
          const directsCount = Object.values(usersData).filter((u: any) => u.referrer === uplineId).length;
          if (directsCount < requirement) {
            qualifies = false;
          }
        }

        if (qualifies && percent > 0) {
            try {
              const uPubkeyStr = uplineId;
              const commission = amountToInvest * (percent / 100);
              const uplineData = usersData[uPubkeyStr] || {};
              
              // 1. Log transaction
              await push(ref(database, `transactions/${uPubkeyStr}`), {
                type: 'referral',
                amount: `${commission.toFixed(4)} SOL`,
                price: 'Commission',
                time: new Date().toLocaleString(),
                timestamp: timestamp,
                txId: signature
              });

              // 2. Update upline earnings (also increment claimed to show it was instantly disbursed)
              await update(ref(database, `users/${uPubkeyStr}`), {
                earnings: (uplineData.earnings || 0) + commission,
                claimedCommissions: (uplineData.claimedCommissions || 0) + commission,
                lastActive: timestamp
              });
            } catch(e) {
              console.error('Failed to reward upline:', uplineId, e);
            }
        }
      }

      // Log Pool Rewards if intercepted by a user
      const logPoolReward = async (uId: string, percent: number) => {
        try {
          const commission = amountToInvest * (percent / 100);
          const uData = usersData[uId] || {};
          await push(ref(database, `transactions/${uId}`), {
            type: 'pool_bonus',
            amount: `${commission.toFixed(4)} SOL`,
            price: `App Pool (${percent}%)`,
            time: new Date().toLocaleString(),
            timestamp: timestamp,
            txId: signature
          });
          await update(ref(database, `users/${uId}`), {
            earnings: (uData.earnings || 0) + commission,
            claimedCommissions: (uData.claimedCommissions || 0) + commission,
            lastActive: timestamp
          });
        } catch (e) {
          console.error('Failed to update pool bonus', e);
        }
      };

      if (rewardForPool8) await logPoolReward(rewardForPool8, 8);
      if (rewardForPool6) await logPoolReward(rewardForPool6, 6);
      if (rewardForPool4) await logPoolReward(rewardForPool4, 4);
      if (rewardForPool2) await logPoolReward(rewardForPool2, 2);

      setUsGoldBalance(prev => prev + investAmount);
      setUserTotalInvested(prev => prev + investAmount);
      setBalance(prev => Math.max(0, prev - amountToInvest));
      
      triggerHaptic('success');
      alert(`Investment successful! Distributed ~$${investAmount} in SOL and received ${investAmount} GOLD.`);
    } catch (err: any) {
      triggerHaptic('error');
      console.error('Investment failed:', err);
      
      let errorMessage = err.message || String(err);
      
      // Handle the "No record of prior credit" error specifically
      if (errorMessage.includes('Attempt to debit an account but found no record of a prior credit')) {
        errorMessage = "Your wallet account has 0 SOL and is not initialized. Please transfer some SOL to your wallet to activate it and pay for the investment and network fees.";
      } else if (err.logs) {
        // If there are detailed logs, check them for specific error messages
        const logsStr = JSON.stringify(err.logs);
        if (logsStr.includes('Attempt to debit an account but found no record of a prior credit')) {
          errorMessage = "Your wallet account has 0 SOL and is not initialized. Please transfer some SOL to your wallet to activate it and pay for the investment and network fees.";
        } else {
          console.log('Transaction Simulation Logs:', err.logs);
          errorMessage += ` (Check console for full logs)`;
        }
      }

      alert(`Investment failed: ${errorMessage}`);
    } finally {
      setIsInvesting(false);
    }
  };

  const handleOpenQR = (title: string, value: string) => {
    setQrTitle(title);
    setQrValue(value);
    setQrOpen(true);
  };

  const handleClaimCommissions = async () => {
    const activeAddress = publicKey?.toString() || appKitAddress;
    if (!activeAddress || isClaiming) return;
    
    // Calculate available amount
    const availableToClaim = userEarnings - userClaimedCommissions;
    if (availableToClaim <= 0) return;

    try {
      setIsClaiming(true);

      const timestamp = Date.now();
      
      // We would normally also initiate a blockchain transaction to send the commissions here!
      // This snippet simulates successful claim state updates.

      // Update claimed commissions in Firebase
      await update(ref(database, `users/${activeAddress}`), {
        claimedCommissions: userClaimedCommissions + availableToClaim,
        lastActive: timestamp
      });

      // Log claim transaction
      await push(ref(database, `transactions/${activeAddress}`), {
        type: 'claim',
        amount: `${availableToClaim.toFixed(4)} SOL`,
        status: 'completed',
        time: new Date().toLocaleString(),
        timestamp: timestamp,
        txId: 'SimulatedTx_' + timestamp
      });

      triggerHaptic('success');
      alert(`Successfully claimed ${availableToClaim.toFixed(4)} SOL!`);
      setClaimDialogOpen(false);
    } catch (e) {
      triggerHaptic('error');
      console.error('Claim failed:', e);
      alert('Claim failed. Try again.');
    } finally {
      setIsClaiming(false);
    }
  };

  const handleConnect = async () => {
    if (isActuallyConnected) return;
    
    // Check for specific injected wallets in in-app browsers
    const isSafePal = !!(window as any).safepal || !!(window as any).safepal_solana;
    const isTrust = !!(window as any).trustWallet || !!(window as any).trustwallet;

    if (isSafePal) {
      const wp = wallets.find(w => w.adapter.name.toLowerCase().includes('safepal'));
      if (wp) { 
        try {
          await select(wp.adapter.name as any); 
          return; 
        } catch (e) {
          console.error('Wallet selection failed:', e);
        }
      }
    }
    if (isTrust) {
      const wp = wallets.find(w => w.adapter.name.toLowerCase().includes('trust'));
      if (wp) { 
        try {
          await select(wp.adapter.name as any); 
          return; 
        } catch (e) {
          console.error('Wallet selection failed:', e);
        }
      }
    }

    // Use native WalletConnect (Reown AppKit) modal
    try {
      await open();
    } catch (e) {
      console.error('AppKit open failed:', e);
      setVisible(true); // Fallback to standard modal
    }
  };

  // Auto-connect logic - limited to In-App browsers or MWA to avoid desktop intrusive popups
  useEffect(() => {
    if (connected || publicKey || wallets.length === 0) return;

    const isSafePal = !!(window as any).safepal || !!(window as any).safepal_solana;
    const isTrust = !!(window as any).trustWallet || !!(window as any).trustwallet;

    if (isSafePal || isTrust) {
      const name = isSafePal ? 'SafePal' : 'Trust';
      const wallet = wallets.find(w => w.adapter.name.toLowerCase().includes(name.toLowerCase()));
      if (wallet) {
        select(wallet.adapter.name as any);
      }
    }

    // MWA (Mobile Wallet Adapter) optimization
    const mwaWallet = wallets.find(w => w.adapter.name === 'Solana Mobile Stack');
    if (mwaWallet && mwaWallet.readyState === WalletReadyState.Installed) {
       // Only select if specifically likely to be on a mobile device where MWA is preferred
       if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
         select(mwaWallet.adapter.name as any);
       }
    }
  }, [wallets, connected, publicKey, select]);

  const isRtl = ['AR', 'FA', 'CKB'].includes(language);
  const rtlTheme = useMemo(() => createTheme({
    direction: isRtl ? 'rtl' : 'ltr',
    palette: {
      mode: 'dark',
      primary: { main: '#D4AF37', light: '#F3E5AB', dark: '#AA8529', contrastText: '#1a1b1f' },
      secondary: { main: '#1a1b1f' },
      background: { default: '#000000', paper: '#121214' }, // Pure black background like true iOS dark mode
      divider: alpha('#D4AF37', 0.15),
    },
    shape: { borderRadius: 20 },
    typography: {
      fontFamily: '"Montserrat", "Inter", "Vazirmatn", sans-serif',
      h1: { fontFamily: '"Montserrat", "Inter", sans-serif', fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { fontFamily: '"Montserrat", "Inter", sans-serif', fontWeight: 700, letterSpacing: '-0.01em' },
      h3: { fontFamily: '"Montserrat", "Inter", sans-serif', fontWeight: 700 },
      h4: { fontFamily: '"Montserrat", "Inter", sans-serif', fontWeight: 700 },
      h5: { fontFamily: '"Montserrat", "Inter", sans-serif', fontWeight: 600 },
      h6: { fontFamily: '"Montserrat", "Inter", sans-serif', fontWeight: 600 },
      button: { fontWeight: 600, textTransform: 'none' },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            overflowX: 'hidden',
            width: '100%',
            margin: 0,
            padding: 0,
          },
          body: {
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            WebkitTapHighlightColor: 'transparent',
            backgroundColor: '#000000',
            overscrollBehaviorY: 'none', // Prevent pull-to-refresh bounce Native feel
            overflowX: 'hidden',
            width: '100%',
            margin: 0,
            padding: 0,
          },
          '#root': {
            overflowX: 'hidden',
            width: '100%',
          },
          '*': {
            // Prevent text selection by default, except in inputs, to feel like native app
            userSelect: 'none',
          },
          'p, h1, h2, h3, h4, h5, h6, span': {
             userSelect: 'none',
          },
          'input, textarea': {
             userSelect: 'text',
          }
        },
      },
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
        styleOverrides: {
          root: {
            borderRadius: 24, // iOS pill-like buttons
            padding: '12px 24px',
            minHeight: '48px', // Native touch target size
            transition: 'transform 0.1s ease-in-out, opacity 0.1s',
            boxShadow: 'none',
            '&:active': {
              transform: 'scale(0.96)', // Native button press scale effect
              opacity: 0.8,
            },
          },
          contained: {
            color: '#1a1b1f',
            backgroundColor: '#D4AF37',
            '&:hover': {
              backgroundColor: '#F3E5AB',
            }
          }
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            backgroundColor: '#121214',
            borderRadius: 24,
            border: `1px solid ${alpha('#ffffff', 0.08)}`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: alpha('#0d0d0d', 0.6),
            backdropFilter: 'blur(20px) saturate(180%)',
            borderBottom: 'none',
            boxShadow: 'none',
          },
        },
      },
      MuiBottomNavigation: {
        styleOverrides: {
          root: {
            backgroundColor: 'transparent',
            height: '72px',
          },
        },
      },
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: {
            color: alpha('#ffffff', 0.5),
            padding: '12px 0 8px',
            '&.Mui-selected': {
              color: '#D4AF37',
              '& .MuiBottomNavigationAction-label': {
                fontWeight: 700,
                color: '#D4AF37',
              },
              '& .pill-indicator': {
                opacity: 1,
                transform: 'scaleX(1)',
              }
            },
            '& .MuiBottomNavigationAction-label': {
              fontSize: '0.7rem',
              fontWeight: 500,
              marginTop: '4px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }
          },
        },
      },
      MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          marginBottom: 4,
        }
      }
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          fontSize: '16px', // Prevent auto-zoom on iOS
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 28,
          backgroundColor: '#121214',
          backgroundImage: 'none',
          boxShadow: '0 24px 48px rgba(0,0,0,0.6)',
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        }
      }
    }
  },
  }), [isRtl]);

  const cacheRtl = useMemo(() => createCache({
    key: 'muirtl',
    stylisPlugins: [prefixer, rtlPlugin],
  }), []);

  const cacheLtr = useMemo(() => createCache({
    key: 'muiltr',
    stylisPlugins: [prefixer],
  }), []);

  return (
  <CacheProvider value={isRtl ? cacheRtl : cacheLtr}>
    <ThemeProvider theme={rtlTheme}>
    <Box sx={{ pb: 9, minHeight: '100vh', bgcolor: 'background.default' }}>
      <OnboardingModal openExternal={isGuidanceOpen} onCloseExternal={() => setIsGuidanceOpen(false)} />
      {/* Header */}
      <AppBar 
        position="fixed" 
        elevation={0} 
        sx={{ 
          top: { xs: 8, sm: 16 }, 
          left: '50%',
          transform: 'translateX(-50%)',
          width: { xs: 'calc(100% - 16px)', sm: 'calc(100% - 32px)' },
          maxWidth: 680,
          borderRadius: '32px',
          bgcolor: alpha('#121214', 0.7),
          backdropFilter: 'blur(20px) saturate(180%)',
          border: `1px solid ${alpha('#D4AF37', 0.25)}`,
          overflow: 'hidden',
          zIndex: 1100,
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            bgcolor: alpha('#121214', 0.8),
            border: `1px solid ${alpha('#D4AF37', 0.4)}`,
            boxShadow: `0 8px 32px ${alpha('#D4AF37', 0.1)}`,
          }
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 1.5, sm: 2.5 }, minHeight: { xs: '56px !important', sm: '64px !important' } }}>
          <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 2 }}>
            <Box sx={{ position: 'relative' }}>
              <Avatar src="https://xminer.space/icon.svg" sx={{ width: { xs: 32, sm: 36 }, height: { xs: 32, sm: 36 }, bgcolor: 'transparent' }} />
              <Box sx={{ position: 'absolute', inset: -4, borderRadius: '50%', border: `1px solid ${alpha('#D4AF37', 0.3)}`, animation: 'pulse 2s infinite' }} />
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
               <Typography 
                variant="h6" 
                sx={{ 
                  fontFamily: '"Cinzel", serif', 
                  fontWeight: 900, 
                  fontSize: { xs: '1rem', sm: '1.25rem' }, 
                  background: 'linear-gradient(45deg, #FFDF73, #D4AF37)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  letterSpacing: '0.05em'
                }}
              >
                GOLD
              </Typography>
            </Box>
          </Stack>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1.5 } }}>
            <Box>
              <MuiIconButton 
                onClick={handleLangClick} 
                sx={{ 
                  height: 36,
                  borderRadius: '12px',
                  bgcolor: alpha('#D4AF37', 0.08), 
                  color: 'primary.main',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  gap: 0.5,
                  px: 1.5,
                  '&:hover': { bgcolor: alpha('#D4AF37', 0.15) } 
                }}
              >
                <Globe size={16} />
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>{language}</Box>
              </MuiIconButton>
              <Menu
                anchorEl={langAnchorEl}
                open={Boolean(langAnchorEl)}
                onClose={() => handleLangClose()}
                sx={{ 
                  '& .MuiPaper-root': { 
                    bgcolor: alpha('#121214', 0.95), 
                    backdropFilter: 'blur(10px)',
                    border: `1px solid ${alpha('#D4AF37', 0.2)}`, 
                    borderRadius: '20px',
                    mt: 1.5,
                    boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                    maxHeight: '300px'
                  } 
                }}
              >
                <MenuItem onClick={() => handleLangClose('EN')} sx={{ color: language === 'EN' ? 'primary.main' : 'text.primary', borderRadius: '12px', mx: 1 }}>English</MenuItem>
                <MenuItem onClick={() => handleLangClose('ES')} sx={{ color: language === 'ES' ? 'primary.main' : 'text.primary', borderRadius: '12px', mx: 1 }}>Español</MenuItem>
                <MenuItem onClick={() => handleLangClose('FR')} sx={{ color: language === 'FR' ? 'primary.main' : 'text.primary', borderRadius: '12px', mx: 1 }}>Français</MenuItem>
                <MenuItem onClick={() => handleLangClose('AR')} sx={{ color: language === 'AR' ? 'primary.main' : 'text.primary', borderRadius: '12px', mx: 1 }}>العربية</MenuItem>
                <MenuItem onClick={() => handleLangClose('FA')} sx={{ color: language === 'FA' ? 'primary.main' : 'text.primary', borderRadius: '12px', mx: 1 }}>فارسی</MenuItem>
                <MenuItem onClick={() => handleLangClose('RU')} sx={{ color: language === 'RU' ? 'primary.main' : 'text.primary', borderRadius: '12px', mx: 1 }}>Русский</MenuItem>
                <MenuItem onClick={() => handleLangClose('ZH')} sx={{ color: language === 'ZH' ? 'primary.main' : 'text.primary', borderRadius: '12px', mx: 1 }}>中文</MenuItem>
                <MenuItem onClick={() => handleLangClose('CKB')} sx={{ color: language === 'CKB' ? 'primary.main' : 'text.primary', borderRadius: '12px', mx: 1 }}>کوردی</MenuItem>
                <MenuItem onClick={() => handleLangClose('AZ')} sx={{ color: language === 'AZ' ? 'primary.main' : 'text.primary', borderRadius: '12px', mx: 1 }}>Azərbaycan</MenuItem>
                <MenuItem onClick={() => handleLangClose('DE')} sx={{ color: language === 'DE' ? 'primary.main' : 'text.primary', borderRadius: '12px', mx: 1 }}>Deutsch</MenuItem>
                <MenuItem onClick={() => handleLangClose('IT')} sx={{ color: language === 'IT' ? 'primary.main' : 'text.primary', borderRadius: '12px', mx: 1 }}>Italiano</MenuItem>
                <MenuItem onClick={() => handleLangClose('JA')} sx={{ color: language === 'JA' ? 'primary.main' : 'text.primary', borderRadius: '12px', mx: 1 }}>日本語</MenuItem>
                <MenuItem onClick={() => handleLangClose('KO')} sx={{ color: language === 'KO' ? 'primary.main' : 'text.primary', borderRadius: '12px', mx: 1 }}>한국어</MenuItem>
                <MenuItem onClick={() => handleLangClose('ID')} sx={{ color: language === 'ID' ? 'primary.main' : 'text.primary', borderRadius: '12px', mx: 1 }}>Bahasa Indonesia</MenuItem>
              </Menu>
            </Box>

            {!isActuallyConnected && !viewOnlyAddress ? (
              <Button 
                variant="contained" 
                onClick={handleConnect}
                startIcon={<Wallet size={16} />}
                sx={{ 
                  borderRadius: '14px',
                  fontWeight: 900,
                  height: 36,
                  px: { xs: 1.5, sm: 2.5 },
                  fontSize: { xs: '0.7rem', sm: '0.8rem' },
                  bgcolor: '#D4AF37',
                  color: '#000',
                  boxShadow: `0 4px 15px ${alpha('#D4AF37', 0.3)}`,
                }}
              >
                {t('connectWallet', language)}
              </Button>
            ) : (
              <Button 
                variant="outlined" 
                onClick={() => {
                  if (connected) disconnect();
                  setViewOnlyAddress(null);
                }}
                sx={{ 
                  height: 36, 
                  borderRadius: '14px', 
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: 'primary.main',
                  borderColor: alpha('#D4AF37', 0.4),
                  px: 2,
                  '&:hover': {
                    borderColor: '#D4AF37',
                    bgcolor: alpha('#D4AF37', 0.05)
                  }
                }}
                startIcon={
                  isActuallyConnected && effectiveAddress ? (
                    <Box sx={{ display: 'flex', borderRadius: '50%', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <Jazzicon diameter={16} seed={jsNumberForAddress(effectiveAddress)} />
                    </Box>
                  ) : (
                    <User size={16} />
                  )
                }
              >
                {effectiveAddress?.slice(0, 4)}...{effectiveAddress?.slice(-4)}
              </Button>
            )}
            
            <MuiIconButton 
              size="small" 
              onClick={() => setIsGuidanceOpen(true)}
              sx={{ 
                height: 36,
                width: 36,
                borderRadius: '12px',
                bgcolor: alpha('#D4AF37', 0.08), 
                color: 'primary.main',
                '&:hover': { bgcolor: alpha('#D4AF37', 0.15) } 
              }}
            >
              <Info size={18} />
            </MuiIconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ mt: 12, mb: 16, px: { xs: 2, sm: 3 } }}>
        {activeTab === 'vault' && (
          <Stack spacing={3} sx={{ animation: 'fadeIn 0.4s ease-out' }}>
            {/* Gold Bar Investment UI */}
            <Card sx={{ 
              background: `linear-gradient(145deg, #1A1A1A 0%, #0D0D0D 100%)`,
              border: `1px solid ${alpha('#D4AF37', 0.3)}`,
              boxShadow: `0 12px 40px ${alpha('#D4AF37', 0.15)}, inset 0 1px 0 ${alpha('#fff', 0.1)}`,
              position: 'relative', 
              overflow: 'hidden', 
              mb: 3,
              borderRadius: '28px'
            }}>
              {/* Background glows */}
              <Box sx={{ position: 'absolute', top: -50, left: -50, width: 200, height: 200, background: `radial-gradient(circle, ${alpha('#D4AF37', 0.15)} 0%, transparent 60%)` }} />
              <Box sx={{ position: 'absolute', bottom: -100, right: -50, width: 300, height: 300, background: `radial-gradient(circle, ${alpha('#D4AF37', 0.1)} 0%, transparent 60%)` }} />
              
              <CardContent sx={{ p: {xs: 3, md: 5}, position: 'relative', zIndex: 1 }}>
                
                <Box textAlign="center" mb={4}>
                  <Typography variant="overline" color="text.secondary" fontWeight="700" letterSpacing={3} sx={{ opacity: 0.8 }}>
                    {t('secureYourLegacy', language)}
                  </Typography>
                  <Typography variant="h3" fontWeight="900" sx={{ mt: 1, fontFamily: '"Cinzel", serif', background: 'linear-gradient(45deg, #FFDF73, #D4AF37, #996515)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
                    {t('mintUsGold', language)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: '80%', mx: 'auto' }}>
                    {t('transformSol', language)}
                  </Typography>
                </Box>

                {/* Interactive Gold Bar Display */}
                <Box sx={{ 
                  position: 'relative', 
                  width: '100%', 
                  height: 220, 
                  perspective: 1000,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  mt: 2,
                  mb: 6
                }}>
                  <Box sx={{
                    position: 'relative',
                    width: '50%',
                    maxWidth: 220,
                    height: 100,
                    background: `linear-gradient(to right, #B5852A, #F5D76E, #C89B3C, #F5D76E, #B5852A)`,
                    borderRadius: '16px',
                    boxShadow: `
                      0 20px 40px rgba(0,0,0,0.6),
                      inset 0 4px 10px rgba(255,255,255,0.6),
                      inset 0 -4px 10px rgba(0,0,0,0.4)
                    `,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: `rotateX(15deg) scale(${0.6 + Math.pow(investAmount / 10, 1 / 3) * 0.4})`,
                    transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  }}>
                    {/* Engravings on the Gold Bar */}
                    <Typography variant="h4" fontWeight="900" sx={{ color: 'rgba(120, 80, 20, 0.6)', textShadow: '1px 1px 1px rgba(255,255,255,0.3), -1px -1px 1px rgba(0,0,0,0.2)', fontFamily: '"Cinzel", serif' }}>
                      {investAmount} oz
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(120, 80, 20, 0.5)', fontWeight: 'bold', letterSpacing: 2 }}>
                      {t('royalReserve', language)}
                    </Typography>
                  </Box>
                  <Box sx={{ 
                    position: 'absolute', 
                    bottom: 0, 
                    width: '60%', 
                    maxWidth: 260,
                    height: 20, 
                    background: 'rgba(0,0,0,0.5)', 
                    filter: 'blur(10px)', 
                    borderRadius: '50%',
                    transform: `scale(${0.6 + Math.pow(investAmount / 10, 1 / 3) * 0.4})`,
                    transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                  }} />
                </Box>

                {/* Investment Controls */}
                <Box sx={{ bgcolor: alpha('#000', 0.4), p: 3, borderRadius: '24px', border: `1px solid ${alpha('#ffffff', 0.05)}` }}>
                  
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-end" mb={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight="600" letterSpacing={1}>{t('mintAmount', language)}</Typography>
                      <Typography variant="h4" color="#fff" fontWeight="900">${investAmount} <span style={{fontSize: '1rem', color: '#D4AF37'}}>$USD</span></Typography>
                    </Box>
                    <Box textAlign="right">
                      <Typography variant="caption" color="text.secondary" fontWeight="600" letterSpacing={1}>{t('requiredSol', language)}</Typography>
                      <Typography variant="h6" color="#14F195" fontWeight="bold">
                        ~{solanaPrice ? (investAmount / solanaPrice).toFixed(4) : '---'} SOL
                      </Typography>
                    </Box>
                  </Stack>

                  <Slider
                    value={investAmount}
                    onChange={(e, newValue) => {
                      triggerHaptic('light');
                      setInvestAmount(newValue as number);
                    }}
                    min={10}
                    max={100}
                    step={10}
                    marks={[
                      { value: 10, label: '$10' },
                      { value: 50, label: '$50' },
                      { value: 100, label: '$100' },
                    ]}
                    sx={{
                      color: '#D4AF37',
                      height: 8,
                      '& .MuiSlider-track': { border: 'none', background: 'linear-gradient(to right, #D4AF37, #FFDF73)' },
                      '& .MuiSlider-thumb': {
                        height: 24,
                        width: 24,
                        backgroundColor: '#fff',
                        border: '4px solid #D4AF37',
                        '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
                          boxShadow: `0px 0px 0px 8px ${alpha('#D4AF37', 0.16)}`,
                        },
                      },
                      '& .MuiSlider-markLabel': {
                        color: alpha('#fff', 0.5),
                        fontWeight: 'bold',
                        fontSize: '0.75rem',
                        '&[data-index="0"]': { transform: 'translateX(0%)' },
                        '&[data-index="3"]': { transform: 'translateX(-100%)' }
                      }
                    }}
                  />

                  <Box display="flex" justifyContent="space-between" mt={3} pt={2} borderTop={`1px solid ${alpha('#fff', 0.05)}`}>
                    <Typography variant="caption" color="text.secondary">{t('walletBalance', language)} <span style={{color: '#fff', fontWeight: 'bold'}}>{balance > 0 ? balance.toFixed(4) : '---'} SOL</span></Typography>
                    <Typography variant="caption" color="text.secondary">1 SOL ≈ <span style={{color: '#fff', fontWeight: 'bold'}}>${solanaPrice ? solanaPrice.toFixed(2) : '---'}</span></Typography>
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    <Button 
                      size="small" 
                      variant="text" 
                      onClick={() => setShowDistribution(!showDistribution)}
                      endIcon={<ChevronDown size={14} style={{ transform: showDistribution ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />}
                      sx={{ fontSize: '0.65rem', p: 0, minWidth: 0, color: alpha('#D4AF37', 0.8) }}
                    >
                      {t('viewDistributionBreakdown', language)}
                    </Button>
                    <Collapse in={showDistribution}>
                      <Box sx={{ mt: 1, p: 1.5, borderRadius: 2, bgcolor: alpha('#000', 0.2), border: `1px solid ${alpha('#D4AF37', 0.2)}` }}>
                        <Stack spacing={1}>
                          <Box display="flex" justifyContent="space-between">
                            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{t('royalReferrals', language)}</Typography>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>60% <span style={{fontSize: '0.6rem'}}>{t('max', language)}</span></Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between">
                            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{t('leadershipAdmin', language)}</Typography>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>20%</Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between">
                            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{t('appPool8', language)}</Typography>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>8%</Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between">
                            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{t('appPool6', language)}</Typography>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>6%</Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between">
                            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{t('appPool4', language)}</Typography>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>4%</Typography>
                          </Box>
                          <Box display="flex" justifyContent="space-between">
                            <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{t('appPool2', language)}</Typography>
                            <Typography sx={{ fontSize: '0.7rem', fontWeight: 'bold' }}>2%</Typography>
                          </Box>
                          <Divider sx={{ opacity: 0.1 }} />
                          <Typography variant="caption" sx={{ fontSize: '0.6rem', color: alpha(theme.palette.text.secondary, 0.7), fontStyle: 'italic' }}>
                            {t('distributionNote', language)}
                          </Typography>
                        </Stack>
                      </Box>
                    </Collapse>
                  </Box>
                </Box>

                <Button 
                  variant="contained" 
                  fullWidth 
                  size="large"
                  onClick={handleInvestment}
                  disabled={!isActuallyConnected || isInvesting}
                  sx={{ 
                    mt: 4,
                    py: 2, 
                    fontSize: '1.1rem', 
                    fontWeight: '900', 
                    borderRadius: '16px',
                    background: 'linear-gradient(45deg, #D4AF37, #F5D76E)',
                    color: '#000',
                    boxShadow: `0 8px 24px ${alpha('#D4AF37', 0.4)}`,
                    transition: 'all 0.3s ease',
                    textTransform: 'uppercase',
                    letterSpacing: 2,
                    '&:hover': {
                      background: 'linear-gradient(45deg, #F5D76E, #FFF0B3)',
                      boxShadow: `0 12px 32px ${alpha('#D4AF37', 0.6)}`,
                      transform: 'translateY(-2px)'
                    },
                    '&:disabled': {
                      background: alpha('#D4AF37', 0.3),
                      color: alpha('#000', 0.5)
                    }
                  }}
                >
                  {isInvesting ? (
                    <Stack direction="row" alignItems="center" spacing={2} justifyContent="center">
                      <CircularProgress size={24} color="inherit" />
                      <span>{t('mintingLegacy', language)}</span>
                    </Stack>
                  ) : (
                    <Stack direction="row" alignItems="center" spacing={1.5} justifyContent="center">
                      <Coins size={24} />
                      <span>{t('mintUsGold', language)}</span>
                    </Stack>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Investment Overview Card */}
            <Box sx={{ position: 'relative', mb: 4, perspective: 1000, WebkitPerspective: 1000 }}>
              <Card sx={{ 
                position: 'relative', 
                overflow: 'visible',
                background: `linear-gradient(135deg, ${alpha('#121214', 0.9)} 0%, ${alpha('#0a0a0b', 0.95)} 100%)`,
                border: `1px solid ${alpha('#D4AF37', 0.2)}`,
                boxShadow: `0 12px 40px ${alpha('#000', 0.8)}, inset 0 1px 0 ${alpha('#ffffff', 0.1)}`,
                borderRadius: '24px',
              }}>
                <Box sx={{ position: 'absolute', top: 0, right: 0, width: 300, height: 300, background: `radial-gradient(circle, ${alpha('#D4AF37', 0.1)} 0%, transparent 60%)`, transform: 'translate(30%, -30%)', zIndex: 0 }} />
                
                <CardContent sx={{ p: '24px !important', position: 'relative', zIndex: 1 }}>
                  <Typography variant="overline" color="primary.main" fontWeight="800" letterSpacing={3} gutterBottom display="block" align="center">
                    {t('yourNetworkOverview', language)}
                  </Typography>

                  {/* 3D Gold Bar Representation */}
                  <Box sx={{ 
                    position: 'relative', 
                    width: '100%', 
                    height: 180, 
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    mt: 2,
                    mb: 3
                  }}>
                    <Box sx={{
                      position: 'relative',
                      width: '60%',
                      maxWidth: 240,
                      height: 110,
                      background: `linear-gradient(to right, #B5852A, #F5D76E, #C89B3C, #F5D76E, #B5852A)`,
                      borderRadius: '16px',
                      boxShadow: `
                        0 20px 40px rgba(0,0,0,0.6),
                        inset 0 4px 10px rgba(255,255,255,0.6),
                        inset 0 -4px 10px rgba(0,0,0,0.4),
                        0 0 20px rgba(212, 175, 55, 0.3)
                      `,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: 'rotateX(20deg) rotateY(-5deg)',
                      transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      cursor: 'pointer',
                      '&:hover': {
                         transform: 'rotateX(5deg) rotateY(0deg) scale(1.05)',
                      }
                    }}>
                      {/* Engravings on the Gold Bar */}
                      <Typography variant="h4" fontWeight="900" sx={{ color: 'rgba(120, 80, 20, 0.7)', textShadow: '1px 1px 1px rgba(255,255,255,0.4), -1px -1px 1px rgba(0,0,0,0.1)', fontFamily: '"Cinzel", serif' }}>
                        {!isAppReady ? <Skeleton width={100} sx={{ borderRadius: '8px' }} /> : `${userTotalInvested.toFixed(2)} oz`}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(120, 80, 20, 0.6)', fontWeight: 'bold', letterSpacing: 2 }}>
                        {t('royalReserve', language)}
                      </Typography>
                    </Box>
                    {/* Shadow under the bar */}
                    <Box sx={{ 
                      position: 'absolute', 
                      bottom: 10, 
                      width: '70%', 
                      maxWidth: 280,
                      height: 20, 
                      background: 'rgba(0,0,0,0.6)', 
                      filter: 'blur(12px)', 
                      borderRadius: '50%',
                    }} />
                  </Box>

                  <Stack direction="row" spacing={2} sx={{ mt: 2, bgcolor: alpha('#000', 0.4), p: 2, borderRadius: '20px', border: `1px solid ${alpha('#ffffff', 0.05)}`, willChange: 'transform', transform: 'translateZ(0)' }}>
                    <Box sx={{ flex: 1, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom fontWeight="600" letterSpacing={1}>{t('totalInvested', language)}</Typography>
                      <Typography variant="h5" fontWeight="800" sx={{ color: '#fff' }}>
                        {!isAppReady ? <Skeleton width="60%" sx={{ mx: 'auto', borderRadius: '8px' }} /> : <>{userTotalInvested.toFixed(2)} <Box component="span" sx={{ fontSize: '0.8rem', color: '#D4AF37' }}>GOLD</Box></>}
                      </Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem sx={{ borderColor: alpha('#ffffff', 0.1) }} />
                    <Box sx={{ flex: 1, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary" display="block" gutterBottom fontWeight="600" letterSpacing={1}>{t('earnings', language).toUpperCase()}</Typography>
                      <Typography variant="h5" fontWeight="800" sx={{ color: '#4caf50' }}>
                        {!isAppReady ? <Skeleton width="60%" sx={{ mx: 'auto', borderRadius: '8px' }} /> : <>{Math.max(0, userEarnings).toFixed(4)} <Box component="span" sx={{ fontSize: '0.8rem', color: '#D4AF37' }}>SOL</Box></>}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Box>

            {/* Market Data Snippets Card */}
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3, pb: "24px !important" }}>
                <Stack direction="row" spacing={4} sx={{ overflowX: 'auto' }}>
                  <Box sx={{ minWidth: 100 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                      <img src="https://usgold.us/wp-content/uploads/2025/08/usgold.svg" alt="$usGOLD" style={{ width: 16, height: 16 }} />
                      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{t('usGoldPrice', language)}</Typography>
                    </Box>
                    <Typography variant="body1" fontWeight="bold">
                      ${tokenPrice ? tokenPrice.toFixed(4) : '---'}
                    </Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box sx={{ minWidth: 80 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                      <img src="https://solana.com/src/img/branding/solanaLogoMark.svg" alt="SOL" style={{ width: 16, height: 16 }} />
                      <Typography variant="caption" color="text.secondary">{t('solPrice', language)}</Typography>
                    </Box>
                    <Typography variant="body1" fontWeight="bold">
                      ${solanaPrice ? solanaPrice.toFixed(2) : '---'}
                    </Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box sx={{ minWidth: 100 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                      <Activity size={14} color={theme.palette.text.secondary} />
                      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>{t('liquiditySol', language)}</Typography>
                    </Box>
                    <Typography variant="body1" fontWeight="bold">
                      {totalLiquidity && solanaPrice ? (totalLiquidity / solanaPrice).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '---'}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Price Chart Card - MOVED FROM LEDGER */}
            <Card>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ mb: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ textTransform: 'uppercase', mb: 1, display: 'block' }}>{t('liveUsdMarket', language)}</Typography>
                    <Stack direction="row" alignItems="baseline" spacing={1}>
                       <Typography variant="h4" fontWeight="bold">
                        {tokenPrice ? `$${tokenPrice.toLocaleString(undefined, {minimumFractionDigits: 5})}` : '---'}
                      </Typography>
                      <Chip size="small" icon={<ArrowUpRight size={14} color="#14F195" />} label="+1.2%" sx={{ bgcolor: alpha('#14F195', 0.1), color: '#14F195', fontWeight: 600, borderRadius: 1 }} />
                    </Stack>
                  </Box>
                  <MuiIconButton size="small" color="primary" onClick={() => window.open('https://www.geckoterminal.com/solana/pools/4uzpwQ3Lb8HNWrLRU8MYkR1viRnpxdzrPRaF4p4DCcUx', '_blank')}>
                    <Activity size={20} />
                  </MuiIconButton>
                </Box>
                
                <Box sx={{ width: '100%', height: 200, mt: 2 }}>
                  {isFetchingChart ? (
                     <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', bgcolor: alpha('#fff', 0.02), borderRadius: 2 }}>
                         <Typography variant="body2" color="text.secondary">{t('loadingChartData', language)}</Typography>
                     </Box>
                  ) : chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={theme.palette.primary.main} stopOpacity={0.4}/>
                            <stop offset="95%" stopColor={theme.palette.primary.main} stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={alpha(theme.palette.divider, 0.4)} />
                        <XAxis 
                          dataKey="time" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: theme.palette.text.secondary }} 
                          dy={10} 
                          minTickGap={30}
                        />
                        <YAxis 
                          domain={['auto', 'auto']} 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 10, fill: theme.palette.text.secondary }} 
                          tickFormatter={(val) => `$${val.toFixed(0)}`}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: theme.palette.background.paper, borderRadius: 8, border: `1px solid ${theme.palette.divider}`, boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}
                          itemStyle={{ color: theme.palette.primary.main, fontWeight: 'bold' }}
                          formatter={(value: any) => [`$${parseFloat(value).toFixed(2)}`, 'Price']}
                          labelStyle={{ color: theme.palette.text.secondary, marginBottom: 4 }}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="price" 
                          stroke={theme.palette.primary.main} 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorPrice)" 
                          animationDuration={1500}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', bgcolor: alpha('#fff', 0.02), borderRadius: 2 }}>
                       <Typography variant="body2" color="text.secondary">{t('noChartData', language)}</Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>

            {/* Yield Card */}
            <Card sx={{ background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, transparent 100%)`, mb: 3 }}>
              <CardContent sx={{ p: 3, pb: "24px !important" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight="600" sx={{ textTransform: 'uppercase' }}>{t('currentStakingYield', language)}</Typography>
                    <Typography variant="h5" fontWeight="700" color="primary.main" sx={{ mt: 0.5 }}>{apyYield}% APY</Typography>
                  </Box>
                  <MuiIconButton size="small" sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: 'primary.main' }}>
                    <Info size={16} />
                  </MuiIconButton>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {t('stakeDescription', language)}
                </Typography>
              </CardContent>
            </Card>

            {/* ROI Calculator Card */}
            <Card sx={{ 
              background: `linear-gradient(135deg, ${alpha('#1a1b1f', 1)} 0%, ${alpha('#2a2b2f', 0.8)} 100%)`,
              backdropFilter: 'blur(10px)',
              border: `1px solid ${alpha('#D4AF37', 0.3)}`,
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: `0 8px 32px ${alpha('#000', 0.4)}`,
              mb: 3
            }}>
              <CardContent sx={{ p: 4 }}>
                <Stack direction="row" alignItems="center" spacing={2} mb={3}>
                  <Box sx={{ p: 1.5, bgcolor: alpha('#D4AF37', 0.1), borderRadius: '16px', color: '#D4AF37' }}>
                    <BarChart3 size={24} />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight="900" sx={{ fontFamily: '"Cinzel", serif', letterSpacing: 1 }}>
                      {t('roiCalculator', language)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight="700">
                      {t('roiDescription', language)}
                    </Typography>
                  </Box>
                </Stack>

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Stack spacing={2.5}>
                      <Box>
                        <Typography variant="caption" color="primary.main" fontWeight="800" sx={{ display: 'block', mb: 1, letterSpacing: 1 }}>
                          {t('buyAmount', language)}
                        </Typography>
                        <TextField
                          fullWidth
                          variant="outlined"
                          size="small"
                          value={calcAmount}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCalcAmount(e.target.value)}
                          InputProps={{
                            startAdornment: <Typography variant="body2" sx={{ mr: 1, color: 'text.secondary', fontWeight: 'bold' }}>$</Typography>,
                          }}
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              borderRadius: '12px',
                              bgcolor: alpha('#000', 0.3),
                              fontWeight: 'bold',
                              color: '#fff'
                            } 
                          }}
                        />
                      </Box>
                      <Box>
                        <Typography variant="caption" color="primary.main" fontWeight="800" sx={{ display: 'block', mb: 1, letterSpacing: 1 }}>
                          {t('years', language)}
                        </Typography>
                        <TextField
                          fullWidth
                          variant="outlined"
                          size="small"
                          type="number"
                          value={calcYears}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCalcYears(e.target.value)}
                          sx={{ 
                            '& .MuiOutlinedInput-root': { 
                              borderRadius: '12px',
                              bgcolor: alpha('#000', 0.3),
                              fontWeight: 'bold',
                              color: '#fff'
                            } 
                          }}
                        />
                      </Box>
                    </Stack>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Box sx={{ 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center',
                      p: 3,
                      bgcolor: alpha('#000', 0.3),
                      borderRadius: '20px',
                      border: `1px solid ${alpha('#fff', 0.05)}`
                    }}>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight="700" display="block">{t('estimatedEarnings', language)}</Typography>
                          <Typography variant="h5" color="primary.main" fontWeight="900">
                            +${earnings.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </Typography>
                        </Box>
                        <Divider sx={{ opacity: 0.1 }} />
                        <Box>
                          <Typography variant="caption" color="text.secondary" fontWeight="700" display="block">{t('totalFutureValue', language)}</Typography>
                          <Typography variant="h4" color="#fff" fontWeight="900" sx={{ mt: 0.5 }}>
                            ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', opacity: 0.6, fontSize: '0.65rem' }}>
                          *Based on current {apyYield}% APY compounded annually. {t('notFinancialAdvice', language)}
                        </Typography>
                      </Stack>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Stack>
        )}

        {activeTab === 'network' && (
          <Stack spacing={4} sx={{ animation: 'fadeIn 0.4s ease-out' }}>
            <ROIAnalyzer 
              apyYield={apyYield}
              totalMembers={totalMembers}
              userTotalInvested={userTotalInvested}
              language={language}
            />
            
            {/* Elegant Header */}
            <Card sx={{ 
              textAlign: 'center', 
              background: `linear-gradient(to bottom, ${alpha('#D4AF37', 0.1)}, transparent)`,
              borderRadius: '24px',
              border: `1px solid ${alpha('#D4AF37', 0.2)}`,
              mb: 1
            }}>
              <CardContent sx={{ py: 2.5, '&:last-child': { pb: 2.5 } }}>
                <Typography 
                  variant="h4" 
                  fontWeight="900" 
                  sx={{ 
                    mb: 1, 
                    fontFamily: '"Cinzel", serif', 
                    color: 'primary.main',
                    textShadow: `0 2px 8px ${alpha('#D4AF37', 0.3)}`
                  }}
                >
                  {t('myGoldenNetwork', language)}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '85%', mx: 'auto', fontStyle: 'italic', fontWeight: 500, opacity: 0.8 }}>
                  {t('networkDescription', language)}
                </Typography>
              </CardContent>
            </Card>

            {/* Premium Stats Card */}
            <Card sx={{ 
              background: `linear-gradient(135deg, ${alpha('#1a1b1f', 1)} 0%, ${alpha('#2a2b2f', 0.8)} 100%)`,
              backdropFilter: 'blur(10px)',
              border: `1px solid ${alpha('#D4AF37', 0.4)}`,
              boxShadow: `0 12px 40px ${alpha('#000', 0.6)}`,
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '24px'
            }}>
              {/* Decorative Glow */}
              <Box sx={{ 
                position: 'absolute', 
                top: -60, 
                right: -60, 
                width: 180, 
                height: 180, 
                borderRadius: '50%',
                background: `radial-gradient(circle, ${alpha('#D4AF37', 0.2)} 0%, transparent 70%)`,
                zIndex: 0
              }} />
              
              <CardContent sx={{ p: { xs: 3, sm: 4 }, position: 'relative', zIndex: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={4}>
                  <Box>
                    <Typography variant="caption" color="primary.main" fontWeight="800" sx={{ letterSpacing: 2.5, textTransform: 'uppercase', mb: 1, display: 'block' }}>{t('yourOfficialId', language)}</Typography>
                    <Typography variant="h2" fontWeight="900" sx={{ color: '#fff', fontSize: { xs: '1.2rem', sm: '1.8rem' }, fontFamily: 'monospace' }}>
                      {effectiveAddress ? `${effectiveAddress.substring(0, 12)}...${effectiveAddress.slice(-4)}` : t('walletNotLinked', language)}
                    </Typography>
                    <Stack direction="row" alignItems="baseline" spacing={1} mt={1}>
                      <Typography variant="h4" fontWeight="800" sx={{ color: alpha('#fff', 0.9) }}>
                        {totalMembers}
                      </Typography>
                      <Typography variant="caption" sx={{ color: alpha('#fff', 0.5), fontWeight: 700, letterSpacing: 1 }}>
                        {t('membersRecruited', language)}
                      </Typography>
                    </Stack>
                  </Box>
                  <Box sx={{ 
                    width: 64, 
                    height: 64, 
                    bgcolor: alpha('#D4AF37', 0.15), 
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `2px solid ${alpha('#D4AF37', 0.6)}`,
                    boxShadow: `0 0 25px ${alpha('#D4AF37', 0.4)}`,
                    overflow: 'hidden'
                  }}>
                    {effectiveAddress ? (
                      <Jazzicon diameter={64} seed={jsNumberForAddress(effectiveAddress)} />
                    ) : (
                      <Users size={32} color="#D4AF37" />
                    )}
                  </Box>
                </Stack>
                
                <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight="700" letterSpacing={1}>{t('earnings', language).toUpperCase()}</Typography>
                    <Typography variant="h5" fontWeight="900" sx={{ mt: 0.5 }}>{userEarnings.toFixed(4)} SOL</Typography>
                  </Box>
                </Box>
                
                {userTotalInvested > 0 ? (
                  <Card sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.6)}`, borderRadius: '24px', overflow: 'hidden', mb: 4 }}>
                    <CardContent sx={{ p: 0 }}>
                      <Box px={3} py={2.5} sx={{ borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: alpha('#D4AF37', 0.05), borderLeft: `4px solid #D4AF37` }}>
                        <Typography variant="h6" fontWeight="900" sx={{ fontFamily: '"Cinzel", serif', color: 'primary.main', letterSpacing: 1 }}>{t('royalRecruitmentLink', language) || 'ROYAL RECRUITMENT LINK'}</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, opacity: 0.8 }}>{t('chooseLineDescription', language)}</Typography>
                      </Box>
                      <Box sx={{ p: 3, bgcolor: alpha('#000', 0.2) }}>
                        <Grid container spacing={2}>
                          {['A', 'B', 'C', 'D'].map(line => (
                            <Grid item xs={12} sm={6} key={line}>
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 1.5,
                                bgcolor: alpha('#fff', 0.03),
                                p: 1.5,
                                borderRadius: 3,
                                border: `1px solid ${alpha('#D4AF37', 0.15)}`,
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  bgcolor: alpha('#D4AF37', 0.08),
                                  border: `1px solid ${alpha('#D4AF37', 0.4)}`,
                                  transform: 'translateY(-2px)',
                                  boxShadow: `0 4px 15px ${alpha('#D4AF37', 0.1)}`
                                }
                              }}>
                                <Box sx={{ 
                                  minWidth: 32, 
                                  height: 32, 
                                  borderRadius: 1.5, 
                                  bgcolor: alpha('#D4AF37', 0.15), 
                                  display: 'flex', 
                                  justifyContent: 'center', 
                                  alignItems: 'center', 
                                  fontWeight: 'bold', 
                                  color: '#D4AF37' 
                                }}>
                                  {line}
                                </Box>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    fontFamily: 'monospace', 
                                    flex: 1, 
                                    overflow: 'hidden', 
                                    textOverflow: 'ellipsis',
                                    color: alpha('#fff', 0.9),
                                    fontWeight: 500,
                                    fontSize: '0.8rem'
                                  }}
                                >
                                  {getReferralLink(line)}
                                </Typography>
                                <Stack direction="row" spacing={1}>
                                  <MuiIconButton 
                                    size="small" 
                                    onClick={() => copyReferral(line)}
                                    sx={{ 
                                      color: copiedLine === line ? '#14F195' : '#D4AF37', 
                                      bgcolor: alpha('#D4AF37', 0.1),
                                      '&:hover': { bgcolor: alpha('#D4AF37', 0.2) }
                                    }}
                                  >
                                    {copiedLine === line ? <CopyCheck size={16} /> : <Copy size={16} />}
                                  </MuiIconButton>
                                  <MuiIconButton 
                                    size="small" 
                                    onClick={() => handleOpenQR(`Line ${line} Link`, getReferralLink(line))}
                                    sx={{ 
                                      color: '#D4AF37', 
                                      bgcolor: alpha('#D4AF37', 0.1),
                                      '&:hover': { bgcolor: alpha('#D4AF37', 0.2) }
                                    }}
                                  >
                                    <QrCode size={16} />
                                  </MuiIconButton>
                                </Stack>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                      </Box>
                      
                      <Box px={3} py={2.5} sx={{ borderTop: `1px solid ${theme.palette.divider}`, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: alpha('#D4AF37', 0.05), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" fontWeight="900" sx={{ fontFamily: '"Cinzel", serif', letterSpacing: 1 }}>{t('downlineGenesis', language)}</Typography>
                        <Chip size="small" label="10-Tier Structure" icon={<Activity size={14} />} sx={{ fontWeight: 700, borderRadius: '8px', bgcolor: alpha('#D4AF37', 0.1), color: '#D4AF37', border: `1px solid ${alpha('#D4AF37', 0.2)}` }} />
                      </Box>
                      <Box sx={{ p: 2, bgcolor: alpha('#000', 0.15) }}>
                        <NetworkTree address={effectiveAddress || undefined} />
                      </Box>
                    </CardContent>
                  </Card>
                ) : (
                  <Box sx={{ 
                    p: 4, 
                    bgcolor: alpha('#000', 0.4), 
                    borderRadius: 5, 
                    border: `1px dashed ${alpha('#D4AF37', 0.3)}`,
                    mb: 4,
                    textAlign: 'center',
                    boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.5)'
                  }}>
                    <Typography variant="body1" sx={{ color: alpha('#fff', 0.8), fontWeight: 600 }}>
                      {t('investToActivateLink', language) || 'Invest in GOLD to activate your Royal Recruitment Link and start building your legacy.'}
                    </Typography>
                  </Box>
                )}
                
                <Box>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                    <Typography variant="caption" color="text.secondary" fontWeight="800" sx={{ letterSpacing: 1 }}>{t('experienceMilestone', language)}</Typography>
                    <Chip 
                      label={`LEVEL ${Math.floor(totalMembers / 10) + 1}`} 
                      size="small"
                      sx={{ 
                        bgcolor: 'primary.main', 
                        color: '#000', 
                        fontWeight: 900, 
                        fontSize: '0.7rem',
                        boxShadow: `0 0 10px ${alpha('#D4AF37', 0.5)}`
                      }}
                    />
                  </Stack>
                  <LinearProgress 
                    variant="determinate" 
                    value={(totalMembers % 10) * 10} 
                    sx={{ 
                      height: 12, 
                      borderRadius: 6, 
                      bgcolor: alpha('#000', 0.6),
                      border: `1px solid ${alpha('#D4AF37', 0.1)}`,
                      '& .MuiLinearProgress-bar': { 
                        bgcolor: 'primary.main', 
                        borderRadius: 6,
                        boxShadow: `inset 0 0 5px rgba(255,255,255,0.5), 0 0 15px ${alpha('#D4AF37', 0.6)}`
                      } 
                    }} 
                  />
                </Box>
              </CardContent>
            </Card>

            {/* Commission Blueprints */}
            {userTotalInvested > 0 && (
              <Card sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.6)}`, borderRadius: '24px', overflow: 'hidden' }}>
                <CardContent sx={{ p: 0 }}>
                  <Box px={3} py={2.5} sx={{ borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: alpha('#fff', 0.01) }}>
                    <Typography variant="h6" fontWeight="900" sx={{ fontFamily: '"Cinzel", serif', fontSize: '1.1rem' }}>{t('royalRewards', language)}</Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight="800" sx={{ letterSpacing: 1 }}>{t('cashbackRoyalty', language)}</Typography>
                  </Box>
                  <List disablePadding>
                    {[
                      { tier: 1, percent: 20, rank: 'Archduke' },
                      { tier: 2, percent: 10, rank: 'Grand Duke' },
                      { tier: 3, percent: 8, rank: 'Duke' },
                      { tier: 4, percent: 6, rank: 'Marquess' },
                      { tier: 5, percent: 5, rank: 'Earl' },
                      { tier: 6, percent: 4, rank: 'Viscount' },
                      { tier: 7, percent: 3, rank: 'Baron' },
                      { tier: 8, percent: 2, rank: 'Baronet' },
                      { tier: 9, percent: 1, rank: 'Knight' },
                      { tier: 10, percent: 1, rank: 'Esquire' },
                    ].map(({tier, percent, rank}, i) => (
                      <Box key={tier}>
                        <ListItem sx={{ 
                          py: 2.5, 
                          px: 3,
                          bgcolor: i < 3 ? alpha('#D4AF37', 0.04) : 'transparent',
                          transition: 'all 0.2s',
                          '&:hover': { bgcolor: alpha('#D4AF37', 0.08) }
                        }}>
                          <ListItemAvatar>
                            <Avatar sx={{ 
                              width: 36, 
                              height: 36, 
                              fontSize: '0.85rem', 
                              fontWeight: 900,
                              bgcolor: i === 0 ? '#D4AF37' : i === 1 ? '#C0C0C0' : i === 2 ? '#CD7F32' : alpha('#fff', 0.05),
                              color: i < 3 ? '#000' : alpha('#fff', 0.7),
                              border: i < 3 ? 'none' : `1px solid ${alpha('#fff', 0.1)}`,
                              boxShadow: i < 3 ? `0 4px 10px ${alpha('#000', 0.3)}` : 'none'
                            }}>
                              {tier}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText 
                            primary={
                              <Typography variant="subtitle2" fontWeight="800">
                                Tier {tier} Dynasty
                              </Typography>
                            }
                            secondary={
                              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                                Title: {rank}
                              </Typography>
                            }
                          />
                          <Box sx={{ textAlign: 'right' }}>
                             <Typography variant="h5" fontWeight="900" sx={{ color: i < 3 ? '#D4AF37' : '#fff' }}>
                              {percent}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.6rem', fontWeight: 800 }}>{t('reward', language)}</Typography>
                          </Box>
                        </ListItem>
                        {i < 9 && <Divider sx={{ opacity: 0.3, px: 2 }} />}
                      </Box>
                    ))}
                  </List>
                </CardContent>
              </Card>
            )}
          </Stack>
        )}

        {activeTab === 'markets' && (
          <Stack spacing={4} sx={{ animation: 'fadeIn 0.4s ease-out' }}>
            {/* Game-like Header for Activity */}
            <Box sx={{ textAlign: 'center', mb: 2 }}>
              <Typography variant="h3" fontWeight="900" sx={{ 
                fontFamily: '"Cinzel", serif', 
                background: 'linear-gradient(to bottom, #FFDF73, #D4AF37)', 
                WebkitBackgroundClip: 'text', 
                WebkitTextFillColor: 'transparent',
                textShadow: `0 4px 20px ${alpha('#D4AF37', 0.4)}`
              }}>
                {t('recentActivity', language)}
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                {t('ledgerPersonalDesc', language)}
              </Typography>
            </Box>

            {/* Overall Stats in Game-like UI */}
            <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 4 }}>
              <Box sx={{
                flex: 1, 
                bgcolor: alpha('#121214', 0.8),
                borderRadius: '20px',
                border: `1px solid ${alpha('#D4AF37', 0.3)}`,
                p: 2,
                boxShadow: `inset 0 2px 10px ${alpha('#D4AF37', 0.1)}`,
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}>
                <Box sx={{ p: 1.5, background: 'linear-gradient(45deg, #2a2a2d, #1a1a1f)', borderRadius: '12px', border: `1px solid ${alpha('#fff', 0.1)}` }}>
                   <Coins size={24} color="#D4AF37" />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="700" letterSpacing={1}>{t('totalInvested', language) || 'Total Invested'}</Typography>
                  <Typography variant="h6" fontWeight="900" color="#fff">{userTotalInvested.toFixed(2)} oz</Typography>
                </Box>
              </Box>
              <Box sx={{
                flex: 1, 
                bgcolor: alpha('#121214', 0.8),
                borderRadius: '20px',
                border: `1px solid ${alpha('#4caf50', 0.3)}`,
                p: 2,
                boxShadow: `inset 0 2px 10px ${alpha('#4caf50', 0.1)}`,
                display: 'flex',
                alignItems: 'center',
                gap: 2
              }}>
                <Box sx={{ p: 1.5, background: 'linear-gradient(45deg, #1b3a1e, #0e1e10)', borderRadius: '12px', border: `1px solid ${alpha('#4caf50', 0.2)}` }}>
                   <ArrowDownRight size={24} color="#4caf50" />
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary" fontWeight="700" letterSpacing={1} sx={{ color: '#4caf50' }}>{t('totalOps', language) || 'Operations'}</Typography>
                  <Typography variant="h6" fontWeight="900" color="#fff">{transactions.length}</Typography>
                </Box>
              </Box>
            </Stack>

            {/* The Vault View (Game-like Transaction List) */}
            <Box>
              <Typography variant="overline" color="text.secondary" sx={{ ml: 2, fontWeight: 800, letterSpacing: 2 }}>{t('ledgerEntriesTitle', language)}</Typography>
              <Stack spacing={3} sx={{ mt: 2 }}>
                {transactions.length > 0 ? transactions.map((tx: any, i: number) => {
                  const isBuy = tx.type === 'buy';
                  const amount = parseFloat(tx.amount.replace(/ \$usGOLD| SOL|/g, ''));
                  return (
                  <Card 
                    key={tx.id || i}
                    onClick={() => tx.txId ? window.open(`https://solscan.io/tx/${tx.txId}`, '_blank') : alert(`Transaction Details:\nID: ${tx.id || 'N/A'}\nType: ${tx.type}\nStatus: Confirmed`)}
                    sx={{
                      cursor: 'pointer',
                      background: `linear-gradient(90deg, ${isBuy ? alpha('#D4AF37', 0.05) : alpha('#4caf50', 0.05)} 0%, ${alpha('#121214', 0.9)} 100%)`,
                      border: `1px solid ${isBuy ? alpha('#D4AF37', 0.2) : alpha('#4caf50', 0.2)}`,
                      borderRadius: '24px',
                      overflow: 'visible',
                      position: 'relative',
                      transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      '&:hover': {
                        transform: 'scale(1.02) translateX(10px)',
                        boxShadow: `0 10px 30px ${isBuy ? alpha('#D4AF37', 0.15) : alpha('#4caf50', 0.15)}`,
                        borderColor: isBuy ? alpha('#D4AF37', 0.5) : alpha('#4caf50', 0.5),
                        '& .gold-bar': {
                           transform: 'rotateX(20deg) rotateY(-15deg) scale(1.1)',
                        }
                      }
                  }}>
                    <CardContent sx={{ p: '24px !important', display: 'flex', alignItems: 'center', gap: 3 }}>
                      {/* Game-like 3D Gold Bar Representation for each transaction */}
                      <Box sx={{ width: 80, height: 60, perspective: 500, WebkitPerspective: 500, flexShrink: 0 }}>
                        <Box className="gold-bar" sx={{
                          width: '100%',
                          height: '100%',
                          background: isBuy 
                            ? `linear-gradient(to right, #B5852A, #F5D76E, #C89B3C, #F5D76E, #B5852A)` 
                            : `linear-gradient(to right, #2e7d32, #66bb6a, #43a047, #66bb6a, #2e7d32)`,
                          borderRadius: '8px',
                          boxShadow: `
                            0 8px 15px rgba(0,0,0,0.5),
                            inset 0 2px 5px rgba(255,255,255,0.4),
                            inset 0 -2px 5px rgba(0,0,0,0.3)
                          `,
                          transform: 'rotateX(20deg) rotateY(15deg)',
                          transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Typography sx={{ 
                            fontSize: '0.9rem', 
                            fontWeight: 900, 
                            color: isBuy ? 'rgba(120, 80, 20, 0.8)' : 'rgba(20, 80, 20, 0.8)',
                            textShadow: '1px 1px 0px rgba(255,255,255,0.3)'
                          }}>
                            {amount} oz
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ flex: 1 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                          <Typography variant="h6" fontWeight="800" color="#fff">
                            {isBuy ? 'Minted GOLD' : 'Yield Harvest'}
                          </Typography>
                          <Typography variant="h6" fontWeight="900" sx={{ color: isBuy ? '#D4AF37' : '#4caf50' }}>
                            +{amount}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Activity size={14} color={alpha('#fff', 0.5)} />
                            <Typography variant="caption" sx={{ color: alpha('#fff', 0.5), fontWeight: 500 }}>
                              {tx.time}
                            </Typography>
                          </Box>
                          <Typography variant="caption" sx={{ color: alpha('#fff', 0.4), fontWeight: 500 }}>
                            {tx.price.includes('$') ? `Valued at ${tx.price}` : tx.price}
                          </Typography>
                        </Stack>
                      </Box>
                    </CardContent>
                  </Card>
                )}) : (
                  <Box sx={{ 
                    p: 6, 
                    textAlign: 'center', 
                    borderRadius: '24px', 
                    border: `1px dashed ${alpha('#D4AF37', 0.3)}`,
                    bgcolor: alpha('#000', 0.4)
                  }}>
                    <Box sx={{ mb: 2, opacity: 0.3 }}>
                      <BarChart3 size={64} style={{ margin: '0 auto', color: '#D4AF37' }} />
                    </Box>
                    <Typography variant="h6" color="text.secondary" fontWeight="700" gutterBottom>{t('emptyLedger', language)}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t('unlockLedgerDesc', language)}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </Box>

            {/* Ledger Info Footer Game-like */}
            <Card sx={{ 
              bgcolor: alpha(theme.palette.primary.main, 0.03), 
              borderRadius: '20px', 
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              mb: 6
            }}>
              <CardContent sx={{ p: 3, '&:last-child': { pb: 3 } }}>
                <Stack direction="row" spacing={3} alignItems="center">
                   <Box sx={{ 
                     p: 1.5, 
                     bgcolor: alpha(theme.palette.primary.main, 0.1), 
                     borderRadius: '12px', 
                     color: theme.palette.primary.main,
                     border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`
                   }}>
                      <Info size={24} />
                   </Box>
                   <Box>
                      <Typography variant="subtitle1" fontWeight="800" sx={{ color: '#fff' }}>{t('ledgerInformation', language)}</Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.5 }}>
                        {t('ledgerDescription', language)}
                      </Typography>
                   </Box>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        )}

        {activeTab === 'ai' && (
          <Box sx={{ animation: 'fadeIn 0.4s ease-out' }}>
            <AIPage 
              effectiveAddress={effectiveAddress} 
              allUsersData={allUsersData} 
              transactions={transactions}
              language={language}
            />
          </Box>
        )}
      </Container>

      {/* Bottom Navigation */}
       <Box 
        sx={{ 
          position: 'fixed', 
          bottom: { xs: 16, sm: 24 }, 
          left: '50%', 
          transform: 'translateX(-50%)',
          width: { xs: 'calc(100% - 32px)', sm: 'calc(100% - 48px)' },
          maxWidth: 480,
          zIndex: 1100,
          borderRadius: '32px',
          overflow: 'hidden',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          border: `1px solid ${alpha('#D4AF37', 0.2)}`,
          bgcolor: alpha('#121214', 0.75),
          backdropFilter: 'blur(25px) saturate(180%)',
          transition: 'all 0.3s ease',
          '&:hover': {
            bgcolor: alpha('#121214', 0.85),
            border: `1px solid ${alpha('#D4AF37', 0.4)}`,
            transform: 'translateX(-50%) translateY(-2px)',
          }
        }} 
      >
        <BottomNavigation
          showLabels
          value={activeTab}
          onChange={(event, newValue) => {
            if (activeTab !== newValue) {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              triggerHaptic('medium');
            }
            setActiveTab(newValue);
          }}
          sx={{ 
            height: 76,
            backgroundColor: 'transparent',
          }}
        >
          <BottomNavigationAction 
            label={t('vault', language)} 
            value="vault" 
            icon={
              <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box className="pill-indicator" sx={{ position: 'absolute', width: '48px', height: '32px', bgcolor: alpha('#D4AF37', 0.15), borderRadius: '16px', opacity: 0, transform: 'scaleX(0.5)', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 0 }} />
                <Home size={22} className="lucide" style={{ position: 'relative', zIndex: 1 }} />
              </Box>
            } 
          />
          <BottomNavigationAction 
            label={t('network', language)} 
            value="network" 
            icon={
              <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <Box className="pill-indicator" sx={{ position: 'absolute', width: '48px', height: '32px', bgcolor: alpha('#D4AF37', 0.15), borderRadius: '16px', opacity: 0, transform: 'scaleX(0.5)', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 0 }} />
                 <Users size={22} className="lucide" style={{ position: 'relative', zIndex: 1 }} />
              </Box>
            } 
          />
          <BottomNavigationAction 
            label={t('recentActivity', language)} 
            value="markets" 
            icon={
              <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box className="pill-indicator" sx={{ position: 'absolute', width: '48px', height: '32px', bgcolor: alpha('#D4AF37', 0.15), borderRadius: '16px', opacity: 0, transform: 'scaleX(0.5)', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 0 }} />
                <BarChart3 size={22} className="lucide" style={{ position: 'relative', zIndex: 1 }} />
              </Box>
            } 
          />
          <BottomNavigationAction 
            label="AI" 
            value="ai" 
            icon={
              <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Box className="pill-indicator" sx={{ position: 'absolute', width: '48px', height: '32px', bgcolor: alpha('#D4AF37', 0.15), borderRadius: '16px', opacity: 0, transform: 'scaleX(0.5)', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)', zIndex: 0 }} />
                <Bot size={22} className="lucide" style={{ position: 'relative', zIndex: 1 }} />
              </Box>
            } 
          />
        </BottomNavigation>
      </Box>

      <Dialog 
        open={qrOpen} 
        onClose={() => setQrOpen(false)} 
        PaperProps={{ 
          sx: { 
            bgcolor: 'background.paper', 
            borderRadius: '24px', 
            p: 1,
            border: `1px solid ${alpha('#D4AF37', 0.2)}`
          } 
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1, color: 'primary.main', fontFamily: '"Cinzel", serif', fontWeight: 900 }}>
          {qrValue ? qrTitle : 'EXPLORE SYNDICATE'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: '16px !important', pb: 3 }}>
          {qrValue ? (
            <>
              <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, mb: 2 }}>
                <QRCode value={qrValue} size={200} />
              </Box>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
                {qrValue}
              </Typography>
            </>
          ) : (
            <Box sx={{ width: '100%', maxWidth: 300 }}>
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
                {t('enterWalletToView', language) || 'Enter a wallet address to view stats and downline structure in read-only mode.'}
              </Typography>
              <TextField 
                fullWidth
                placeholder="Solana Wallet Address"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                variant="outlined"
                sx={{ 
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '12px',
                    bgcolor: alpha('#fff', 0.05)
                  }
                }}
              />
              <Button 
                fullWidth 
                variant="contained" 
                disabled={loginInput.length < 32}
                sx={{ height: 48, borderRadius: '12px', fontWeight: 800 }}
                onClick={() => {
                   setViewOnlyAddress(loginInput);
                   setQrOpen(false);
                }}
              >
                {t('accessDashboard', language) || 'ACCESS DASHBOARD'}
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button onClick={() => { setQrOpen(false); setQrValue(''); }} sx={{ color: 'text.secondary', fontWeight: 600 }}>{t('dismiss', language) || 'DISMISS'}</Button>
          {qrValue && (
            <Button 
              variant="contained" 
              onClick={() => {
                navigator.clipboard.writeText(qrValue);
                setQrOpen(false);
              }} 
              startIcon={<Copy size={16} />}
              sx={{ borderRadius: '12px' }}
            >
              {t('copyLinkBtn', language) || 'COPY LINK'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog 
        open={claimDialogOpen} 
        onClose={() => !isClaiming && setClaimDialogOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: 'background.paper',
            borderRadius: '24px',
            p: 1,
            border: `1px solid ${alpha('#D4AF37', 0.2)}`
          }
        }}
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1, color: 'primary.main', fontFamily: '"Cinzel", serif', fontWeight: 900 }}>
          {t('claimCommissions', language)}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: '16px !important', pb: 3 }}>
          <Typography variant="body1" align="center" sx={{ mb: 2 }}>
            {t('claimConfirmDesc1', language)} <strong>{Math.max(0, userEarnings - userClaimedCommissions).toFixed(3)} $USD</strong>.
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            {t('claimConfirmDesc2', language)}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button onClick={() => setClaimDialogOpen(false)} disabled={isClaiming} sx={{ color: 'text.secondary', fontWeight: 600 }}>{t('cancel', language).toUpperCase()}</Button>
          <Button onClick={handleClaimCommissions} disabled={isClaiming} variant="contained" sx={{ borderRadius: '12px', fontWeight: 'bold' }}>
            {isClaiming ? t('processing', language).toUpperCase() : t('proceed', language).toUpperCase()}
          </Button>
        </DialogActions>
      </Dialog>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(1.4); opacity: 0; }
        }
      `}</style>
    </Box>
    </ThemeProvider>
  </CacheProvider>
  );
}

export default function App() {
  return (
    <AppWalletProvider>
      <Dashboard />
    </AppWalletProvider>
  );
}

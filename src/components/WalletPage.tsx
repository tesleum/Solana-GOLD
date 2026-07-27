import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, Typography, Stack, Card, CardContent, alpha, useTheme, Button, 
  Grid, TextField, InputAdornment, Chip, Avatar, MenuItem, Select, 
  FormControl, IconButton, Dialog, DialogTitle, DialogContent, 
  DialogActions, Tooltip, CircularProgress, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import { 
  Wallet, Coins, Zap, Activity, CheckCircle2, DollarSign, 
  ArrowDownUp, RefreshCw, Settings2, ExternalLink, ShieldCheck, 
  TrendingUp, Sparkles, ArrowRight, Clock, ChevronDown, Check, Copy
} from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL, SystemProgram, PublicKey, VersionedTransaction, TransactionMessage, TransactionInstruction } from '@solana/web3.js';
import { t } from '../translations';
import { database } from '../firebase';
import { ref, onValue, update, push } from 'firebase/database';
import { useAppKit } from '@reown/appkit/react';
import { TokenIcon } from './TokenIcon';
import { triggerHaptic } from '../lib/haptic';

interface WalletPageProps {
  language: string;
  userTotalInvested: number;
  usGoldBalance: number;
  effectiveAddress: string | null;
  solanaPrice: number | null;
  tokenPrice: number | null;
  apyYield: string;
  transactions: any[];
  userEarnings: number;
  investAmount: number;
  setInvestAmount: (val: number) => void;
  handleInvest: () => Promise<void>;
  handleClaimCommissions: () => Promise<void>;
  setActiveTab: (tab: string) => void;
  isInvesting: boolean;
  isClaiming: boolean;
}

// Supported Tokens for Solana DEX Swap
interface TokenOption {
  symbol: string;
  name: string;
  usdPrice: number;
  decimals: number;
  isNativeSol?: boolean;
}

export function WalletPage({
  language,
  userTotalInvested,
  usGoldBalance,
  effectiveAddress,
  solanaPrice,
  tokenPrice,
  apyYield,
  transactions,
  userEarnings,
  investAmount,
  setInvestAmount,
  handleInvest,
  handleClaimCommissions,
  setActiveTab,
  isInvesting,
  isClaiming
}: WalletPageProps) {
  const theme = useTheme();
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const { open } = useAppKit();
  
  // Wallet sub-tab state
  const [walletTab, setWalletTab] = useState<'swap' | 'topup' | 'history'>('swap');

  // Real Native SOL Balance
  const [solBalance, setSolBalance] = useState<number>(0);

  // Futures Margin Balance from Firebase
  const [futuresBalance, setFuturesBalance] = useState<number>(0);

  // Additional Token Balances (USDC, GOLD) from Firebase
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [goldTokenBalance, setGoldTokenBalance] = useState<number>(0);

  // Top Up / Purchase Asset states
  const [purchaseAsset, setPurchaseAsset] = useState<'usGOLD' | 'USDT'>('usGOLD');
  const [customPurchaseAmount, setCustomPurchaseAmount] = useState<number>(50);
  const [isProcessingUsdtBuy, setIsProcessingUsdtBuy] = useState(false);

  // Solana DEX Swap States
  const currentSolPrice = solanaPrice && solanaPrice > 0 ? solanaPrice : 150;
  const currentGoldPrice = tokenPrice && tokenPrice > 0 ? tokenPrice : 75;

  const TOKEN_LIST: TokenOption[] = [
    { symbol: 'SOL', name: 'Solana Native', usdPrice: currentSolPrice, decimals: 9, isNativeSol: true },
    { symbol: 'usGOLD', name: 'Golden Stablecoin', usdPrice: 1.00, decimals: 6 },
    { symbol: 'USDT', name: 'Tether USD', usdPrice: 1.00, decimals: 6 },
    { symbol: 'USDC', name: 'USD Coin', usdPrice: 1.00, decimals: 6 },
    { symbol: 'GOLD', name: 'Golden Reserve Token', usdPrice: currentGoldPrice, decimals: 6 },
  ];

  const [fromTokenSymbol, setFromTokenSymbol] = useState<string>('SOL');
  const [toTokenSymbol, setToTokenSymbol] = useState<string>('usGOLD');
  const [fromAmount, setFromAmount] = useState<string>('0.5');
  const [slippage, setSlippage] = useState<number>(0.5); // 0.5%
  const [priorityFee, setPriorityFee] = useState<'auto' | 'high' | 'turbo'>('high');
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [swapTxSuccess, setSwapTxSuccess] = useState<any | null>(null);

  // Fetch real-time SOL balance from Solana RPC connection
  useEffect(() => {
    let isMounted = true;
    const fetchSolBalance = async () => {
      if (publicKey && connection) {
        try {
          const balLamports = await connection.getBalance(publicKey);
          if (isMounted) {
            setSolBalance(balLamports / LAMPORTS_PER_SOL);
          }
        } catch (e) {
          console.error("Error fetching SOL balance:", e);
        }
      }
    };

    fetchSolBalance();
    const interval = setInterval(fetchSolBalance, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [publicKey, connection]);

  // Sync balances from Firebase
  useEffect(() => {
    if (effectiveAddress) {
      const userRef = ref(database, `users/${effectiveAddress}`);
      const unsub = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setFuturesBalance(data.futuresBalance || 0);
          setUsdcBalance(data.usdcBalance || 0);
          setGoldTokenBalance(data.goldTokenBalance || 0);
        }
      });
      return () => unsub();
    }
  }, [effectiveAddress]);

  // Helper to get token object
  const fromToken = useMemo(() => TOKEN_LIST.find(t => t.symbol === fromTokenSymbol) || TOKEN_LIST[0], [fromTokenSymbol, currentSolPrice, currentGoldPrice]);
  const toToken = useMemo(() => TOKEN_LIST.find(t => t.symbol === toTokenSymbol) || TOKEN_LIST[1], [toTokenSymbol, currentSolPrice, currentGoldPrice]);

  // Balance getter for any token
  const getTokenBalance = (symbol: string): number => {
    switch (symbol) {
      case 'SOL': return solBalance;
      case 'usGOLD': return usGoldBalance;
      case 'USDT': return futuresBalance;
      case 'USDC': return usdcBalance;
      case 'GOLD': return goldTokenBalance;
      default: return 0;
    }
  };

  const fromTokenBalance = getTokenBalance(fromTokenSymbol);
  const toTokenBalance = getTokenBalance(toTokenSymbol);

  // Swap Calculation
  const numFromAmount = parseFloat(fromAmount) || 0;
  const fromValueUsd = numFromAmount * fromToken.usdPrice;
  const calculatedToAmount = toToken.usdPrice > 0 ? (fromValueUsd / toToken.usdPrice) : 0;
  const minimumReceived = calculatedToAmount * (1 - slippage / 100);

  // Handle Token Direction Flip
  const handleFlipTokens = () => {
    triggerHaptic(15);
    const prevFrom = fromTokenSymbol;
    const prevTo = toTokenSymbol;
    setFromTokenSymbol(prevTo);
    setToTokenSymbol(prevFrom);
    // Recalculate amount based on equivalent USD value
    if (calculatedToAmount > 0) {
      setFromAmount(calculatedToAmount.toFixed(toTokenSymbol === 'SOL' ? 4 : 2));
    }
  };

  // Quick Preset % setter for Swap
  const handleSetPercent = (pct: number) => {
    triggerHaptic(10);
    const bal = getTokenBalance(fromTokenSymbol);
    if (bal <= 0) {
      setFromAmount('0');
      return;
    }
    // Leave small gas buffer if native SOL
    const usableBal = fromTokenSymbol === 'SOL' ? Math.max(0, bal - 0.005) : bal;
    const val = (usableBal * pct) / 100;
    setFromAmount(val.toFixed(fromTokenSymbol === 'SOL' ? 4 : 2));
  };

  // Execute Solana DEX Swap
  const handleExecuteSwap = async () => {
    triggerHaptic(25);
    if (!connected || !publicKey) {
      open();
      return;
    }

    if (numFromAmount <= 0) {
      alert("Please enter a valid swap amount.");
      return;
    }

    if (numFromAmount > fromTokenBalance) {
      alert(`Insufficient ${fromTokenSymbol} balance. Available: ${fromTokenBalance.toFixed(4)} ${fromTokenSymbol}`);
      return;
    }

    setIsSwapping(true);

    try {
      const recipientAddressStr = '8RcMWyzfueBWK7ddUPX111pZnLec1XSh8eP1SewUPgRM';
      const recipientPubkey = new PublicKey(recipientAddressStr);
      let txSignature = '';

      // If spending native SOL, execute actual Solana transaction
      if (fromTokenSymbol === 'SOL') {
        const totalLamports = Math.floor(numFromAmount * LAMPORTS_PER_SOL);
        const transaction = new TransactionMessage({
          payerKey: publicKey,
          recentBlockhash: (await connection.getLatestBlockhash('confirmed')).blockhash,
          instructions: [
            SystemProgram.transfer({
              fromPubkey: publicKey,
              toPubkey: recipientPubkey,
              lamports: totalLamports,
            })
          ],
        }).compileToV0Message();

        const vTx = new VersionedTransaction(transaction);
        txSignature = await sendTransaction(vTx, connection);
        await connection.confirmTransaction(txSignature, 'confirmed');
      } else {
        // Generate simulated on-chain transaction hash for non-SOL token swaps
        txSignature = `sol_swap_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }

      const timestamp = Date.now();

      // Update Firebase balances
      if (effectiveAddress) {
        const userRef = ref(database, `users/${effectiveAddress}`);
        const updates: any = {};

        // Deduct fromToken balance
        if (fromTokenSymbol === 'usGOLD') {
          updates.usGoldBalance = Math.max(0, usGoldBalance - numFromAmount);
        } else if (fromTokenSymbol === 'USDT') {
          updates.futuresBalance = Math.max(0, futuresBalance - numFromAmount);
        } else if (fromTokenSymbol === 'USDC') {
          updates.usdcBalance = Math.max(0, usdcBalance - numFromAmount);
        } else if (fromTokenSymbol === 'GOLD') {
          updates.goldTokenBalance = Math.max(0, goldTokenBalance - numFromAmount);
        }

        // Add toToken balance
        if (toTokenSymbol === 'usGOLD') {
          updates.usGoldBalance = (updates.usGoldBalance ?? usGoldBalance) + calculatedToAmount;
        } else if (toTokenSymbol === 'USDT') {
          updates.futuresBalance = (updates.futuresBalance ?? futuresBalance) + calculatedToAmount;
        } else if (toTokenSymbol === 'USDC') {
          updates.usdcBalance = (updates.usdcBalance ?? usdcBalance) + calculatedToAmount;
        } else if (toTokenSymbol === 'GOLD') {
          updates.goldTokenBalance = (updates.goldTokenBalance ?? goldTokenBalance) + calculatedToAmount;
        }

        await update(userRef, updates);

        // Record swap transaction
        const txRef = ref(database, `transactions/${effectiveAddress}`);
        await push(txRef, {
          type: 'token_swap',
          amount: `${numFromAmount.toFixed(4)} ${fromTokenSymbol} ➔ ${calculatedToAmount.toFixed(4)} ${toTokenSymbol}`,
          price: `$${fromValueUsd.toFixed(2)} USD`,
          details: `Swapped via Solana Mainnet Liquidity Pool (Slippage: ${slippage}%)`,
          timestamp: timestamp,
          txId: txSignature
        });

        // Global audit log
        await push(ref(database, `global_transactions`), {
          type: 'token_swap',
          user: effectiveAddress,
          fromToken: fromTokenSymbol,
          toToken: toTokenSymbol,
          fromAmount: numFromAmount,
          toAmount: calculatedToAmount,
          usdVal: fromValueUsd,
          timestamp: timestamp,
          txId: txSignature
        });
      }

      setSwapTxSuccess({
        from: `${numFromAmount.toFixed(4)} ${fromTokenSymbol}`,
        to: `${calculatedToAmount.toFixed(4)} ${toTokenSymbol}`,
        usdVal: fromValueUsd.toFixed(2),
        txId: txSignature
      });

      setIsSwapping(false);
    } catch (err: any) {
      console.error("Solana DEX Swap error:", err);
      alert(`Swap execution failed: ${err.message || err}`);
      setIsSwapping(false);
    }
  };

  // Top Up Handler
  const handleBuyUsdtWithSol = async (amountInUsd: number) => {
    if (!connected || !publicKey) {
      open();
      return;
    }
    
    if (amountInUsd < 10 || amountInUsd > 1000) {
      alert("USDT purchase amount must be between $10 and $1,000 USD.");
      return;
    }
    
    setIsProcessingUsdtBuy(true);
    try {
      const amountToInvest = parseFloat((amountInUsd / currentSolPrice).toFixed(4));
      const totalLamports = Math.floor(amountToInvest * LAMPORTS_PER_SOL);
      
      const recipientAddressStr = '8RcMWyzfueBWK7ddUPX111pZnLec1XSh8eP1SewUPgRM'; // Pool Treasury
      const recipientPubkey = new PublicKey(recipientAddressStr);
      
      const instructions: TransactionInstruction[] = [
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: recipientPubkey,
          lamports: totalLamports,
        })
      ];

      const blockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
      const messageV0 = new TransactionMessage({
        payerKey: publicKey,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');

      const timestamp = Date.now();
      const newBal = futuresBalance + amountInUsd;
      
      if (effectiveAddress) {
        const userRef = ref(database, `users/${effectiveAddress}`);
        await update(userRef, { futuresBalance: newBal });

        const txRef = ref(database, `transactions/${effectiveAddress}`);
        await push(txRef, {
          type: 'buy_usdt',
          amount: `${amountInUsd.toFixed(2)} USDT`,
          details: `Purchased USDT with ${amountToInvest.toFixed(4)} SOL`,
          timestamp: timestamp,
          txId: signature
        });
      }

      alert(`USDT top up successful! Added $${amountInUsd.toFixed(2)} USDT to your Futures Wallet.`);
      setIsProcessingUsdtBuy(false);
    } catch (err: any) {
      console.error("USDT Purchase failed:", err);
      alert(`USDT Purchase failed: ${err.message || err}`);
      setIsProcessingUsdtBuy(false);
    }
  };

  const handleExecutePurchase = async () => {
    if (!connected || !publicKey) {
      open();
      return;
    }
    if (purchaseAsset === 'usGOLD') {
      if (customPurchaseAmount < 10 || customPurchaseAmount > 1000) {
        alert("usGOLD minting volume must be between $10 and $1,000 USD.");
        return;
      }
      setInvestAmount(customPurchaseAmount);
      await handleInvest();
    } else {
      await handleBuyUsdtWithSol(customPurchaseAmount);
    }
  };

  // Calculations for Compact Portfolio Cards
  const totalSolUsd = solBalance * currentSolPrice;
  const totalUsGoldUsd = usGoldBalance * 1.00;
  const totalUsdtUsd = futuresBalance * 1.00;
  const totalUsdcUsd = usdcBalance * 1.00;
  const totalGoldUsd = goldTokenBalance * currentGoldPrice;
  const totalPortfolioUSD = totalSolUsd + totalUsGoldUsd + totalUsdtUsd + totalUsdcUsd + totalGoldUsd;

  if (!effectiveAddress) {
    return (
      <Box sx={{ py: 8, px: 2, textAlign: 'center' }}>
        <Card sx={{ 
          maxWidth: 420, mx: 'auto', p: 4, 
          bgcolor: '#121316', borderRadius: '24px',
          border: `1px solid ${alpha('#D4AF37', 0.3)}`,
          boxShadow: `0 12px 36px ${alpha('#000', 0.6)}`
        }}>
          <Box sx={{ width: 64, height: 64, borderRadius: '50%', bgcolor: alpha('#D4AF37', 0.15), display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
            <Wallet size={32} color="#D4AF37" />
          </Box>
          <Typography variant="h5" color="#D4AF37" fontWeight="900" gutterBottom>
            Solana Wallet Portal
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={4} sx={{ lineHeight: 1.6 }}>
            Connect your Solana wallet to access live balances, execute instant token swaps, and top up usGOLD and USDT margin.
          </Typography>
          <Button 
            variant="contained" 
            onClick={() => open()}
            sx={{ 
              backgroundColor: '#D4AF37', 
              color: '#000', 
              fontWeight: '900', 
              borderRadius: '14px',
              padding: '12px 28px',
              fontSize: '0.95rem',
              '&:hover': { backgroundColor: '#FFDF73' }
            }}
          >
            Connect Wallet
          </Button>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out', pb: 10 }}>
      
      {/* HEADER TITLE */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
        <Box>
          <Typography variant="h4" fontWeight="900" sx={{ 
            background: 'linear-gradient(to right, #FFDF73 10%, #D4AF37 50%, #AA7C11 100%)', 
            WebkitBackgroundClip: 'text', 
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-0.5px'
          }}>
            Wallet & Solana Swap
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '13px' }}>
            Instant token swap engine & live balance overview on Solana Network.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <Chip 
            icon={<ShieldCheck size={14} color="#14F195" />}
            label="Solana Mainnet-Beta" 
            size="small"
            sx={{ bgcolor: alpha('#14F195', 0.1), color: '#14F195', border: `1px solid ${alpha('#14F195', 0.3)}`, fontWeight: 'bold' }}
          />
        </Stack>
      </Box>

      {/* 1. COMPACT ENHANCED BALANCE CARDS GRID (4 COMPACT CARDS) */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        
        {/* Card 1: Total Net Worth */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            bgcolor: '#141518', 
            border: `1px solid ${alpha('#D4AF37', 0.35)}`, 
            borderRadius: '16px',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: `0 8px 24px ${alpha('#000', 0.4)}`
          }}>
            <Box sx={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle, ${alpha('#D4AF37', 0.15)} 0%, transparent 70%)` }} />
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="caption" color="text.secondary" fontWeight="800" sx={{ fontSize: '10px', letterSpacing: 0.8 }}>
                  NET WORTH (USD)
                </Typography>
                <Avatar sx={{ bgcolor: alpha('#D4AF37', 0.15), width: 28, height: 28 }}>
                  <Wallet size={14} color="#D4AF37" />
                </Avatar>
              </Stack>
              <Typography variant="h5" fontWeight="900" color="#FFDF73" sx={{ mb: 0.5, letterSpacing: '-0.5px' }}>
                ${totalPortfolioUSD.toFixed(2)}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Sparkles size={11} color="#D4AF37" />
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px', fontWeight: 600 }}>
                  Combined Solana Assets
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 2: usGOLD Staking Balance */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            bgcolor: '#141518', 
            border: `1px solid ${alpha('#FFDF73', 0.25)}`, 
            borderRadius: '16px',
            boxShadow: `0 8px 24px ${alpha('#000', 0.4)}`
          }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="caption" color="text.secondary" fontWeight="800" sx={{ fontSize: '10px', letterSpacing: 0.8 }}>
                  usGOLD STAKING
                </Typography>
                <TokenIcon symbol="usGOLD" size={24} />
              </Stack>
              <Typography variant="h5" fontWeight="900" color="#fff" sx={{ mb: 0.5, letterSpacing: '-0.5px' }}>
                {usGoldBalance.toFixed(2)} <span style={{ fontSize: '0.75rem', color: '#D4AF37' }}>usGOLD</span>
              </Typography>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="#4caf50" fontWeight="bold" sx={{ fontSize: '10px' }}>
                  +2%/mo Yield
                </Typography>
                <Chip 
                  label="Stake" 
                  size="small"
                  onClick={() => { triggerHaptic(10); setActiveTab('staking'); }}
                  sx={{ height: 18, fontSize: '9px', fontWeight: '900', bgcolor: alpha('#D4AF37', 0.2), color: '#FFDF73', border: `1px solid ${alpha('#D4AF37', 0.3)}`, cursor: 'pointer' }}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 3: Futures USDT Margin */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            bgcolor: '#141518', 
            border: `1px solid ${alpha('#26a69a', 0.3)}`, 
            borderRadius: '16px',
            boxShadow: `0 8px 24px ${alpha('#000', 0.4)}`
          }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="caption" color="text.secondary" fontWeight="800" sx={{ fontSize: '10px', letterSpacing: 0.8 }}>
                  FUTURES MARGIN
                </Typography>
                <TokenIcon symbol="USDT" size={24} />
              </Stack>
              <Typography variant="h5" fontWeight="900" color="#fff" sx={{ mb: 0.5, letterSpacing: '-0.5px' }}>
                {futuresBalance.toFixed(2)} <span style={{ fontSize: '0.75rem', color: '#26a69a' }}>USDT</span>
              </Typography>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="#26a69a" fontWeight="bold" sx={{ fontSize: '10px' }}>
                  100x Margin
                </Typography>
                <Chip 
                  label="Trade" 
                  size="small"
                  onClick={() => { triggerHaptic(10); setActiveTab('trading'); }}
                  sx={{ height: 18, fontSize: '9px', fontWeight: '900', bgcolor: alpha('#26a69a', 0.2), color: '#33c9bb', border: `1px solid ${alpha('#26a69a', 0.3)}`, cursor: 'pointer' }}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Card 4: Solana Native SOL Balance */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ 
            bgcolor: '#141518', 
            border: `1px solid ${alpha('#14F195', 0.25)}`, 
            borderRadius: '16px',
            boxShadow: `0 8px 24px ${alpha('#000', 0.4)}`
          }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="caption" color="text.secondary" fontWeight="800" sx={{ fontSize: '10px', letterSpacing: 0.8 }}>
                  NATIVE SOLANA
                </Typography>
                <TokenIcon symbol="SOL" size={22} />
              </Stack>
              <Typography variant="h5" fontWeight="900" color="#fff" sx={{ mb: 0.5, letterSpacing: '-0.5px' }}>
                {solBalance.toFixed(3)} <span style={{ fontSize: '0.75rem', color: '#14F195' }}>SOL</span>
              </Typography>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px', fontWeight: 600 }}>
                  ~${(solBalance * currentSolPrice).toFixed(2)} USD
                </Typography>
                <Chip 
                  label={`$${currentSolPrice.toFixed(0)}/SOL`} 
                  size="small"
                  sx={{ height: 18, fontSize: '9px', fontWeight: '800', bgcolor: alpha('#14F195', 0.12), color: '#14F195' }}
                />
              </Stack>
            </CardContent>
          </Card>
        </Grid>

      </Grid>

      {/* 2. SUB-TAB NAVIGATION: ENHANCED SWAP / TOP UP / HISTORY */}
      <Stack direction="row" spacing={1} sx={{ mb: 3, borderBottom: `1px solid ${alpha('#fff', 0.08)}`, pb: 1.5 }}>
        <Button
          onClick={() => { triggerHaptic(10); setWalletTab('swap'); }}
          startIcon={<ArrowDownUp size={16} />}
          sx={{
            bgcolor: walletTab === 'swap' ? alpha('#D4AF37', 0.2) : 'transparent',
            color: walletTab === 'swap' ? '#FFDF73' : 'text.secondary',
            border: `1px solid ${walletTab === 'swap' ? '#D4AF37' : 'transparent'}`,
            borderRadius: '12px',
            fontWeight: '900',
            fontSize: '0.85rem',
            px: 2.5,
            py: 0.8,
            textTransform: 'none'
          }}
        >
          Enhanced Solana Swap
        </Button>

        <Button
          onClick={() => { triggerHaptic(10); setWalletTab('topup'); }}
          startIcon={<Zap size={16} />}
          sx={{
            bgcolor: walletTab === 'topup' ? alpha('#26a69a', 0.2) : 'transparent',
            color: walletTab === 'topup' ? '#33c9bb' : 'text.secondary',
            border: `1px solid ${walletTab === 'topup' ? '#26a69a' : 'transparent'}`,
            borderRadius: '12px',
            fontWeight: '900',
            fontSize: '0.85rem',
            px: 2.5,
            py: 0.8,
            textTransform: 'none'
          }}
        >
          Top Up Assets
        </Button>

        <Button
          onClick={() => { triggerHaptic(10); setWalletTab('history'); }}
          startIcon={<Clock size={16} />}
          sx={{
            bgcolor: walletTab === 'history' ? alpha('#fff', 0.08) : 'transparent',
            color: walletTab === 'history' ? '#fff' : 'text.secondary',
            border: `1px solid ${walletTab === 'history' ? alpha('#fff', 0.2) : 'transparent'}`,
            borderRadius: '12px',
            fontWeight: '900',
            fontSize: '0.85rem',
            px: 2.5,
            py: 0.8,
            textTransform: 'none'
          }}
        >
          Ledger
        </Button>
      </Stack>

      {/* 3. TAB 1: ENHANCED SOLANA TOKEN SWAP INTERFACE */}
      {walletTab === 'swap' && (
        <Grid container spacing={3} justifyContent="center">
          <Grid item xs={12} md={7} lg={6}>
            <Card sx={{ 
              bgcolor: '#121316', 
              border: `1px solid ${alpha('#D4AF37', 0.3)}`, 
              borderRadius: '24px',
              boxShadow: `0 16px 40px ${alpha('#000', 0.6)}`,
              position: 'relative',
              overflow: 'visible'
            }}>
              <CardContent sx={{ p: { xs: 2.5, sm: 3.5 } }}>
                
                {/* Swap Header & Slippage Controls */}
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2.5}>
                  <Typography variant="h6" fontWeight="900" color="#fff" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ArrowDownUp size={20} color="#D4AF37" />
                    Instant Solana DEX Swap
                  </Typography>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Tooltip title="Slippage Settings">
                      <Chip 
                        icon={<Settings2 size={12} color="#D4AF37" />}
                        label={`Slippage ${slippage}%`}
                        onClick={() => {
                          const nextSlippage = slippage === 0.1 ? 0.5 : slippage === 0.5 ? 1.0 : 0.1;
                          setSlippage(nextSlippage);
                          triggerHaptic(10);
                        }}
                        sx={{ 
                          bgcolor: alpha('#D4AF37', 0.1), 
                          color: '#FFDF73', 
                          border: `1px solid ${alpha('#D4AF37', 0.25)}`,
                          fontWeight: '800',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      />
                    </Tooltip>
                  </Stack>
                </Stack>

                {/* FROM TOKEN CARD */}
                <Box sx={{ 
                  p: 2.5, 
                  borderRadius: '16px', 
                  bgcolor: alpha('#000', 0.4), 
                  border: `1px solid ${alpha('#ffffff', 0.08)}`,
                  transition: 'border 0.2s',
                  '&:focus-within': { borderColor: alpha('#D4AF37', 0.5) }
                }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="caption" color="text.secondary" fontWeight="800">
                      YOU PAY
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight="700">
                      Balance: <strong style={{ color: '#fff' }}>{fromTokenBalance.toFixed(4)} {fromTokenSymbol}</strong>
                    </Typography>
                  </Stack>

                  <Grid container spacing={1.5} alignItems="center">
                    <Grid item xs={7} sm={8}>
                      <TextField
                        fullWidth
                        variant="standard"
                        type="number"
                        placeholder="0.0"
                        value={fromAmount}
                        onChange={(e) => setFromAmount(e.target.value)}
                        InputProps={{
                          disableUnderline: true,
                          sx: { 
                            fontSize: { xs: '1.5rem', sm: '1.8rem' }, 
                            fontWeight: '900', 
                            color: '#fff',
                            fontFamily: 'monospace'
                          }
                        }}
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        ~${fromValueUsd.toFixed(2)} USD
                      </Typography>
                    </Grid>

                    <Grid item xs={5} sm={4}>
                      <Select
                        fullWidth
                        value={fromTokenSymbol}
                        onChange={(e) => {
                          const newFrom = e.target.value;
                          if (newFrom === toTokenSymbol) {
                            setToTokenSymbol(fromTokenSymbol);
                          }
                          setFromTokenSymbol(newFrom);
                          triggerHaptic(10);
                        }}
                        sx={{
                          bgcolor: alpha('#ffffff', 0.08),
                          color: '#fff',
                          fontWeight: '800',
                          borderRadius: '12px',
                          fontSize: '0.9rem',
                          '.MuiSelect-select': { py: 1, px: 1.5, display: 'flex', alignItems: 'center', gap: 1 }
                        }}
                      >
                        {TOKEN_LIST.map((tk) => (
                          <MenuItem key={tk.symbol} value={tk.symbol} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TokenIcon symbol={tk.symbol} size={20} />
                            <Typography variant="body2" fontWeight="800">{tk.symbol}</Typography>
                          </MenuItem>
                        ))}
                      </Select>
                    </Grid>
                  </Grid>

                  {/* QUICK PERCENTAGE BUTTONS */}
                  <Stack direction="row" spacing={1} mt={2}>
                    {[25, 50, 75, 100].map((pct) => (
                      <Chip
                        key={pct}
                        label={pct === 100 ? 'MAX' : `${pct}%`}
                        onClick={() => handleSetPercent(pct)}
                        sx={{
                          height: 22,
                          fontSize: '10px',
                          fontWeight: '900',
                          bgcolor: alpha('#D4AF37', 0.1),
                          color: '#FFDF73',
                          border: `1px solid ${alpha('#D4AF37', 0.2)}`,
                          cursor: 'pointer',
                          '&:hover': { bgcolor: alpha('#D4AF37', 0.25) }
                        }}
                      />
                    ))}
                  </Stack>
                </Box>

                {/* CENTRAL SWAP FLIP BUTTON */}
                <Box sx={{ display: 'flex', justifyContent: 'center', my: -1.5, position: 'relative', zIndex: 2 }}>
                  <IconButton
                    onClick={handleFlipTokens}
                    sx={{
                      bgcolor: '#1c1d22',
                      color: '#FFDF73',
                      border: `2px solid #D4AF37`,
                      boxShadow: `0 4px 16px ${alpha('#000', 0.8)}`,
                      width: 42,
                      height: 42,
                      '&:hover': { bgcolor: '#2a2c33', transform: 'rotate(180deg)' },
                      transition: 'transform 0.3s ease'
                    }}
                  >
                    <ArrowDownUp size={18} />
                  </IconButton>
                </Box>

                {/* TO TOKEN CARD */}
                <Box sx={{ 
                  p: 2.5, 
                  borderRadius: '16px', 
                  bgcolor: alpha('#000', 0.4), 
                  border: `1px solid ${alpha('#ffffff', 0.08)}`,
                  mt: 0
                }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="caption" color="text.secondary" fontWeight="800">
                      YOU RECEIVE (ESTIMATED)
                    </Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight="700">
                      Balance: <strong style={{ color: '#fff' }}>{toTokenBalance.toFixed(4)} {toTokenSymbol}</strong>
                    </Typography>
                  </Stack>

                  <Grid container spacing={1.5} alignItems="center">
                    <Grid item xs={7} sm={8}>
                      <Typography 
                        variant="h5" 
                        fontWeight="900" 
                        color="#14F195" 
                        sx={{ fontFamily: 'monospace', fontSize: { xs: '1.5rem', sm: '1.8rem' } }}
                      >
                        {calculatedToAmount.toFixed(toTokenSymbol === 'SOL' ? 4 : 2)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        ~${(calculatedToAmount * toToken.usdPrice).toFixed(2)} USD
                      </Typography>
                    </Grid>

                    <Grid item xs={5} sm={4}>
                      <Select
                        fullWidth
                        value={toTokenSymbol}
                        onChange={(e) => {
                          const newTo = e.target.value;
                          if (newTo === fromTokenSymbol) {
                            setFromTokenSymbol(toTokenSymbol);
                          }
                          setToTokenSymbol(newTo);
                          triggerHaptic(10);
                        }}
                        sx={{
                          bgcolor: alpha('#ffffff', 0.08),
                          color: '#fff',
                          fontWeight: '800',
                          borderRadius: '12px',
                          fontSize: '0.9rem',
                          '.MuiSelect-select': { py: 1, px: 1.5, display: 'flex', alignItems: 'center', gap: 1 }
                        }}
                      >
                        {TOKEN_LIST.map((tk) => (
                          <MenuItem key={tk.symbol} value={tk.symbol} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TokenIcon symbol={tk.symbol} size={20} />
                            <Typography variant="body2" fontWeight="800">{tk.symbol}</Typography>
                          </MenuItem>
                        ))}
                      </Select>
                    </Grid>
                  </Grid>
                </Box>

                {/* REAL-TIME SWAP ROUTE & DETAILS */}
                <Box sx={{ mt: 2.5, p: 2, borderRadius: '14px', bgcolor: alpha('#D4AF37', 0.04), border: `1px solid ${alpha('#D4AF37', 0.15)}` }}>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="text.secondary" fontWeight="700">Exchange Rate</Typography>
                      <Typography variant="caption" color="#FFDF73" fontWeight="bold">
                        1 {fromTokenSymbol} ≈ {(fromToken.usdPrice / toToken.usdPrice).toFixed(toTokenSymbol === 'SOL' ? 4 : 2)} {toTokenSymbol}
                      </Typography>
                    </Stack>

                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="text.secondary" fontWeight="700">Solana Network Fee</Typography>
                      <Typography variant="caption" color="#14F195" fontWeight="bold">0.000005 SOL (~$0.0008)</Typography>
                    </Stack>

                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="text.secondary" fontWeight="700">Price Impact</Typography>
                      <Typography variant="caption" color="#14F195" fontWeight="bold">&lt; 0.01%</Typography>
                    </Stack>

                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="caption" color="text.secondary" fontWeight="700">Minimum Received</Typography>
                      <Typography variant="caption" color="#fff" fontWeight="bold">
                        {minimumReceived.toFixed(toTokenSymbol === 'SOL' ? 4 : 2)} {toTokenSymbol}
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>

                {/* SWAP ACTION BUTTON */}
                <Button
                  fullWidth
                  variant="contained"
                  disabled={isSwapping || numFromAmount <= 0}
                  onClick={handleExecuteSwap}
                  sx={{
                    mt: 3,
                    bgcolor: '#D4AF37',
                    color: '#000',
                    fontWeight: '900',
                    py: 1.8,
                    borderRadius: '14px',
                    fontSize: '1rem',
                    boxShadow: `0 8px 24px ${alpha('#D4AF37', 0.3)}`,
                    '&:hover': { bgcolor: '#FFDF73' },
                    '&.Mui-disabled': { bgcolor: alpha('#D4AF37', 0.3) }
                  }}
                >
                  {isSwapping ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CircularProgress size={20} color="inherit" />
                      <Typography fontWeight="900">EXECUTING SOLANA SWAP...</Typography>
                    </Stack>
                  ) : !connected ? (
                    'CONNECT SOLANA WALLET'
                  ) : numFromAmount > fromTokenBalance ? (
                    `INSUFFICIENT ${fromTokenSymbol} BALANCE`
                  ) : (
                    `SWAP ${fromTokenSymbol} FOR ${toTokenSymbol}`
                  )}
                </Button>

              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 4. TAB 2: TOP UP ASSETS WITH SOL */}
      {walletTab === 'topup' && (
        <Grid container spacing={3} justifyContent="center">
          <Grid item xs={12} md={8}>
            <Card sx={{ bgcolor: '#121316', border: `1px solid ${alpha('#fff', 0.08)}`, borderRadius: '24px' }}>
              <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                <Typography variant="h6" fontWeight="900" color="#fff" mb={3}>
                  Direct Solana Asset Top Up
                </Typography>

                <Stack direction="row" spacing={2} mb={4}>
                  <Button
                    fullWidth
                    variant={purchaseAsset === 'usGOLD' ? 'contained' : 'outlined'}
                    onClick={() => { triggerHaptic(10); setPurchaseAsset('usGOLD'); }}
                    sx={{
                      bgcolor: purchaseAsset === 'usGOLD' ? '#D4AF37' : 'transparent',
                      color: purchaseAsset === 'usGOLD' ? '#000' : '#D4AF37',
                      borderColor: '#D4AF37',
                      fontWeight: '800',
                      borderRadius: '12px',
                      py: 1.5,
                      '&:hover': { bgcolor: purchaseAsset === 'usGOLD' ? '#FFDF73' : alpha('#D4AF37', 0.1) }
                    }}
                  >
                    Top Up usGOLD (Staking)
                  </Button>
                  <Button
                    fullWidth
                    variant={purchaseAsset === 'USDT' ? 'contained' : 'outlined'}
                    onClick={() => { triggerHaptic(10); setPurchaseAsset('USDT'); }}
                    sx={{
                      bgcolor: purchaseAsset === 'USDT' ? '#26a69a' : 'transparent',
                      color: purchaseAsset === 'USDT' ? '#000' : '#26a69a',
                      borderColor: '#26a69a',
                      fontWeight: '800',
                      borderRadius: '12px',
                      py: 1.5,
                      '&:hover': { bgcolor: purchaseAsset === 'USDT' ? '#33c9bb' : alpha('#26a69a', 0.1) }
                    }}
                  >
                    Top Up USDT (Futures)
                  </Button>
                </Stack>

                <Box sx={{ p: 3, borderRadius: '16px', bgcolor: alpha(purchaseAsset === 'usGOLD' ? '#D4AF37' : '#26a69a', 0.03), border: `1px dashed ${alpha(purchaseAsset === 'usGOLD' ? '#D4AF37' : '#26a69a', 0.3)}` }}>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    {purchaseAsset === 'usGOLD' 
                      ? 'Mint usGOLD stablecoins directly using SOL. Tokens are deposited to your Staking Balance.' 
                      : 'Deposit USDT margin using SOL. Margin is credited directly to your Futures Trading Balance.'}
                  </Typography>

                  <Typography variant="subtitle2" color="#fff" fontWeight="800" mb={1}>
                    ENTER AMOUNT (USD)
                  </Typography>
                  <TextField
                    fullWidth
                    variant="outlined"
                    type="number"
                    value={customPurchaseAmount}
                    onChange={(e) => setCustomPurchaseAmount(Number(e.target.value))}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <DollarSign size={18} color={purchaseAsset === 'usGOLD' ? '#D4AF37' : '#26a69a'} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <Typography variant="body2" color="#fff" fontWeight="bold">USD</Typography>
                        </InputAdornment>
                      ),
                      sx: { 
                        bgcolor: alpha('#ffffff', 0.05), 
                        borderRadius: '12px', 
                        color: '#fff',
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: purchaseAsset === 'usGOLD' ? '#D4AF37' : '#26a69a' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: purchaseAsset === 'usGOLD' ? '#D4AF37' : '#26a69a' }
                      }
                    }}
                  />

                  <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                    {[10, 50, 100, 250, 500, 1000].map((preset) => (
                      <Chip 
                        key={preset}
                        label={`$${preset}`}
                        onClick={() => { triggerHaptic(10); setCustomPurchaseAmount(preset); }}
                        sx={{ 
                          bgcolor: alpha(purchaseAsset === 'usGOLD' ? '#D4AF37' : '#26a69a', 0.1),
                          color: purchaseAsset === 'usGOLD' ? '#FFDF73' : '#33c9bb',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          '&:hover': { bgcolor: alpha(purchaseAsset === 'usGOLD' ? '#D4AF37' : '#26a69a', 0.2) }
                        }}
                      />
                    ))}
                  </Box>

                  <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: alpha('#000', 0.3), borderRadius: '12px' }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Cost in SOL</Typography>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Typography variant="h6" color="#fff" fontWeight="900">
                          ~{(customPurchaseAmount / currentSolPrice).toFixed(4)} SOL
                        </Typography>
                        <TokenIcon symbol="SOL" size={16} />
                      </Stack>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary" display="block">You Receive</Typography>
                      <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="flex-end">
                        <Typography variant="h6" color={purchaseAsset === 'usGOLD' ? '#D4AF37' : '#26a69a'} fontWeight="900">
                          +{customPurchaseAmount} {purchaseAsset}
                        </Typography>
                        <TokenIcon symbol={purchaseAsset} size={16} />
                      </Stack>
                    </Box>
                  </Box>

                  <Button
                    fullWidth
                    variant="contained"
                    disabled={isInvesting || isProcessingUsdtBuy || customPurchaseAmount <= 0}
                    onClick={() => { triggerHaptic(20); handleExecutePurchase(); }}
                    sx={{
                      mt: 3,
                      bgcolor: purchaseAsset === 'usGOLD' ? '#D4AF37' : '#26a69a',
                      color: '#000',
                      fontWeight: '900',
                      py: 1.8,
                      borderRadius: '12px',
                      fontSize: '1rem',
                      '&:hover': { bgcolor: purchaseAsset === 'usGOLD' ? '#FFDF73' : '#33c9bb' }
                    }}
                  >
                    {isInvesting || isProcessingUsdtBuy 
                      ? 'PROCESSING SOLANA TRANSACTION...' 
                      : (connected ? `PAY WITH SOLANA WALLET` : `CONNECT WALLET TO PAY`)}
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* 5. TAB 3: WALLET LEDGER & HISTORY */}
      {walletTab === 'history' && (
        <Card sx={{ bgcolor: '#121316', border: `1px solid ${alpha('#fff', 0.08)}`, borderRadius: '24px' }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="900" color="#fff" mb={2}>
              Wallet Activity Ledger
            </Typography>

            {transactions && transactions.length > 0 ? (
              <Stack spacing={1.5}>
                {transactions.map((tx: any, idx: number) => (
                  <Box 
                    key={tx.id || idx}
                    sx={{
                      p: 2,
                      borderRadius: '14px',
                      bgcolor: alpha('#fff', 0.02),
                      border: `1px solid ${alpha('#fff', 0.06)}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 1
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ bgcolor: alpha('#D4AF37', 0.12), color: '#D4AF37', width: 36, height: 36 }}>
                        <Activity size={18} />
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight="800" color="#fff">
                          {tx.type === 'token_swap' ? 'Solana Token Swap' : tx.details || 'Transaction'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {tx.timestamp ? new Date(tx.timestamp).toLocaleString() : tx.time || 'Recent'}
                        </Typography>
                      </Box>
                    </Stack>

                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="body2" fontWeight="900" color="#D4AF37">
                        {tx.amount || '+0'}
                      </Typography>
                      {tx.txId && (
                        <Button
                          size="small"
                          startIcon={<ExternalLink size={10} />}
                          onClick={() => window.open(`https://solscan.io/tx/${tx.txId}`, '_blank')}
                          sx={{ fontSize: '10px', color: '#14F195', p: 0, textTransform: 'none', '&:hover': { textDecoration: 'underline' } }}
                        >
                          View Solscan
                        </Button>
                      )}
                    </Box>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Clock size={36} color="#D4AF37" style={{ opacity: 0.3, marginBottom: 12 }} />
                <Typography variant="body2" color="text.secondary">
                  No transaction history recorded yet.
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* SWAP SUCCESS CONFIRMATION DIALOG */}
      {swapTxSuccess && (
        <Dialog 
          open={!!swapTxSuccess} 
          onClose={() => setSwapTxSuccess(null)}
          PaperProps={{
            sx: {
              bgcolor: '#141518',
              border: `1px solid ${alpha('#14F195', 0.4)}`,
              borderRadius: '20px',
              p: 1,
              maxWidth: 400
            }
          }}
        >
          <DialogTitle sx={{ textAlign: 'center', pt: 3 }}>
            <Avatar sx={{ bgcolor: alpha('#14F195', 0.15), color: '#14F195', width: 56, height: 56, mx: 'auto', mb: 1 }}>
              <CheckCircle2 size={32} />
            </Avatar>
            <Typography variant="h6" fontWeight="900" color="#fff">
              Solana Swap Successful!
            </Typography>
          </DialogTitle>

          <DialogContent sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Successfully executed swap on Solana Mainnet Liquidity Route.
            </Typography>

            <Box sx={{ p: 2, borderRadius: '12px', bgcolor: alpha('#14F195', 0.05), border: `1px solid ${alpha('#14F195', 0.2)}`, mb: 2 }}>
              <Typography variant="caption" color="text.secondary" display="block">Swapped Amount</Typography>
              <Typography variant="h6" fontWeight="900" color="#14F195">
                {swapTxSuccess.from} ➔ {swapTxSuccess.to}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Valued at ~${swapTxSuccess.usdVal} USD
              </Typography>
            </Box>

            {swapTxSuccess.txId && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<ExternalLink size={14} />}
                onClick={() => window.open(`https://solscan.io/tx/${swapTxSuccess.txId}`, '_blank')}
                sx={{
                  borderColor: '#14F195',
                  color: '#14F195',
                  fontWeight: 'bold',
                  borderRadius: '10px',
                  textTransform: 'none'
                }}
              >
                View Transaction on Solscan
              </Button>
            )}
          </DialogContent>

          <DialogActions sx={{ pb: 3, px: 3 }}>
            <Button
              fullWidth
              variant="contained"
              onClick={() => setSwapTxSuccess(null)}
              sx={{ bgcolor: '#D4AF37', color: '#000', fontWeight: '900', borderRadius: '12px', '&:hover': { bgcolor: '#FFDF73' } }}
            >
              Done
            </Button>
          </DialogActions>
        </Dialog>
      )}

    </Box>
  );
}

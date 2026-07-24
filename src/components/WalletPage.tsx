import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Stack, Card, CardContent, alpha, useTheme, Button, 
  Divider, Grid, Chip, Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, InputAdornment, IconButton, Tab, Tabs, LinearProgress, Avatar, Slider, Tooltip
} from '@mui/material';
import { 
  Wallet, ArrowUpRight, ArrowDownRight, Coins, BarChart3, ShieldCheck, 
  Zap, Plus, RefreshCw, Copy, Check, TrendingUp, Layers, Award, Sparkles, 
  CreditCard, DollarSign, ArrowRight, Activity, CheckCircle2, Info, Shield, HelpCircle
} from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon';
import { LAMPORTS_PER_SOL, SystemProgram, PublicKey, VersionedTransaction, TransactionMessage, TransactionInstruction } from '@solana/web3.js';
import { t } from '../translations';
import { database } from '../firebase';
import { ref, onValue, update, push } from 'firebase/database';

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
  const [copied, setCopied] = useState(false);

  // Futures Wallet Balance state from Firebase
  const [futuresBalance, setFuturesBalance] = useState<number>(0);
  const [inPositionMargin, setInPositionMargin] = useState<number>(0);
  
  // Custom Staking & Flexible Vault State (from Staking tab inside Wallet)
  const [customStakeAmount, setCustomStakeAmount] = useState<string>('100');
  const [stakingDurationMonths, setStakingDurationMonths] = useState<1 | 3 | 6 | 12>(3);
  const [isCreatingStake, setIsCreatingStake] = useState(false);
  const [activeStakes, setActiveStakes] = useState<any[]>([]);

  // Ticking live timestamp for yield stream
  const [nowTime, setNowTime] = useState<number>(Date.now());

  // Purchase/Mint Asset states
  const [purchaseAsset, setPurchaseAsset] = useState<'usGOLD' | 'USDT'>('usGOLD');
  const [customPurchaseAmount, setCustomPurchaseAmount] = useState<number>(50);
  const [isProcessingUsdtBuy, setIsProcessingUsdtBuy] = useState(false);

  // Quick Top Up / Deposit Dialog State
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState<string>('100');

  // Tab state inside Wallet
  const [walletTab, setWalletTab] = useState<'overview' | 'buy' | 'futures' | 'staking'>('overview');

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync Active Stakes from Firebase
  useEffect(() => {
    if (effectiveAddress) {
      const stakesRef = ref(database, `stakes/${effectiveAddress}`);
      const unsub = onValue(stakesRef, (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const list = Object.keys(val).map(key => ({
            key,
            ...val[key]
          }));
          setActiveStakes(list);
        } else {
          setActiveStakes([]);
        }
      });
      return () => unsub();
    }
  }, [effectiveAddress]);

  // Sync Futures Wallet balance from Firebase
  useEffect(() => {
    if (effectiveAddress) {
      const userRef = ref(database, `users/${effectiveAddress}`);
      const unsub = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          if (val.futuresBalance !== undefined) {
            setFuturesBalance(parseFloat(val.futuresBalance) || 0);
          } else {
            update(userRef, { futuresBalance: 0 });
            setFuturesBalance(0);
          }

          if (val.futuresPositions) {
            const positions = Object.values(val.futuresPositions);
            const totalMargin = positions.reduce((acc: number, pos: any) => acc + (parseFloat(pos.margin) || 0), 0);
            setInPositionMargin(totalMargin);
          } else {
            setInPositionMargin(0);
          }
        } else {
          setFuturesBalance(0);
          setInPositionMargin(0);
        }
      });
      return () => unsub();
    }
  }, [effectiveAddress]);

  // Sync props investAmount to state customPurchaseAmount when usGOLD is selected
  useEffect(() => {
    if (purchaseAsset === 'usGOLD') {
      setInvestAmount(customPurchaseAmount);
    }
  }, [customPurchaseAmount, purchaseAsset]);

  // Copy address handler
  const handleCopyAddress = () => {
    if (effectiveAddress) {
      navigator.clipboard.writeText(effectiveAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Create Staking lock
  const handleCreateCustomStake = async () => {
    const amt = parseFloat(customStakeAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Please enter a valid usGOLD amount to stake.");
      return;
    }

    if (amt > usGoldBalance) {
      alert(`Insufficient usGOLD balance. Your current balance is ${usGoldBalance.toFixed(2)} usGOLD. Please buy usGOLD first.`);
      setWalletTab('buy');
      setPurchaseAsset('usGOLD');
      return;
    }

    setIsCreatingStake(true);

    try {
      const profitRate = stakingDurationMonths * 0.02; // 2% return per month
      const durationDays = stakingDurationMonths * 30;
      const durationMs = durationDays * 86400 * 1000;
      const startTime = Date.now();
      const endTime = startTime + durationMs;
      const totalExpectedProfit = amt * profitRate;

      const newStake = {
        amount: amt,
        durationMonths: stakingDurationMonths,
        profitRate: profitRate,
        totalExpectedProfit: totalExpectedProfit,
        startTime: startTime,
        endTime: endTime,
        status: 'active',
        createdAt: Date.now()
      };

      if (effectiveAddress) {
        // Deduct from usGoldBalance in database
        const userRef = ref(database, `users/${effectiveAddress}`);
        await update(userRef, { usGoldBalance: Math.max(0, usGoldBalance - amt) });

        // Push stake
        const stakesRef = ref(database, `stakes/${effectiveAddress}`);
        await push(stakesRef, newStake);

        // Record transaction
        const txRef = ref(database, `transactions/${effectiveAddress}`);
        await push(txRef, {
          type: 'stake_created',
          amount: `${amt} usGOLD`,
          details: `Staked in ${stakingDurationMonths}-Month Vault (${(profitRate * 100).toFixed(0)}% Return)`,
          timestamp: Date.now()
        });
      }

      setIsCreatingStake(false);
      alert(`Success! Staked ${amt} usGOLD in the ${stakingDurationMonths}-Month Vault with ${stakingDurationMonths * 2}% total return!`);
    } catch (err) {
      console.error("Stake creation error:", err);
      setIsCreatingStake(false);
      alert("Failed to create stake. Please try again.");
    }
  };

  // Claim staking reward
  const handleClaimStakeProfit = async (stakeKey: string, accruedProfit: number) => {
    try {
      if (effectiveAddress) {
        const stakeRef = ref(database, `stakes/${effectiveAddress}/${stakeKey}`);
        await update(stakeRef, { status: 'claimed', claimedAt: Date.now() });

        // Reward goes directly into usGoldBalance
        const userRef = ref(database, `users/${effectiveAddress}`);
        await update(userRef, { usGoldBalance: usGoldBalance + accruedProfit });

        const txRef = ref(database, `transactions/${effectiveAddress}`);
        await push(txRef, {
          type: 'stake_claimed',
          amount: `+$${accruedProfit.toFixed(2)} USD`,
          details: `Claimed Staking Profits of ${accruedProfit.toFixed(4)} usGOLD`,
          timestamp: Date.now()
        });
      }
      alert(`Successfully claimed $${accruedProfit.toFixed(2)} USD in usGOLD staking rewards!`);
    } catch (err) {
      console.error("Claim stake error:", err);
      alert("Failed to claim rewards.");
    }
  };

  // USDT Purchase with SOL via Connected Solana Wallet
  const handleBuyUsdtWithSol = async (amountInUsd: number) => {
    if (!connected || !publicKey) {
      alert("Please connect your Solana wallet first.");
      return;
    }

    if (amountInUsd < 10 || amountInUsd > 1000) {
      alert("USDT purchase amount must be between $10 and $1,000 USD.");
      return;
    }

    setIsProcessingUsdtBuy(true);

    try {
      const currentSolPrice = solanaPrice || 150;
      const amountToInvest = parseFloat((amountInUsd / currentSolPrice).toFixed(4));
      const totalLamports = Math.floor(amountToInvest * LAMPORTS_PER_SOL);

      const recipientAddressStr = 'BASAeBAszKMALU1ho4kdYEZzPcbzGrqUm4RWmhAFrvJs'; // Platform Treasury
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

      // Confirm transaction
      await connection.confirmTransaction(signature, 'confirmed');

      const timestamp = Date.now();
      const newBal = futuresBalance + amountInUsd;

      // Update user futuresBalance and log tx
      if (effectiveAddress) {
        const userRef = ref(database, `users/${effectiveAddress}`);
        await update(userRef, { futuresBalance: newBal });

        // Record USDT purchase transaction
        const txRef = ref(database, `transactions/${effectiveAddress}`);
        await push(txRef, {
          type: 'buy_usdt',
          amount: `${amountInUsd.toFixed(2)} USDT`,
          details: `Purchased USDT with ${amountToInvest.toFixed(4)} SOL`,
          timestamp: timestamp,
          txId: signature
        });

        // Record global transaction
        await push(ref(database, `global_transactions`), {
          type: 'buy_usdt',
          user: effectiveAddress,
          amount: amountInUsd,
          solAmount: amountToInvest,
          timestamp: timestamp,
          txId: signature
        });
      }

      alert(`USDT purchased successfully! Added $${amountInUsd.toFixed(2)} USDT to your Futures Trading Wallet.`);
      setIsProcessingUsdtBuy(false);
      setDepositOpen(false);
    } catch (err: any) {
      console.error("USDT Purchase failed:", err);
      alert(`USDT Purchase failed: ${err.message || err}`);
      setIsProcessingUsdtBuy(false);
    }
  };

  // unified action handler for usGOLD vs USDT purchases
  const handleExecutePurchase = async () => {
    if (purchaseAsset === 'usGOLD') {
      if (customPurchaseAmount < 10 || customPurchaseAmount > 100) {
        alert("usGOLD minting volume must be between $10 and $100 USD.");
        return;
      }
      setInvestAmount(customPurchaseAmount);
      // Execute props handleInvest (which performs the standard on-chain SOL transfer and referral system updates)
      await handleInvest();
    } else {
      await handleBuyUsdtWithSol(customPurchaseAmount);
    }
  };

  // Calculations
  const solPrice = solanaPrice || 150;
  const usGoldUsdValue = usGoldBalance * 80; // $80 per usGOLD
  const totalNetWorth = futuresBalance + usGoldUsdValue;
  const activeStakedList = activeStakes.filter(s => s.status !== 'claimed');
  const totalStakedVolume = activeStakedList.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);

  // Cumulative real-time accruing profits ticking live second-by-second
  const liveTotalAccrued = activeStakedList.reduce((acc, curr) => {
    const totalDurationSec = Math.floor((curr.endTime - curr.startTime) / 1000) || 1;
    const elapsedSec = Math.min(totalDurationSec, Math.max(0, Math.floor((nowTime - curr.startTime) / 1000)));
    const profitPerSec = curr.totalExpectedProfit / totalDurationSec;
    const accrued = Math.min(curr.totalExpectedProfit, elapsedSec * profitPerSec);
    return acc + accrued;
  }, 0);

  const solEquivalent = customPurchaseAmount / solPrice;

  return (
    <Box sx={{ animation: 'fadeIn 0.4s ease-out', pb: 12 }}>
      
      {/* Page Header */}
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Chip 
          icon={<Sparkles size={14} color="#D4AF37" />} 
          label="IMPERIAL DIGITAL TREASURY" 
          size="small" 
          sx={{ 
            bgcolor: alpha('#D4AF37', 0.12), 
            color: '#FFDF73', 
            fontWeight: '800', 
            mb: 1.5, 
            letterSpacing: 2.5,
            px: 1.5
          }} 
        />
        <Typography variant="h3" fontWeight="900" sx={{ 
          fontFamily: '"Cinzel", serif', 
          background: 'linear-gradient(to bottom, #FFDF73 10%, #D4AF37 50%, #AA7C11 100%)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent',
          filter: `drop-shadow(0 4px 15px ${alpha('#D4AF37', 0.35)})`
        }}>
          Digital Treasury & Asset Minting
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, maxWidth: 620, mx: 'auto', lineHeight: 1.6 }}>
          Buy and mint gold-backed reserves (usGOLD) or USDT margin assets securely using your connected Solana wallet. Manage leverage trading accounts and lock up high-yield gold-staking vaults.
        </Typography>
      </Box>

      {!effectiveAddress ? (
        <Card sx={{ 
          background: 'linear-gradient(135deg, #1A1B20 0%, #111215 100%)',
          borderRadius: '28px',
          border: `1px solid ${alpha('#D4AF37', 0.3)}`,
          p: { xs: 4, sm: 6 },
          textAlign: 'center',
          boxShadow: `0 20px 50px ${alpha('#000', 0.6)}`
        }}>
          <Wallet size={56} color="#D4AF37" style={{ margin: '0 auto 16px', filter: 'drop-shadow(0 0 12px rgba(212,175,55,0.4))' }} />
          <Typography variant="h5" fontWeight="900" color="#fff" mb={1.5} sx={{ fontFamily: '"Cinzel", serif' }}>
            Connect Your Wallet
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={4} sx={{ maxWidth: 440, mx: 'auto', lineHeight: 1.6 }}>
            Connect your Solana wallet to access your personal Imperial Treasury, purchase usGOLD and USDT directly with SOL, and view your interactive ledger.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <WalletMultiButton style={{ 
              backgroundColor: '#D4AF37', 
              color: '#000', 
              fontWeight: '900', 
              borderRadius: '14px',
              padding: '14px 32px',
              boxShadow: '0 8px 24px rgba(212,175,55,0.3)'
            }} />
          </Box>
        </Card>
      ) : (
        <Stack spacing={4}>
          
          {/* NET WORTH BANNER CARD */}
          <Card sx={{ 
            background: 'linear-gradient(135deg, #16171a 0%, #0F1012 100%)',
            borderRadius: '24px',
            border: `1px solid ${alpha('#D4AF37', 0.25)}`,
            boxShadow: `0 16px 40px ${alpha('#000', 0.5)}, inset 0 1px 0 ${alpha('#FFDF73', 0.1)}`,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: `radial-gradient(circle, ${alpha('#D4AF37', 0.08)} 0%, transparent 70%)` }} />
            <CardContent sx={{ p: { xs: 3, sm: 4 }, position: 'relative', zIndex: 1 }}>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={7}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box sx={{ p: '2px', borderRadius: '50%', background: 'linear-gradient(45deg, #D4AF37, #FFDF73)' }}>
                      <Box sx={{ bgcolor: '#0c0d0f', borderRadius: '50%', p: '2px' }}>
                        <Jazzicon diameter={38} seed={jsNumberForAddress(effectiveAddress)} />
                      </Box>
                    </Box>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight="800" color="#fff" sx={{ letterSpacing: 0.5 }}>
                          {effectiveAddress.substring(0, 6)}...{effectiveAddress.substring(effectiveAddress.length - 4)}
                        </Typography>
                        <IconButton size="small" onClick={handleCopyAddress} sx={{ color: '#D4AF37', p: 0.5 }}>
                          {copied ? <Check size={14} color="#4caf50" /> : <Copy size={14} />}
                        </IconButton>
                      </Box>
                      <Chip 
                        icon={<ShieldCheck size={12} color="#4caf50" />} 
                        label="SECURE LEDGER ACCOUNT" 
                        size="small" 
                        sx={{ bgcolor: alpha('#4caf50', 0.1), color: '#4caf50', fontSize: '0.65rem', height: 18, mt: 0.5, fontWeight: '800' }} 
                      />
                    </Box>
                  </Box>

                  <Typography variant="overline" color="text.secondary" fontWeight="700" letterSpacing={1.5}>
                    ESTIMATED TREASURY NET WORTH
                  </Typography>
                  <Typography variant="h2" fontWeight="900" sx={{ color: '#fff', fontFamily: '"Cinzel", serif', my: 0.5 }}>
                    ${totalNetWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total balance comprising USDT Futures Margin & usGOLD Reserve Assets.
                  </Typography>
                </Grid>

                <Grid item xs={12} md={5}>
                  <Stack spacing={1.5} sx={{ bgcolor: alpha('#000', 0.25), p: 2.5, borderRadius: '18px', border: `1px solid ${alpha('#fff', 0.05)}` }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BarChart3 size={14} color="#26a69a" /> USDT Futures margin:
                      </Typography>
                      <Typography variant="body2" fontWeight="800" color="#26a69a">
                        ${futuresBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT
                      </Typography>
                    </Box>
                    <Divider sx={{ borderColor: alpha('#fff', 0.05) }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Coins size={14} color="#D4AF37" /> usGOLD Reserve:
                      </Typography>
                      <Typography variant="body2" fontWeight="800" color="#D4AF37">
                        {usGoldBalance.toFixed(2)} GOLD (${usGoldUsdValue.toFixed(2)})
                      </Typography>
                    </Box>
                    <Divider sx={{ borderColor: alpha('#fff', 0.05) }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingUp size={14} color="#9945FF" /> Solana Market Price:
                      </Typography>
                      <Typography variant="body2" fontWeight="800" color="#9945FF">
                        ${solPrice.toFixed(2)} USD
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* INNER PAGE NAVIGATION TABS */}
          <Box sx={{ borderBottom: 1, borderColor: alpha('#D4AF37', 0.2), mt: 2 }}>
            <Tabs 
              value={walletTab} 
              onChange={(_, v) => setWalletTab(v)}
              textColor="inherit"
              indicatorColor="secondary"
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTabs-indicator': { backgroundColor: '#D4AF37', height: 3 },
                '& .MuiTab-root': { 
                  color: alpha('#fff', 0.5), 
                  fontWeight: '800', 
                  fontSize: '0.9rem', 
                  pb: 1.5,
                  minWidth: 120,
                  transition: 'color 0.2s',
                  '&:hover': { color: '#fff' }
                },
                '& .Mui-selected': { color: '#D4AF37' }
              }}
            >
              <Tab label="Portfolio Dashboard" value="overview" icon={<Layers size={16} />} iconPosition="start" />
              <Tab label="Buy & Mint Assets" value="buy" icon={<Plus size={16} />} iconPosition="start" />
              <Tab label="Futures Trading Wallet" value="futures" icon={<BarChart3 size={16} />} iconPosition="start" />
              <Tab label="usGOLD Staking Vault" value="staking" icon={<Coins size={16} />} iconPosition="start" />
            </Tabs>
          </Box>

          {/* TAB 1: PORTFOLIO & GENERAL ACTIVITY DASHBOARD */}
          {walletTab === 'overview' && (
            <Grid container spacing={3.5}>
              <Grid item xs={12} md={7}>
                <Stack spacing={3}>
                  
                  {/* Portfolio overview breakdown */}
                  <Card sx={{ bgcolor: '#121316', border: `1px solid ${alpha('#fff', 0.05)}`, borderRadius: '20px' }}>
                    <Box sx={{ p: 2.5, borderBottom: `1px solid ${alpha('#fff', 0.05)}`, bgcolor: alpha('#000', 0.15) }}>
                      <Typography variant="subtitle1" fontWeight="800" color="#fff" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Layers size={18} color="#D4AF37" /> Available Portfolio Reserves
                      </Typography>
                    </Box>
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack spacing={2}>
                        {/* USDT */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderRadius: '14px', bgcolor: alpha('#26a69a', 0.05), border: `1px solid ${alpha('#26a69a', 0.15)}` }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ width: 42, height: 42, bgcolor: alpha('#26a69a', 0.15), borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <BarChart3 color="#26a69a" size={22} />
                            </Box>
                            <Box>
                              <Typography fontWeight="800" color="#fff">USDT (Futures Account)</Typography>
                              <Typography variant="caption" color="text.secondary">KuCoin Perpetual Trading Balance</Typography>
                            </Box>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography fontWeight="900" color="#26a69a" variant="h6">
                              ${futuresBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </Typography>
                            <Button 
                              size="small" 
                              onClick={() => { setWalletTab('buy'); setPurchaseAsset('USDT'); }} 
                              sx={{ color: '#26a69a', textTransform: 'none', p: 0, minWidth: 0, fontWeight: '800', fontSize: '11px' }}
                            >
                              + Buy USDT
                            </Button>
                          </Box>
                        </Box>

                        {/* usGOLD */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderRadius: '14px', bgcolor: alpha('#D4AF37', 0.05), border: `1px solid ${alpha('#D4AF37', 0.15)}` }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ width: 42, height: 42, bgcolor: alpha('#D4AF37', 0.15), borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Coins color="#D4AF37" size={22} />
                            </Box>
                            <Box>
                              <Typography fontWeight="800" color="#fff">usGOLD Stablecoin</Typography>
                              <Typography variant="caption" color="text.secondary">Gold-Backed Staking Capital</Typography>
                            </Box>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography fontWeight="900" color="#D4AF37" variant="h6">
                              {usGoldBalance.toFixed(2)} GOLD
                            </Typography>
                            <Button 
                              size="small" 
                              onClick={() => { setWalletTab('buy'); setPurchaseAsset('usGOLD'); }} 
                              sx={{ color: '#D4AF37', textTransform: 'none', p: 0, minWidth: 0, fontWeight: '800', fontSize: '11px' }}
                            >
                              + Mint usGOLD
                            </Button>
                          </Box>
                        </Box>

                        {/* Solana */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderRadius: '14px', bgcolor: alpha('#9945FF', 0.03), border: `1px solid ${alpha('#9945FF', 0.08)}` }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Box sx={{ width: 42, height: 42, bgcolor: alpha('#9945FF', 0.1), borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <img src="https://cryptologos.cc/logos/solana-sol-logo.png" alt="SOL" width={22} height={22} />
                            </Box>
                            <Box>
                              <Typography fontWeight="800" color="#fff">SOL (Solana Wallet)</Typography>
                              <Typography variant="caption" color="text.secondary">Connected Native Assets</Typography>
                            </Box>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography fontWeight="800" color="#fff" variant="body2">
                              Connected
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ${solPrice.toFixed(2)} / SOL
                            </Typography>
                          </Box>
                        </Box>
                      </Stack>
                    </CardContent>
                  </Card>

                  {/* Staking summary on overview */}
                  <Card sx={{ bgcolor: '#121316', border: `1px solid ${alpha('#fff', 0.05)}`, borderRadius: '20px' }}>
                    <Box sx={{ p: 2.5, borderBottom: `1px solid ${alpha('#fff', 0.05)}`, bgcolor: alpha('#000', 0.15), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle1" fontWeight="800" color="#fff" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Coins size={18} color="#D4AF37" /> Staking Reserves Overview
                      </Typography>
                      <Button size="small" onClick={() => setWalletTab('staking')} sx={{ color: '#D4AF37', textTransform: 'none', fontWeight: '800' }}>
                        Manage Vaults →
                      </Button>
                    </Box>
                    <CardContent sx={{ p: 2.5 }}>
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary" display="block">TOTAL LOCKED CAPITAL</Typography>
                          <Typography variant="h6" fontWeight="900" color="#fff">
                            {totalStakedVolume.toFixed(2)} usGOLD
                          </Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary" display="block">ACCUMULATED REWARDS</Typography>
                          <Typography variant="h6" fontWeight="900" color="#4caf50">
                            +${liveTotalAccrued.toFixed(4)} USD
                          </Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Stack>
              </Grid>

              {/* Transactions list */}
              <Grid item xs={12} md={5}>
                <Card sx={{ bgcolor: '#121316', border: `1px solid ${alpha('#fff', 0.05)}`, borderRadius: '20px', height: '100%' }}>
                  <Box sx={{ p: 2.5, borderBottom: `1px solid ${alpha('#fff', 0.05)}`, bgcolor: alpha('#000', 0.15) }}>
                    <Typography variant="subtitle1" fontWeight="800" color="#fff" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Activity size={18} color="#D4AF37" /> Recent Transactions
                    </Typography>
                  </Box>
                  <CardContent sx={{ p: 2 }}>
                    {transactions.length === 0 ? (
                      <Box sx={{ py: 6, textAlign: 'center' }}>
                        <HelpCircle size={32} color={alpha('#fff', 0.2)} style={{ margin: '0 auto 8px' }} />
                        <Typography variant="body2" color="text.secondary">No transactions logged yet.</Typography>
                      </Box>
                    ) : (
                      <Stack spacing={1}>
                        {transactions.slice(0, 6).map((tx, idx) => (
                          <Box key={tx.id || idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: '10px', bgcolor: alpha('#fff', 0.01), borderBottom: idx < 5 ? `1px solid ${alpha('#fff', 0.03)}` : 'none' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <CheckCircle2 color="#4caf50" size={16} />
                              <Box>
                                <Typography variant="body2" fontWeight="800" color="#fff">{tx.details || tx.type.toUpperCase()}</Typography>
                                <Typography variant="caption" color="text.secondary">{new Date(tx.timestamp).toLocaleTimeString()}</Typography>
                              </Box>
                            </Box>
                            <Typography variant="body2" fontWeight="900" color="#D4AF37">
                              {tx.amount}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* TAB 2: BUY & MINT ASSETS (CORES) */}
          {walletTab === 'buy' && (
            <Grid container spacing={3.5}>
              
              {/* Buy Form */}
              <Grid item xs={12} md={7}>
                <Card sx={{ 
                  background: 'linear-gradient(145deg, #131417 0%, #0c0d10 100%)',
                  borderRadius: '24px',
                  border: `1.5px solid ${alpha('#D4AF37', 0.3)}`,
                  boxShadow: `0 16px 36px ${alpha('#000', 0.6)}`
                }}>
                  <Box sx={{ p: 3, borderBottom: `1px solid ${alpha('#D4AF37', 0.15)}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: alpha('#000', 0.2) }}>
                    <Typography variant="h6" fontWeight="900" color="#fff" sx={{ fontFamily: '"Cinzel", serif', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Plus size={20} color="#D4AF37" /> Mint & Deposit Portal
                    </Typography>
                    <Chip label="Instant Delivery" size="small" sx={{ bgcolor: alpha('#4caf50', 0.15), color: '#4caf50', fontWeight: '900', fontSize: '11px' }} />
                  </Box>

                  <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                    <Stack spacing={4}>
                      
                      {/* Token Asset Toggle */}
                      <Box>
                        <Typography variant="subtitle2" color="#D4AF37" fontWeight="800" sx={{ mb: 1.5, letterSpacing: 0.8 }}>
                          SELECT TARGET RESERVE ASSET
                        </Typography>
                        <Grid container spacing={2}>
                          
                          {/* usGOLD Option */}
                          <Grid item xs={6}>
                            <Box 
                              onClick={() => setPurchaseAsset('usGOLD')}
                              sx={{
                                cursor: 'pointer',
                                p: 2,
                                borderRadius: '16px',
                                bgcolor: purchaseAsset === 'usGOLD' ? alpha('#D4AF37', 0.1) : alpha('#fff', 0.01),
                                border: `1.5px solid ${purchaseAsset === 'usGOLD' ? '#D4AF37' : alpha('#fff', 0.05)}`,
                                transition: 'all 0.2s',
                                '&:hover': {
                                  borderColor: '#D4AF37',
                                  bgcolor: alpha('#D4AF37', 0.05)
                                }
                              }}
                            >
                              <Stack direction="row" spacing={1.5} alignItems="center">
                                <Avatar sx={{ bgcolor: alpha('#D4AF37', 0.15), color: '#D4AF37' }}>
                                  <Coins size={20} />
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" fontWeight="900" color={purchaseAsset === 'usGOLD' ? '#FFDF73' : '#fff'}>
                                    usGOLD Token
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Guaranteed yield
                                  </Typography>
                                </Box>
                              </Stack>
                            </Box>
                          </Grid>

                          {/* USDT Option */}
                          <Grid item xs={6}>
                            <Box 
                              onClick={() => setPurchaseAsset('USDT')}
                              sx={{
                                cursor: 'pointer',
                                p: 2,
                                borderRadius: '16px',
                                bgcolor: purchaseAsset === 'USDT' ? alpha('#26a69a', 0.1) : alpha('#fff', 0.01),
                                border: `1.5px solid ${purchaseAsset === 'USDT' ? '#26a69a' : alpha('#fff', 0.05)}`,
                                transition: 'all 0.2s',
                                '&:hover': {
                                  borderColor: '#26a69a',
                                  bgcolor: alpha('#26a69a', 0.05)
                                }
                              }}
                            >
                              <Stack direction="row" spacing={1.5} alignItems="center">
                                <Avatar sx={{ bgcolor: alpha('#26a69a', 0.15), color: '#26a69a' }}>
                                  <BarChart3 size={20} />
                                </Avatar>
                                <Box>
                                  <Typography variant="body2" fontWeight="900" color={purchaseAsset === 'USDT' ? '#2bbdAE' : '#fff'}>
                                    USDT Futures
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    Trading Margin
                                  </Typography>
                                </Box>
                              </Stack>
                            </Box>
                          </Grid>
                        </Grid>
                      </Box>

                      {/* Amount Input */}
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                          <Typography variant="subtitle2" color="#D4AF37" fontWeight="800" sx={{ letterSpacing: 0.8 }}>
                            SPECIFY MINTING VOLUME
                          </Typography>
                          <Chip 
                            label={`1 ${purchaseAsset} = $1.00`} 
                            size="small" 
                            sx={{ 
                              bgcolor: purchaseAsset === 'usGOLD' ? alpha('#D4AF37', 0.15) : alpha('#26a69a', 0.15), 
                              color: purchaseAsset === 'usGOLD' ? '#D4AF37' : '#26a69a',
                              fontWeight: '900'
                            }} 
                          />
                        </Box>

                        <TextField
                          fullWidth
                          variant="outlined"
                          type="number"
                          value={customPurchaseAmount}
                          onChange={(e) => setCustomPurchaseAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                          placeholder="e.g. 100"
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <Typography color={purchaseAsset === 'usGOLD' ? '#D4AF37' : '#26a69a'} fontWeight="900" fontSize="1.1rem">$</Typography>
                              </InputAdornment>
                            ),
                            endAdornment: (
                              <InputAdornment position="end">
                                <Typography variant="body2" color="text.secondary">USD</Typography>
                              </InputAdornment>
                            ),
                            sx: { 
                              bgcolor: alpha('#ffffff', 0.02), 
                              borderRadius: '14px', 
                              color: '#fff', 
                              fontSize: '1.2rem', 
                              fontWeight: '900',
                              border: `1.5px solid ${purchaseAsset === 'usGOLD' ? alpha('#D4AF37', 0.3) : alpha('#26a69a', 0.3)}`,
                              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: purchaseAsset === 'usGOLD' ? '#D4AF37' : '#26a69a' },
                              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: purchaseAsset === 'usGOLD' ? '#D4AF37' : '#26a69a' }
                            }
                          }}
                        />

                        {/* Presets */}
                        <Box sx={{ display: 'flex', gap: 1.5, mt: 1.5 }}>
                          {[10, 25, 50, 100, 250, 500].map((preset) => (
                            <Button 
                              key={preset}
                              size="small"
                              onClick={() => setCustomPurchaseAmount(preset)}
                              sx={{ 
                                flexGrow: 1, 
                                bgcolor: customPurchaseAmount === preset ? alpha('#fff', 0.05) : alpha('#fff', 0.01), 
                                color: purchaseAsset === 'usGOLD' ? '#FFDF73' : '#26a69a', 
                                borderRadius: '10px',
                                fontWeight: '900',
                                border: `1px solid ${customPurchaseAmount === preset ? (purchaseAsset === 'usGOLD' ? '#D4AF37' : '#26a69a') : alpha('#fff', 0.05)}`,
                                '&:hover': { bgcolor: alpha('#fff', 0.08) }
                              }}
                            >
                              ${preset}
                            </Button>
                          ))}
                        </Box>
                      </Box>

                      {/* Transaction Breakdown */}
                      <Box sx={{ p: 2.5, borderRadius: '16px', bgcolor: alpha('#000', 0.3), border: `1px solid ${alpha('#fff', 0.05)}` }}>
                        <Stack spacing={1.5}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Minting Target:</Typography>
                            <Typography variant="body2" fontWeight="800" color="#fff">+{customPurchaseAmount} {purchaseAsset}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">On-chain Solana Cost:</Typography>
                            <Typography variant="body2" fontWeight="800" color="#9945FF">
                              ~{solEquivalent.toFixed(4)} SOL
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" color="text.secondary">Network Fee Buffer:</Typography>
                            <Typography variant="body2" fontWeight="800" color="#4caf50">0.0001 SOL (Fully Subsidized)</Typography>
                          </Box>
                        </Stack>
                      </Box>

                      {/* Primary Button */}
                      <Button
                        variant="contained"
                        onClick={handleExecutePurchase}
                        disabled={isInvesting || isProcessingUsdtBuy || customPurchaseAmount <= 0}
                        sx={{
                          py: 1.8,
                          borderRadius: '14px',
                          fontWeight: '900',
                          fontSize: '1rem',
                          color: '#000',
                          bgcolor: purchaseAsset === 'usGOLD' ? '#D4AF37' : '#26a69a',
                          '&:hover': { bgcolor: purchaseAsset === 'usGOLD' ? '#FFDF73' : '#2bbdAE' },
                          boxShadow: purchaseAsset === 'usGOLD' 
                            ? `0 8px 24px ${alpha('#D4AF37', 0.3)}` 
                            : `0 8px 24px ${alpha('#26a69a', 0.3)}`
                        }}
                      >
                        {isInvesting || isProcessingUsdtBuy ? (
                          <Stack direction="row" spacing={1} alignItems="center">
                            <RefreshCw size={18} className="animate-spin" />
                            <Typography fontWeight="900">MINTING ASSET ON SOLANA...</Typography>
                          </Stack>
                        ) : (
                          `CONFIRM & MINT ${customPurchaseAmount} ${purchaseAsset} VIA SOL`
                        )}
                      </Button>

                      <Typography variant="caption" color="text.secondary" textAlign="center">
                        SOL is automatically disbursed to the Imperial MLM Ledger smart structures. Minted stable contracts will reflect instantly in your liquid ledger account.
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Informational Help Column */}
              <Grid item xs={12} md={5}>
                <Stack spacing={3.5}>
                  <Card sx={{ bgcolor: alpha('#121316', 0.5), border: `1px solid ${alpha('#fff', 0.05)}`, borderRadius: '20px' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Stack spacing={2.5}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Shield size={22} color="#D4AF37" />
                          <Typography variant="subtitle1" fontWeight="800" color="#fff" sx={{ fontFamily: '"Cinzel", serif' }}>
                            Imperial Security Standards
                          </Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                          All gold-backed assets minted through this portal are directly collateralized by Physical Bullion reserves audited monthly.
                        </Typography>
                        <Divider sx={{ borderColor: alpha('#fff', 0.05) }} />
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Info size={16} color="#4caf50" />
                          <Typography variant="caption" color="text.secondary" fontWeight="800">
                            TRANSACTION THRESHOLDS
                          </Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" display="block">
                          • <strong>usGOLD Stablecoin:</strong> Min $10.00 / Max $100.00 USD per mint.<br />
                          • <strong>USDT Futures:</strong> Min $10.00 / Max $1,000.00 USD per purchase.
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>

                  <Card sx={{ bgcolor: alpha('#9945FF', 0.03), border: `1px dashed ${alpha('#9945FF', 0.3)}`, borderRadius: '20px' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Stack spacing={1.5}>
                        <Typography variant="subtitle2" fontWeight="800" color="#9945FF">
                          Solana Network Connection
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                          Your wallet is connected to Solana Devnet/Mainnet RPC. Ensure you have sufficient native SOL balance to cover the purchase amount and microscopic priority gas fees.
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Stack>
              </Grid>
            </Grid>
          )}

          {/* TAB 3: FUTURES WALLET DETAILS & MARGIN */}
          {walletTab === 'futures' && (
            <Card sx={{ 
              background: 'linear-gradient(145deg, #121316 0%, #0c0d0f 100%)',
              border: `1.5px solid ${alpha('#26a69a', 0.45)}`,
              borderRadius: '24px',
              boxShadow: `0 16px 40px ${alpha('#000', 0.5)}`
            }}>
              <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: alpha('#26a69a', 0.15), color: '#26a69a', width: 44, height: 44 }}>
                      <BarChart3 size={24} />
                    </Avatar>
                    <Box>
                      <Typography variant="h6" fontWeight="900" color="#fff" sx={{ fontFamily: '"Cinzel", serif' }}>
                        Futures Trading Wallet
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Dedicated margin account for leverage futures contracts
                      </Typography>
                    </Box>
                  </Stack>
                  <Chip label="Margin Wallet" sx={{ bgcolor: alpha('#26a69a', 0.2), color: '#2bbdAE', fontWeight: '900' }} />
                </Box>

                <Grid container spacing={4} alignItems="center" sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary" fontWeight="800" letterSpacing={1.5}>
                      AVAILABLE FUTURES MARGIN BALANCE
                    </Typography>
                    <Typography variant="h3" fontWeight="900" color="#26a69a" sx={{ my: 1 }}>
                      ${futuresBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 360 }}>
                      Use these funds to open long or short leverage contracts on world FOREX and crypto indexes.
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Stack spacing={2} direction="row">
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={() => { setWalletTab('buy'); setPurchaseAsset('USDT'); }}
                        startIcon={<Plus size={18} />}
                        sx={{
                          py: 1.8,
                          bgcolor: '#26a69a',
                          color: '#000',
                          fontWeight: '900',
                          borderRadius: '12px',
                          '&:hover': { bgcolor: '#2bbdAE' }
                        }}
                      >
                        Buy USDT with SOL
                      </Button>
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => setActiveTab('futures')}
                        endIcon={<ArrowRight size={18} />}
                        sx={{
                          py: 1.8,
                          borderColor: alpha('#D4AF37', 0.4),
                          color: '#D4AF37',
                          fontWeight: '900',
                          borderRadius: '12px',
                          '&:hover': { borderColor: '#D4AF37', bgcolor: alpha('#D4AF37', 0.05) }
                        }}
                      >
                        Go to Trade Page
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>

                <Divider sx={{ borderColor: alpha('#fff', 0.05), my: 3 }} />

                <Grid container spacing={3}>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">IN-POSITION MARGIN</Typography>
                    <Typography variant="subtitle1" fontWeight="800" color="#fff">
                      ${inPositionMargin.toFixed(2)} USDT
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={4}>
                    <Typography variant="caption" color="text.secondary">MAX CONTRACT LEVERAGE</Typography>
                    <Typography variant="subtitle1" fontWeight="800" color="#FFDF73">
                      100x Leverage
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="text.secondary">LIQUIDATION SAFETY</Typography>
                    <Typography variant="subtitle1" fontWeight="800" color="#4caf50" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <ShieldCheck size={16} /> Secured by KuCoin Engine
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* TAB 4: usGOLD STAKING & ACTIVE VAULTS */}
          {walletTab === 'staking' && (
            <Grid container spacing={3.5}>
              
              {/* Lock Vault Panel */}
              <Grid item xs={12} md={7}>
                <Card sx={{ bgcolor: '#121316', border: `1px solid ${alpha('#D4AF37', 0.25)}`, borderRadius: '24px' }}>
                  <Box sx={{ p: 3, borderBottom: `1px solid ${alpha('#fff', 0.05)}`, bgcolor: alpha('#000', 0.15) }}>
                    <Typography variant="h6" fontWeight="900" color="#fff" sx={{ fontFamily: '"Cinzel", serif', display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Coins size={20} color="#D4AF37" /> Initiate usGOLD High-Yield Lock
                    </Typography>
                  </Box>

                  <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                    <Stack spacing={3.5}>
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                          <Typography variant="subtitle2" color="#D4AF37" fontWeight="800" sx={{ letterSpacing: 0.8 }}>
                            SPECIFY STAKING VOLUME
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Liquid usGOLD Balance: <strong>{usGoldBalance.toFixed(2)} GOLD</strong>
                          </Typography>
                        </Box>

                        <TextField
                          fullWidth
                          variant="outlined"
                          value={customStakeAmount}
                          onChange={(e) => setCustomStakeAmount(e.target.value)}
                          placeholder="Amount of usGOLD to stake"
                          InputProps={{
                            startAdornment: <InputAdornment position="start"><Coins size={20} color="#D4AF37" /></InputAdornment>,
                            endAdornment: <InputAdornment position="end"><Typography color="#D4AF37" fontWeight="900">usGOLD</Typography></InputAdornment>,
                            sx: { bgcolor: alpha('#000', 0.2), borderRadius: '14px', color: '#fff', fontWeight: '900' }
                          }}
                        />

                        {/* Staking Presets */}
                        <Box sx={{ display: 'flex', gap: 1.5, mt: 1.5 }}>
                          {[50, 100, 500, 1000].map((preset) => (
                            <Button 
                              key={preset}
                              size="small"
                              onClick={() => setCustomStakeAmount(preset.toString())}
                              sx={{ 
                                flexGrow: 1, 
                                bgcolor: alpha('#D4AF37', 0.05), 
                                color: '#FFDF73', 
                                borderRadius: '8px',
                                fontWeight: '800',
                                border: `1px solid ${alpha('#D4AF37', 0.15)}`,
                                '&:hover': { bgcolor: alpha('#D4AF37', 0.15) }
                              }}
                            >
                              +{preset}
                            </Button>
                          ))}
                          <Button 
                            size="small"
                            onClick={() => setCustomStakeAmount(usGoldBalance.toString())}
                            sx={{ 
                              flexGrow: 1, 
                              bgcolor: alpha('#4caf50', 0.08), 
                              color: '#4caf50', 
                              borderRadius: '8px',
                              fontWeight: '900',
                              border: `1px solid ${alpha('#4caf50', 0.2)}`
                            }}
                          >
                            MAX
                          </Button>
                        </Box>
                      </Box>

                      {/* Staking Duration Period Select */}
                      <Box>
                        <Typography variant="subtitle2" color="#D4AF37" fontWeight="800" sx={{ mb: 1.5, letterSpacing: 0.8 }}>
                          CHOOSE LOCKUP VAULT DURATION
                        </Typography>
                        <Grid container spacing={2}>
                          {[
                            { months: 1, rate: 0.02, label: `1 Month`, rateText: "2% Fixed" },
                            { months: 3, rate: 0.06, label: `3 Months`, rateText: "6% Fixed" },
                            { months: 6, rate: 0.12, label: `6 Months`, rateText: "12% Fixed" },
                            { months: 12, rate: 0.24, label: `12 Months`, rateText: "24% Fixed" },
                          ].map((plan) => {
                            const isSelected = stakingDurationMonths === plan.months;
                            return (
                              <Grid item xs={6} key={plan.months}>
                                <Box 
                                  onClick={() => setStakingDurationMonths(plan.months as any)}
                                  sx={{
                                    cursor: 'pointer',
                                    bgcolor: isSelected ? alpha('#D4AF37', 0.1) : alpha('#fff', 0.01),
                                    border: `1.5px solid ${isSelected ? '#D4AF37' : alpha('#fff', 0.05)}`,
                                    borderRadius: '16px',
                                    p: 2,
                                    textAlign: 'center',
                                    transition: 'all 0.2s',
                                    '&:hover': { borderColor: '#D4AF37', bgcolor: alpha('#D4AF37', 0.05) }
                                  }}
                                >
                                  <Typography variant="body2" fontWeight="900" color={isSelected ? '#FFDF73' : '#fff'}>
                                    {plan.label}
                                  </Typography>
                                  <Chip 
                                    label={plan.rateText} 
                                    size="small" 
                                    sx={{ 
                                      my: 1, 
                                      bgcolor: isSelected ? '#D4AF37' : alpha('#4caf50', 0.15), 
                                      color: isSelected ? '#000' : '#4caf50',
                                      fontWeight: '900',
                                      fontSize: '10px'
                                    }} 
                                  />
                                </Box>
                              </Grid>
                            );
                          })}
                        </Grid>
                      </Box>

                      {/* Summary */}
                      <Box sx={{ p: 2, borderRadius: '16px', bgcolor: alpha('#D4AF37', 0.05), border: `1px dashed ${alpha('#D4AF37', 0.3)}` }}>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">Locked Reserves</Typography>
                            <Typography variant="body1" fontWeight="800" color="#fff">
                              {parseFloat(customStakeAmount) || 0} usGOLD
                            </Typography>
                          </Grid>
                          <Grid item xs={6} sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" color="text.secondary">Expected Staking Dividends</Typography>
                            <Typography variant="body1" fontWeight="900" color="#4caf50">
                              +${((parseFloat(customStakeAmount) || 0) * (stakingDurationMonths * 0.02)).toFixed(2)} USD
                            </Typography>
                          </Grid>
                        </Grid>
                      </Box>

                      <Button
                        variant="contained"
                        disabled={isCreatingStake}
                        onClick={handleCreateCustomStake}
                        sx={{
                          py: 1.8,
                          borderRadius: '12px',
                          bgcolor: '#D4AF37',
                          color: '#000',
                          fontWeight: '900',
                          '&:hover': { bgcolor: '#FFDF73' },
                          boxShadow: `0 8px 24px ${alpha('#D4AF37', 0.35)}`
                        }}
                      >
                        {isCreatingStake ? 'CREATING LOCK VAULT...' : 'CONFIRM STAKING DEPOSIT'}
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Active Locked Vaults List */}
              <Grid item xs={12} md={5}>
                <Card sx={{ bgcolor: '#121316', border: `1px solid ${alpha('#fff', 0.05)}`, borderRadius: '24px', height: '100%' }}>
                  <Box sx={{ p: 2.5, borderBottom: `1px solid ${alpha('#fff', 0.05)}`, bgcolor: alpha('#000', 0.15) }}>
                    <Typography variant="subtitle1" fontWeight="800" color="#fff" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Activity size={18} color="#D4AF37" /> Active Locked Positions
                    </Typography>
                  </Box>
                  <CardContent sx={{ p: 2.5 }}>
                    {activeStakedList.length === 0 ? (
                      <Box sx={{ py: 8, textAlign: 'center' }}>
                        <Coins size={44} color="#D4AF37" style={{ opacity: 0.35, marginBottom: 12 }} />
                        <Typography variant="body2" color="text.secondary">No active staking vaults found.</Typography>
                      </Box>
                    ) : (
                      <Stack spacing={2.5}>
                        {activeStakedList.map((st) => {
                          const totalDurationSec = Math.floor((st.endTime - st.startTime) / 1000) || 1;
                          const elapsedSec = Math.min(totalDurationSec, Math.max(0, Math.floor((nowTime - st.startTime) / 1000)));
                          const remainingSec = Math.max(0, Math.floor((st.endTime - nowTime) / 1000));

                          const profitPerSec = st.totalExpectedProfit / totalDurationSec;
                          const currentAccruedProfit = Math.min(st.totalExpectedProfit, elapsedSec * profitPerSec);

                          const days = Math.floor(remainingSec / 86400);
                          const hours = Math.floor((remainingSec % 86400) / 3600);
                          const minutes = Math.floor((remainingSec % 3600) / 60);
                          const seconds = remainingSec % 60;
                          const countdownFormatted = `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;

                          const progressPercent = Math.min(100, (elapsedSec / totalDurationSec) * 100);

                          return (
                            <Box key={st.key} sx={{ p: 2, borderRadius: '16px', bgcolor: alpha('#fff', 0.01), border: `1px solid ${alpha('#D4AF37', 0.25)}` }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                                <Typography variant="body2" fontWeight="900" color="#fff">{st.amount} usGOLD</Typography>
                                <Chip label={`+${st.durationMonths * 2}% Return`} size="small" sx={{ bgcolor: alpha('#4caf50', 0.15), color: '#4caf50', fontSize: '10px' }} />
                              </Box>

                              <Box sx={{ p: 1.5, borderRadius: '8px', bgcolor: alpha('#4caf50', 0.05), mb: 1.5 }}>
                                <Typography variant="caption" color="text.secondary" display="block">LIVE ACCRUED PROFIT</Typography>
                                <Typography variant="body1" fontWeight="900" color="#4caf50" sx={{ fontFamily: 'monospace' }}>
                                  +${currentAccruedProfit.toFixed(6)} USD
                                </Typography>
                              </Box>

                              <Typography variant="caption" color="text.secondary">UNLOCKED IN COUNTDOWN:</Typography>
                              <Typography variant="body2" fontWeight="800" color="#FFDF73" sx={{ fontFamily: 'monospace', mb: 1 }}>
                                {countdownFormatted}
                              </Typography>

                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <LinearProgress variant="determinate" value={progressPercent} sx={{ flexGrow: 1, height: 4, borderRadius: 2, bgcolor: alpha('#fff', 0.1), '& .MuiLinearProgress-bar': { bgcolor: '#D4AF37' } }} />
                                <Typography variant="caption" color="text.secondary">{progressPercent.toFixed(0)}%</Typography>
                              </Box>

                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                fullWidth
                                onClick={() => handleClaimStakeProfit(st.key, currentAccruedProfit)}
                                sx={{ fontWeight: '800', py: 1, textTransform: 'none', borderRadius: '8px' }}
                              >
                                Claim Accrued Profits
                              </Button>
                            </Box>
                          );
                        })}
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

        </Stack>
      )}
    </Box>
  );
}

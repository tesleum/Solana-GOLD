import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Stack, Card, CardContent, alpha, useTheme, Button, 
  Divider, Grid, Chip, Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, InputAdornment, IconButton, Tab, Tabs, LinearProgress, Avatar, Slider
} from '@mui/material';
import { 
  Wallet, ArrowUpRight, ArrowDownRight, Coins, BarChart3, ShieldCheck, 
  Zap, Plus, RefreshCw, Copy, Check, TrendingUp, Layers, Award, Sparkles, 
  CreditCard, DollarSign, ArrowRight, Activity, CheckCircle2
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon';
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
  const { publicKey } = useWallet();
  const [copied, setCopied] = useState(false);

  // Futures Wallet Balance state from Firebase
  const [futuresBalance, setFuturesBalance] = useState<number>(0);
  const [inPositionMargin, setInPositionMargin] = useState<number>(0);
  
  // Top Up Modal State
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<string>('500');
  const [isProcessingTopUp, setIsProcessingTopUp] = useState(false);

  // Tab state inside Wallet
  const [walletTab, setWalletTab] = useState<'overview' | 'futures' | 'staking'>('overview');

  // Custom Staking & Flexible Vault State
  const [customStakeAmount, setCustomStakeAmount] = useState<string>('100');
  const [stakingDurationMonths, setStakingDurationMonths] = useState<1 | 3 | 6 | 12>(3);
  const [isCreatingStake, setIsCreatingStake] = useState(false);

  // Active Stakes from Firebase
  const [activeStakes, setActiveStakes] = useState<any[]>([]);

  // Real-time ticking timestamp state (ticks every second for real-time countdown & profit accrual)
  const [nowTime, setNowTime] = useState<number>(Date.now());

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

  // Handle Custom usGOLD Staking creation
  const handleCreateCustomStake = async () => {
    const amt = parseFloat(customStakeAmount);
    if (isNaN(amt) || amt <= 0) {
      alert("Please enter a valid usGOLD amount to stake.");
      return;
    }

    setIsCreatingStake(true);

    try {
      const profitRate = stakingDurationMonths * 0.02; // 2% profit per month
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
      } else {
        setActiveStakes(prev => [...prev, { key: Date.now().toString(), ...newStake }]);
      }

      setIsCreatingStake(false);
      alert(`Success! Staked ${amt} usGOLD in the ${stakingDurationMonths}-Month Vault with ${stakingDurationMonths * 2}% total return!`);
    } catch (err) {
      console.error("Stake creation error:", err);
      setIsCreatingStake(false);
      alert("Failed to create stake. Please try again.");
    }
  };

  // Handle Claiming Staking Profit
  const handleClaimStakeProfit = async (stakeKey: string, accruedProfit: number) => {
    try {
      if (effectiveAddress) {
        const stakeRef = ref(database, `stakes/${effectiveAddress}/${stakeKey}`);
        await update(stakeRef, { status: 'claimed', claimedAt: Date.now() });

        const txRef = ref(database, `transactions/${effectiveAddress}`);
        await push(txRef, {
          type: 'stake_claimed',
          amount: `$${accruedProfit.toFixed(2)} USD`,
          details: `Claimed Staking Profits from usGOLD Vault`,
          timestamp: Date.now()
        });
      } else {
        setActiveStakes(prev => prev.filter(s => s.key !== stakeKey));
      }
      alert(`Successfully claimed $${accruedProfit.toFixed(2)} USD in accrued staking rewards!`);
    } catch (err) {
      console.error("Claim stake error:", err);
      alert("Failed to claim rewards.");
    }
  };

  // Copy address handler
  const handleCopyAddress = () => {
    if (effectiveAddress) {
      navigator.clipboard.writeText(effectiveAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Sync Futures Wallet balance and positions from Firebase for effectiveAddress
  useEffect(() => {
    if (effectiveAddress) {
      const userRef = ref(database, `users/${effectiveAddress}`);
      const unsub = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          if (val.futuresBalance !== undefined) {
            setFuturesBalance(parseFloat(val.futuresBalance) || 0);
          } else {
            // Default 0 USDT futures wallet balance if first time
            update(userRef, { futuresBalance: 0 });
            setFuturesBalance(0);
          }

          // Calculate margin in positions
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

  // Handle Futures Top Up
  const handleExecuteTopUp = async () => {
    const amountNum = parseFloat(topUpAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid top up amount.");
      return;
    }

    setIsProcessingTopUp(true);

    try {
      const newBal = futuresBalance + amountNum;
      if (effectiveAddress) {
        const userRef = ref(database, `users/${effectiveAddress}`);
        await update(userRef, { futuresBalance: newBal });

        // Record Top-Up Transaction
        const txRef = ref(database, `transactions/${effectiveAddress}`);
        await push(txRef, {
          type: 'top_up',
          amount: `${amountNum.toFixed(2)} USDT`,
          details: 'Futures Trading Wallet Top-Up',
          timestamp: Date.now()
        });
      } else {
        setFuturesBalance(newBal);
      }

      setIsProcessingTopUp(false);
      setTopUpOpen(false);
      alert(`Success! Topped up $${amountNum.toFixed(2)} USDT to your Futures Trading Wallet.`);
    } catch (err) {
      console.error("Top up error:", err);
      setIsProcessingTopUp(false);
      alert("Failed to execute top up. Please try again.");
    }
  };

  const solPrice = solanaPrice || 150;
  const usGoldUsdValue = usGoldBalance * 80; // $80 per usGOLD
  const totalNetWorth = futuresBalance + usGoldUsdValue;

  return (
    <Box sx={{ animation: 'fadeIn 0.4s ease-out', pb: 12 }}>
      {/* Page Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="overline" color="#D4AF37" fontWeight="800" letterSpacing={3}>
          IMPERIAL FINANCIAL HUB
        </Typography>
        <Typography variant="h3" fontWeight="900" sx={{ 
          fontFamily: '"Cinzel", serif', 
          background: 'linear-gradient(to bottom, #FFDF73, #D4AF37, #AA7C11)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent',
          filter: `drop-shadow(0 4px 20px ${alpha('#D4AF37', 0.4)})`
        }}>
          Digital Treasury
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 500, mx: 'auto' }}>
          Manage your Futures Trading Margin, usGOLD Staking Reserve, and Wallet Assets in one place.
        </Typography>
      </Box>

      {!effectiveAddress ? (
        <Card sx={{ 
          bgcolor: alpha('#121214', 0.9),
          borderRadius: '28px',
          border: `1px solid ${alpha('#D4AF37', 0.3)}`,
          p: { xs: 3, sm: 5 },
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
        }}>
          <Wallet size={56} color="#D4AF37" style={{ margin: '0 auto 16px', filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.4))' }} />
          <Typography variant="h5" fontWeight="bold" color="#fff" mb={1.5}>
            Connect Your Wallet
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={4} sx={{ maxWidth: 420, mx: 'auto' }}>
            Connect your Web3 wallet or log in to access your personal Futures Trading Wallet, Top-Up funds, and usGOLD Staking Vault.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <WalletMultiButton style={{ 
              backgroundColor: '#D4AF37', 
              color: '#000', 
              fontWeight: 800, 
              borderRadius: '14px',
              padding: '12px 28px'
            }} />
          </Box>
        </Card>
      ) : (
        <Stack spacing={3}>
          {/* Identity & Net Worth Banner */}
          <Card sx={{ 
            background: `linear-gradient(135deg, ${alpha('#1A1B20', 0.95)} 0%, ${alpha('#121316', 0.98)} 100%)`,
            borderRadius: '28px',
            border: `1px solid ${alpha('#D4AF37', 0.35)}`,
            boxShadow: `0 16px 40px ${alpha('#000', 0.6)}, inset 0 1px 0 ${alpha('#FFDF73', 0.2)}`,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box sx={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, background: `radial-gradient(circle, ${alpha('#D4AF37', 0.12)} 0%, transparent 70%)` }} />
            
            <CardContent sx={{ p: { xs: 3, sm: 4 }, position: 'relative', zIndex: 1 }}>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={7}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box sx={{ p: '2px', borderRadius: '50%', background: 'linear-gradient(45deg, #D4AF37, #FFDF73)' }}>
                      <Box sx={{ bgcolor: '#121214', borderRadius: '50%', p: '2px' }}>
                        <Jazzicon diameter={42} seed={jsNumberForAddress(effectiveAddress)} />
                      </Box>
                    </Box>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight="700" color="#fff">
                          {effectiveAddress.substring(0, 6)}...{effectiveAddress.substring(effectiveAddress.length - 4)}
                        </Typography>
                        <IconButton size="small" onClick={handleCopyAddress} sx={{ color: '#D4AF37' }}>
                          {copied ? <Check size={16} color="#4caf50" /> : <Copy size={16} />}
                        </IconButton>
                      </Box>
                      <Chip 
                        icon={<ShieldCheck size={12} color="#D4AF37" />} 
                        label="Verified Account" 
                        size="small" 
                        sx={{ bgcolor: alpha('#D4AF37', 0.1), color: '#D4AF37', fontSize: '0.7rem', height: 20, mt: 0.5 }} 
                      />
                    </Box>
                  </Box>

                  <Typography variant="overline" color="text.secondary" fontWeight="700" letterSpacing={2}>
                    Total Estimated Net Worth
                  </Typography>
                  <Typography variant="h2" fontWeight="900" sx={{ color: '#fff', fontFamily: '"Cinzel", serif', my: 0.5 }}>
                    ${totalNetWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Includes Futures Trading Margin + usGOLD Staking Reserve
                  </Typography>
                </Grid>

                <Grid item xs={12} md={5}>
                  <Stack spacing={1.5} sx={{ bgcolor: alpha('#000', 0.3), p: 2.5, borderRadius: '20px', border: `1px solid ${alpha('#ffffff', 0.05)}` }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Futures Margin:</Typography>
                      <Typography variant="body2" fontWeight="bold" color="#26a69a">
                        ${futuresBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })} USDT
                      </Typography>
                    </Box>
                    <Divider sx={{ borderColor: alpha('#fff', 0.05) }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">usGOLD Vault:</Typography>
                      <Typography variant="body2" fontWeight="bold" color="#D4AF37">
                        {usGoldBalance.toFixed(2)} GOLD (${usGoldUsdValue.toFixed(2)})
                      </Typography>
                    </Box>
                    <Divider sx={{ borderColor: alpha('#fff', 0.05) }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">Solana Market Price:</Typography>
                      <Typography variant="body2" fontWeight="bold" color="#9945FF">
                        ${solPrice.toFixed(2)} USD
                      </Typography>
                    </Box>
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Navigation Tabs inside Wallet */}
          <Box sx={{ borderBottom: 1, borderColor: alpha('#D4AF37', 0.2) }}>
            <Tabs 
              value={walletTab} 
              onChange={(_, v) => setWalletTab(v)}
              textColor="inherit"
              indicatorColor="secondary"
              sx={{
                '& .MuiTabs-indicator': { backgroundColor: '#D4AF37', height: 3 },
                '& .MuiTab-root': { color: 'text.secondary', fontWeight: 700, fontSize: '0.95rem' },
                '& .Mui-selected': { color: '#D4AF37' }
              }}
            >
              <Tab label="Futures Trading Wallet" value="futures" icon={<BarChart3 size={18} />} iconPosition="start" />
              <Tab label="usGOLD Staking Vault" value="staking" icon={<Coins size={18} />} iconPosition="start" />
              <Tab label="Portfolio & Activity" value="overview" icon={<Layers size={18} />} iconPosition="start" />
            </Tabs>
          </Box>

          {/* TAB 1: FUTURES TRADING WALLET */}
          {(walletTab === 'futures' || walletTab === 'overview') && (
            <Card sx={{ 
              background: `linear-gradient(145deg, #16181D 0%, #0F1014 100%)`,
              borderRadius: '24px',
              border: `1px solid ${alpha('#26a69a', 0.4)}`,
              boxShadow: `0 12px 30px ${alpha('#000', 0.5)}`
            }}>
              <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{ p: 1.2, bgcolor: alpha('#26a69a', 0.15), borderRadius: '14px', border: `1px solid ${alpha('#26a69a', 0.3)}` }}>
                      <BarChart3 color="#26a69a" size={24} />
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight="bold" color="#fff">
                        Futures Trading Wallet
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Dedicated margin account for perpetual futures & leverage contracts
                      </Typography>
                    </Box>
                  </Box>
                  <Chip label="Live Margin" size="small" sx={{ bgcolor: alpha('#26a69a', 0.2), color: '#26a69a', fontWeight: 'bold' }} />
                </Box>

                <Grid container spacing={3} alignItems="center">
                  <Grid item xs={12} sm={6}>
                    <Typography variant="overline" color="text.secondary" fontWeight="700">
                      Available Trading Balance
                    </Typography>
                    <Typography variant="h3" fontWeight="900" color="#26a69a" sx={{ my: 0.5 }}>
                      ${futuresBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span style={{ fontSize: '1rem', color: '#888' }}>USDT</span>
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Ready for 1x - 100x Leverage Trading on KuCoin Futures Markets
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }}>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={() => setTopUpOpen(true)}
                        startIcon={<Plus size={20} />}
                        sx={{
                          bgcolor: '#26a69a',
                          color: '#000',
                          fontWeight: '800',
                          borderRadius: '14px',
                          py: 1.8,
                          fontSize: '1rem',
                          '&:hover': { bgcolor: '#2bbdAE' },
                          boxShadow: '0 8px 24px rgba(38,166,154,0.3)'
                        }}
                      >
                        Top Up Wallet
                      </Button>
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={() => setActiveTab('futures')}
                        endIcon={<ArrowRight size={20} />}
                        sx={{
                          borderColor: alpha('#D4AF37', 0.5),
                          color: '#D4AF37',
                          fontWeight: '800',
                          borderRadius: '14px',
                          py: 1.8,
                          '&:hover': { borderColor: '#D4AF37', bgcolor: alpha('#D4AF37', 0.1) }
                        }}
                      >
                        Trade Futures
                      </Button>
                    </Stack>
                  </Grid>
                </Grid>

                {/* Futures Perks Banner */}
                <Box sx={{ mt: 3, p: 2, borderRadius: '16px', bgcolor: alpha('#26a69a', 0.06), border: `1px dashed ${alpha('#26a69a', 0.2)}`, display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Zap size={20} color="#26a69a" />
                  <Typography variant="caption" color="text.secondary">
                    <strong>Zero Deposit Fees:</strong> Top up instantly to lock margin for FOREX perpetual futures, real-time live tickers, and high-frequency orderbook trading.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* TAB 2: usGOLD STAKING & MINTING VAULT */}
          {(walletTab === 'staking' || walletTab === 'overview') && (
            <Card sx={{ 
              background: `linear-gradient(145deg, #1A1A1A 0%, #0D0D0D 100%)`,
              border: `1px solid ${alpha('#D4AF37', 0.35)}`,
              boxShadow: `0 12px 40px ${alpha('#D4AF37', 0.15)}`,
              borderRadius: '28px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <Box sx={{ position: 'absolute', top: -50, left: -50, width: 200, height: 200, background: `radial-gradient(circle, ${alpha('#D4AF37', 0.15)} 0%, transparent 60%)` }} />
              
              <CardContent sx={{ p: { xs: 3, md: 5 }, position: 'relative', zIndex: 1 }}>
                
                <Box textAlign="center" mb={4}>
                  <Chip label="2% Monthly Fixed Return Staking" size="small" sx={{ bgcolor: alpha('#D4AF37', 0.15), color: '#FFDF73', fontWeight: '800', mb: 1 }} />
                  <Typography variant="h3" fontWeight="900" sx={{ fontFamily: '"Cinzel", serif', background: 'linear-gradient(45deg, #FFDF73, #D4AF37, #996515)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Stake usGOLD Reserve
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: '80%', mx: 'auto' }}>
                    Choose any custom amount to stake in 1-Month, 3-Months, 6-Months, or 12-Months locked vaults. Earn a guaranteed 2% profit every month with live real-time second-by-second yield updates.
                  </Typography>
                </Box>

                {/* Staking Setup Box */}
                <Box sx={{ bgcolor: alpha('#000', 0.5), p: { xs: 2.5, md: 4 }, borderRadius: '24px', border: `1px solid ${alpha('#D4AF37', 0.2)}` }}>
                  <Stack spacing={3}>
                    {/* Amount Input */}
                    <Box>
                      <Typography variant="subtitle2" color="#D4AF37" fontWeight="800" mb={1}>
                        1. ENTER STAKING AMOUNT (usGOLD)
                      </Typography>
                      <TextField
                        fullWidth
                        variant="outlined"
                        value={customStakeAmount}
                        onChange={(e) => setCustomStakeAmount(e.target.value)}
                        placeholder="e.g. 500"
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Coins size={20} color="#D4AF37" />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <Typography variant="body2" color="#D4AF37" fontWeight="bold">usGOLD</Typography>
                            </InputAdornment>
                          ),
                          sx: { 
                            bgcolor: alpha('#ffffff', 0.04), 
                            borderRadius: '14px', 
                            color: '#fff', 
                            fontSize: '1.2rem', 
                            fontWeight: 'bold',
                            border: `1px solid ${alpha('#D4AF37', 0.3)}`
                          }
                        }}
                      />
                      
                      {/* Amount Slider */}
                      <Box sx={{ px: 1, mt: 3, mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">Select Staking Amount via Slider</Typography>
                          <Typography variant="caption" color="#D4AF37" fontWeight="bold">{customStakeAmount || 0} usGOLD</Typography>
                        </Box>
                        <Slider
                          value={parseFloat(customStakeAmount) || 0}
                          onChange={(_, val) => setCustomStakeAmount(val.toString())}
                          min={10}
                          max={10000}
                          step={10}
                          marks={[
                            { value: 10, label: '10' },
                            { value: 2500, label: '2.5k' },
                            { value: 5000, label: '5k' },
                            { value: 7500, label: '7.5k' },
                            { value: 10000, label: '10k' }
                          ]}
                          valueLabelDisplay="auto"
                          sx={{
                            color: '#D4AF37',
                            '& .MuiSlider-thumb': { bgcolor: '#D4AF37' },
                            '& .MuiSlider-rail': { bgcolor: alpha('#fff', 0.2) },
                            '& .MuiSlider-markLabel': { color: 'text.secondary', fontSize: '0.75rem' }
                          }}
                        />
                      </Box>
                    </Box>

                    {/* Duration Options */}
                    <Box>
                      <Typography variant="subtitle2" color="#D4AF37" fontWeight="800" mb={1}>
                        2. SELECT STAKING DURATION & GUARANTEED PROFIT
                      </Typography>
                      <Grid container spacing={2}>
                        {[
                          { months: 1, rate: 0.02, label: "1 Month", profit: "2% Profit" },
                          { months: 3, rate: 0.06, label: "3 Months", profit: "6% Profit" },
                          { months: 6, rate: 0.12, label: "6 Months", profit: "12% Profit" },
                          { months: 12, rate: 0.24, label: "12 Months", profit: "24% Profit" },
                        ].map((plan) => {
                          const isSelected = stakingDurationMonths === plan.months;
                          const amt = parseFloat(customStakeAmount) || 0;
                          const estProfit = amt * plan.rate;
                          return (
                            <Grid item xs={6} sm={3} key={plan.months}>
                              <Card 
                                onClick={() => setStakingDurationMonths(plan.months as any)}
                                sx={{
                                  cursor: 'pointer',
                                  bgcolor: isSelected ? alpha('#D4AF37', 0.15) : alpha('#ffffff', 0.03),
                                  border: `2px solid ${isSelected ? '#D4AF37' : alpha('#ffffff', 0.1)}`,
                                  borderRadius: '18px',
                                  p: 2,
                                  textAlign: 'center',
                                  transition: 'all 0.2s ease',
                                  boxShadow: isSelected ? `0 0 20px ${alpha('#D4AF37', 0.3)}` : 'none',
                                  '&:hover': {
                                    borderColor: '#D4AF37',
                                    bgcolor: alpha('#D4AF37', 0.1)
                                  }
                                }}
                              >
                                <Typography variant="h6" fontWeight="900" color={isSelected ? '#FFDF73' : '#fff'}>
                                  {plan.label}
                                </Typography>
                                <Chip 
                                  label={plan.profit} 
                                  size="small" 
                                  sx={{ 
                                    my: 1, 
                                    bgcolor: isSelected ? '#D4AF37' : alpha('#4caf50', 0.2), 
                                    color: isSelected ? '#000' : '#4caf50',
                                    fontWeight: 'bold' 
                                  }} 
                                />
                                <Typography variant="caption" display="block" color="text.secondary">
                                  Return: +${estProfit.toFixed(2)}
                                </Typography>
                              </Card>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Box>

                    {/* Projected Profit Summary */}
                    <Box sx={{ p: 2.5, borderRadius: '16px', bgcolor: alpha('#D4AF37', 0.08), border: `1px dashed ${alpha('#D4AF37', 0.3)}` }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">Staked Amount:</Typography>
                          <Typography variant="h5" fontWeight="bold" color="#fff">
                            {parseFloat(customStakeAmount) || 0} usGOLD
                          </Typography>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="caption" color="text.secondary">Guaranteed {stakingDurationMonths}-Month Return ({stakingDurationMonths * 2}%):</Typography>
                          <Typography variant="h5" fontWeight="900" color="#4caf50">
                            +${((parseFloat(customStakeAmount) || 0) * (stakingDurationMonths * 0.02)).toFixed(2)} USD
                          </Typography>
                        </Grid>
                      </Grid>
                    </Box>

                    <Button
                      variant="contained"
                      fullWidth
                      disabled={isCreatingStake}
                      onClick={handleCreateCustomStake}
                      sx={{
                        bgcolor: '#D4AF37',
                        color: '#000',
                        fontWeight: '900',
                        fontSize: '1.15rem',
                        py: 2,
                        borderRadius: '16px',
                        '&:hover': { bgcolor: '#FFDF73' },
                        boxShadow: '0 8px 30px rgba(212,175,55,0.4)'
                      }}
                    >
                      {isCreatingStake ? 'Locking Stake...' : `Stake ${parseFloat(customStakeAmount) || 0} usGOLD (${stakingDurationMonths} Mo • ${stakingDurationMonths * 2}% Profit)`}
                    </Button>
                  </Stack>
                </Box>

                {/* Active Locked Stakes & Real-Time Countdown List */}
                <Box sx={{ mt: 5 }}>
                  <Typography variant="h5" fontWeight="900" color="#fff" mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Activity color="#D4AF37" size={24} />
                    Active Staking Vaults ({activeStakes.filter(s => s.status !== 'claimed').length})
                  </Typography>

                  {activeStakes.filter(s => s.status !== 'claimed').length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center', bgcolor: alpha('#ffffff', 0.02), borderRadius: '20px', border: `1px dashed ${alpha('#ffffff', 0.1)}` }}>
                      <Coins size={40} color="#D4AF37" style={{ opacity: 0.5, marginBottom: 8 }} />
                      <Typography variant="body1" color="text.secondary">
                        No active usGOLD stakes currently locked. Create your first stake above!
                      </Typography>
                    </Box>
                  ) : (
                    <Stack spacing={2.5}>
                      {activeStakes.filter(s => s.status !== 'claimed').map((st) => {
                        const totalDurationSec = Math.floor((st.endTime - st.startTime) / 1000) || 1;
                        const elapsedSec = Math.min(totalDurationSec, Math.max(0, Math.floor((nowTime - st.startTime) / 1000)));
                        const remainingSec = Math.max(0, Math.floor((st.endTime - nowTime) / 1000));

                        // Profit accrued per second
                        const profitPerSec = st.totalExpectedProfit / totalDurationSec;
                        const currentAccruedProfit = Math.min(st.totalExpectedProfit, elapsedSec * profitPerSec);

                        // Countdown formatting
                        const days = Math.floor(remainingSec / 86400);
                        const hours = Math.floor((remainingSec % 86400) / 3600);
                        const minutes = Math.floor((remainingSec % 3600) / 60);
                        const seconds = remainingSec % 60;
                        const countdownFormatted = `${days}d ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;

                        const progressPercent = Math.min(100, (elapsedSec / totalDurationSec) * 100);

                        return (
                          <Card 
                            key={st.key}
                            sx={{
                              bgcolor: alpha('#16171b', 0.95),
                              border: `1px solid ${alpha('#D4AF37', 0.4)}`,
                              borderRadius: '20px',
                              p: 3,
                              boxShadow: `0 8px 30px ${alpha('#000', 0.5)}`
                            }}
                          >
                            <Grid container spacing={2} alignItems="center">
                              <Grid item xs={12} md={4}>
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                  <Avatar sx={{ bgcolor: alpha('#D4AF37', 0.2), color: '#D4AF37' }}>
                                    <ShieldCheck size={24} />
                                  </Avatar>
                                  <Box>
                                    <Typography variant="h6" fontWeight="bold" color="#fff">
                                      {st.amount} usGOLD
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                      {st.durationMonths}-Month Vault ({st.durationMonths * 2}% Return)
                                    </Typography>
                                  </Box>
                                </Stack>
                              </Grid>

                              <Grid item xs={12} sm={6} md={4}>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Live Profit Countdown Ticker (+2%/mo):
                                </Typography>
                                <Typography variant="h5" fontWeight="900" color="#4caf50" sx={{ fontFamily: 'monospace', filter: 'drop-shadow(0 0 8px rgba(76,175,80,0.4))' }}>
                                  +${currentAccruedProfit.toFixed(6)} USD
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Max Profit: +${st.totalExpectedProfit?.toFixed(2)} USD
                                </Typography>
                              </Grid>

                              <Grid item xs={12} sm={6} md={4}>
                                <Typography variant="caption" color="#D4AF37" fontWeight="bold" display="block">
                                  Vault Unlock Countdown:
                                </Typography>
                                <Typography variant="h6" fontWeight="bold" color="#FFDF73" sx={{ fontFamily: 'monospace' }}>
                                  {countdownFormatted}
                                </Typography>
                                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <LinearProgress 
                                    variant="determinate" 
                                    value={progressPercent} 
                                    sx={{ 
                                      flexGrow: 1, 
                                      height: 6, 
                                      borderRadius: 3, 
                                      bgcolor: alpha('#ffffff', 0.1),
                                      '& .MuiLinearProgress-bar': { bgcolor: '#D4AF37' } 
                                    }} 
                                  />
                                  <Typography variant="caption" color="text.secondary">{progressPercent.toFixed(1)}%</Typography>
                                </Box>
                              </Grid>
                            </Grid>

                            <Divider sx={{ my: 2, borderColor: alpha('#ffffff', 0.05) }} />

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="caption" color="text.secondary">
                                Live per-second compounding active
                              </Typography>
                              <Button
                                size="small"
                                variant="contained"
                                color="success"
                                onClick={() => handleClaimStakeProfit(st.key, currentAccruedProfit)}
                                sx={{ fontWeight: 'bold', borderRadius: '10px' }}
                              >
                                Claim Accrued (${currentAccruedProfit.toFixed(2)})
                              </Button>
                            </Box>
                          </Card>
                        );
                      })}
                    </Stack>
                  )}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* ASSET PORTFOLIO BREAKDOWN */}
          <Typography variant="h6" fontWeight="bold" sx={{ color: '#fff', mt: 3 }}>
            Asset Portfolio
          </Typography>
          <Card sx={{ 
            bgcolor: alpha('#121214', 0.95),
            borderRadius: '24px',
            border: `1px solid ${alpha('#D4AF37', 0.2)}`
          }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack spacing={2}>
                {/* USDT Futures Margin */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: '16px', bgcolor: alpha('#fff', 0.02), '&:hover': { bgcolor: alpha('#fff', 0.05) } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 42, height: 42, bgcolor: alpha('#26a69a', 0.15), borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <BarChart3 color="#26a69a" size={22} />
                    </Box>
                    <Box>
                      <Typography fontWeight="bold" color="#fff">USDT (Futures Margin)</Typography>
                      <Typography variant="caption" color="text.secondary">KuCoin Perpetual Contracts</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography fontWeight="bold" color="#26a69a">
                      ${futuresBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Typography>
                    <Button size="small" onClick={() => setTopUpOpen(true)} sx={{ color: '#26a69a', textTransform: 'none', p: 0, minWidth: 0, fontWeight: 'bold' }}>
                      + Top Up
                    </Button>
                  </Box>
                </Box>

                {/* usGOLD Solana Token Contract */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: '16px', bgcolor: alpha('#D4AF37', 0.05), border: `1px solid ${alpha('#D4AF37', 0.2)}`, '&:hover': { bgcolor: alpha('#D4AF37', 0.08) } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 42, height: 42, bgcolor: alpha('#D4AF37', 0.2), borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Coins color="#D4AF37" size={22} />
                    </Box>
                    <Box>
                      <Typography fontWeight="bold" color="#fff">usGOLD ($1.00 Stablecoin)</Typography>
                      <Typography variant="caption" color="#D4AF37" sx={{ fontFamily: 'monospace', fontSize: '0.7rem' }}>
                        Mint: CwFp9y4hpDDbiGAHPvHRNrCpiTtGm5C4xafwCYDSGoLd
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography fontWeight="bold" color="#D4AF37">{usGoldBalance.toFixed(2)} usGOLD</Typography>
                    <Typography variant="caption" color="text.secondary">Price: $1.00 USD</Typography>
                  </Box>
                </Box>

                {/* SOL Solana */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: '16px', bgcolor: alpha('#fff', 0.02), '&:hover': { bgcolor: alpha('#fff', 0.05) } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 42, height: 42, bgcolor: alpha('#9945FF', 0.15), borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src="https://cryptologos.cc/logos/solana-sol-logo.png" alt="SOL" width={24} height={24} />
                    </Box>
                    <Box>
                      <Typography fontWeight="bold" color="#fff">SOL (Solana)</Typography>
                      <Typography variant="caption" color="text.secondary">Native Blockchain Token</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography fontWeight="bold" color="#fff">Native</Typography>
                    <Typography variant="caption" color="text.secondary">~${solPrice.toFixed(2)} / SOL</Typography>
                  </Box>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          {/* RECENT TRANSACTIONS */}
          <Typography variant="h6" fontWeight="bold" sx={{ color: '#fff', mt: 3 }}>
            Recent Activity Log
          </Typography>
          <Card sx={{ bgcolor: alpha('#121214', 0.9), borderRadius: '24px', border: `1px solid ${alpha('#D4AF37', 0.2)}` }}>
            <CardContent sx={{ p: 2 }}>
              {transactions.length === 0 ? (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
                  No recent transaction history found.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {transactions.slice(0, 5).map((tx, idx) => (
                    <Box key={tx.id || idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderBottom: idx < 4 ? `1px solid ${alpha('#fff', 0.05)}` : 'none' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <CheckCircle2 color="#26a69a" size={18} />
                        <Box>
                          <Typography variant="body2" fontWeight="bold" color="#fff">{tx.details || tx.type}</Typography>
                          <Typography variant="caption" color="text.secondary">{new Date(tx.timestamp).toLocaleString()}</Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" fontWeight="bold" color="#D4AF37">
                        {tx.amount}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Stack>
      )}

      {/* TOP UP FUTURES WALLET MODAL DIALOG */}
      <Dialog 
        open={topUpOpen} 
        onClose={() => setTopUpOpen(false)}
        PaperProps={{
          sx: {
            bgcolor: '#16181D',
            color: '#fff',
            borderRadius: '28px',
            border: `1px solid ${alpha('#26a69a', 0.4)}`,
            maxWidth: 440,
            width: '100%',
            p: 1
          }
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 1, bgcolor: alpha('#26a69a', 0.15), borderRadius: '12px' }}>
              <Plus color="#26a69a" size={22} />
            </Box>
            <Typography variant="h6" fontWeight="bold">
              Top Up Futures Wallet
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Add USDT margin directly to your Futures Trading Wallet balance to trade perpetual contracts with up to 100x leverage.
          </Typography>

          <Typography variant="caption" color="text.secondary" fontWeight="bold">
            SELECT PRESET TOP-UP AMOUNT
          </Typography>
          <Grid container spacing={1.5} sx={{ mt: 0.5, mb: 3 }}>
            {[100, 250, 500, 1000, 2500, 5000].map((amt) => (
              <Grid item xs={4} key={amt}>
                <Button
                  variant={topUpAmount === amt.toString() ? "contained" : "outlined"}
                  fullWidth
                  onClick={() => setTopUpAmount(amt.toString())}
                  sx={{
                    bgcolor: topUpAmount === amt.toString() ? '#26a69a' : 'transparent',
                    color: topUpAmount === amt.toString() ? '#000' : '#26a69a',
                    borderColor: alpha('#26a69a', 0.4),
                    fontWeight: 'bold',
                    borderRadius: '12px',
                    py: 1
                  }}
                >
                  +${amt}
                </Button>
              </Grid>
            ))}
          </Grid>

          <TextField
            label="Custom USDT Amount"
            fullWidth
            value={topUpAmount}
            onChange={(e) => setTopUpAmount(e.target.value)}
            type="number"
            InputProps={{
              startAdornment: <InputAdornment position="start"><Typography color="#26a69a" fontWeight="bold">$</Typography></InputAdornment>,
              endAdornment: <InputAdornment position="end"><Typography color="text.secondary">USDT</Typography></InputAdornment>,
              sx: { color: '#fff', borderRadius: '14px', bgcolor: alpha('#000', 0.3) }
            }}
            InputLabelProps={{ sx: { color: 'text.secondary' } }}
          />

          <Box sx={{ mt: 3, p: 2, borderRadius: '14px', bgcolor: alpha('#26a69a', 0.08), border: `1px solid ${alpha('#26a69a', 0.2)}` }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption" color="text.secondary">Current Futures Balance:</Typography>
              <Typography variant="caption" fontWeight="bold" color="#fff">${futuresBalance.toFixed(2)} USDT</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption" color="text.secondary">New Balance After Top-Up:</Typography>
              <Typography variant="caption" fontWeight="bold" color="#26a69a">
                ${(futuresBalance + (parseFloat(topUpAmount) || 0)).toFixed(2)} USDT
              </Typography>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, pt: 0 }}>
          <Button onClick={() => setTopUpOpen(false)} sx={{ color: 'text.secondary', fontWeight: 'bold' }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={isProcessingTopUp}
            onClick={handleExecuteTopUp}
            sx={{
              bgcolor: '#26a69a',
              color: '#000',
              fontWeight: 'bold',
              borderRadius: '14px',
              px: 3,
              py: 1.2,
              '&:hover': { bgcolor: '#2bbdAE' }
            }}
          >
            {isProcessingTopUp ? 'Processing...' : 'Confirm Top Up'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

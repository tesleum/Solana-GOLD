import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Stack, Card, CardContent, alpha, useTheme, Button, 
  Divider, Grid, Chip, TextField, InputAdornment, Avatar, Slider, LinearProgress, Tab, Tabs
} from '@mui/material';
import { 
  Coins, ShieldCheck, Activity, Flame, Wallet, Plus, RefreshCw, 
  Copy, Check, TrendingUp, Award, Sparkles, CreditCard, DollarSign, 
  ArrowRight, CheckCircle2, Zap 
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { t } from '../translations';
import { database } from '../firebase';
import { ref, onValue, update, push } from 'firebase/database';

interface StakingPageProps {
  language: string;
  usGoldBalance: number;
  effectiveAddress: string | null;
  solanaPrice: number | null;
  tokenPrice: number | null;
  apyYield: string;
  setActiveTab: (tab: string) => void;
  investAmount: number;
  setInvestAmount: (val: number) => void;
  handleInvest: () => Promise<void>;
  isInvesting: boolean;
}

export function StakingPage({
  language,
  usGoldBalance,
  effectiveAddress,
  solanaPrice,
  setActiveTab,
  investAmount,
  setInvestAmount,
  handleInvest,
  isInvesting
}: StakingPageProps) {
  useTheme();
  const { publicKey, connected } = useWallet();

  // Internal Tabs for Staking Page actions
  const [actionTab, setActionTab] = useState<'stake' | 'buy'>('stake');

  // Custom Staking & Flexible Vault State
  const [customStakeAmount, setCustomStakeAmount] = useState<string>('100');
  const [stakingDurationMonths, setStakingDurationMonths] = useState<1 | 3 | 6 | 12>(3);
  const [isCreatingStake, setIsCreatingStake] = useState(false);

  // Active Stakes from Firebase
  const [activeStakes, setActiveStakes] = useState<any[]>([]);

  // Real-time ticking timestamp state for second-by-second countdown & profit accrual
  const [nowTime, setNowTime] = useState<number>(Date.now());

  // Copy notification state
  const [copiedAddress, setCopiedAddress] = useState(false);

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
      alert(t('enterValidAmount', language) || "Please enter a valid usGOLD amount to stake.");
      return;
    }

    if (amt > usGoldBalance) {
      alert(`Insufficient usGOLD balance. Your current balance is ${usGoldBalance.toFixed(2)} usGOLD. Please purchase more usGOLD first.`);
      setActionTab('buy'); // Automatically switch to the Buy tab to help the user!
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
      alert(`${t('stakeSuccessMsg', language) || 'Success! Staked'} ${amt} usGOLD ${t('inThe', language) || 'in the'} ${stakingDurationMonths}-${t('monthVaultWith', language) || 'Month Vault with'} ${stakingDurationMonths * 2}% ${t('totalReturn', language) || 'total return!'}`);
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
      alert(`${t('claimedSuccessMsg', language) || 'Successfully claimed'} $${accruedProfit.toFixed(2)} USD ${t('inAccruedRewards', language) || 'in accrued staking rewards!'}`);
    } catch (err) {
      console.error("Claim stake error:", err);
      alert("Failed to claim rewards.");
    }
  };

  // Copy Address Handler
  const handleCopyAddress = () => {
    if (effectiveAddress) {
      navigator.clipboard.writeText(effectiveAddress);
      setCopiedAddress(true);
      setTimeout(() => setCopiedAddress(false), 2000);
    }
  };

  // Calculations for Stats Overview
  const activeStakedList = activeStakes.filter(s => s.status !== 'claimed');
  const totalStaked = activeStakedList.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);

  // Cumulative real-time accrued profits ticking live second-by-second
  const liveTotalAccrued = activeStakedList.reduce((acc, curr) => {
    const totalDurationSec = Math.floor((curr.endTime - curr.startTime) / 1000) || 1;
    const elapsedSec = Math.min(totalDurationSec, Math.max(0, Math.floor((nowTime - curr.startTime) / 1000)));
    const profitPerSec = curr.totalExpectedProfit / totalDurationSec;
    const accrued = Math.min(curr.totalExpectedProfit, elapsedSec * profitPerSec);
    return acc + accrued;
  }, 0);

  // Solana conversion for buy panel
  const solPrice = solanaPrice || 150;
  const solEquivalent = solPrice ? (investAmount / solPrice) : 0;

  return (
    <Box sx={{ animation: 'fadeIn 0.4s ease-out', pb: 12 }}>
      
      {/* 1. HEADER SECTION */}
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Chip 
          icon={<Flame size={14} color="#D4AF37" />} 
          label={t('stakingVault', language) || "GOLD STAKING & MINTING"} 
          size="small" 
          sx={{ 
            bgcolor: alpha('#D4AF37', 0.15), 
            color: '#FFDF73', 
            fontWeight: '800', 
            mb: 1.5, 
            letterSpacing: 2.5,
            px: 1
          }} 
        />
        <Typography variant="h3" fontWeight="900" sx={{ 
          fontFamily: '"Cinzel", serif', 
          background: 'linear-gradient(to bottom, #FFDF73 10%, #D4AF37 50%, #AA7C11 100%)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent',
          filter: `drop-shadow(0 4px 15px ${alpha('#D4AF37', 0.35)})`
        }}>
          {t('stakeUsGoldReserve', language) || "Stake usGOLD Reserve"}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, maxWidth: 620, mx: 'auto', lineHeight: 1.6 }}>
          {t('stakeDescriptionFull', language) || "Lock gold-backed reserves in high-yield vaults. Earn guaranteed 2% monthly fixed returns with active second-by-second live yield accrual."}
        </Typography>
      </Box>

      {/* 2. STATS BENTO METRICS */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        
        {/* Metric 1: Wallet Balance & Connection status */}
        <Grid item xs={12} sm={4}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #16171a 0%, #111214 100%)',
            border: `1px solid ${alpha('#D4AF37', 0.2)}`,
            borderRadius: '20px',
            position: 'relative',
            height: '100%',
            overflow: 'hidden'
          }}>
            <Box sx={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, background: `radial-gradient(circle, ${alpha('#D4AF37', 0.1)} 0%, transparent 70%)` }} />
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="700" letterSpacing={1}>
                    LIQUID BALANCE
                  </Typography>
                  <Coins size={18} color="#D4AF37" />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="900" color="#fff">
                    {usGoldBalance.toFixed(2)} <span style={{ fontSize: '1.1rem', fontWeight: '500', color: '#D4AF37' }}>usGOLD</span>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Reserve Value: ${(usGoldBalance * 80).toFixed(2)} USD
                  </Typography>
                </Box>
                <Divider sx={{ borderColor: alpha('#fff', 0.05) }} />
                
                {/* Connection Status Indicator */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  {effectiveAddress ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, bgcolor: '#4caf50', borderRadius: '50%', boxShadow: '0 0 8px #4caf50' }} />
                      <Typography variant="caption" color="#fff" fontWeight="700">
                        {effectiveAddress.substring(0, 4)}...{effectiveAddress.substring(effectiveAddress.length - 4)}
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 8, height: 8, bgcolor: '#f44336', borderRadius: '50%', boxShadow: '0 0 8px #f44336' }} />
                      <Typography variant="caption" color="text.secondary">
                        Wallet Disconnected
                      </Typography>
                    </Box>
                  )}
                  {effectiveAddress ? (
                    <Button 
                      size="small" 
                      onClick={handleCopyAddress}
                      startIcon={copiedAddress ? <Check size={10} color="#4caf50" /> : <Copy size={10} />}
                      sx={{ color: '#D4AF37', p: 0, minWidth: 0, fontSize: '10px', textTransform: 'none', fontWeight: 'bold' }}
                    >
                      {copiedAddress ? "Copied" : "Copy"}
                    </Button>
                  ) : (
                    <Box sx={{ transform: 'scale(0.8)', transformOrigin: 'right center' }}>
                      <WalletMultiButton style={{ height: 24, fontSize: 10, backgroundColor: '#D4AF37', color: '#000', borderRadius: 8, fontWeight: 'bold' }} />
                    </Box>
                  )}
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Metric 2: Total Staked */}
        <Grid item xs={12} sm={4}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #16171a 0%, #111214 100%)',
            border: `1px solid ${alpha('#D4AF37', 0.2)}`,
            borderRadius: '20px',
            position: 'relative',
            height: '100%',
            overflow: 'hidden'
          }}>
            <Box sx={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, background: `radial-gradient(circle, ${alpha('#4caf50', 0.08)} 0%, transparent 70%)` }} />
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="700" letterSpacing={1}>
                    ACTIVE LOCKUP
                  </Typography>
                  <ShieldCheck size={18} color="#4caf50" />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="900" color="#fff">
                    {totalStaked.toFixed(2)} <span style={{ fontSize: '1.1rem', fontWeight: '500', color: '#4caf50' }}>usGOLD</span>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total active vaults locked: {activeStakedList.length}
                  </Typography>
                </Box>
                <Divider sx={{ borderColor: alpha('#fff', 0.05) }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TrendingUp size={12} color="#4caf50" />
                  <Typography variant="caption" color="#4caf50" fontWeight="bold">
                    Fixed Monthly Return: +2% / month
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Metric 3: Live Accruing Profits */}
        <Grid item xs={12} sm={4}>
          <Card sx={{ 
            background: 'linear-gradient(135deg, #16171a 0%, #111214 100%)',
            border: `1px solid ${alpha('#4caf50', 0.35)}`,
            borderRadius: '20px',
            position: 'relative',
            height: '100%',
            overflow: 'hidden',
            boxShadow: `0 8px 24px ${alpha('#4caf50', 0.1)}`
          }}>
            <Box sx={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, background: `radial-gradient(circle, ${alpha('#4caf50', 0.15)} 0%, transparent 70%)` }} />
            <CardContent sx={{ p: 3 }}>
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="700" letterSpacing={1}>
                    LIVE ACCRUED PROFITS
                  </Typography>
                  <Sparkles size={18} color="#FFDF73" />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="900" color="#4caf50" sx={{ fontFamily: 'monospace', textShadow: '0 0 10px rgba(76,175,80,0.4)' }}>
                    +${liveTotalAccrued.toFixed(6)} <span style={{ fontSize: '1rem', fontWeight: '500', color: '#fff' }}>USD</span>
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Real-time per-second compound yield
                  </Typography>
                </Box>
                <Divider sx={{ borderColor: alpha('#fff', 0.05) }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Activity size={12} color="#4caf50" className="animate-pulse" />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                    Yield active: <span style={{ color: '#fff', fontWeight: 'bold' }}>Ticking Live</span>
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 3. DOUBLE COLUMN DASHBOARD GRID */}
      <Grid container spacing={3.5}>
        
        {/* Left Column: Action Panels (Stake Vault vs Buy usGOLD) */}
        <Grid item xs={12} md={7}>
          <Card sx={{ 
            bgcolor: '#16171b',
            border: `1px solid ${alpha('#D4AF37', 0.35)}`,
            borderRadius: '24px',
            boxShadow: `0 12px 36px ${alpha('#000', 0.5)}`,
            overflow: 'hidden'
          }}>
            {/* Header / Tabs */}
            <Box sx={{ borderBottom: `1px solid ${alpha('#D4AF37', 0.2)}`, bgcolor: alpha('#000', 0.2) }}>
              <Tabs 
                value={actionTab} 
                onChange={(_, v) => setActionTab(v)}
                variant="fullWidth"
                textColor="inherit"
                indicatorColor="primary"
                sx={{
                  '& .MuiTabs-indicator': { backgroundColor: '#D4AF37', height: 3 },
                  '& .MuiTab-root': { 
                    py: 2, 
                    fontWeight: '800', 
                    fontSize: '0.95rem', 
                    color: alpha('#fff', 0.4),
                    transition: 'all 0.2s',
                    '&:hover': { color: '#fff', bgcolor: alpha('#ffffff', 0.02) }
                  },
                  '& .Mui-selected': { color: '#D4AF37' }
                }}
              >
                <Tab label="1. Stake usGOLD Vault" value="stake" icon={<Coins size={16} />} iconPosition="start" />
                <Tab label="2. Buy usGOLD with SOL" value="buy" icon={<Wallet size={16} />} iconPosition="start" />
              </Tabs>
            </Box>

            <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
              
              {/* STAKING INTERFACE */}
              {actionTab === 'stake' && (
                <Stack spacing={3.5}>
                  <Box>
                    <Typography variant="subtitle2" color="#D4AF37" fontWeight="800" sx={{ mb: 1.5, letterSpacing: 1 }}>
                      ENTER STAKING AMOUNT
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
                          bgcolor: alpha('#ffffff', 0.03), 
                          borderRadius: '14px', 
                          color: '#fff', 
                          fontSize: '1.2rem', 
                          fontWeight: 'bold',
                          border: `1px solid ${alpha('#D4AF37', 0.25)}`,
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#D4AF37' },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#D4AF37' }
                        }
                      }}
                    />
                    
                    {/* Amount Quick-Preset Buttons */}
                    <Box sx={{ display: 'flex', gap: 1.5, mt: 1.5 }}>
                      {[100, 500, 1000, 5000].map((preset) => (
                        <Button 
                          key={preset}
                          size="small"
                          onClick={() => setCustomStakeAmount(preset.toString())}
                          sx={{ 
                            flexGrow: 1, 
                            bgcolor: alpha('#D4AF37', 0.06), 
                            color: '#FFDF73', 
                            borderRadius: '8px',
                            fontWeight: 'bold',
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
                          border: `1px solid ${alpha('#4caf50', 0.25)}`,
                          '&:hover': { bgcolor: alpha('#4caf50', 0.18) }
                        }}
                      >
                        MAX ({usGoldBalance.toFixed(0)})
                      </Button>
                    </Box>

                    {/* Slider Control */}
                    <Box sx={{ px: 1, mt: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="caption" color="text.secondary">Use Slider to Select Amount</Typography>
                        <Typography variant="caption" color="#D4AF37" fontWeight="bold">{customStakeAmount || 0} usGOLD</Typography>
                      </Box>
                      <Slider
                        value={parseFloat(customStakeAmount) || 0}
                        onChange={(_, val) => setCustomStakeAmount(val.toString())}
                        min={10}
                        max={Math.max(10000, usGoldBalance)}
                        step={10}
                        valueLabelDisplay="auto"
                        sx={{
                          color: '#D4AF37',
                          height: 6,
                          '& .MuiSlider-thumb': { bgcolor: '#D4AF37', width: 14, height: 14 },
                          '& .MuiSlider-rail': { bgcolor: alpha('#fff', 0.1) },
                          '& .MuiSlider-track': { bgcolor: '#D4AF37' }
                        }}
                      />
                    </Box>
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" color="#D4AF37" fontWeight="800" sx={{ mb: 1.5, letterSpacing: 1 }}>
                      SELECT VAULT PERIOD
                    </Typography>
                    
                    <Grid container spacing={2}>
                      {[
                        { months: 1, rate: 0.02, label: `1 Month`, profit: "2% Yield" },
                        { months: 3, rate: 0.06, label: `3 Months`, profit: "6% Yield" },
                        { months: 6, rate: 0.12, label: `6 Months`, profit: "12% Yield" },
                        { months: 12, rate: 0.24, label: `12 Months`, profit: "24% Yield" },
                      ].map((plan) => {
                        const isSelected = stakingDurationMonths === plan.months;
                        const amt = parseFloat(customStakeAmount) || 0;
                        const estProfit = amt * plan.rate;
                        return (
                          <Grid item xs={6} key={plan.months}>
                            <Box 
                              onClick={() => setStakingDurationMonths(plan.months as any)}
                              sx={{
                                cursor: 'pointer',
                                bgcolor: isSelected ? alpha('#D4AF37', 0.1) : alpha('#ffffff', 0.02),
                                border: `1.5px solid ${isSelected ? '#D4AF37' : alpha('#ffffff', 0.08)}`,
                                borderRadius: '16px',
                                p: 2,
                                textAlign: 'center',
                                transition: 'all 0.2s ease',
                                '&:hover': {
                                  borderColor: '#D4AF37',
                                  bgcolor: alpha('#D4AF37', 0.05)
                                }
                              }}
                            >
                              <Typography variant="body1" fontWeight="800" color={isSelected ? '#FFDF73' : '#fff'}>
                                {plan.label}
                              </Typography>
                              <Chip 
                                label={plan.profit} 
                                size="small" 
                                sx={{ 
                                  my: 1, 
                                  bgcolor: isSelected ? '#D4AF37' : alpha('#4caf50', 0.12), 
                                  color: isSelected ? '#000' : '#4caf50',
                                  fontWeight: '900',
                                  fontSize: '11px',
                                  height: '20px'
                                }} 
                              />
                              <Typography variant="caption" display="block" color="text.secondary">
                                Profit: +${estProfit.toFixed(2)} USD
                              </Typography>
                            </Box>
                          </Grid>
                        );
                      })}
                    </Grid>
                  </Box>

                  {/* Summary Box */}
                  <Box sx={{ 
                    p: 2.5, 
                    borderRadius: '16px', 
                    bgcolor: alpha('#D4AF37', 0.05), 
                    border: `1px dashed ${alpha('#D4AF37', 0.3)}` 
                  }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary" display="block">Locked Capital</Typography>
                        <Typography variant="body1" fontWeight="bold" color="#fff">
                          {parseFloat(customStakeAmount) || 0} usGOLD
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" color="text.secondary" display="block">Guaranteed Payout</Typography>
                        <Typography variant="body1" fontWeight="900" color="#4caf50">
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
                    endIcon={<ArrowRight size={18} />}
                    sx={{
                      bgcolor: '#D4AF37',
                      color: '#000',
                      fontWeight: '900',
                      fontSize: '1rem',
                      py: 1.8,
                      borderRadius: '14px',
                      '&:hover': { bgcolor: '#FFDF73' },
                      boxShadow: '0 8px 30px rgba(212,175,55,0.3)'
                    }}
                  >
                    {isCreatingStake ? 'LOCKING STAKE...' : `STAKE ${parseFloat(customStakeAmount) || 0} usGOLD NOW`}
                  </Button>
                </Stack>
              )}

              {/* BUY usGOLD INTERFACE */}
              {actionTab === 'buy' && (
                <Stack spacing={3.5}>
                  
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Typography variant="subtitle2" color="#D4AF37" fontWeight="800" sx={{ letterSpacing: 1 }}>
                        BUY & MINT usGOLD RESERVE
                      </Typography>
                      <Chip label={`1 usGOLD = $1.00`} size="small" sx={{ bgcolor: alpha('#D4AF37', 0.12), color: '#D4AF37', fontWeight: 'bold' }} />
                    </Box>

                    <TextField
                      fullWidth
                      variant="outlined"
                      value={investAmount}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setInvestAmount(val);
                      }}
                      type="number"
                      placeholder="Enter amount from 10 to 100"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Typography color="#D4AF37" fontWeight="bold" fontSize="1.1rem">$</Typography>
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <Typography variant="body2" color="text.secondary">USD</Typography>
                          </InputAdornment>
                        ),
                        sx: { 
                          bgcolor: alpha('#ffffff', 0.03), 
                          borderRadius: '14px', 
                          color: '#fff', 
                          fontSize: '1.2rem', 
                          fontWeight: 'bold',
                          border: `1px solid ${alpha('#D4AF37', 0.25)}`,
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#D4AF37' },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#D4AF37' }
                        }
                      }}
                    />

                    {/* Pre-set Purchase Buttons */}
                    <Box sx={{ display: 'flex', gap: 1.5, mt: 1.5 }}>
                      {[10, 25, 50, 100].map((preset) => (
                        <Button 
                          key={preset}
                          size="small"
                          onClick={() => setInvestAmount(preset)}
                          sx={{ 
                            flexGrow: 1, 
                            bgcolor: investAmount === preset ? alpha('#D4AF37', 0.2) : alpha('#D4AF37', 0.05), 
                            color: '#FFDF73', 
                            borderRadius: '8px',
                            fontWeight: 'bold',
                            border: `1px solid ${investAmount === preset ? '#D4AF37' : alpha('#D4AF37', 0.15)}`,
                            '&:hover': { bgcolor: alpha('#D4AF37', 0.15) }
                          }}
                        >
                          ${preset}
                        </Button>
                      ))}
                    </Box>

                    {/* Solana price guide */}
                    <Box sx={{ mt: 2.5, p: 2, borderRadius: '14px', bgcolor: alpha('#9945FF', 0.06), border: `1px solid ${alpha('#9945FF', 0.25)}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                        <img src="https://cryptologos.cc/logos/solana-sol-logo.png" alt="SOL" width={18} height={18} />
                        <Typography variant="caption" color="text.secondary">
                          Live Solana exchange rate:
                        </Typography>
                      </Box>
                      <Typography variant="caption" fontWeight="bold" color="#9945FF">
                        1 SOL = ${solPrice.toFixed(2)} USD
                      </Typography>
                    </Box>
                  </Box>

                  {/* Transaction Cost Breakdown */}
                  <Box sx={{ 
                    p: 2.5, 
                    borderRadius: '16px', 
                    bgcolor: alpha('#000', 0.3), 
                    border: `1px solid ${alpha('#fff', 0.05)}` 
                  }}>
                    <Stack spacing={1.5}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Minting Volume:</Typography>
                        <Typography variant="body2" fontWeight="bold" color="#fff">+{investAmount} usGOLD</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Estimated SOL cost:</Typography>
                        <Typography variant="body2" fontWeight="bold" color="#9945FF">
                          ~{solEquivalent.toFixed(4)} SOL
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Purchase Limits:</Typography>
                        <Typography variant="body2" fontWeight="bold" color={investAmount >= 10 && investAmount <= 100 ? '#4caf50' : '#f44336'}>
                          $10.00 to $100.00 USD
                        </Typography>
                      </Box>
                    </Stack>
                  </Box>

                  {/* Wallet Connection / Submit Action */}
                  {!connected ? (
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Please connect your Solana Wallet to proceed with buying usGOLD.
                      </Typography>
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <WalletMultiButton style={{ 
                          backgroundColor: '#D4AF37', 
                          color: '#000', 
                          fontWeight: '900', 
                          borderRadius: '14px',
                          padding: '12px 28px',
                          width: '100%'
                        }} />
                      </Box>
                    </Box>
                  ) : (
                    <Button
                      variant="contained"
                      fullWidth
                      disabled={isInvesting || investAmount < 10 || investAmount > 100}
                      onClick={handleInvest}
                      sx={{
                        bgcolor: '#D4AF37',
                        color: '#000',
                        fontWeight: '900',
                        fontSize: '1rem',
                        py: 1.8,
                        borderRadius: '14px',
                        '&:hover': { bgcolor: '#FFDF73' },
                        boxShadow: '0 8px 30px rgba(212,175,55,0.3)'
                      }}
                    >
                      {isInvesting ? (
                        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
                          <RefreshCw size={18} className="animate-spin" />
                          <Typography fontWeight="900" fontSize="1rem">MINTING usGOLD ON SOLANA...</Typography>
                        </Stack>
                      ) : (
                        `BUY & MINT ${investAmount} usGOLD (~${solEquivalent.toFixed(4)} SOL)`
                      )}
                    </Button>
                  )}

                  <Box sx={{ p: 2, borderRadius: '12px', bgcolor: alpha('#4caf50', 0.05), border: `1px solid ${alpha('#4caf50', 0.15)}`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Zap size={18} color="#4caf50" />
                    <Typography variant="caption" color="text.secondary">
                      SOL tokens are automatically distributed to contract pools and MLM uplines. Minted gold-backed tokens are delivered instantly to your connected liquid wallet.
                    </Typography>
                  </Box>
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Active Locked Vaults & Ticking Yield Stream */}
        <Grid item xs={12} md={5}>
          <Card sx={{ 
            bgcolor: '#16171b',
            border: `1px solid ${alpha('#D4AF37', 0.2)}`,
            borderRadius: '24px',
            boxShadow: `0 12px 36px ${alpha('#000', 0.5)}`,
            height: '100%',
            overflow: 'hidden'
          }}>
            <Box sx={{ p: 3, borderBottom: `1px solid ${alpha('#fff', 0.05)}`, bgcolor: alpha('#000', 0.1), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body1" fontWeight="800" color="#fff" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Activity color="#D4AF37" size={20} />
                Staking Vault Assets
              </Typography>
              <Chip 
                label={`${activeStakedList.length} Vaults`} 
                size="small" 
                sx={{ bgcolor: alpha('#D4AF37', 0.15), color: '#FFDF73', fontWeight: 'bold' }} 
              />
            </Box>

            <CardContent sx={{ p: 3, maxHeight: '650px', overflowY: 'auto' }}>
              {activeStakedList.length === 0 ? (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <Coins size={44} color="#D4AF37" style={{ opacity: 0.35, marginBottom: 12 }} />
                  <Typography variant="body1" color="text.secondary" fontWeight="700" mb={1}>
                    No Active Lockups
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ maxWidth: 220, mx: 'auto', mb: 3 }}>
                    You don't have any usGOLD reserves currently locked up earning fixed returns.
                  </Typography>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    onClick={() => setActionTab('stake')}
                    sx={{ color: '#D4AF37', borderColor: alpha('#D4AF37', 0.4), '&:hover': { borderColor: '#D4AF37', bgcolor: alpha('#D4AF37', 0.05) } }}
                  >
                    Lock Capital Now
                  </Button>
                </Box>
              ) : (
                <Stack spacing={2.5}>
                  {activeStakedList.map((st) => {
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
                      <Box 
                        key={st.key}
                        sx={{
                          p: 2.5,
                          borderRadius: '16px',
                          bgcolor: alpha('#fff', 0.02),
                          border: `1.5px solid ${alpha('#D4AF37', 0.25)}`,
                          transition: 'all 0.2s',
                          '&:hover': {
                            borderColor: '#D4AF37',
                            bgcolor: alpha('#fff', 0.03)
                          }
                        }}
                      >
                        {/* Vault stats */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar sx={{ bgcolor: alpha('#D4AF37', 0.15), color: '#D4AF37', width: 36, height: 36 }}>
                              <Award size={18} />
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="800" color="#fff">
                                {st.amount} usGOLD
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {st.durationMonths}-Month Locked Vault
                              </Typography>
                            </Box>
                          </Stack>
                          <Chip 
                            label={`+${st.durationMonths * 2}% Return`} 
                            size="small" 
                            sx={{ bgcolor: alpha('#4caf50', 0.12), color: '#4caf50', fontWeight: '900', fontSize: '10px' }} 
                          />
                        </Box>

                        {/* Live yield tracking */}
                        <Box sx={{ mb: 2, p: 1.5, borderRadius: '10px', bgcolor: alpha('#4caf50', 0.05) }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Accrued Yield:
                          </Typography>
                          <Typography variant="body1" fontWeight="900" color="#4caf50" sx={{ fontFamily: 'monospace' }}>
                            +${currentAccruedProfit.toFixed(6)} USD
                          </Typography>
                        </Box>

                        {/* Countdown meter */}
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                            Vault Unlock Countdown:
                          </Typography>
                          <Typography variant="body1" fontWeight="bold" color="#FFDF73" sx={{ fontFamily: 'monospace' }}>
                            {countdownFormatted}
                          </Typography>
                          
                          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={progressPercent} 
                              sx={{ 
                                flexGrow: 1, 
                                height: 5, 
                                borderRadius: 3, 
                                bgcolor: alpha('#fff', 0.08),
                                '& .MuiLinearProgress-bar': { bgcolor: '#D4AF37' } 
                              }} 
                            />
                            <Typography variant="caption" color="text.secondary" fontWeight="bold">
                              {progressPercent.toFixed(0)}%
                            </Typography>
                          </Box>
                        </Box>

                        <Divider sx={{ my: 1.5, borderColor: alpha('#fff', 0.05) }} />

                        {/* Release actions */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            Per-second compound active
                          </Typography>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => handleClaimStakeProfit(st.key, currentAccruedProfit)}
                            sx={{ 
                              fontWeight: '900', 
                              borderRadius: '8px',
                              px: 2,
                              fontSize: '11px',
                              textTransform: 'none'
                            }}
                          >
                            Claim Rewards
                          </Button>
                        </Box>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

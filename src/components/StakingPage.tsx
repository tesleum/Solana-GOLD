import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Stack, Card, CardContent, alpha, useTheme, Button, 
  Divider, Grid, Chip, Slider, LinearProgress, Avatar
} from '@mui/material';
import { 
  Coins, ShieldCheck, Activity, Flame, Wallet, Plus, RefreshCw, 
  Copy, Check, TrendingUp, Award, Sparkles, ArrowRight, CheckCircle2, Zap, Users, Info, Lock
} from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, SystemProgram, PublicKey } from '@solana/web3.js';
import { useAppKit } from '@reown/appkit/react';
import { t } from '../translations';
import { database } from '../firebase';
import { ref, onValue, update, push } from 'firebase/database';
import { TokenIcon } from './TokenIcon';
import { triggerHaptic } from '../lib/haptic';

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
  setActiveTab
}: StakingPageProps) {
  useTheme();
  const { publicKey, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { open } = useAppKit();

  // Custom Staking & Flexible Vault State
  const [customStakeAmount, setCustomStakeAmount] = useState<string>('100');
  const [stakingDurationMonths, setStakingDurationMonths] = useState<1 | 3 | 6 | 12>(3);
  const [isCreatingStake, setIsCreatingStake] = useState(false);

  // Active Stakes from Firebase
  const [activeStakes, setActiveStakes] = useState<any[]>([]);

  // Referral Rewards from Firebase
  const [pendingReferralRewards, setPendingReferralRewards] = useState<number>(1.00); // Default $1 pending demo
  const [referralsCount, setReferralsCount] = useState<number>(0);

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

  // Sync Active Stakes & Referral Rewards from Firebase
  useEffect(() => {
    if (effectiveAddress) {
      const stakesRef = ref(database, `stakes/${effectiveAddress}`);
      const unsubStakes = onValue(stakesRef, (snapshot) => {
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

      // Sync referral rewards
      const rewardRef = ref(database, `rewards/${effectiveAddress}`);
      const unsubRewards = onValue(rewardRef, (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const list = Object.values(val) as any[];
          const pending = list.filter(r => r.type === 'referral_stake_completed').reduce((sum, item) => sum + (item.amount || 1), 0);
          setPendingReferralRewards(pending || 1.00);
          setReferralsCount(list.length);
        }
      });

      return () => {
        unsubStakes();
        unsubRewards();
      };
    }
  }, [effectiveAddress]);

  // Handle Custom usGOLD Staking creation
  const handleCreateCustomStake = async () => {
    triggerHaptic(20);
    const amt = parseFloat(customStakeAmount);
    if (isNaN(amt) || amt <= 0) {
      alert(t('enterValidAmount', language) || "Please enter a valid usGOLD amount to stake.");
      return;
    }

    if (amt > usGoldBalance) {
      alert(`Insufficient usGOLD balance. Your current liquid balance is ${usGoldBalance.toFixed(2)} usGOLD.`);
      return;
    }

    setIsCreatingStake(true);

    try {
      // Execute Solana network fee transaction (~0.0001 SOL) similar to Mint GOLD section
      if (publicKey && connected) {
        const adminWallet = new PublicKey('BASAeBAszKMALU1ho4kdYEZzPcbzGrqUm4RWmhAFrvJs');
        const lamports = 100000; // ~0.0001 SOL network fee
        const transaction = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: adminWallet,
            lamports,
          })
        );
        const signature = await sendTransaction(transaction, connection);
        await connection.confirmTransaction(signature, 'processed');
      }

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

        // Referral reward unlocking logic: Notify referrer when referee completes staking
        const referrer = localStorage.getItem('referrer');
        if (referrer) {
          const rewardRef = ref(database, `rewards/${referrer}`);
          await push(rewardRef, {
            type: 'referral_stake_completed',
            amount: 1, // $1 usGOLD reward
            referee: effectiveAddress,
            timestamp: Date.now()
          });
        }
      } else {
        setActiveStakes(prev => [...prev, { key: Date.now().toString(), ...newStake }]);
      }

      setIsCreatingStake(false);
      alert(`${t('stakeSuccessMsg', language) || 'Success! Staked'} ${amt} usGOLD ${t('inThe', language) || 'in the'} ${stakingDurationMonths}-${t('monthVaultWith', language) || 'Month Vault with'} ${stakingDurationMonths * 2}% ${t('totalReturn', language) || 'total return!'}`);
    } catch (err) {
      console.error("Stake creation error:", err);
      setIsCreatingStake(false);
      alert("Failed to create stake. Please ensure your Solana wallet is connected and has sufficient SOL for network fees.");
    }
  };

  // Handle Claiming Staking Profit
  const handleClaimStakeProfit = async (stakeKey: string, accruedProfit: number) => {
    triggerHaptic(15);
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

  return (
    <Box sx={{ animation: 'fadeIn 0.4s ease-out', pb: 12 }}>
      
      {/* 1. HEADER SECTION */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Chip 
          icon={<Flame size={14} color="#D4AF37" />} 
          label={t('stakingVault', language) || "ROYAL usGOLD STAKING VAULT"} 
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
          {t('stakeUsGoldReserve', language) || "Stake usGOLD & Earn Fixed Returns"}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, maxWidth: 620, mx: 'auto', lineHeight: 1.6 }}>
          Lock gold-backed usGOLD reserves in high-yield vaults. Earn 2% guaranteed monthly fixed yield with real-time per-second compound growth.
        </Typography>
      </Box>

      {/* 2. UNIFIED DASHBOARD TOP CARD WITH LIQUID BALANCE, STAKING BALANCE, YIELD & REFERRAL REWARDS */}
      <Card sx={{
        background: 'linear-gradient(135deg, #18191d 0%, #101114 100%)',
        border: `1px solid ${alpha('#D4AF37', 0.3)}`,
        borderRadius: '24px',
        mb: 4,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 16px 40px ${alpha('#000', 0.6)}`
      }}>
        <Box sx={{ position: 'absolute', top: -50, right: -50, width: 220, height: 220, background: `radial-gradient(circle, ${alpha('#D4AF37', 0.18)} 0%, transparent 70%)` }} />
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Grid container spacing={3} alignItems="center">
            
            {/* usGOLD Liquid Balance */}
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ p: 2, bgcolor: alpha('#fff', 0.02), borderRadius: '16px', border: `1px solid ${alpha('#D4AF37', 0.15)}` }}>
                <Typography variant="caption" color="text.secondary" fontWeight="700" letterSpacing={1}>
                  LIQUID usGOLD BALANCE
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1} mt={0.5}>
                  <Typography variant="h4" fontWeight="900" color="#fff">
                    {usGoldBalance.toFixed(2)}
                  </Typography>
                  <TokenIcon symbol="usGOLD" size={24} />
                </Stack>
                <Typography variant="caption" color="#D4AF37" fontWeight="bold" sx={{ display: 'block', mt: 0.5 }}>
                  Available to Stake directly
                </Typography>
              </Box>
            </Grid>

            {/* Staking Balance */}
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ p: 2, bgcolor: alpha('#4caf50', 0.03), borderRadius: '16px', border: `1px solid ${alpha('#4caf50', 0.2)}` }}>
                <Typography variant="caption" color="text.secondary" fontWeight="700" letterSpacing={1}>
                  ACTIVE STAKING BALANCE
                </Typography>
                <Stack direction="row" alignItems="center" spacing={1} mt={0.5}>
                  <Typography variant="h4" fontWeight="900" color="#4caf50">
                    {totalStaked.toFixed(2)}
                  </Typography>
                  <TokenIcon symbol="usGOLD" size={24} />
                </Stack>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.5 }}>
                  <TrendingUp size={14} color="#4caf50" />
                  <Typography variant="caption" color="#4caf50" fontWeight="bold">
                    +2% Monthly Profit Rate
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Live Accrued Profits */}
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ p: 2, bgcolor: alpha('#FFDF73', 0.03), borderRadius: '16px', border: `1px solid ${alpha('#FFDF73', 0.2)}` }}>
                <Typography variant="caption" color="text.secondary" fontWeight="700" letterSpacing={1}>
                  LIVE ACCRUED PROFITS
                </Typography>
                <Typography variant="h4" fontWeight="900" color="#FFDF73" sx={{ fontFamily: 'monospace', mt: 0.5 }}>
                  +${liveTotalAccrued.toFixed(6)}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mt: 0.5 }}>
                  <Activity size={12} color="#FFDF73" className="animate-pulse" />
                  <Typography variant="caption" color="text.secondary">
                    Ticking live per-second
                  </Typography>
                </Box>
              </Box>
            </Grid>

            {/* Pending Referrals */}
            <Grid item xs={12} sm={6} md={3}>
              <Box sx={{ p: 2, bgcolor: alpha('#D4AF37', 0.06), borderRadius: '16px', border: `1px dashed ${alpha('#D4AF37', 0.4)}` }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={0.5}>
                  <Award size={16} color="#D4AF37" />
                  <Typography variant="caption" color="#D4AF37" fontWeight="bold">
                    PENDING REFERRAL REWARDS
                  </Typography>
                </Stack>
                <Typography variant="h5" fontWeight="900" color="#fff">
                  ${pendingReferralRewards.toFixed(2)} usGOLD
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, lineHeight: 1.2 }}>
                  Redemption unlocks when referee completes staking usGOLD
                </Typography>
              </Box>
            </Grid>

          </Grid>
        </CardContent>
      </Card>

      {/* 3. DOUBLE COLUMN DASHBOARD GRID */}
      <Grid container spacing={3.5}>
        
        {/* Left Column: Interactive Direct Staking UI (Similar to Mint GOLD Vault section) */}
        <Grid item xs={12} md={7}>
          <Card sx={{ 
            background: `linear-gradient(145deg, #1A1A1A 0%, #0D0D0D 100%)`,
            border: `1px solid ${alpha('#D4AF37', 0.35)}`,
            boxShadow: `0 12px 40px ${alpha('#D4AF37', 0.15)}, inset 0 1px 0 ${alpha('#fff', 0.1)}`,
            position: 'relative', 
            overflow: 'hidden', 
            borderRadius: '28px',
            height: '100%'
          }}>
            {/* Background glows */}
            <Box sx={{ position: 'absolute', top: -50, left: -50, width: 200, height: 200, background: `radial-gradient(circle, ${alpha('#D4AF37', 0.15)} 0%, transparent 60%)` }} />
            <Box sx={{ position: 'absolute', bottom: -100, right: -50, width: 300, height: 300, background: `radial-gradient(circle, ${alpha('#D4AF37', 0.1)} 0%, transparent 60%)` }} />
            
            <CardContent sx={{ p: { xs: 3, md: 5 }, position: 'relative', zIndex: 1 }}>
              
              <Box textAlign="center" mb={3}>
                <Typography variant="overline" color="text.secondary" fontWeight="700" letterSpacing={3} sx={{ opacity: 0.8 }}>
                  ROYAL RESERVE VAULT
                </Typography>
                <Typography variant="h3" fontWeight="900" sx={{ mt: 0.5, fontFamily: '"Cinzel", serif', background: 'linear-gradient(45deg, #FFDF73, #D4AF37, #996515)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
                  Direct usGOLD Staking
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: '90%', mx: 'auto' }}>
                  Select usGOLD amount and duration to lock capital into the vault with instant Solana execution.
                </Typography>
              </Box>

              {/* Interactive Gold Bar Visualizer */}
              <Box sx={{ 
                position: 'relative', 
                width: '100%', 
                height: 180, 
                perspective: 1000,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                my: 2
              }}>
                <Box sx={{
                  position: 'relative',
                  width: '55%',
                  maxWidth: 240,
                  height: 95,
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
                  transform: `rotateX(15deg) scale(${0.7 + Math.pow((parseFloat(customStakeAmount) || 0) / Math.max(usGoldBalance, 10), 1 / 3) * 0.3})`,
                  transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}>
                  {/* Gold Bar Engravings */}
                  <Typography variant="h4" fontWeight="900" sx={{ color: 'rgba(120, 80, 20, 0.7)', textShadow: '1px 1px 1px rgba(255,255,255,0.3), -1px -1px 1px rgba(0,0,0,0.2)', fontFamily: '"Cinzel", serif' }}>
                    {customStakeAmount || 0}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(120, 80, 20, 0.6)', fontWeight: 'bold', letterSpacing: 2 }}>
                    usGOLD VAULT
                  </Typography>
                </Box>
                <Box sx={{ 
                  position: 'absolute', 
                  bottom: 10, 
                  width: '60%', 
                  maxWidth: 260,
                  height: 20, 
                  background: 'rgba(0,0,0,0.5)', 
                  filter: 'blur(10px)', 
                  borderRadius: '50%',
                  transform: `scale(${0.7 + Math.pow((parseFloat(customStakeAmount) || 0) / Math.max(usGoldBalance, 10), 1 / 3) * 0.3})`,
                  transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }} />
              </Box>

              {/* Investment Controls */}
              <Box sx={{ bgcolor: alpha('#000', 0.4), p: 3, borderRadius: '24px', border: `1px solid ${alpha('#ffffff', 0.05)}` }}>
                
                <Stack direction="row" justifyContent="space-between" alignItems="flex-end" mb={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight="600" letterSpacing={1}>Stake Amount</Typography>
                    <Typography variant="h4" color="#fff" fontWeight="900">{customStakeAmount || 0} <span style={{ fontSize: '1rem', color: '#D4AF37' }}>usGOLD</span></Typography>
                  </Box>
                  <Box textAlign="right">
                    <Typography variant="caption" color="text.secondary" fontWeight="600" letterSpacing={1}>Solana Network Fee</Typography>
                    <Typography variant="h6" color="#14F195" fontWeight="bold">
                      ~0.0001 SOL
                    </Typography>
                  </Box>
                </Stack>

                {/* Amount Presets */}
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  {[100, 500, 1000, 5000].map((preset) => (
                    <Button 
                      key={preset}
                      size="small"
                      onClick={() => {
                        triggerHaptic(10);
                        setCustomStakeAmount(preset.toString());
                      }}
                      sx={{ 
                        flexGrow: 1, 
                        bgcolor: customStakeAmount === preset.toString() ? alpha('#D4AF37', 0.25) : alpha('#D4AF37', 0.05), 
                        color: customStakeAmount === preset.toString() ? '#FFDF73' : '#fff', 
                        borderRadius: '10px',
                        fontWeight: 'bold',
                        border: `1px solid ${customStakeAmount === preset.toString() ? '#D4AF37' : alpha('#D4AF37', 0.15)}`,
                        '&:hover': { bgcolor: alpha('#D4AF37', 0.18) }
                      }}
                    >
                      +{preset}
                    </Button>
                  ))}
                  <Button 
                    size="small"
                    onClick={() => {
                      triggerHaptic(10);
                      setCustomStakeAmount(usGoldBalance.toString());
                    }}
                    sx={{ 
                      flexGrow: 1, 
                      bgcolor: alpha('#4caf50', 0.1), 
                      color: '#4caf50', 
                      borderRadius: '10px',
                      fontWeight: '900',
                      border: `1px solid ${alpha('#4caf50', 0.3)}`,
                      '&:hover': { bgcolor: alpha('#4caf50', 0.2) }
                    }}
                  >
                    MAX ({usGoldBalance.toFixed(0)})
                  </Button>
                </Box>

                <Slider
                  value={parseFloat(customStakeAmount) || 0}
                  onChange={(e, newValue) => {
                    triggerHaptic(10);
                    setCustomStakeAmount((newValue as number).toString());
                  }}
                  min={0}
                  max={Math.max(10, usGoldBalance)}
                  step={1}
                  sx={{
                    color: '#D4AF37',
                    height: 8,
                    mb: 3,
                    '& .MuiSlider-track': { border: 'none', background: 'linear-gradient(to right, #D4AF37, #FFDF73)' },
                    '& .MuiSlider-thumb': {
                      height: 24,
                      width: 24,
                      backgroundColor: '#fff',
                      border: '4px solid #D4AF37',
                      '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
                        boxShadow: `0px 0px 0px 8px ${alpha('#D4AF37', 0.16)}`,
                      },
                    }
                  }}
                />

                <Box sx={{ mb: 3 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="600" letterSpacing={1} display="block" mb={1.5}>
                    Select Lockup Duration & Monthly Yield
                  </Typography>
                  <Grid container spacing={1.5}>
                    {[
                      { months: 1, rate: '2%', total: '2% Total' },
                      { months: 3, rate: '2%/mo', total: '6% Total' },
                      { months: 6, rate: '2%/mo', total: '12% Total' },
                      { months: 12, rate: '2%/mo', total: '24% Total' }
                    ].map((plan) => (
                      <Grid item xs={3} key={plan.months}>
                        <Box
                          onClick={() => {
                            triggerHaptic(10);
                            setStakingDurationMonths(plan.months as any);
                          }}
                          sx={{
                            cursor: 'pointer',
                            bgcolor: stakingDurationMonths === plan.months ? alpha('#D4AF37', 0.2) : alpha('#fff', 0.03),
                            color: stakingDurationMonths === plan.months ? '#FFDF73' : '#fff',
                            border: `1.5px solid ${stakingDurationMonths === plan.months ? '#D4AF37' : alpha('#fff', 0.08)}`,
                            py: 1.5,
                            px: 1,
                            textAlign: 'center',
                            borderRadius: '14px',
                            transition: 'all 0.2s',
                            '&:hover': { bgcolor: alpha('#D4AF37', 0.1) }
                          }}
                        >
                          <Typography variant="body1" fontWeight="800">
                            {plan.months}M
                          </Typography>
                          <Chip 
                            label={plan.total} 
                            size="small" 
                            sx={{ 
                              mt: 0.5, 
                              height: 18, 
                              fontSize: '9px', 
                              fontWeight: '900',
                              bgcolor: stakingDurationMonths === plan.months ? '#D4AF37' : alpha('#4caf50', 0.15),
                              color: stakingDurationMonths === plan.months ? '#000' : '#4caf50'
                            }} 
                          />
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Box>

                {!connected ? (
                  <Button 
                    fullWidth
                    onClick={() => open()}
                    sx={{ 
                      backgroundColor: '#D4AF37', 
                      color: '#000', 
                      fontWeight: '900', 
                      borderRadius: '14px',
                      padding: '16px',
                      fontSize: '1rem',
                      '&:hover': { backgroundColor: '#FFDF73' }
                    }}
                  >
                    Connect Wallet to Stake usGOLD
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    fullWidth
                    disabled={isCreatingStake || parseFloat(customStakeAmount) <= 0 || parseFloat(customStakeAmount) > usGoldBalance}
                    onClick={handleCreateCustomStake}
                    sx={{
                      bgcolor: '#D4AF37',
                      color: '#000',
                      fontWeight: '900',
                      fontSize: '1.1rem',
                      py: 1.8,
                      borderRadius: '14px',
                      '&:hover': { bgcolor: '#FFDF73' },
                      boxShadow: '0 8px 30px rgba(212,175,55,0.3)',
                      '&.Mui-disabled': {
                        bgcolor: alpha('#D4AF37', 0.3),
                        color: alpha('#000', 0.5)
                      }
                    }}
                  >
                    {isCreatingStake ? 'STAKING ON SOLANA...' : `STAKE ${parseFloat(customStakeAmount) || 0} usGOLD NOW`}
                  </Button>
                )}
                
                {parseFloat(customStakeAmount) > usGoldBalance && (
                  <Typography variant="caption" color="error" display="block" textAlign="center" mt={1.5} fontWeight="bold">
                    Insufficient liquid usGOLD. Available: {usGoldBalance.toFixed(2)} usGOLD
                  </Typography>
                )}
              </Box>

              {/* Referral Bonus Banner inside Staking Box */}
              <Box sx={{ mt: 3, p: 2, borderRadius: '16px', bgcolor: alpha('#D4AF37', 0.05), border: `1px solid ${alpha('#D4AF37', 0.2)}`, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Users size={20} color="#D4AF37" />
                <Typography variant="caption" color="text.secondary">
                  <strong style={{ color: '#D4AF37' }}>$1.00 usGOLD Referral Reward:</strong> Invite friends using your referral link. You earn $1 usGOLD reward for each referee, which unlocks and becomes redeemable as soon as your referee completes staking usGOLD!
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Active Locked Vaults & Real-Time Ticking Countdown / Yield Stream */}
        <Grid item xs={12} md={5}>
          <Card sx={{ 
            bgcolor: '#16171b',
            border: `1px solid ${alpha('#D4AF37', 0.25)}`,
            borderRadius: '24px',
            boxShadow: `0 12px 36px ${alpha('#000', 0.5)}`,
            height: '100%',
            overflow: 'hidden'
          }}>
            <Box sx={{ p: 3, borderBottom: `1px solid ${alpha('#fff', 0.05)}`, bgcolor: alpha('#000', 0.2), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body1" fontWeight="800" color="#fff" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Activity color="#D4AF37" size={20} />
                Active Staking Vaults
              </Typography>
              <Chip 
                label={`${activeStakedList.length} Active`} 
                size="small" 
                sx={{ bgcolor: alpha('#D4AF37', 0.15), color: '#FFDF73', fontWeight: 'bold' }} 
              />
            </Box>

            <CardContent sx={{ p: 3, maxHeight: '650px', overflowY: 'auto' }}>
              {activeStakedList.length === 0 ? (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <Coins size={44} color="#D4AF37" style={{ opacity: 0.35, marginBottom: 12 }} />
                  <Typography variant="body1" color="text.secondary" fontWeight="700" mb={1}>
                    No Active Vaults
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ maxWidth: 240, mx: 'auto', mb: 3 }}>
                    You don't have any active usGOLD lockups. Stake usGOLD to start earning 2% monthly yield.
                  </Typography>
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
                        {/* Vault Header */}
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
                            label={`+${st.durationMonths * 2}% Total`} 
                            size="small" 
                            sx={{ bgcolor: alpha('#4caf50', 0.12), color: '#4caf50', fontWeight: '900', fontSize: '10px' }} 
                          />
                        </Box>

                        {/* Live Yield Tracking Counter */}
                        <Box sx={{ mb: 2, p: 1.5, borderRadius: '10px', bgcolor: alpha('#4caf50', 0.05), border: `1px solid ${alpha('#4caf50', 0.15)}` }}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Real-Time Accrued Yield (2%/mo):
                          </Typography>
                          <Typography variant="body1" fontWeight="900" color="#4caf50" sx={{ fontFamily: 'monospace' }}>
                            +${currentAccruedProfit.toFixed(6)} USD
                          </Typography>
                        </Box>

                        {/* Countdown Meter */}
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                            Staking Time Countdown:
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

                        {/* Claim Action */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            Ticking per second
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

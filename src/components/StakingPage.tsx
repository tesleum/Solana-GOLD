import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Stack, Card, CardContent, alpha, useTheme, Button, 
  Divider, Grid, Chip, Slider, LinearProgress, Avatar, Tooltip, IconButton, Collapse
} from '@mui/material';
import { 
  Coins, ShieldCheck, Activity, Flame, Wallet, Share2, 
  Copy, Check, TrendingUp, Award, Sparkles, CheckCircle2, Zap, Users, Lock, ArrowUpRight,
  Wifi, Cpu, CreditCard, Gift, ChevronLeft, ChevronRight, ChevronDown, ChevronUp
} from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useAppKit } from '@reown/appkit/react';
import { t } from '../translations';
import { database } from '../firebase';
import { ref, onValue, update, push, get } from 'firebase/database';
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
  tokenPrice,
  setActiveTab
}: StakingPageProps) {
  useTheme();
  const { publicKey, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { open } = useAppKit();

  // Custom Staking & Duration State
  const [customStakeAmount, setCustomStakeAmount] = useState<string>('100');
  const [stakingDurationMonths, setStakingDurationMonths] = useState<1 | 3 | 6 | 12>(3);
  const [isCreatingStake, setIsCreatingStake] = useState(false);

  // Active Stakes from Firebase
  const [activeStakes, setActiveStakes] = useState<any[]>([]);

  // Referral Rewards from Firebase
  const [pendingReferralRewards, setPendingReferralRewards] = useState<number>(1.00);
  const [referralsCount, setReferralsCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [needsApprovalCount, setNeedsApprovalCount] = useState<number>(0);
  const [approvedCount, setApprovedCount] = useState<number>(0);

  // Real-time ticking timestamp state for second-by-second countdown & profit accrual
  const [nowTime, setNowTime] = useState<number>(Date.now());

  // Copy / Share Notification States
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [showMetrics, setShowMetrics] = useState<boolean>(false);

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
          
          const pCount = list.filter(r => r.status === 'pending').length;
          const nCount = list.filter(r => r.status === 'needs_approval').length;
          const aCount = list.filter(r => r.status === 'approved' || r.status === 'redeemed' || r.type === 'referral_stake_completed').length;
          
          setPendingCount(pCount);
          setNeedsApprovalCount(nCount);
          setApprovedCount(aCount);
          setReferralsCount(list.length);
          
          const legacyPending = list.filter(r => r.type === 'referral_stake_completed').reduce((sum, item) => sum + (item.amount || 1), 0);
          setPendingReferralRewards((aCount * 1) || legacyPending || 0);
        } else {
          setPendingCount(0);
          setNeedsApprovalCount(0);
          setApprovedCount(0);
          setReferralsCount(0);
          setPendingReferralRewards(0);
        }
      });

      return () => {
        unsubStakes();
        unsubRewards();
      };
    }
  }, [effectiveAddress]);

  // Handle Referral Share via Web API
  const handleShareReferral = async () => {
    triggerHaptic(15);
    const referralLink = `${window.location.origin}?ref=${effectiveAddress || 'GOLDEN'}`;
    const shareData = {
      title: 'usGOLD Staking Reserve',
      text: 'Stake usGOLD stablecoin on Solana to earn 2% monthly fixed yield + $1 usGOLD referral bonus!',
      url: referralLink,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      } catch (err) {
        console.log("Share dismissed or error:", err);
      }
    } else {
      // Fallback copy to clipboard
      try {
        await navigator.clipboard.writeText(referralLink);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      } catch (err) {
        console.error("Clipboard copy failed:", err);
      }
    }
  };

  // Solana Price & SOL conversion calculation for usGOLD (derived from tokenPrice)
  const currentSolPrice = solanaPrice && solanaPrice > 0 ? solanaPrice : 0;
  const effectiveTokenPrice = tokenPrice && tokenPrice > 0 ? tokenPrice : 0;
  const stakeValUsd = (parseFloat(customStakeAmount) || 0) * effectiveTokenPrice;
  
  // SOL needed = (Amount * tokenPrice) / currentSolPrice
  const requiredSol = (currentSolPrice && currentSolPrice > 0) ? (stakeValUsd / currentSolPrice) : 0;
  const networkFeeSol = 0.0001;
  const totalSolPayment = requiredSol + networkFeeSol;

  // Handle Custom usGOLD Staking creation with Direct Solana Payment
  const handleCreateCustomStake = async () => {
    triggerHaptic(20);
    const amt = parseFloat(customStakeAmount);
    if (isNaN(amt) || amt < 10 || amt > 1000) {
      alert("Please enter a valid usGOLD amount to stake (between $10 and $1,000).");
      return;
    }

    setIsCreatingStake(true);

    try {
      // Execute Solana network payment transaction
      if (publicKey && connected) {
        const adminWallet = new PublicKey('6PCtQ1NeTdyPpBCVZv1NGCSaBaRy9UaYXNLdmdqEtz5a');
        const lamports = Math.round(totalSolPayment * LAMPORTS_PER_SOL);
        
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
        createdAt: Date.now(),
        solPaid: totalSolPayment.toFixed(6)
      };

      if (effectiveAddress) {
        const stakesRef = ref(database, `stakes/${effectiveAddress}`);
        await push(stakesRef, newStake);

        // Record transaction
        const txRef = ref(database, `transactions/${effectiveAddress}`);
        await push(txRef, {
          type: 'stake_created',
          amount: `${amt} usGOLD`,
          price: `${totalSolPayment.toFixed(6)} SOL`,
          details: `Staked in ${stakingDurationMonths}-Month Vault (${(profitRate * 100).toFixed(0)}% Return)`,
          timestamp: Date.now()
        });

        // Referral reward unlocking logic: Referee completed staking payment
        try {
          const userRef = ref(database, `users/${effectiveAddress}`);
          const userSnapshot = await get(userRef);
          let referrer = localStorage.getItem('referrer');
          
          if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            if (userData.referrer) {
              referrer = userData.referrer;
            }
          }
          
          if (referrer) {
            const rewardsRef = ref(database, `rewards/${referrer}`);
            const rewardsSnapshot = await get(rewardsRef);
            let rewardKeyToUpdate = null;
            
            if (rewardsSnapshot.exists()) {
              const rewardsData = rewardsSnapshot.val();
              // Find the pending reward for this referee
              rewardKeyToUpdate = Object.keys(rewardsData).find(key => 
                rewardsData[key].referee === effectiveAddress && 
                rewardsData[key].status === 'pending'
              );
            }
            
            if (rewardKeyToUpdate) {
              // Update status to needs_approval and attach staking data
              await update(ref(database, `rewards/${referrer}/${rewardKeyToUpdate}`), {
                status: 'needs_approval',
                completedAt: Date.now(),
                stakeAmount: amt,
                stakeDurationMonths: stakingDurationMonths,
                solPaid: totalSolPayment.toFixed(6)
              });
            } else {
              // Create it directly as needs_approval if it didn't exist
              await push(rewardsRef, {
                type: 'referral_reward',
                amount: 1,
                referee: effectiveAddress,
                status: 'needs_approval',
                timestamp: Date.now(),
                completedAt: Date.now(),
                stakeAmount: amt,
                stakeDurationMonths: stakingDurationMonths,
                solPaid: totalSolPayment.toFixed(6)
              });
            }
          }
        } catch (err) {
          console.error("Error updating referral reward:", err);
        }
      } else {
        setActiveStakes(prev => [...prev, { key: Date.now().toString(), ...newStake }]);
      }

      setIsCreatingStake(false);
      alert(`Success! Staked ${amt} usGOLD in the ${stakingDurationMonths}-Month Vault (${(profitRate * 100).toFixed(0)}% Yield). Paid ${totalSolPayment.toFixed(6)} SOL.`);
    } catch (err) {
      console.error("Stake creation error:", err);
      setIsCreatingStake(false);
      alert("Failed to complete Solana transaction. Please ensure your wallet is connected with sufficient SOL.");
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
          price: `$${accruedProfit.toFixed(2)}`,
          details: `Claimed Staking Yield from usGOLD Vault`,
          timestamp: Date.now()
        });
      } else {
        setActiveStakes(prev => prev.filter(s => s.key !== stakeKey));
      }
      alert(`Successfully claimed $${accruedProfit.toFixed(2)} USD in accrued staking yield!`);
    } catch (err) {
      console.error("Claim stake error:", err);
      alert("Failed to claim rewards.");
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
    <Box sx={{ animation: 'fadeIn 0.3s ease-out', pb: 10 }}>
      {/* Redesigned Staking Vault Card matching Vault style */}
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
              {t('goldReserveYield', language) || "SECURE FIXED INCOME"}
            </Typography>
            <Typography variant="h3" fontWeight="900" sx={{ mt: 1, fontFamily: '"Cinzel", serif', background: 'linear-gradient(45deg, #FFDF73, #D4AF37, #996515)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }}>
              {t('stakeUsGold', language) || "STAKE usGOLD"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: '80%', mx: 'auto' }}>
              {t('lockupYourHoldings', language) || "Lock up your usGOLD stablecoin to earn guaranteed 2% monthly fixed yield."}
            </Typography>
          </Box>

          {/* Interactive Gold Bar Display */}
          {(() => {
            const val = Math.min(1000, Math.max(10, parseFloat(customStakeAmount) || 10));
            const norm = (val - 10) / 990; // 0.0 at $10 up to 1.0 at $1000
            const barScale = 0.75 + norm * 0.35; // 0.75x -> 1.10x

            return (
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
                  transform: `rotateX(15deg) scale(${barScale})`,
                  transition: 'all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }}>
                  {/* Engravings on the Gold Bar */}
                  <Typography variant="h4" fontWeight="900" sx={{ color: 'rgba(120, 80, 20, 0.6)', textShadow: '1px 1px 1px rgba(255,255,255,0.3), -1px -1px 1px rgba(0,0,0,0.2)', fontFamily: '"Cinzel", serif' }}>
                    {customStakeAmount || 10}g
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(120, 80, 20, 0.5)', fontWeight: 'bold', letterSpacing: 2 }}>
                    {t('stakedVault', language)}
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
                  transform: `scale(${barScale})`,
                  transition: 'all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                }} />
              </Box>
            );
          })()}

          {/* Staking Controls */}
          <Box sx={{ bgcolor: alpha('#000', 0.4), p: 3, borderRadius: '24px', border: `1px solid ${alpha('#ffffff', 0.05)}` }}>
            
            {/* Amount Header & SOL Calculation */}
            <Stack direction="row" justifyContent="space-between" alignItems="flex-end" mb={2}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="600" letterSpacing={1}>
                  {t('stakingAmount', language)}
                </Typography>
                <Typography variant="h4" color="#fff" fontWeight="900">
                  {customStakeAmount || 0} <span style={{ fontSize: '1rem', color: '#D4AF37' }}>usGOLD</span>
                </Typography>
              </Box>

              <Box textAlign="right">
                <Typography variant="caption" color="text.secondary" fontWeight="600" letterSpacing={1}>
                  {t('solanaRequired', language)}
                </Typography>
                <Typography variant="h6" color="#14F195" fontWeight="bold">
                  {requiredSol.toFixed(6)} SOL
                </Typography>
              </Box>
            </Stack>

            {/* Calculation Breakdown Banner */}
            <Box sx={{ mb: 3, p: 1.5, borderRadius: '12px', bgcolor: alpha('#14F195', 0.05), border: `1px solid ${alpha('#14F195', 0.2)}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                {t('rate', language)}: <strong>1 usGOLD = ${effectiveTokenPrice.toFixed(2)} USD</strong>
              </Typography>
              <Typography variant="caption" color="#14F195" fontWeight="bold" sx={{ fontSize: '11px' }}>
                {t('fee', language)}: +{networkFeeSol} SOL
              </Typography>
            </Box>

            {/* Adjust Staking Amount Label & Slider */}
            <Box sx={{ mt: 1, mb: 1.5 }}>
              <Typography variant="caption" color="text.secondary" fontWeight="700" letterSpacing={0.5}>
                {t('adjustStakingAmount', language)}
              </Typography>
            </Box>

            <Slider
              value={Math.min(1000, Math.max(10, parseFloat(customStakeAmount) || 10))}
              onChange={(e, newValue) => {
                triggerHaptic(10);
                setCustomStakeAmount((newValue as number).toString());
              }}
              min={10}
              max={1000}
              step={10}
              sx={{
                color: '#D4AF37',
                height: 8,
                mb: 4,
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

            {/* Duration Picker */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="caption" color="text.secondary" fontWeight="700" letterSpacing={0.5} display="block" mb={1.5}>
                {t('selectLockupPeriod', language)}
              </Typography>
              <Grid container spacing={1.5}>
                {[
                  { months: 1, total: `2% ${t('total', language)}` },
                  { months: 3, total: `6% ${t('total', language)}` },
                  { months: 6, total: `12% ${t('total', language)}` },
                  { months: 12, total: `24% ${t('total', language)}` }
                ].map((plan) => (
                  <Grid item xs={3} key={plan.months}>
                    <Box
                      onClick={() => {
                        triggerHaptic(10);
                        setStakingDurationMonths(plan.months as any);
                      }}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: stakingDurationMonths === plan.months ? alpha('#D4AF37', 0.2) : alpha('#fff', 0.02),
                        color: stakingDurationMonths === plan.months ? '#FFDF73' : '#fff',
                        border: `1.5px solid ${stakingDurationMonths === plan.months ? '#D4AF37' : alpha('#fff', 0.08)}`,
                        py: 1.5,
                        px: 0.5,
                        textAlign: 'center',
                        borderRadius: '16px',
                        transition: 'all 0.2s',
                        '&:hover': { bgcolor: alpha('#D4AF37', 0.1) }
                      }}
                    >
                      <Typography variant="body2" fontWeight="800">
                        {plan.months} {t('month', language)}
                      </Typography>
                      <Chip 
                        label={plan.total} 
                        size="small" 
                        sx={{ 
                          mt: 0.5, 
                          height: 18, 
                          fontSize: '9.5px', 
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

            {/* Action Button */}
            {!connected ? (
              <Button 
                fullWidth
                onClick={() => open()}
                sx={{ 
                  backgroundColor: '#D4AF37', 
                  color: '#000', 
                  fontWeight: '900', 
                  borderRadius: '16px',
                  padding: '16px',
                  fontSize: '1rem',
                  '&:hover': { backgroundColor: '#FFDF73' }
                }}
              >
                {t('connectWalletToStake', language)}
              </Button>
            ) : (
              <Button 
                fullWidth
                onClick={handleCreateCustomStake}
                disabled={isCreatingStake}
                sx={{ 
                  backgroundColor: '#D4AF37', 
                  color: '#000', 
                  fontWeight: '900', 
                  borderRadius: '16px',
                  padding: '16px',
                  fontSize: '1rem',
                  '&:hover': { backgroundColor: '#FFDF73' }
                }}
              >
                {isCreatingStake ? t('creatingStakeVault', language) : (t('stakeUsGoldNow', language) || "STAKE usGOLD NOW")}
              </Button>
            )}

          </Box>

        </CardContent>
      </Card>

      {/* 2. ACTIVE STAKES / PREVIOUS VAULTS SECTION */}
      <Card sx={{ 
        bgcolor: '#141518',
        border: `1px solid ${alpha('#D4AF37', 0.25)}`,
        borderRadius: '28px',
        boxShadow: `0 10px 30px ${alpha('#000', 0.5)}`,
        overflow: 'hidden'
      }}>
        <Box sx={{ p: 3, borderBottom: `1px solid ${alpha('#fff', 0.05)}`, bgcolor: alpha('#000', 0.2), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="800" color="#fff" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Activity color="#D4AF37" size={20} />
            {t('activeStakingVaults', language)}
          </Typography>
          <Chip 
            label={`${activeStakedList.length} ${t('active', language)}`} 
            size="small" 
            sx={{ bgcolor: alpha('#D4AF37', 0.15), color: '#FFDF73', fontWeight: 'bold', fontSize: '11px' }} 
          />
        </Box>

        <CardContent sx={{ p: 3, maxHeight: '650px', overflowY: 'auto' }}>
          {activeStakedList.length === 0 ? (
            <Box sx={{ py: 8, textAlign: 'center' }}>
              <Coins size={44} color="#D4AF37" style={{ opacity: 0.35, marginBottom: 16 }} />
              <Typography variant="body1" color="text.secondary" fontWeight="700" mb={1}>
                {t('noActiveVaults', language)}
              </Typography>
              <Typography variant="body2" color="text.secondary" display="block" sx={{ maxWidth: 280, mx: 'auto' }}>
                {t('stakeUsGoldDirectly', language)}
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
                      borderRadius: '18px',
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
                          <Typography variant="body1" fontWeight="800" color="#fff">
                            {st.amount} usGOLD
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                            {st.durationMonths}-{t('monthLockedVault', language)}
                          </Typography>
                        </Box>
                      </Stack>
                      <Chip 
                        label={`+${st.durationMonths * 2}% ${t('total', language)}`} 
                        size="small" 
                        sx={{ bgcolor: alpha('#4caf50', 0.12), color: '#4caf50', fontWeight: '900', fontSize: '11px', height: 22 }} 
                      />
                    </Box>

                    {/* Live Yield Counter */}
                    <Box sx={{ mb: 2, p: 1.5, borderRadius: '12px', bgcolor: alpha('#4caf50', 0.05), border: `1px solid ${alpha('#4caf50', 0.15)}` }}>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '11px' }}>
                        {t('accruedYield', language)} (2%/mo):
                      </Typography>
                      <Typography variant="body1" fontWeight="900" color="#4caf50" sx={{ fontFamily: 'monospace' }}>
                        +${currentAccruedProfit.toFixed(6)} USD
                      </Typography>
                    </Box>

                    {/* Countdown */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '11px' }}>
                        {t('countdown', language)}:
                      </Typography>
                      <Typography variant="body2" fontWeight="bold" color="#FFDF73" sx={{ fontFamily: 'monospace', fontSize: '13px' }}>
                        {countdownFormatted}
                      </Typography>
                      
                      <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={progressPercent} 
                          sx={{ 
                            flexGrow: 1, 
                            height: 6, 
                            borderRadius: 3, 
                            bgcolor: alpha('#fff', 0.08),
                            '& .MuiLinearProgress-bar': { bgcolor: '#D4AF37' } 
                          }} 
                        />
                        <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ fontSize: '11px' }}>
                          {progressPercent.toFixed(0)}%
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 1.5, borderColor: alpha('#fff', 0.05) }} />

                    {/* Claim Action */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                        {t('perSecondRealTime', language)}
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
                          py: 0.5,
                          fontSize: '11px',
                          textTransform: 'none'
                        }}
                      >
                        {t('claimYield', language)}
                      </Button>
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}

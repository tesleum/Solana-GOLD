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
      
      {/* 1. SINGLE COMPACT LUXURY BANK WALLET CARD WITH TOP-RIGHT REFERRAL & SLIDABLE METRICS */}
      <Card sx={{
        background: 'linear-gradient(135deg, #1c190f 0%, #0d0d10 40%, #17150e 75%, #08090a 100%)',
        border: `1px solid ${alpha('#D4AF37', 0.45)}`,
        borderRadius: '20px',
        mb: 3,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 20px 50px ${alpha('#000', 0.8)}, 0 0 35px ${alpha('#D4AF37', 0.15)}, inset 0 1px 1px ${alpha('#FFDF73', 0.4)}`,
        p: { xs: 2, sm: 2.5 }
      }}>
        {/* Decorative Metallic Background Lights */}
        <Box sx={{ 
          position: 'absolute', 
          top: -70, 
          right: -70, 
          width: 250, 
          height: 250, 
          background: `radial-gradient(circle, ${alpha('#D4AF37', 0.2)} 0%, ${alpha('#FFDF73', 0.04)} 45%, transparent 70%)`,
          pointerEvents: 'none'
        }} />
        <Box sx={{ 
          position: 'absolute', 
          bottom: -80, 
          left: -80, 
          width: 260, 
          height: 260, 
          background: `radial-gradient(circle, ${alpha('#14F195', 0.08)} 0%, transparent 70%)`,
          pointerEvents: 'none'
        }} />

        {/* TOP CARD HEADER: Brand (Left) + TOP-RIGHT REFERRAL & VIP (Right) */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
          <Stack direction="row" alignItems="center" spacing={1.2}>
            {/* EMV Microchip graphic */}
            <Box sx={{ 
              width: 38, 
              height: 28, 
              borderRadius: '5px', 
              background: 'linear-gradient(135deg, #E5C158 0%, #B38F26 50%, #F5D77F 100%)',
              border: '1px solid #99781D',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.6), 0 2px 6px rgba(0,0,0,0.5)',
              position: 'relative',
              overflow: 'hidden',
              p: 0.4,
              display: 'flex',
              flexDirection: 'column',
              justify: 'space-between'
            }}>
              <Box sx={{ width: '100%', height: '1px', bgcolor: 'rgba(0,0,0,0.35)' }} />
              <Box sx={{ width: '100%', height: '1px', bgcolor: 'rgba(0,0,0,0.35)' }} />
              <Box sx={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', bgcolor: 'rgba(0,0,0,0.35)' }} />
            </Box>

            <Box>
              <Typography variant="overline" color="#D4AF37" sx={{ fontWeight: 900, letterSpacing: 1.5, fontSize: '10px', lineHeight: 1, display: 'block' }}>
                {t('solanaGoldVault', language)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '9px', fontWeight: 700, letterSpacing: 0.5 }}>
                {t('debitYieldCard', language)}
              </Typography>
            </Box>
          </Stack>

          {/* TOP RIGHT REDESIGNED REFERRAL STATUS */}
          <Stack direction="row" alignItems="center" spacing={1}>
            <Tooltip 
              title={`${t('referralRewards', language)}: 1 usGOLD/ref (${t('earned', language)}: ${pendingReferralRewards.toFixed(2)} usGOLD | ${t('pending', language)}: ${pendingCount} | ${t('needsApproval', language)}: ${needsApprovalCount} | ${t('redeemed', language)}: ${approvedCount})`}
              arrow
            >
              <Button
                size="small"
                onClick={handleShareReferral}
                startIcon={<Gift size={13} color="#D4AF37" />}
                sx={{
                  bgcolor: alpha('#D4AF37', 0.1),
                  border: `1px solid ${alpha('#D4AF37', 0.45)}`,
                  color: '#FFDF73',
                  fontSize: '11px',
                  fontWeight: 800,
                  py: 0.5,
                  px: 1.5,
                  borderRadius: '12px',
                  textTransform: 'none',
                  transition: 'all 0.2s',
                  '&:hover': { 
                    bgcolor: alpha('#D4AF37', 0.25),
                    borderColor: '#FFDF73'
                  }
                }}
              >
                <Stack direction="column" alignItems="flex-start" sx={{ textAlign: 'left', lineHeight: 1.1 }}>
                  <Typography variant="caption" sx={{ fontSize: '8px', color: '#D4AF37', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {copiedLink ? t('copied', language) : shareSuccess ? t('shared', language) : t('inviteEarn', language)}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 900, color: '#fff' }}>
                    {pendingReferralRewards.toFixed(1)} {t('usGoldRef', language)}
                  </Typography>
                </Stack>
              </Button>
            </Tooltip>
          </Stack>
        </Stack>

        {/* NET PORTFOLIO BALANCE & CARD ADDRESS */}
        <Grid container spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <Grid item xs={12} sm={7}>
            <Typography variant="caption" sx={{ color: alpha('#FFDF73', 0.8), fontWeight: 800, fontSize: '10px', letterSpacing: 1, display: 'block', mb: 0.2 }}>
              {t('netPortfolioBalance', language)}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography variant="h4" fontWeight="900" sx={{ 
                color: '#FFF', 
                fontFamily: '"Cinzel", serif',
                letterSpacing: '-0.5px',
                fontSize: { xs: '1.8rem', sm: '2.2rem' },
                textShadow: `0 0 20px ${alpha('#D4AF37', 0.35)}`
              }}>
                ${(((usGoldBalance + totalStaked) * effectiveTokenPrice) + liveTotalAccrued).toFixed(2)}
              </Typography>
              <Typography variant="subtitle2" fontWeight="800" color="#D4AF37" sx={{ fontSize: '13px' }}>
                USD
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={5}>
            {/* CARD ACCOUNT NUMBER DISPLAY */}
            <Box sx={{ 
              py: 1, 
              px: 1.5, 
              borderRadius: '12px', 
              bgcolor: alpha('#000', 0.55), 
              border: `1px solid ${alpha('#D4AF37', 0.25)}`,
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center'
            }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '8px', letterSpacing: 1, fontWeight: 700, display: 'block' }}>
                  {t('vaultCardAddress', language)}
                </Typography>
                <Typography variant="body2" sx={{ 
                  fontFamily: 'monospace', 
                  letterSpacing: { xs: 1.5, sm: 2 }, 
                  fontWeight: 800, 
                  color: alpha('#fff', 0.95),
                  fontSize: { xs: '10.5px', sm: '11.5px' }
                }}>
                  4912 •••• {effectiveAddress ? effectiveAddress.slice(-4).toUpperCase() : '8888'}
                </Typography>
              </Box>

              <Tooltip title={t('copyVaultCardAddress', language)}>
                <IconButton 
                  size="small" 
                  onClick={() => {
                    if (effectiveAddress) {
                      navigator.clipboard.writeText(effectiveAddress);
                      triggerHaptic(10);
                      alert(t('vaultCardWalletCopied', language));
                    }
                  }}
                  sx={{ color: '#D4AF37', p: 0.6, bgcolor: alpha('#D4AF37', 0.1), '&:hover': { bgcolor: alpha('#D4AF37', 0.25) } }}
                >
                  <Copy size={13} />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>

        {/* EXPANDABLE SLIDE DOWN TOGGLE BUTTON */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          mt: 1.5,
          pt: 1.5,
          borderTop: `1px solid ${alpha('#D4AF37', 0.2)}`
        }}>
          <Button
            size="small"
            variant="text"
            onClick={() => {
              triggerHaptic(5);
              setShowMetrics(!showMetrics);
            }}
            endIcon={showMetrics ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            sx={{
              color: '#FFDF73',
              fontSize: '10.5px',
              fontWeight: 800,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              py: 0.4,
              px: 2,
              borderRadius: '20px',
              bgcolor: alpha('#D4AF37', 0.08),
              border: `1px solid ${alpha('#D4AF37', 0.25)}`,
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: alpha('#D4AF37', 0.16),
                borderColor: '#FFDF73'
              }
            }}
          >
            {showMetrics ? t('hideBalanceDetails', language) : t('showBalanceDetails', language)}
          </Button>
        </Box>

        {/* COLLAPSIBLE METRICS CAROUSEL */}
        <Collapse in={showMetrics} timeout="auto">
          <Box sx={{ mt: 2 }}>
            {/* SLIDABLE METRICS SECTION HEADER WITH TABS & CHEVRONS */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, pt: 1, borderTop: `1px dashed ${alpha('#D4AF37', 0.2)}` }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Stack direction="row" spacing={0.5}>
                  {[t('liquidUsGold', language), t('vaultStaked', language), t('liveYieldTicker', language)].map((name, idx) => (
                    <Chip
                      key={name}
                      label={name}
                      size="small"
                      onClick={() => {
                        setActiveSlide(idx);
                        const container = document.getElementById('slidable-metrics-container');
                        if (container) {
                          container.scrollTo({ left: idx * 260, behavior: 'smooth' });
                        }
                      }}
                      sx={{
                        height: 20,
                        fontSize: '9px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        bgcolor: activeSlide === idx ? alpha('#D4AF37', 0.3) : alpha('#fff', 0.05),
                        color: activeSlide === idx ? '#FFDF73' : 'text.secondary',
                        border: `1px solid ${activeSlide === idx ? alpha('#D4AF37', 0.5) : alpha('#fff', 0.1)}`,
                        transition: 'all 0.2s'
                      }}
                    />
                  ))}
                </Stack>
              </Stack>

              {/* Chevrons for manual sliding */}
              <Stack direction="row" spacing={0.5}>
                <IconButton 
                  size="small"
                  onClick={() => {
                    const nextIdx = Math.max(0, activeSlide - 1);
                    setActiveSlide(nextIdx);
                    const container = document.getElementById('slidable-metrics-container');
                    if (container) {
                      container.scrollTo({ left: nextIdx * 260, behavior: 'smooth' });
                    }
                  }}
                  sx={{ color: '#D4AF37', p: 0.4, bgcolor: alpha('#fff', 0.04) }}
                >
                  <ChevronLeft size={14} />
                </IconButton>
                <IconButton 
                  size="small"
                  onClick={() => {
                    const nextIdx = Math.min(2, activeSlide + 1);
                    setActiveSlide(nextIdx);
                    const container = document.getElementById('slidable-metrics-container');
                    if (container) {
                      container.scrollTo({ left: nextIdx * 260, behavior: 'smooth' });
                    }
                  }}
                  sx={{ color: '#D4AF37', p: 0.4, bgcolor: alpha('#fff', 0.04) }}
                >
                  <ChevronRight size={14} />
                </IconButton>
              </Stack>
            </Box>

            {/* HORIZONTAL TOUCH-SLIDABLE CAROUSEL (3 METRICS: LIQUID, STAKED, LIVE YIELD) */}
            <Box 
              id="slidable-metrics-container"
              onScroll={(e) => {
                const target = e.currentTarget;
                const scrollPos = target.scrollLeft;
                const cardWidth = 260;
                const newIndex = Math.min(2, Math.max(0, Math.round(scrollPos / cardWidth)));
                if (newIndex !== activeSlide) {
                  setActiveSlide(newIndex);
                }
              }}
              sx={{ 
                display: 'flex', 
                gap: 1.5, 
                overflowX: 'auto', 
                scrollSnapType: 'x mandatory',
                py: 0.5,
                px: 0.2,
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' }
              }}
            >
              {/* Card 1: Liquid usGOLD */}
              <Box sx={{ 
                minWidth: { xs: 240, sm: '31%' },
                flex: '0 0 auto',
                scrollSnapAlign: 'start',
                p: 1.5, 
                bgcolor: alpha('#fff', 0.025), 
                borderRadius: '14px', 
                border: `1px solid ${activeSlide === 0 ? alpha('#D4AF37', 0.55) : alpha('#D4AF37', 0.2)}`,
                boxShadow: activeSlide === 0 ? `0 4px 16px ${alpha('#D4AF37', 0.15)}` : 'none',
                transition: 'all 0.2s ease-in-out',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between'
              }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary" fontWeight="800" letterSpacing={0.5} sx={{ fontSize: '9.5px' }}>
                    1. {t('liquidUsGold', language)}
                  </Typography>
                  <TokenIcon symbol="usGOLD" size={16} />
                </Stack>
                <Box mt={1}>
                  <Typography variant="h6" fontWeight="900" color="#fff" sx={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
                    {usGoldBalance.toFixed(4)} <span style={{ fontSize: '11px', color: '#D4AF37' }}>g</span>
                  </Typography>
                  <Typography variant="caption" color="#D4AF37" fontWeight="bold" sx={{ fontSize: '10px' }}>
                    ≈ ${(usGoldBalance * effectiveTokenPrice).toFixed(2)} USD
                  </Typography>
                </Box>
              </Box>

              {/* Card 2: Vault Staked */}
              <Box sx={{ 
                minWidth: { xs: 240, sm: '31%' },
                flex: '0 0 auto',
                scrollSnapAlign: 'start',
                p: 1.5, 
                bgcolor: alpha('#4caf50', 0.04), 
                borderRadius: '14px', 
                border: `1px solid ${activeSlide === 1 ? alpha('#4caf50', 0.6) : alpha('#4caf50', 0.25)}`,
                boxShadow: activeSlide === 1 ? `0 4px 16px ${alpha('#4caf50', 0.15)}` : 'none',
                transition: 'all 0.2s ease-in-out',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between'
              }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary" fontWeight="800" letterSpacing={0.5} sx={{ fontSize: '9.5px' }}>
                    2. {t('vaultStaked', language)}
                  </Typography>
                  <Lock size={15} color="#4caf50" />
                </Stack>
                <Box mt={1}>
                  <Typography variant="h6" fontWeight="900" color="#4caf50" sx={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
                    {totalStaked.toFixed(4)} <span style={{ fontSize: '11px' }}>g</span>
                  </Typography>
                  <Typography variant="caption" color="#4caf50" fontWeight="bold" sx={{ fontSize: '10px' }}>
                    +2% / mo {t('guaranteedReturn', language)}
                  </Typography>
                </Box>
              </Box>

              {/* Card 3: Live Yield Ticker */}
              <Box sx={{ 
                minWidth: { xs: 240, sm: '31%' },
                flex: '0 0 auto',
                scrollSnapAlign: 'start',
                p: 1.5, 
                bgcolor: alpha('#FFDF73', 0.04), 
                borderRadius: '14px', 
                border: `1px solid ${activeSlide === 2 ? alpha('#FFDF73', 0.6) : alpha('#FFDF73', 0.25)}`,
                boxShadow: activeSlide === 2 ? `0 4px 16px ${alpha('#FFDF73', 0.15)}` : 'none',
                transition: 'all 0.2s ease-in-out',
                display: 'flex',
                flexDirection: 'column',
                justify: 'space-between'
              }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary" fontWeight="800" letterSpacing={0.5} sx={{ fontSize: '9.5px' }}>
                    3. {t('liveYieldTicker', language)}
                  </Typography>
                  <Activity size={15} color="#FFDF73" className="animate-pulse" />
                </Stack>
                <Box mt={1}>
                  <Typography variant="h6" fontWeight="900" color="#FFDF73" sx={{ fontFamily: 'monospace', fontSize: '1rem', lineHeight: 1.2 }}>
                    +${liveTotalAccrued.toFixed(6)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                    {t('perSecondRealTime', language)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Collapse>
      </Card>

      {/* 2. DIRECT STAKING & ACTIVE VAULTS MAIN GRID */}
      <Grid container spacing={3}>
        
        {/* Left Column: Direct usGOLD Staking Card */}
        <Grid item xs={12} md={7}>
          <Card sx={{ 
            background: `linear-gradient(145deg, #18191c 0%, #0f1012 100%)`,
            border: `1px solid ${alpha('#D4AF37', 0.3)}`,
            boxShadow: `0 10px 30px ${alpha('#000', 0.6)}`,
            borderRadius: '20px',
            height: '100%'
          }}>
            <CardContent sx={{ p: { xs: 2.5, md: 3.5 } }}>
              
              {/* Gold Bar Interactive Visualizer */}
              {(() => {
                const val = Math.min(1000, Math.max(10, parseFloat(customStakeAmount) || 10));
                const norm = (val - 10) / 990; // 0.0 at $10 up to 1.0 at $1000
                const barWidth = Math.round(150 + norm * 90); // 150px at $10 -> 240px at $1000
                const barHeight = Math.round(65 + norm * 25); // 65px at $10 -> 90px at $1000
                const barScale = 0.75 + norm * 0.35; // 0.75x -> 1.10x

                return (
                  <Box sx={{ 
                    position: 'relative', 
                    width: '100%', 
                    height: 140, 
                    perspective: 800,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    mb: 1
                  }}>
                    <Box sx={{
                      position: 'relative',
                      width: barWidth,
                      height: barHeight,
                      background: `linear-gradient(to right, #B5852A, #F5D76E, #C89B3C, #F5D76E, #B5852A)`,
                      borderRadius: '14px',
                      boxShadow: `
                        0 15px 30px rgba(0,0,0,0.6),
                        inset 0 3px 8px rgba(255,255,255,0.6),
                        inset 0 -3px 8px rgba(0,0,0,0.4)
                      `,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transform: `rotateX(12deg) scale(${barScale})`,
                      transition: 'all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}>
                      <Typography variant="h5" fontWeight="900" sx={{ color: 'rgba(120, 80, 20, 0.85)', textShadow: '1px 1px 1px rgba(255,255,255,0.3)', fontFamily: '"Cinzel", serif' }}>
                        ${customStakeAmount || 10}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(120, 80, 20, 0.75)', fontWeight: 'bold', letterSpacing: 1.5, fontSize: '9px' }}>
                        usGOLD VAULT
                      </Typography>
                    </Box>
                  </Box>
                );
              })()}

              {/* Direct Staking Controls */}
              <Box sx={{ bgcolor: alpha('#000', 0.4), p: 2.5, borderRadius: '16px', border: `1px solid ${alpha('#ffffff', 0.06)}` }}>
                
                {/* Amount Header & SOL Calculation */}
                <Stack direction="row" justifyContent="space-between" alignItems="flex-end" mb={1.5}>
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight="700" letterSpacing={0.5}>
                      {t('stakingAmount', language)}
                    </Typography>
                    <Typography variant="h5" color="#fff" fontWeight="900">
                      {customStakeAmount || 0} <span style={{ fontSize: '0.9rem', color: '#D4AF37' }}>{t('grams', language)}</span>
                    </Typography>
                  </Box>

                  <Box textAlign="right">
                    <Typography variant="caption" color="text.secondary" fontWeight="700" letterSpacing={0.5}>
                      {t('solanaRequired', language)}
                    </Typography>
                    <Typography variant="h6" color="#14F195" fontWeight="bold">
                      {requiredSol.toFixed(6)} SOL
                    </Typography>
                  </Box>
                </Stack>

                {/* Calculation Breakdown Banner */}
                <Box sx={{ mb: 2, p: 1.2, borderRadius: '10px', bgcolor: alpha('#14F195', 0.05), border: `1px solid ${alpha('#14F195', 0.2)}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '11px' }}>
                    {t('rate', language)}: <strong>1 gram = {effectiveTokenPrice.toFixed(2)} USD</strong> (@ ${currentSolPrice.toFixed(2)}/SOL)
                  </Typography>
                  <Typography variant="caption" color="#14F195" fontWeight="bold" sx={{ fontSize: '11px' }}>
                    {t('fee', language)}: +{networkFeeSol} SOL
                  </Typography>
                </Box>

                {/* Amount Quick Presets Grid - Responsive 3-col on Mobile, 6-col on Desktop */}
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: usGoldBalance > 0 ? 'repeat(6, 1fr)' : 'repeat(5, 1fr)' }, 
                  gap: 1, 
                  mb: 2 
                }}>
                  {[10, 50, 100, 500, 1000].map((preset) => (
                    <Button 
                      key={preset}
                      size="small"
                      onClick={() => {
                        triggerHaptic(10);
                        setCustomStakeAmount(preset.toString());
                      }}
                      sx={{ 
                        bgcolor: customStakeAmount === preset.toString() ? alpha('#D4AF37', 0.25) : alpha('#D4AF37', 0.05), 
                        color: customStakeAmount === preset.toString() ? '#FFDF73' : '#fff', 
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        fontSize: '12px',
                        py: 0.8,
                        minWidth: 0,
                        border: `1px solid ${customStakeAmount === preset.toString() ? '#D4AF37' : alpha('#D4AF37', 0.15)}`,
                        '&:hover': { bgcolor: alpha('#D4AF37', 0.18) }
                      }}
                    >
                      ${preset}
                    </Button>
                  ))}
                  {usGoldBalance > 0 && (
                    <Button 
                      size="small"
                      onClick={() => {
                        triggerHaptic(10);
                        const maxAmt = Math.min(usGoldBalance, 1000);
                        setCustomStakeAmount(maxAmt.toString());
                      }}
                      sx={{ 
                        bgcolor: alpha('#4caf50', 0.15), 
                        color: '#4caf50', 
                        borderRadius: '8px',
                        fontWeight: '900',
                        fontSize: '11px',
                        py: 0.8,
                        minWidth: 0,
                        border: `1px solid ${alpha('#4caf50', 0.3)}`,
                        '&:hover': { bgcolor: alpha('#4caf50', 0.25) }
                      }}
                    >
                      {t('max', language)}
                    </Button>
                  )}
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
                    height: 6,
                    mb: 2.5,
                    '& .MuiSlider-track': { border: 'none', background: 'linear-gradient(to right, #D4AF37, #FFDF73)' },
                    '& .MuiSlider-thumb': {
                      height: 20,
                      width: 20,
                      backgroundColor: '#fff',
                      border: '3px solid #D4AF37',
                    }
                  }}
                />

                {/* Duration Picker */}
                <Box sx={{ mb: 2.5 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="700" letterSpacing={0.5} display="block" mb={1}>
                    {t('selectLockupPeriod', language)}
                  </Typography>
                  <Grid container spacing={1}>
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
                            py: 1.2,
                            px: 0.5,
                            textAlign: 'center',
                            borderRadius: '12px',
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
                              mt: 0.3, 
                              height: 16, 
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

                {/* Action Button */}
                {!connected ? (
                  <Button 
                    fullWidth
                    onClick={() => open()}
                    sx={{ 
                      backgroundColor: '#D4AF37', 
                      color: '#000', 
                      fontWeight: '900', 
                      borderRadius: '12px',
                      padding: '14px',
                      fontSize: '0.95rem',
                      '&:hover': { backgroundColor: '#FFDF73' }
                    }}
                  >
                    {t('connectWalletToStake', language)}
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    fullWidth
                    disabled={isCreatingStake || parseFloat(customStakeAmount) <= 0}
                    onClick={handleCreateCustomStake}
                    sx={{
                      bgcolor: '#D4AF37',
                      color: '#000',
                      fontWeight: '900',
                      fontSize: '1rem',
                      py: 1.5,
                      borderRadius: '12px',
                      '&:hover': { bgcolor: '#FFDF73' },
                      boxShadow: '0 6px 20px rgba(212,175,55,0.35)',
                      '&.Mui-disabled': {
                        bgcolor: alpha('#D4AF37', 0.3),
                        color: alpha('#000', 0.5)
                      }
                    }}
                  >
                    {isCreatingStake 
                      ? 'PROCESSING SOLANA TRANSACTION...' 
                      : `STAKE ${customStakeAmount || 0} GRAMS (Pay ${totalSolPayment.toFixed(6)} SOL)`}
                  </Button>
                )}
                
                {/* Dedicated Staking Wallet Address Notice */}
                <Box sx={{ mt: 2.5, p: 1.5, borderRadius: '10px', bgcolor: alpha('#D4AF37', 0.04), border: `1px solid ${alpha('#D4AF37', 0.15)}`, display: 'flex', gap: 1.2, alignItems: 'flex-start' }}>
                  <Lock size={14} color="#D4AF37" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ fontSize: '10px', display: 'block', color: '#FFDF73' }}>
                      DEDICATED STAKING DEPOSIT POOL
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '9px', display: 'block', lineHeight: 1.3, wordBreak: 'break-all', fontFamily: 'monospace' }}>
                      6PCtQ1NeTdyPpBCVZv1NGCSaBaRy9UaYXNLdmdqEtz5a
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '9px', display: 'block', mt: 0.5, lineHeight: 1.2 }}>
                      Staking payments are directed exclusively to this secure liquidity pool, fully isolated from gold minting operations.
                    </Typography>
                  </Box>
                </Box>
                
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Active Vaults & Real-Time Ticking Countdown / Yield Stream */}
        <Grid item xs={12} md={5}>
          <Card sx={{ 
            bgcolor: '#141518',
            border: `1px solid ${alpha('#D4AF37', 0.25)}`,
            borderRadius: '20px',
            boxShadow: `0 10px 30px ${alpha('#000', 0.5)}`,
            height: '100%',
            overflow: 'hidden'
          }}>
            <Box sx={{ p: 2.5, borderBottom: `1px solid ${alpha('#fff', 0.05)}`, bgcolor: alpha('#000', 0.2), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body1" fontWeight="800" color="#fff" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Activity color="#D4AF37" size={18} />
                Active Staking Vaults
              </Typography>
              <Chip 
                label={`${activeStakedList.length} Active`} 
                size="small" 
                sx={{ bgcolor: alpha('#D4AF37', 0.15), color: '#FFDF73', fontWeight: 'bold', fontSize: '11px' }} 
              />
            </Box>

            <CardContent sx={{ p: 2.5, maxHeight: '580px', overflowY: 'auto' }}>
              {activeStakedList.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Coins size={40} color="#D4AF37" style={{ opacity: 0.35, marginBottom: 12 }} />
                  <Typography variant="body2" color="text.secondary" fontWeight="700" mb={0.5}>
                    No Active Vaults
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ maxWidth: 220, mx: 'auto' }}>
                    Stake usGOLD directly using SOL to start earning guaranteed 2% monthly yield.
                  </Typography>
                </Box>
              ) : (
                <Stack spacing={2}>
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
                          p: 2,
                          borderRadius: '14px',
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
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                          <Stack direction="row" spacing={1.2} alignItems="center">
                            <Avatar sx={{ bgcolor: alpha('#D4AF37', 0.15), color: '#D4AF37', width: 32, height: 32 }}>
                              <Award size={16} />
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="800" color="#fff">
                                {st.amount} {t('grams', language)}
                              </Typography>
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                                {st.durationMonths}-{t('monthLockedVault', language)}
                              </Typography>
                            </Box>
                          </Stack>
                          <Chip 
                            label={`+${st.durationMonths * 2}% Total`} 
                            size="small" 
                            sx={{ bgcolor: alpha('#4caf50', 0.12), color: '#4caf50', fontWeight: '900', fontSize: '10px', height: 20 }} 
                          />
                        </Box>

                        {/* Live Yield Counter */}
                        <Box sx={{ mb: 1.5, p: 1.2, borderRadius: '8px', bgcolor: alpha('#4caf50', 0.05), border: `1px solid ${alpha('#4caf50', 0.15)}` }}>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '10px' }}>
                            {t('accruedYield', language)} (2%/mo):
                          </Typography>
                          <Typography variant="body2" fontWeight="900" color="#4caf50" sx={{ fontFamily: 'monospace' }}>
                            +${currentAccruedProfit.toFixed(6)} USD
                          </Typography>
                        </Box>

                        {/* Countdown */}
                        <Box sx={{ mb: 1.5 }}>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '10px' }}>
                            {t('countdown', language)}:
                          </Typography>
                          <Typography variant="caption" fontWeight="bold" color="#FFDF73" sx={{ fontFamily: 'monospace', fontSize: '12px' }}>
                            {countdownFormatted}
                          </Typography>
                          
                          <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LinearProgress 
                              variant="determinate" 
                              value={progressPercent} 
                              sx={{ 
                                flexGrow: 1, 
                                height: 4, 
                                borderRadius: 2, 
                                bgcolor: alpha('#fff', 0.08),
                                '& .MuiLinearProgress-bar': { bgcolor: '#D4AF37' } 
                              }} 
                            />
                            <Typography variant="caption" color="text.secondary" fontWeight="bold" sx={{ fontSize: '10px' }}>
                              {progressPercent.toFixed(0)}%
                            </Typography>
                          </Box>
                        </Box>

                        <Divider sx={{ my: 1, borderColor: alpha('#fff', 0.05) }} />

                        {/* Claim Action */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                            {t('perSecondRealTime', language)}
                          </Typography>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            onClick={() => handleClaimStakeProfit(st.key, currentAccruedProfit)}
                            sx={{ 
                              fontWeight: '900', 
                              borderRadius: '6px',
                              px: 1.5,
                              py: 0.3,
                              fontSize: '10px',
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
        </Grid>
      </Grid>
    </Box>
  );
}

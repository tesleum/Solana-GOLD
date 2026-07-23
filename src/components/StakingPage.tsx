import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Stack, Card, CardContent, alpha, useTheme, Button, 
  Divider, Grid, Chip, Slider, LinearProgress, Avatar
} from '@mui/material';
import { 
  Coins, ShieldCheck, Zap, Plus, RefreshCw, Trophy, TrendingUp, Sparkles, 
  ArrowRight, Activity, CheckCircle2, Lock, Clock
} from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { t } from '../translations';
import { database } from '../firebase';
import { ref, onValue, update, push } from 'firebase/database';

interface StakingPageProps {
  language: string;
  effectiveAddress: string | null;
  usGoldBalance: number;
  solBalance: number;
  tokenPrice: number | null;
  setActiveTab: (tab: string) => void;
}

export function StakingPage({
  language,
  effectiveAddress,
  usGoldBalance,
  solBalance,
  tokenPrice,
  setActiveTab,
}: StakingPageProps) {
  const theme = useTheme();
  const { publicKey } = useWallet();

  // Custom Staking & Flexible Vault State
  const [customStakeAmount, setCustomStakeAmount] = useState<string>('100');
  const [stakingDurationMonths, setStakingDurationMonths] = useState<1 | 3 | 6 | 12>(3);
  const [isCreatingStake, setIsCreatingStake] = useState(false);

  // Active Stakes from Firebase
  const [activeStakes, setActiveStakes] = useState<any[]>([]);
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

    if (amt > usGoldBalance) {
      alert("Insufficient usGOLD balance in connected wallet/account for staking.");
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

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
      {/* Header Banner */}
      <Card sx={{ 
        background: 'linear-gradient(135deg, rgba(212, 175, 55, 0.15) 0%, rgba(18, 18, 20, 0.95) 100%)', 
        border: `1px solid ${alpha('#D4AF37', 0.3)}`,
        borderRadius: '24px',
        p: { xs: 3, md: 4 },
        mb: 4,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <Box sx={{ position: 'absolute', right: -20, bottom: -20, opacity: 0.1, pointerEvents: 'none' }}>
          <Coins size={180} color="#D4AF37" />
        </Box>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} spacing={3}>
          <Box>
            <Chip 
              icon={<ShieldCheck size={14} color="#D4AF37" />} 
              label="SOLANA STABLECOIN VAULT" 
              sx={{ bgcolor: alpha('#D4AF37', 0.15), color: '#D4AF37', fontWeight: 'bold', mb: 1.5, fontSize: '0.75rem' }} 
            />
            <Typography variant="h4" fontWeight="800" color="#fff" gutterBottom sx={{ letterSpacing: '-0.5px' }}>
              usGOLD Staking & Yield Reserve
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 600 }}>
              Stake your usGOLD ($1.00 USD stablecoin) securely on Solana. Earn guaranteed passive yields up to 24% APY backed by protocol liquidity.
            </Typography>
          </Box>
          <Box sx={{ bgcolor: alpha('#000', 0.4), p: 2.5, borderRadius: '16px', border: `1px solid ${alpha('#D4AF37', 0.2)}`, minWidth: 240 }}>
            <Typography variant="caption" color="text.secondary" display="block">Available Wallet usGOLD</Typography>
            <Typography variant="h5" fontWeight="bold" color="#D4AF37">{usGoldBalance.toFixed(2)} usGOLD</Typography>
            <Typography variant="caption" color="text.secondary">1 usGOLD = $1.00 USD Stablecoin</Typography>
          </Box>
        </Stack>
      </Card>

      {/* Contract & Token Specs Card */}
      <Card sx={{ bgcolor: '#121214', border: `1px solid ${alpha('#fff', 0.05)}`, borderRadius: '20px', mb: 4, p: 2.5 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="center" spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ bgcolor: alpha('#D4AF37', 0.2), color: '#D4AF37' }}>
              <Coins size={22} />
            </Avatar>
            <Box>
              <Typography fontWeight="bold" color="#fff">usGOLD Solana Token Contract</Typography>
              <Typography variant="caption" color="#D4AF37" sx={{ fontFamily: 'monospace' }}>
                CwFp9y4hpDDbiGAHPvHRNrCpiTtGm5C4xafwCYDSGoLd
              </Typography>
            </Box>
          </Stack>
          <Chip label="Price: $1.00 USD (Pegged)" color="success" variant="outlined" sx={{ borderColor: '#26a69a', color: '#26a69a', fontWeight: 'bold' }} />
        </Stack>
      </Card>

      {/* Main Grid: Create Stake vs Active Stakes */}
      <Grid container spacing={4}>
        {/* Left: Create New Stake */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ bgcolor: '#121214', border: `1px solid ${alpha('#D4AF37', 0.2)}`, borderRadius: '24px', height: '100%', p: 3 }}>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
              <Lock size={20} color="#D4AF37" />
              <Typography variant="h6" fontWeight="bold" color="#fff">Stake usGOLD Tokens</Typography>
            </Stack>

            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">Select Staking Amount (usGOLD)</Typography>
                <Typography variant="body2" color="#D4AF37" fontWeight="bold">Max: {usGoldBalance.toFixed(2)}</Typography>
              </Box>
              <Slider
                value={parseFloat(customStakeAmount) || 0}
                onChange={(_, val) => setCustomStakeAmount(val.toString())}
                min={10}
                max={Math.max(100, usGoldBalance || 1000)}
                step={10}
                valueLabelDisplay="auto"
                sx={{
                  color: '#D4AF37',
                  '& .MuiSlider-thumb': { bgcolor: '#D4AF37' },
                  '& .MuiSlider-rail': { bgcolor: alpha('#fff', 0.2) }
                }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                <Button size="small" onClick={() => setCustomStakeAmount('50')} sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>50</Button>
                <Button size="small" onClick={() => setCustomStakeAmount((usGoldBalance * 0.25).toFixed(0))} sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>25%</Button>
                <Button size="small" onClick={() => setCustomStakeAmount((usGoldBalance * 0.5).toFixed(0))} sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>50%</Button>
                <Button size="small" onClick={() => setCustomStakeAmount((usGoldBalance * 0.75).toFixed(0))} sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>75%</Button>
                <Button size="small" onClick={() => setCustomStakeAmount(usGoldBalance.toString())} sx={{ color: '#D4AF37', fontSize: '0.7rem', fontWeight: 'bold' }}>MAX</Button>
              </Box>
            </Box>

            <Typography variant="body2" color="text.secondary" mb={1.5}>Select Staking Lock Duration</Typography>
            <Grid container spacing={1.5} mb={3}>
              {[
                { months: 1, label: '1 Month', apr: '2% Yield' },
                { months: 3, label: '3 Months', apr: '6% Yield' },
                { months: 6, label: '6 Months', apr: '12% Yield' },
                { months: 12, label: '12 Months', apr: '24% Yield' }
              ].map(term => (
                <Grid item xs={6} key={term.months}>
                  <Card 
                    onClick={() => setStakingDurationMonths(term.months as any)}
                    sx={{ 
                      bgcolor: stakingDurationMonths === term.months ? alpha('#D4AF37', 0.15) : alpha('#fff', 0.02),
                      border: `1px solid ${stakingDurationMonths === term.months ? '#D4AF37' : alpha('#fff', 0.08)}`,
                      borderRadius: '14px',
                      p: 2,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                      '&:hover': { bgcolor: alpha('#D4AF37', 0.08) }
                    }}
                  >
                    <Typography fontWeight="bold" color={stakingDurationMonths === term.months ? '#D4AF37' : '#fff'}>{term.label}</Typography>
                    <Typography variant="caption" color="text.secondary">{term.apr}</Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>

            <Box sx={{ bgcolor: alpha('#fff', 0.02), p: 2, borderRadius: '14px', mb: 3 }}>
              <Stack direction="row" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">Estimated Reward Return:</Typography>
                <Typography variant="body2" color="#D4AF37" fontWeight="bold">
                  +{(parseFloat(customStakeAmount || '0') * stakingDurationMonths * 0.02).toFixed(2)} usGOLD ({stakingDurationMonths * 2}%)
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Locked Asset Backing:</Typography>
                <Typography variant="body2" color="#fff" fontWeight="bold">Solana Stablecoin Reserve</Typography>
              </Stack>
            </Box>

            <Button
              variant="contained"
              fullWidth
              size="large"
              disabled={isCreatingStake || parseFloat(customStakeAmount || '0') <= 0 || parseFloat(customStakeAmount || '0') > usGoldBalance}
              onClick={handleCreateCustomStake}
              sx={{ 
                bgcolor: '#D4AF37', 
                color: '#000', 
                fontWeight: 'bold', 
                py: 1.5,
                borderRadius: '14px',
                '&:hover': { bgcolor: '#c3a030' },
                '&.Mui-disabled': { bgcolor: alpha('#D4AF37', 0.3), color: alpha('#000', 0.5) }
              }}
            >
              {isCreatingStake ? 'Processing Stake...' : `Confirm Staking (${customStakeAmount || 0} usGOLD)`}
            </Button>
          </Card>
        </Grid>

        {/* Right: Active Stakes & Yield Positions */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ bgcolor: '#121214', border: `1px solid ${alpha('#fff', 0.05)}`, borderRadius: '24px', height: '100%', p: 3, display: 'flex', flexDirection: 'column' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Activity size={20} color="#D4AF37" />
                <Typography variant="h6" fontWeight="bold" color="#fff">Your Active Staking Vaults</Typography>
              </Stack>
              <Chip label={`${activeStakes.length} Active`} color="primary" size="small" />
            </Stack>

            {activeStakes.length === 0 ? (
              <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 4, textAlign: 'center' }}>
                <Box sx={{ width: 64, height: 64, bgcolor: alpha('#D4AF37', 0.1), borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                  <Clock size={32} color="#D4AF37" />
                </Box>
                <Typography variant="subtitle1" fontWeight="bold" color="#fff" gutterBottom>No Active Staking Positions</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300, mb: 3 }}>
                  Stake your usGOLD stablecoin to earn guaranteed monthly yields backed by Solana liquidity.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2} sx={{ flex: 1, overflowY: 'auto', maxHeight: 450 }}>
                {activeStakes.map((stake) => {
                  const now = nowTime;
                  const totalDuration = stake.endTime - stake.startTime;
                  const elapsed = Math.max(0, Math.min(now - stake.startTime, totalDuration));
                  const progress = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 100;
                  const accruedProfit = (stake.totalExpectedProfit * progress) / 100;
                  const isCompleted = now >= stake.endTime;

                  return (
                    <Box 
                      key={stake.key} 
                      sx={{ 
                        p: 2.5, 
                        borderRadius: '16px', 
                        bgcolor: alpha('#fff', 0.02), 
                        border: `1px solid ${alpha('#D4AF37', 0.2)}`,
                        position: 'relative'
                      }}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography fontWeight="bold" color="#fff">{stake.amount} usGOLD Locked</Typography>
                        <Chip 
                          size="small" 
                          label={`${stake.durationMonths}M Vault (${(stake.profitRate * 100).toFixed(0)}%)`} 
                          sx={{ bgcolor: alpha('#D4AF37', 0.15), color: '#D4AF37', fontWeight: 'bold' }} 
                        />
                      </Stack>
                      <Box sx={{ my: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, fontSize: '0.75rem' }}>
                          <span style={{ color: '#888' }}>Accrued Profit: <strong style={{ color: '#26a69a' }}>+${accruedProfit.toFixed(2)}</strong></span>
                          <span style={{ color: '#888' }}>{progress.toFixed(0)}% Completed</span>
                        </Box>
                        <LinearProgress 
                          variant="determinate" 
                          value={progress} 
                          sx={{ 
                            height: 6, 
                            borderRadius: 3, 
                            bgcolor: alpha('#fff', 0.1),
                            '& .MuiLinearProgress-bar': { bgcolor: '#26a69a' }
                          }} 
                        />
                      </Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2}>
                        <Typography variant="caption" color="text.secondary">
                          {isCompleted ? 'Vault Term Completed!' : `Unlocks: ${new Date(stake.endTime).toLocaleDateString()}`}
                        </Typography>
                        {stake.status === 'active' && (
                          <Button
                            size="small"
                            variant="contained"
                            disabled={!isCompleted}
                            onClick={() => handleClaimStakeProfit(stake.key, accruedProfit + stake.amount)}
                            sx={{
                              bgcolor: isCompleted ? '#26a69a' : alpha('#fff', 0.1),
                              color: isCompleted ? '#fff' : alpha('#fff', 0.4),
                              fontWeight: 'bold',
                              borderRadius: '8px'
                            }}
                          >
                            {isCompleted ? 'Claim Principal + Profit' : 'Lock Active'}
                          </Button>
                        )}
                        {stake.status === 'claimed' && (
                          <Chip label="Claimed" size="small" color="success" />
                        )}
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Stack, Card, CardContent, alpha, useTheme, Button, 
  Divider, Grid, Chip, TextField, InputAdornment, Avatar, Slider, LinearProgress
} from '@mui/material';
import { Coins, ShieldCheck, Activity, Flame } from 'lucide-react';
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
}

export function StakingPage({
  language,
  usGoldBalance,
  effectiveAddress,
  setActiveTab
}: StakingPageProps) {
  useTheme();

  // Custom Staking & Flexible Vault State
  const [customStakeAmount, setCustomStakeAmount] = useState<string>('100');
  const [stakingDurationMonths, setStakingDurationMonths] = useState<1 | 3 | 6 | 12>(3);
  const [isCreatingStake, setIsCreatingStake] = useState(false);

  // Active Stakes from Firebase
  const [activeStakes, setActiveStakes] = useState<any[]>([]);

  // Real-time ticking timestamp state for second-by-second countdown & profit accrual
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
      alert(t('enterValidAmount', language) || "Please enter a valid usGOLD amount to stake.");
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

  return (
    <Box sx={{ animation: 'fadeIn 0.4s ease-out', pb: 12 }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Chip 
          icon={<Flame size={14} color="#D4AF37" />} 
          label={t('stakingVault', language) || "USGOLD STAKING VAULT"} 
          size="small" 
          sx={{ bgcolor: alpha('#D4AF37', 0.15), color: '#FFDF73', fontWeight: '800', mb: 1.5, letterSpacing: 2 }} 
        />
        <Typography variant="h3" fontWeight="900" sx={{ 
          fontFamily: '"Cinzel", serif', 
          background: 'linear-gradient(to bottom, #FFDF73, #D4AF37, #AA7C11)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent',
          filter: `drop-shadow(0 4px 20px ${alpha('#D4AF37', 0.4)})`
        }}>
          {t('stakeUsGoldReserve', language) || "Stake usGOLD Reserve"}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: 560, mx: 'auto' }}>
          {t('stakeDescriptionFull', language) || "Earn guaranteed 2% monthly fixed returns on locked usGOLD reserves with live second-by-second yield updates."}
        </Typography>
      </Box>

      {/* Main Staking Section */}
      <Card sx={{ 
        background: `linear-gradient(145deg, #1A1A1A 0%, #0D0D0D 100%)`,
        border: `1px solid ${alpha('#D4AF37', 0.35)}`,
        boxShadow: `0 12px 40px ${alpha('#D4AF37', 0.15)}`,
        borderRadius: '28px',
        position: 'relative',
        overflow: 'hidden',
        mb: 4
      }}>
        <Box sx={{ position: 'absolute', top: -50, left: -50, width: 200, height: 200, background: `radial-gradient(circle, ${alpha('#D4AF37', 0.15)} 0%, transparent 60%)` }} />
        
        <CardContent sx={{ p: { xs: 3, md: 5 }, position: 'relative', zIndex: 1 }}>
          
          <Box textAlign="center" mb={4}>
            <Typography variant="overline" color="text.secondary" fontWeight="700" letterSpacing={3}>
              {t('royalStakingYield', language) || "ROYAL STAKING YIELD"}
            </Typography>
            <Typography variant="h4" fontWeight="900" color="#FFDF73" sx={{ mt: 0.5, fontFamily: '"Cinzel", serif' }}>
              2% {t('monthlyFixedReturn', language) || "Monthly Fixed Return"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: '85%', mx: 'auto' }}>
              {t('stakingSubtitle', language) || "Lock your usGOLD in 1, 3, 6, or 12-month vaults. Profits compound in real-time."}
            </Typography>
          </Box>

          {/* Staking Setup Box */}
          <Box sx={{ bgcolor: alpha('#000', 0.5), p: { xs: 2.5, md: 4 }, borderRadius: '24px', border: `1px solid ${alpha('#D4AF37', 0.2)}` }}>
            <Stack spacing={3}>
              {/* Amount Input */}
              <Box>
                <Typography variant="subtitle2" color="#D4AF37" fontWeight="800" mb={1}>
                  1. {t('enterStakingAmount', language) || "ENTER STAKING AMOUNT (usGOLD)"}
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
                    <Typography variant="caption" color="text.secondary">{t('selectAmountSlider', language) || "Select Staking Amount via Slider"}</Typography>
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
                  2. {t('selectDuration', language) || "SELECT STAKING DURATION & GUARANTEED PROFIT"}
                </Typography>
                <Grid container spacing={2}>
                  {[
                    { months: 1, rate: 0.02, label: `1 ${t('month', language) || 'Month'}`, profit: "2% Profit" },
                    { months: 3, rate: 0.06, label: `3 ${t('months', language) || 'Months'}`, profit: "6% Profit" },
                    { months: 6, rate: 0.12, label: `6 ${t('months', language) || 'Months'}`, profit: "12% Profit" },
                    { months: 12, rate: 0.24, label: `12 ${t('months', language) || 'Months'}`, profit: "24% Profit" },
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
                            {t('returnLabel', language) || 'Return'}: +${estProfit.toFixed(2)}
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
                    <Typography variant="caption" color="text.secondary">{t('stakedAmount', language) || "Staked Amount"}:</Typography>
                    <Typography variant="h5" fontWeight="bold" color="#fff">
                      {parseFloat(customStakeAmount) || 0} usGOLD
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="text.secondary">{t('guaranteedReturn', language) || "Guaranteed Return"} ({stakingDurationMonths * 2}%):</Typography>
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
                {isCreatingStake ? (t('lockingStake', language) || 'Locking Stake...') : `${t('stakeButton', language) || 'Stake'} ${parseFloat(customStakeAmount) || 0} usGOLD (${stakingDurationMonths} Mo • ${stakingDurationMonths * 2}% Profit)`}
              </Button>
            </Stack>
          </Box>

          {/* Active Locked Stakes & Real-Time Countdown List */}
          <Box sx={{ mt: 5 }}>
            <Typography variant="h5" fontWeight="900" color="#fff" mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Activity color="#D4AF37" size={24} />
              {t('activeStakingVaults', language) || "Active Staking Vaults"} ({activeStakes.filter(s => s.status !== 'claimed').length})
            </Typography>

            {activeStakes.filter(s => s.status !== 'claimed').length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center', bgcolor: alpha('#ffffff', 0.02), borderRadius: '20px', border: `1px dashed ${alpha('#ffffff', 0.1)}` }}>
                <Coins size={40} color="#D4AF37" style={{ opacity: 0.5, marginBottom: 8 }} />
                <Typography variant="body1" color="text.secondary">
                  {t('noActiveStakes', language) || "No active usGOLD stakes currently locked. Create your first stake above!"}
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
                                {st.durationMonths}-{t('monthVault', language) || 'Month Vault'} ({st.durationMonths * 2}% Return)
                              </Typography>
                            </Box>
                          </Stack>
                        </Grid>

                        <Grid item xs={12} sm={6} md={4}>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {t('liveProfitTicker', language) || "Live Profit Countdown Ticker (+2%/mo)"}:
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
                            {t('vaultUnlockCountdown', language) || "Vault Unlock Countdown"}:
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
                          {t('liveCompoundingActive', language) || "Live per-second compounding active"}
                        </Typography>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          onClick={() => handleClaimStakeProfit(st.key, currentAccruedProfit)}
                          sx={{ fontWeight: 'bold', borderRadius: '10px' }}
                        >
                          {t('claimReward', language) || "Claim Rewards"}
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
    </Box>
  );
}

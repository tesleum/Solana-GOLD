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
  const [futuresBalance, setFuturesBalance] = useState<number>(1000);
  const [inPositionMargin, setInPositionMargin] = useState<number>(0);
  
  // Top Up Modal State
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<string>('500');
  const [isProcessingTopUp, setIsProcessingTopUp] = useState(false);

  // Tab state inside Wallet
  const [walletTab, setWalletTab] = useState<'overview' | 'futures' | 'staking'>('overview');

  // Copy address handler
  const handleCopyAddress = () => {
    if (effectiveAddress) {
      navigator.clipboard.writeText(effectiveAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Sync Futures Wallet balance from Firebase for effectiveAddress
  useEffect(() => {
    if (effectiveAddress) {
      const userRef = ref(database, `users/${effectiveAddress}`);
      const unsub = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          if (val.futuresBalance !== undefined) {
            setFuturesBalance(parseFloat(val.futuresBalance) || 0);
          } else {
            // Default 1000 USDT futures wallet balance if first time
            update(userRef, { futuresBalance: 1000 });
            setFuturesBalance(1000);
          }
        } else {
          setFuturesBalance(1000);
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
                    <strong>Zero Deposit Fees:</strong> Top up instantly to lock margin for KuCoin perpetual futures, real-time live tickers, and high-frequency orderbook trading.
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}

          {/* TAB 2: usGOLD STAKING & MINTING VAULT (Moved into Wallet Page) */}
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
                  <Chip label={`${apyYield}% APY Staking Yield`} size="small" sx={{ bgcolor: alpha('#D4AF37', 0.15), color: '#FFDF73', fontWeight: '800', mb: 1 }} />
                  <Typography variant="h3" fontWeight="900" sx={{ fontFamily: '"Cinzel", serif', background: 'linear-gradient(45deg, #FFDF73, #D4AF37, #996515)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    Mint & Stake usGOLD
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, maxWidth: '80%', mx: 'auto' }}>
                    Lock SOL collateral to mint physical-backed usGOLD digital reserves and earn continuous daily staking rewards.
                  </Typography>
                </Box>

                {/* Interactive Gold Bar Display */}
                <Box sx={{ 
                  position: 'relative', 
                  width: '100%', 
                  height: 200, 
                  perspective: 1000,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  mt: 1,
                  mb: 5
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
                    <Typography variant="h4" fontWeight="900" sx={{ color: 'rgba(120, 80, 20, 0.7)', fontFamily: '"Cinzel", serif' }}>
                      {investAmount} oz
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(120, 80, 20, 0.6)', fontWeight: 'bold', letterSpacing: 2 }}>
                      ROYAL RESERVE
                    </Typography>
                  </Box>
                </Box>

                {/* Investment Controls */}
                <Box sx={{ bgcolor: alpha('#000', 0.4), p: 3, borderRadius: '24px', border: `1px solid ${alpha('#ffffff', 0.05)}` }}>
                  <Stack spacing={3}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="subtitle2" color="text.secondary">Minting Investment Amount:</Typography>
                      <Typography variant="h4" color="#fff" fontWeight="900">
                        ${investAmount} <span style={{ fontSize: '1rem', color: '#D4AF37' }}>USDT / GOLD</span>
                      </Typography>
                    </Box>

                    {/* Quick Select Preset Buttons */}
                    <Stack direction="row" spacing={1.5} justifyContent="center">
                      {[10, 25, 50, 100].map((preset) => (
                        <Button
                          key={preset}
                          size="small"
                          variant={investAmount === preset ? "contained" : "outlined"}
                          onClick={() => setInvestAmount(preset)}
                          sx={{
                            bgcolor: investAmount === preset ? '#D4AF37' : 'transparent',
                            color: investAmount === preset ? '#000' : '#D4AF37',
                            borderColor: alpha('#D4AF37', 0.4),
                            fontWeight: 'bold',
                            borderRadius: '10px'
                          }}
                        >
                          ${preset}
                        </Button>
                      ))}
                    </Stack>

                    <Slider
                      value={investAmount}
                      min={10}
                      max={100}
                      step={1}
                      onChange={(_, v) => setInvestAmount(v as number)}
                      sx={{
                        color: '#D4AF37',
                        '& .MuiSlider-thumb': {
                          boxShadow: '0 0 10px rgba(212,175,55,0.8)'
                        }
                      }}
                    />

                    <Divider sx={{ borderColor: alpha('#fff', 0.05) }} />

                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Required SOL Collateral:</Typography>
                        <Typography variant="body1" fontWeight="bold" color="#fff">
                          ~{(investAmount / solPrice).toFixed(4)} SOL
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="caption" color="text.secondary">Est. Annual Return ({apyYield}% APY):</Typography>
                        <Typography variant="body1" fontWeight="bold" color="#26a69a">
                          +${(investAmount * (parseFloat(apyYield) / 100)).toFixed(2)} / yr
                        </Typography>
                      </Grid>
                    </Grid>

                    <Button
                      variant="contained"
                      fullWidth
                      disabled={isInvesting}
                      onClick={handleInvest}
                      sx={{
                        bgcolor: '#D4AF37',
                        color: '#000',
                        fontWeight: '900',
                        fontSize: '1.1rem',
                        py: 1.8,
                        borderRadius: '16px',
                        '&:hover': { bgcolor: '#FFDF73' },
                        boxShadow: '0 8px 30px rgba(212,175,55,0.4)'
                      }}
                    >
                      {isInvesting ? 'Minting in Progress...' : `Mint & Stake ${investAmount} usGOLD`}
                    </Button>

                    {/* Claim Rewards Section */}
                    {userEarnings > 0 && (
                      <Box sx={{ mt: 2, p: 2, bgcolor: alpha('#4caf50', 0.1), borderRadius: '16px', border: `1px solid ${alpha('#4caf50', 0.3)}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="caption" color="text.secondary">Unclaimed Staking Commissions:</Typography>
                          <Typography variant="h6" fontWeight="bold" color="#4caf50">
                            ${userEarnings.toFixed(2)} USD
                          </Typography>
                        </Box>
                        <Button
                          variant="contained"
                          color="success"
                          disabled={isClaiming}
                          onClick={handleClaimCommissions}
                          sx={{ fontWeight: 'bold', borderRadius: '10px' }}
                        >
                          {isClaiming ? 'Claiming...' : 'Claim Rewards'}
                        </Button>
                      </Box>
                    )}
                  </Stack>
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

                {/* usGOLD Digital Reserve */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5, borderRadius: '16px', bgcolor: alpha('#fff', 0.02), '&:hover': { bgcolor: alpha('#fff', 0.05) } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 42, height: 42, bgcolor: alpha('#D4AF37', 0.15), borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Coins color="#D4AF37" size={22} />
                    </Box>
                    <Box>
                      <Typography fontWeight="bold" color="#fff">usGOLD (Digital Gold)</Typography>
                      <Typography variant="caption" color="text.secondary">Staked Physical Reserve</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography fontWeight="bold" color="#D4AF37">{usGoldBalance.toFixed(2)} GOLD</Typography>
                    <Typography variant="caption" color="text.secondary">~${usGoldUsdValue.toFixed(2)}</Typography>
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

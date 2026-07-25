import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Stack, Card, CardContent, alpha, useTheme, Button, 
  Grid, TextField, InputAdornment, Chip, Avatar
} from '@mui/material';
import { 
  Wallet, Coins, Zap, Activity, CheckCircle2, DollarSign
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
  
  const [futuresBalance, setFuturesBalance] = useState<number>(0);

  // Purchase/Mint Asset states
  const [purchaseAsset, setPurchaseAsset] = useState<'usGOLD' | 'USDT'>('usGOLD');
  const [customPurchaseAmount, setCustomPurchaseAmount] = useState<number>(50);
  const [isProcessingUsdtBuy, setIsProcessingUsdtBuy] = useState(false);

  // Sync Futures Wallet balance from Firebase
  useEffect(() => {
    if (effectiveAddress) {
      const userRef = ref(database, `users/${effectiveAddress}`);
      const unsub = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setFuturesBalance(data.futuresBalance || 0);
        }
      });
      return () => unsub();
    }
  }, [effectiveAddress]);

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

  const solPrice = solanaPrice || 150;
  const solNeeded = parseFloat((customPurchaseAmount / solPrice).toFixed(4));

  if (!effectiveAddress) {
    return (
      <Box sx={{ py: 8, px: 2, textAlign: 'center' }}>
        <Card sx={{ 
          maxWidth: 400, mx: 'auto', p: 4, 
          bgcolor: '#121316', borderRadius: '24px',
          border: `1px solid ${alpha('#D4AF37', 0.25)}` 
        }}>
          <Wallet size={48} color="#D4AF37" style={{ marginBottom: 16 }} />
          <Typography variant="h5" color="#D4AF37" fontWeight="900" gutterBottom>
            Wallet & Top Up Portal
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={4}>
            Connect your Solana wallet to access your app assets, purchase usGOLD for staking, and top up USDT margin for futures trading.
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
    <Box>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" fontWeight="900" sx={{ 
          background: 'linear-gradient(to bottom, #FFDF73 10%, #D4AF37 50%, #AA7C11 100%)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent',
          mb: 1
        }}>
          Wallet & Assets
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage your app balances and top up for Staking or Futures.
        </Typography>
      </Box>

      {/* OVERVIEW BALANCES */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#121316', border: `1px solid ${alpha('#D4AF37', 0.25)}`, borderRadius: '20px' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TokenIcon symbol="usGOLD" size={48} />
              <Box>
                <Typography variant="caption" color="text.secondary">Staking Balance</Typography>
                <Typography variant="h5" fontWeight="900" color="#fff" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  {usGoldBalance.toFixed(2)} usGOLD
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ bgcolor: '#121316', border: `1px solid ${alpha('#26a69a', 0.25)}`, borderRadius: '20px' }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TokenIcon symbol="USDT" size={48} />
              <Box>
                <Typography variant="caption" color="text.secondary">Futures Margin</Typography>
                <Typography variant="h5" fontWeight="900" color="#fff" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  {futuresBalance.toFixed(2)} USDT
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* TOP UP SECTION */}
      <Card sx={{ bgcolor: '#121316', border: `1px solid ${alpha('#fff', 0.05)}`, borderRadius: '24px' }}>
        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          <Typography variant="h6" fontWeight="800" color="#fff" mb={3}>
            Top Up Assets with SOL
          </Typography>

          <Stack direction="row" spacing={2} mb={4}>
            <Button
              fullWidth
              variant={purchaseAsset === 'usGOLD' ? 'contained' : 'outlined'}
              onClick={() => { triggerHaptic(); setPurchaseAsset('usGOLD'); }}
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
              onClick={() => { triggerHaptic(); setPurchaseAsset('USDT'); }}
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
                ? 'Buy usGOLD tokens using Solana. These tokens can be staked in the Staking Vaults.' 
                : 'Deposit USDT margin using Solana. This margin is used for Futures leverage trading.'}
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

            <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
              {[50, 100, 250, 500].map((preset) => (
                <Chip 
                  key={preset}
                  label={`$${preset}`}
                  onClick={() => { triggerHaptic(); setCustomPurchaseAmount(preset); }}
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
                <Typography variant="caption" color="text.secondary" display="block">Estimated Cost</Typography>
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <Typography variant="h6" color="#fff" fontWeight="900">
                    ~{solNeeded} SOL
                  </Typography>
                  <TokenIcon symbol="SOL" size={16} />
                </Stack>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="caption" color="text.secondary" display="block">You Will Receive</Typography>
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
              onClick={() => { triggerHaptic(30); handleExecutePurchase(); }}
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
                ? 'PROCESSING...' 
                : (connected ? `PAY WITH SOLANA WALLET` : `CONNECT WALLET TO PAY`)}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

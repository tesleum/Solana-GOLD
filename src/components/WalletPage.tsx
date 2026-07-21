import React from 'react';
import { Box, Typography, Stack, Card, CardContent, alpha, useTheme, Button } from '@mui/material';
import { Wallet, ArrowUpRight, ArrowDownRight, CreditCard, Coins } from 'lucide-react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export function WalletPage({ language, userTotalInvested }: { language: string, userTotalInvested: number }) {
  const theme = useTheme();
  const { publicKey } = useWallet();

  return (
    <Box sx={{ animation: 'fadeIn 0.4s ease-out', pb: 8 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" fontWeight="900" sx={{ 
          fontFamily: '"Cinzel", serif', 
          background: 'linear-gradient(to bottom, #FFDF73, #D4AF37)', 
          WebkitBackgroundClip: 'text', 
          WebkitTextFillColor: 'transparent',
          textShadow: `0 4px 20px ${alpha('#D4AF37', 0.4)}`
        }}>
          My Wallet
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
          Manage your assets and connect to decentralized finance
        </Typography>
      </Box>

      {!publicKey ? (
        <Card sx={{ 
          bgcolor: alpha('#121214', 0.8),
          borderRadius: '24px',
          border: `1px solid ${alpha('#D4AF37', 0.3)}`,
          p: 4,
          textAlign: 'center'
        }}>
          <Wallet size={48} color="#D4AF37" style={{ margin: '0 auto 16px' }} />
          <Typography variant="h6" fontWeight="bold" color="#fff" mb={2}>
            Connect your Wallet
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Connect your Solana wallet to view your balances, manage assets, and interact with the Golden Empire.
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <WalletMultiButton style={{ 
              backgroundColor: '#D4AF37', 
              color: '#000', 
              fontWeight: 'bold', 
              borderRadius: '12px' 
            }} />
          </Box>
        </Card>
      ) : (
        <Stack spacing={3}>
          {/* Main Balance Card */}
          <Card sx={{ 
            background: `linear-gradient(135deg, ${alpha('#1a1b1f', 1)} 0%, ${alpha('#2a2b2f', 0.8)} 100%)`,
            borderRadius: '24px',
            border: `1px solid ${alpha('#D4AF37', 0.4)}`,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <Box sx={{ position: 'absolute', top: 0, right: 0, opacity: 0.1, transform: 'scale(1.5) translate(10%, -10%)' }}>
              <Wallet size={120} color="#D4AF37" />
            </Box>
            <CardContent sx={{ p: '32px !important', position: 'relative', zIndex: 1 }}>
              <Typography variant="overline" sx={{ color: alpha('#D4AF37', 0.8), fontWeight: 800, letterSpacing: 2 }}>
                Estimated Balance
              </Typography>
              <Typography variant="h2" fontWeight="900" sx={{ color: '#fff', mt: 1, mb: 1, fontFamily: '"Cinzel", serif' }}>
                $0.00
              </Typography>
              <Typography variant="body2" sx={{ color: alpha('#fff', 0.5) }}>
                Address: {publicKey.toBase58().substring(0, 6)}...{publicKey.toBase58().substring(publicKey.toBase58().length - 4)}
              </Typography>

              <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
                <Button 
                  variant="contained" 
                  fullWidth
                  sx={{ 
                    bgcolor: '#D4AF37', 
                    color: '#000',
                    fontWeight: 800,
                    borderRadius: '12px',
                    py: 1.5,
                    '&:hover': { bgcolor: '#FFDF73' }
                  }}
                  startIcon={<ArrowDownRight />}
                >
                  Deposit
                </Button>
                <Button 
                  variant="outlined" 
                  fullWidth
                  sx={{ 
                    borderColor: alpha('#D4AF37', 0.5), 
                    color: '#D4AF37',
                    fontWeight: 800,
                    borderRadius: '12px',
                    py: 1.5,
                    '&:hover': { borderColor: '#D4AF37', bgcolor: alpha('#D4AF37', 0.1) }
                  }}
                  startIcon={<ArrowUpRight />}
                >
                  Withdraw
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* Assets */}
          <Typography variant="h6" fontWeight="bold" sx={{ color: '#fff', mt: 2 }}>
            Your Assets
          </Typography>
          <Card sx={{ 
            bgcolor: alpha('#121214', 0.8),
            borderRadius: '20px',
            border: `1px solid ${alpha('#D4AF37', 0.2)}`,
          }}>
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderRadius: '12px', '&:hover': { bgcolor: alpha('#fff', 0.05) } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ w: 40, h: 40, bgcolor: alpha('#D4AF37', 0.1), borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 1 }}>
                      <Coins color="#D4AF37" />
                    </Box>
                    <Box>
                      <Typography fontWeight="bold" color="#fff">usGOLD</Typography>
                      <Typography variant="caption" color="text.secondary">Digital Gold</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography fontWeight="bold" color="#fff">{userTotalInvested.toFixed(2)}</Typography>
                    <Typography variant="caption" color="text.secondary">~${(userTotalInvested * 80).toFixed(2)}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, borderRadius: '12px', '&:hover': { bgcolor: alpha('#fff', 0.05) } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ w: 40, h: 40, bgcolor: alpha('#9945FF', 0.1), borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 1 }}>
                      <img src="https://cryptologos.cc/logos/solana-sol-logo.png" alt="SOL" width={24} height={24} />
                    </Box>
                    <Box>
                      <Typography fontWeight="bold" color="#fff">SOL</Typography>
                      <Typography variant="caption" color="text.secondary">Solana</Typography>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography fontWeight="bold" color="#fff">0.00</Typography>
                    <Typography variant="caption" color="text.secondary">~$0.00</Typography>
                  </Box>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Stack>
      )}
    </Box>
  );
}

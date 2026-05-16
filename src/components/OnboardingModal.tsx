import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Stepper, Step, StepLabel, Alert } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { Network, ArrowRightLeft, Smartphone } from 'lucide-react';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebase';

const steps = ['Connect Wallet', 'Understand MLM', 'Start Investing', 'Install App'];

interface OnboardingModalProps {
  openExternal?: boolean;
  onCloseExternal?: () => void;
}

export function OnboardingModal({ openExternal, onCloseExternal }: OnboardingModalProps) {
  const [open, setOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [apyYield, setApyYield] = useState('8');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  
  const { publicKey, wallets, select, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const { open: openAppKit } = useAppKit();
  const { address: appKitAddress, isConnected: isAppKitConnected } = useAppKitAccount();

  const isActuallyConnected = connected || isAppKitConnected;

  useEffect(() => {
    // Check if device is iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));

    // Check if already in standalone mode
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const handleConnect = async () => {
    if (isActuallyConnected) return;
    
    const isSafePal = !!(window as any).safepal || !!(window as any).safepal_solana;
    const isTrust = !!(window as any).trustWallet || !!(window as any).trustwallet;

    if (isSafePal) {
      const wp = wallets.find(w => w.adapter.name.toLowerCase().includes('safepal'));
      if (wp) { select(wp.adapter.name as any); return; }
    }
    if (isTrust) {
      const wp = wallets.find(w => w.adapter.name.toLowerCase().includes('trust'));
      if (wp) { select(wp.adapter.name as any); return; }
    }

    try {
      await openAppKit();
    } catch (e) {
      console.error('AppKit open failed:', e);
      setVisible(true);
    }
  };

  useEffect(() => {
    if (openExternal) {
      setOpen(true);
      setActiveStep(0);
    }
  }, [openExternal]);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding && !openExternal) {
      setOpen(true);
    }

    const settingsRef = ref(database, 'mlmSettings/general');
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.apyYield) {
        setApyYield(data.apyYield);
      }
    });

    return () => unsubscribe();
  }, [openExternal]);

  useEffect(() => {
    if ((publicKey || appKitAddress) && activeStep === 0) {
      setActiveStep(1);
    }
  }, [publicKey, appKitAddress, activeStep]);

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      handleClose();
    } else {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleClose = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setOpen(false);
    if (onCloseExternal) onCloseExternal();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      disableEnforceFocus // Allows wallet modal to take focus
      sx={{ zIndex: 1200 }} 
    >
      <DialogTitle>Welcome to Solana Gold</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4, mt: 2 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        <Box sx={{ minHeight: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          {activeStep === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>Connect Your Solana Wallet</Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                To get started, please connect your Solana wallet. You'll need it to buy $usGOLD and receive commissions.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center' }}>
                {!isActuallyConnected ? (
                  <Button 
                    variant="contained" 
                    onClick={handleConnect}
                    sx={{ 
                      borderRadius: '16px',
                      textTransform: 'uppercase',
                      fontFamily: '"Montserrat", sans-serif',
                      fontWeight: 900,
                      height: 46,
                      px: 4,
                      bgcolor: '#D4AF37',
                      color: '#000',
                      fontSize: '0.9rem',
                      letterSpacing: '0.05em',
                      boxShadow: `0 4px 20px ${alpha('#D4AF37', 0.4)}`,
                      border: '1px solid rgba(255,255,255,0.2)',
                      '&:hover': {
                        bgcolor: '#F3E5AB',
                        transform: 'scale(1.02)',
                        boxShadow: `0 6px 25px ${alpha('#D4AF37', 0.6)}`,
                      },
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    CONNECT WALLET
                  </Button>
                ) : (
                  <Typography color="success.main" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main' }} />
                    WALLET CONNECTED!
                  </Typography>
                )}
              </Box>
            </Box>
          )}

          {activeStep === 1 && (
            <Box>
              <Network size={48} opacity={0.5} style={{ marginBottom: 16 }} />
              <Typography variant="h6" gutterBottom>The Unilevel MLM Structure</Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Invite others using your referral link. When they invest, you earn a percentage of their investment as commission. 
                Our unilevel structure rewards you across multiple levels of your downline!
              </Typography>
            </Box>
          )}

          {activeStep === 2 && (
            <Box>
              <ArrowRightLeft size={48} opacity={0.5} style={{ marginBottom: 16 }} />
              <Typography variant="h6" gutterBottom>Invest in $usGOLD</Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Buy $usGOLD at a discounted price! There's a 20% discount on market price with a 6-month lockup, plus a {apyYield}% APY yield.
              </Typography>
            </Box>
          )}

          {activeStep === 3 && (
            <Box>
              <Smartphone size={48} opacity={0.5} style={{ marginBottom: 16 }} />
              <Typography variant="h6" gutterBottom>Install for the Best Experience</Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Add usGOLD directly to your home screen. Enjoy faster load times, full-screen mode, and quick access to your investments.
              </Typography>
              
              {isStandalone ? (
                <Alert severity="success" sx={{ mt: 2, textAlign: 'left', borderRadius: 2 }}>
                  App is already installed and running in standalone mode!
                </Alert>
              ) : isIOS ? (
                <Box sx={{ mt: 2, p: 2, bgcolor: alpha('#fff', 0.05), borderRadius: 2, textAlign: 'left' }}>
                  <Typography variant="body2" fontWeight="bold" gutterBottom>iOS Installation:</Typography>
                  <Typography variant="caption" display="block">1. Tap the Share button at the bottom of Safari.</Typography>
                  <Typography variant="caption" display="block">2. Scroll down and tap "Add to Home Screen".</Typography>
                  <Typography variant="caption" display="block">3. Tap "Add" in the top right corner.</Typography>
                </Box>
              ) : deferredPrompt ? (
                <Button 
                   variant="contained" 
                   onClick={handleInstallClick}
                   sx={{ mt: 2, height: 46, borderRadius: '12px', fontWeight: 'bold' }}
                >
                  Install App Now
                </Button>
              ) : (
                <Alert severity="info" sx={{ mt: 2, textAlign: 'left', borderRadius: 2 }}>
                  To install, use your browser's menu and select "Add to Home screen".
                </Alert>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        {activeStep > 0 && (
          <Button onClick={handleBack}>Back</Button>
        )}
        <Button 
          variant="contained" 
          onClick={handleNext}
          disabled={
            (activeStep === 0 && !isActuallyConnected)
          }
        >
          {activeStep === steps.length - 1 ? 'Get Started' : 'Next'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

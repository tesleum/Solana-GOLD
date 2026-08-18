import React, { useState, useEffect } from 'react';
import { Dialog, Box, Typography, LinearProgress, Stack, Paper } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { Pickaxe, ShieldCheck, Sparkles, Clock } from 'lucide-react';
import Lottie from 'lottie-react';

interface MiningGoldLoadingModalProps {
  open: boolean;
  amountUsd?: number;
  durationMonths?: number;
}

// Gold Mining Lottie JSON structure for rich visual animation
const goldMiningLottieJson = {
  v: "5.7.1",
  fr: 30,
  ip: 0,
  op: 60,
  w: 120,
  h: 120,
  nm: "Gold Mining",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "Gold Sparkle",
      sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [30] }, { t: 30, s: [100] }, { t: 60, s: [30] }] },
        r: { a: 1, k: [{ t: 0, s: [0] }, { t: 60, s: [360] }] },
        p: { a: 0, k: [60, 60, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [{ t: 0, s: [90, 90] }, { t: 30, s: [110, 110] }, { t: 60, s: [90, 90] }] }
      },
      shapes: [
        {
          ty: "gr",
          it: [
            {
              ty: "sr",
              sy: 1,
              p: { a: 0, k: [0, 0] },
              r: { a: 0, k: [0] },
              pt: { a: 0, k: 5 },
              ir: { a: 0, k: 18 },
              is: { a: 0, k: 0 },
              or: { a: 0, k: 40 },
              os: { a: 0, k: 0 },
              ix: 1,
              nm: "Star Path"
            },
            {
              ty: "fl",
              c: { a: 0, k: [1, 0.84, 0] },
              o: { a: 0, k: 100 },
              r: 1,
              bm: 0,
              nm: "Gold Fill"
            }
          ]
        }
      ]
    }
  ]
};

export const MiningGoldLoadingModal: React.FC<MiningGoldLoadingModalProps> = ({
  open,
  amountUsd = 0,
  durationMonths = 12
}) => {
  const [seconds, setSeconds] = useState(0);
  const [step, setStep] = useState(1);

  useEffect(() => {
    let interval: any = null;
    if (open) {
      setSeconds(0);
      setStep(1);
      interval = setInterval(() => {
        setSeconds(prev => {
          const nextSec = prev + 1;
          if (nextSec >= 3 && nextSec < 7) {
            setStep(2);
          } else if (nextSec >= 7) {
            setStep(3);
          }
          return nextSec;
        });
      }, 1000);
    } else {
      setSeconds(0);
      setStep(1);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [open]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog
      open={open}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: '28px',
          background: 'linear-gradient(145deg, #12100B 0%, #1A160E 100%)',
          border: `1px solid ${alpha('#D4AF37', 0.35)}`,
          boxShadow: `0 20px 60px ${alpha('#000', 0.85)}, 0 0 40px ${alpha('#D4AF37', 0.15)}`,
          color: '#fff',
          p: 3,
          textAlign: 'center',
          overflow: 'hidden',
          position: 'relative'
        }
      }}
    >
      {/* Background Gold Particle Glow */}
      <Box
        sx={{
          position: 'absolute',
          top: -60,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 220,
          height: 220,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${alpha('#D4AF37', 0.25)} 0%, transparent 70%)`,
          filter: 'blur(30px)',
          pointerEvents: 'none'
        }}
      />

      <Box sx={{ position: 'relative', zIndex: 2 }}>
        {/* Lottie / Mining Animation Display */}
        <Box
          sx={{
            width: 110,
            height: 110,
            mx: 'auto',
            mb: 2,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Lottie
            animationData={goldMiningLottieJson}
            loop={true}
            style={{ width: 110, height: 110 }}
          />

          {/* Animated Pickaxe Overlay */}
          <Box
            sx={{
              position: 'absolute',
              color: '#FFDF73',
              animation: 'minePickaxe 1.2s ease-in-out infinite alternate',
              '@keyframes minePickaxe': {
                '0%': { transform: 'rotate(-25deg) scale(0.9)' },
                '100%': { transform: 'rotate(20deg) scale(1.15)' }
              }
            }}
          >
            <Pickaxe size={44} />
          </Box>
        </Box>

        {/* Title */}
        <Typography
          variant="h6"
          fontWeight="900"
          sx={{
            background: 'linear-gradient(90deg, #FFDF73 0%, #D4AF37 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: 0.5,
            mb: 0.5
          }}
        >
          MINING GOLD VAULT...
        </Typography>

        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '13px', mb: 2.5 }}>
          Deploying {amountUsd > 0 ? `$${amountUsd.toFixed(2)} USD` : ''} into {durationMonths}-Month Vault Position
        </Typography>

        {/* Timer Display Badge */}
        <Paper
          elevation={0}
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 0.75,
            borderRadius: '50px',
            bgcolor: alpha('#D4AF37', 0.1),
            border: `1px solid ${alpha('#D4AF37', 0.3)}`,
            mb: 3
          }}
        >
          <Clock size={16} color="#FFDF73" style={{ animation: 'spin 4s linear infinite' }} />
          <Typography variant="body2" fontWeight="900" color="#FFDF73" sx={{ fontFamily: 'monospace', letterSpacing: 1 }}>
            {formatTimer(seconds)}
          </Typography>
        </Paper>

        {/* Step Progression Indicators */}
        <Stack spacing={1.5} sx={{ textAlign: 'left', mb: 3 }}>
          <Box
            sx={{
              p: 1.5,
              borderRadius: '14px',
              bgcolor: step >= 1 ? alpha('#14F195', 0.1) : alpha('#fff', 0.03),
              border: `1px solid ${step >= 1 ? alpha('#14F195', 0.3) : alpha('#fff', 0.08)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.3s ease'
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <ShieldCheck size={18} color={step >= 1 ? '#14F195' : '#888'} />
              <Typography variant="caption" fontWeight="700" color={step >= 1 ? '#14F195' : 'text.secondary'}>
                1. Confirming Wallet Payment
              </Typography>
            </Stack>
            {step >= 1 && <Sparkles size={14} color="#14F195" />}
          </Box>

          <Box
            sx={{
              p: 1.5,
              borderRadius: '14px',
              bgcolor: step >= 2 ? alpha('#D4AF37', 0.12) : alpha('#fff', 0.03),
              border: `1px solid ${step >= 2 ? alpha('#D4AF37', 0.35) : alpha('#fff', 0.08)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.3s ease'
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Pickaxe size={18} color={step >= 2 ? '#FFDF73' : '#888'} />
              <Typography variant="caption" fontWeight="700" color={step >= 2 ? '#FFDF73' : 'text.secondary'}>
                2. Mining Gold Vault Tokens
              </Typography>
            </Stack>
            {step >= 2 && <Sparkles size={14} color="#FFDF73" />}
          </Box>

          <Box
            sx={{
              p: 1.5,
              borderRadius: '14px',
              bgcolor: step >= 3 ? alpha('#14F195', 0.1) : alpha('#fff', 0.03),
              border: `1px solid ${step >= 3 ? alpha('#14F195', 0.3) : alpha('#fff', 0.08)}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all 0.3s ease'
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Sparkles size={18} color={step >= 3 ? '#14F195' : '#888'} />
              <Typography variant="caption" fontWeight="700" color={step >= 3 ? '#14F195' : 'text.secondary'}>
                3. Deploying Open Position to Vault
              </Typography>
            </Stack>
            {step >= 3 && <Sparkles size={14} color="#14F195" />}
          </Box>
        </Stack>

        {/* Animated Progress Bar */}
        <LinearProgress
          variant="indeterminate"
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: alpha('#fff', 0.08),
            '& .MuiLinearProgress-bar': {
              borderRadius: 3,
              background: 'linear-gradient(90deg, #996515 0%, #FFDF73 50%, #14F195 100%)'
            }
          }}
        />

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5, fontSize: '11px' }}>
          Please do not close this window while your position is being opened...
        </Typography>
      </Box>
    </Dialog>
  );
};

import React from 'react';
import { Box, Avatar, alpha } from '@mui/material';
import { Coins, DollarSign, Activity, Wallet, TrendingUp, Compass, Disc, Coins as BtcIcon } from 'lucide-react';

interface TokenIconProps {
  symbol: string;
  size?: number;
}

export function TokenIcon({ symbol, size = 24 }: TokenIconProps) {
  const cleanSymbol = symbol.replace('USDTM', '').replace('$', '').trim().toUpperCase();

  // Return custom image/icon based on symbol
  if (cleanSymbol === 'USGOLD') {
    return (
      <Box sx={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img 
          src="/usgold.svg" 
          alt="usGOLD" 
          referrerPolicy="no-referrer"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/icon.svg';
          }}
        />
      </Box>
    );
  }

  if (cleanSymbol === 'XAUT0' || cleanSymbol === 'XAUT' || cleanSymbol === 'XAUT0' || cleanSymbol === 'XAUT0') {
    return (
      <Avatar 
        sx={{ 
          width: size, 
          height: size, 
          bgcolor: alpha('#FFDF73', 0.15), 
          color: '#FFDF73',
          border: `1px solid ${alpha('#FFDF73', 0.3)}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 0,
          m: 0,
          minWidth: size,
          minHeight: size
        }}
      >
        <Coins size={size * 0.65} />
      </Avatar>
    );
  }

  if (cleanSymbol === 'SOL') {
    return (
      <Box sx={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img 
          src="https://solana.com/src/img/branding/solanaLogoMark.svg" 
          alt="SOL" 
          referrerPolicy="no-referrer"
          style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
        />
      </Box>
    );
  }

  // Default fallback designs for various tokens
  let icon = <Coins size={size * 0.65} />;
  let color = '#D4AF37';
  let bgcolor = alpha('#D4AF37', 0.15);

  if (cleanSymbol === 'USDT') {
    icon = <DollarSign size={size * 0.65} color="#26a69a" />;
    color = '#26a69a';
    bgcolor = alpha('#26a69a', 0.15);
  } else if (cleanSymbol === 'XBT' || cleanSymbol === 'BTC') {
    icon = <TrendingUp size={size * 0.65} color="#f2a900" />;
    color = '#f2a900';
    bgcolor = alpha('#f2a900', 0.15);
  } else if (cleanSymbol === 'ETH') {
    icon = <Activity size={size * 0.65} color="#627eea" />;
    color = '#627eea';
    bgcolor = alpha('#627eea', 0.15);
  } else if (cleanSymbol === 'XRP') {
    icon = <Compass size={size * 0.65} color="#00aae4" />;
    color = '#00aae4';
    bgcolor = alpha('#00aae4', 0.15);
  } else if (cleanSymbol === 'ADA') {
    icon = <Disc size={size * 0.65} color="#0033ad" />;
    color = '#0033ad';
    bgcolor = alpha('#0033ad', 0.15);
  }

  return (
    <Avatar 
      sx={{ 
        width: size, 
        height: size, 
        bgcolor: bgcolor, 
        color: color,
        border: `1px solid ${alpha(color, 0.3)}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 0,
        m: 0,
        minWidth: size,
        minHeight: size
      }}
    >
      {icon}
    </Avatar>
  );
}

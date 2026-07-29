import React, { useState, useEffect } from 'react';
import { 
  ThemeProvider, 
  createTheme, 
  Box, 
  Container, 
  Typography, 
  Stack, 
  Paper, 
  BottomNavigation, 
  BottomNavigationAction,
  alpha 
} from '@mui/material';
import { Wallet, Users, Coins, BarChart3, Activity } from 'lucide-react';
import axios from 'axios';
import { t } from './translations';
import { NetworkTab } from './components/DashboardTabs/NetworkTab';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#D4AF37' },
    background: { default: '#0a0a0b', paper: '#121214' },
    text: { primary: '#ffffff', secondary: alpha('#ffffff', 0.7) }
  },
  typography: {
    fontFamily: '"Inter", "Cinzel", serif',
  }
});

function App() {
  const [activeTab, setActiveTab] = useState('vault');
  const [tokenPrice, setTokenPrice] = useState<number | null>(null);
  const [solanaPrice, setSolanaPrice] = useState<number | null>(null);
  const [effectiveAddress, setEffectiveAddress] = useState<string | null>(null);
  const [totalMembers, setTotalMembers] = useState(0);
  const [userEarnings, setUserEarnings] = useState(0);
  const [userTotalInvested, setUserTotalInvested] = useState(0);
  const language = 'EN';

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await axios.get('/api/jupiter/price?ids=So11111111111111111111111111111111111111112,AymATz4TCL9sWNEEV9Kvyz45CHVhDZ6kUgjTJPzLpU9P');
        if (res.data?.data) {
          const data = res.data.data;
          if (data['So11111111111111111111111111111111111111112']) setSolanaPrice(parseFloat(data['So11111111111111111111111111111111111111112'].price));
          if (data['AymATz4TCL9sWNEEV9Kvyz45CHVhDZ6kUgjTJPzLpU9P']) setTokenPrice(parseFloat(data['AymATz4TCL9sWNEEV9Kvyz45CHVhDZ6kUgjTJPzLpU9P'].price));
        }
      } catch (err) {
        console.error("Price fetch error:", err);
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ThemeProvider theme={darkTheme}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', pb: 10 }}>
        <Container maxWidth="md" sx={{ pt: 4 }}>
          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
            <Box>
              <Typography variant="h5" fontWeight="900" color="primary" sx={{ fontFamily: '"Cinzel", serif' }}>
                SOLANA GOLD
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('welcome', language)}
              </Typography>
            </Box>
            <Paper sx={{ p: 1, borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1, bgcolor: alpha('#D4AF37', 0.1), border: `1px solid ${alpha('#D4AF37', 0.3)}` }}>
              <Wallet size={16} color="#D4AF37" />
              <Typography variant="caption" fontWeight="bold">
                {effectiveAddress ? `${effectiveAddress.substring(0, 6)}...` : t('walletNotLinked', language)}
              </Typography>
            </Paper>
          </Stack>

          {/* Main Content Area */}
          {activeTab === 'vault' && (
            <Stack spacing={3}>
               <Paper sx={{ p: 3, borderRadius: 4, bgcolor: alpha('#121214', 0.8), border: `1px solid ${alpha('#ffffff', 0.05)}` }}>
                  <Typography variant="h6" fontWeight="bold" mb={2}>{t('vault', language)}</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                       <Typography variant="caption" color="text.secondary">SOL Price</Typography>
                       <Typography variant="h6">${solanaPrice?.toFixed(2) || '---'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                       <Typography variant="caption" color="text.secondary">GOLD Price</Typography>
                       <Typography variant="h6">${tokenPrice?.toFixed(2) || '---'}</Typography>
                    </Grid>
                  </Grid>
               </Paper>
               <Box sx={{ p: 4, textAlign: 'center', border: `1px dashed ${alpha('#D4AF37', 0.3)}`, borderRadius: 4 }}>
                  <Typography color="text.secondary">{t('comingSoon', language)}</Typography>
               </Box>
            </Stack>
          )}

          {activeTab === 'network' && (
            <NetworkTab 
              effectiveAddress={effectiveAddress}
              totalMembers={totalMembers}
              userEarnings={userEarnings}
              userTotalInvested={userTotalInvested}
              language={language}
              copiedLine={null}
              copyReferral={() => {}}
              handleOpenQR={() => {}}
              getReferralLink={() => "https://solgold.invest/ref/..."}
            />
          )}

          {activeTab === 'staking' && (
             <Box sx={{ p: 10, textAlign: 'center' }}>
                <Coins size={48} color={alpha('#D4AF37', 0.5)} style={{ marginBottom: 16 }} />
                <Typography color="text.secondary">{t('comingSoon', language)}</Typography>
             </Box>
          )}
        </Container>

        {/* Bottom Navigation */}
        <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, borderTop: `1px solid ${alpha('#ffffff', 0.05)}` }} elevation={3}>
          <BottomNavigation
            showLabels
            value={activeTab}
            onChange={(event, newValue) => setActiveTab(newValue)}
            sx={{ bgcolor: 'background.paper' }}
          >
            <BottomNavigationAction value="vault" label={t('vault', language)} icon={<Wallet size={20} />} />
            <BottomNavigationAction value="network" label={t('network', language)} icon={<Users size={20} />} />
            <BottomNavigationAction value="staking" label={t('staking', language)} icon={<Coins size={20} />} />
          </BottomNavigation>
        </Paper>
      </Box>
    </ThemeProvider>
  );
}

// Add Grid for the Vault section
const Grid = ({ children, container, item, xs, md, spacing }: any) => {
  if (container) return <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: spacing || 0 }}>{children}</Box>;
  if (item) return <Box sx={{ flex: `0 0 ${(xs / 12) * 100}%` }}>{children}</Box>;
  return null;
};

export default App;

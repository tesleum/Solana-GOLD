import React, { useState, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  alpha, 
  useTheme, 
  Stack, 
  Card, 
  CardContent, 
  Grid, 
  TextField, 
  Slider, 
  Chip,
  Divider,
} from '@mui/material';
import { 
  TrendingUp, 
  Users, 
  Target, 
  Lightbulb, 
  BarChart3, 
  Calculator,
  ArrowRight,
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';
import { t } from '../translations';

interface ROIAnalyzerProps {
  apyYield: string;
  totalMembers: number;
  userTotalInvested: number;
  language: string;
}

export const ROIAnalyzer: React.FC<ROIAnalyzerProps> = ({ 
  apyYield, 
  totalMembers, 
  userTotalInvested,
  language 
}) => {
  const theme = useTheme();
  const [calcAmount, setCalcAmount] = useState<number>(userTotalInvested || 100);
  const [calcReferrals, setCalcReferrals] = useState<number>(5);
  const [calcYears, setCalcYears] = useState<number>(1);

  const tiers = [
    { tier: 1, percent: 20 },
    { tier: 2, percent: 10 },
    { tier: 3, percent: 8 },
    { tier: 4, percent: 6 },
    { tier: 5, percent: 5 },
    { tier: 6, percent: 4 },
    { tier: 7, percent: 3 },
    { tier: 8, percent: 2 },
    { tier: 9, percent: 1 },
    { tier: 10, percent: 1 },
  ];

  const calculations = useMemo(() => {
    const yieldRate = (parseFloat(apyYield) || 8) / 100;
    const personalYield = calcAmount * Math.pow(1 + yieldRate, calcYears) - calcAmount;
    
    // Simple network growth estimate:
    // Assume average investment of $100 per referral
    const avgInvest = 100;
    // Assume power of calcReferrals (exponential growth for demo)
    // But let's be more conservative/linear for a better estimate
    // Tier 1: calcReferrals users
    // Tier 2: calcReferrals * 0.5 users
    // Tier 3: calcReferrals * 0.2 users
    const networkCommissions = tiers.reduce((sum, tier) => {
      const tierUsers = Math.floor(calcReferrals * Math.pow(0.5, tier.tier - 1));
      if (tierUsers < 1 && tier.tier > 1) return sum;
      return sum + (Math.max(1, tierUsers) * avgInvest * (tier.percent / 100));
    }, 0) * calcYears;

    const totalEstimate = personalYield + networkCommissions;
    
    return {
      personalYield,
      networkCommissions,
      totalEstimate,
      multiplier: (calcAmount + totalEstimate) / calcAmount
    };
  }, [calcAmount, calcReferrals, calcYears, apyYield]);

  const chartData = useMemo(() => {
    const data = [];
    const yieldRate = (parseFloat(apyYield) || 8) / 100;
    const avgInvest = 100;

    for (let i = 0; i <= calcYears; i += 0.5) {
      const pYield = calcAmount * Math.pow(1 + yieldRate, i) - calcAmount;
      const nComm = tiers.reduce((sum, tier) => {
        const tierUsers = Math.floor(calcReferrals * Math.pow(0.5, tier.tier - 1));
        return sum + (Math.max(1, tierUsers) * avgInvest * (tier.percent / 100));
      }, 0) * i;

      data.push({
        time: i === 0 ? 'Start' : `${i}Y`,
        Personal: parseFloat(pYield.toFixed(2)),
        Network: parseFloat(nComm.toFixed(2)),
        Total: parseFloat((pYield + nComm).toFixed(2))
      });
    }
    return data;
  }, [calcAmount, calcReferrals, calcYears, apyYield]);

  const userPositionData = useMemo(() => {
    // Mock comparative data
    const levels = [
      { name: 'Beginner', users: 0, color: '#9e9e9e' },
      { name: 'Active', users: 5, color: '#4caf50' },
      { name: 'Leader', users: 20, color: '#2196f3' },
      { name: 'Elite', users: 50, color: '#ff9800' },
      { name: 'Royal', users: 100, color: '#D4AF37' }
    ];
    
    return levels.map(l => ({
      ...l,
      isUser: totalMembers >= l.users && (levels.find(next => next.users > l.users)?.users || Infinity) > totalMembers,
      count: l.users
    }));
  }, [totalMembers]);

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box>
          <Typography variant="h5" fontWeight="900" sx={{ fontFamily: '"Cinzel", serif', color: 'primary.main', mb: 1, fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            {t('roiCalculator', language) || 'ROI ANALYZER'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            Estimate your future wealth based on personal yield and network expansion goals.
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Controls */}
          <Grid item xs={12} md={5}>
            <Card sx={{ bgcolor: alpha('#121214', 0.6), borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)' }}>
              <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                <Stack spacing={4}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.75rem' }}>
                      <Target size={14} /> Initial Investment ($)
                    </Typography>
                    <TextField
                      fullWidth
                      type="number"
                      value={calcAmount}
                      onChange={(e) => setCalcAmount(Number(e.target.value))}
                      variant="standard"
                      InputProps={{ sx: { fontSize: { xs: '1.2rem', sm: '1.5rem' }, fontWeight: 800, color: '#fff' } }}
                    />
                    <Slider 
                      value={calcAmount} 
                      min={10} 
                      max={10000} 
                      step={10}
                      onChange={(_, v) => setCalcAmount(v as number)}
                      sx={{ mt: 1 }}
                    />
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.75rem' }}>
                      <Users size={14} /> Targeted Direct Referrals
                    </Typography>
                    <TextField
                      fullWidth
                      type="number"
                      value={calcReferrals}
                      onChange={(e) => setCalcReferrals(Number(e.target.value))}
                      variant="standard"
                      InputProps={{ sx: { fontSize: { xs: '1.2rem', sm: '1.5rem' }, fontWeight: 800, color: '#fff' } }}
                    />
                    <Slider 
                      value={calcReferrals} 
                      min={0} 
                      max={50} 
                      onChange={(_, v) => setCalcReferrals(v as number)}
                      sx={{ mt: 1 }}
                    />
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: '0.75rem' }}>
                      <TrendingUp size={14} /> Time Horizon (Years)
                    </Typography>
                    <TextField
                      fullWidth
                      type="number"
                      value={calcYears}
                      onChange={(e) => setCalcYears(Number(e.target.value))}
                      variant="standard"
                      InputProps={{ sx: { fontSize: { xs: '1.2rem', sm: '1.5rem' }, fontWeight: 800, color: '#fff' } }}
                    />
                    <Slider 
                      value={calcYears} 
                      min={0.5} 
                      max={10} 
                      step={0.5}
                      onChange={(_, v) => setCalcYears(v as number)}
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Results & Chart */}
          <Grid item xs={12} md={7}>
            <Stack spacing={3}>
              <Card sx={{ bgcolor: alpha('#D4AF37', 0.05), borderRadius: 4, border: '1px solid rgba(212, 175, 55, 0.2)' }}>
                <CardContent sx={{ p: { xs: 2.5, sm: 4 } }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary" fontWeight="800" sx={{ fontSize: '0.65rem' }}>ESTIMATED TOTAL EARNINGS</Typography>
                      <Typography variant="h3" fontWeight="900" color="primary.main" sx={{ fontSize: { xs: '2rem', sm: '3rem' } }}>
                        ${calculations.totalEstimate.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" color="text.secondary" fontWeight="800" sx={{ fontSize: '0.65rem' }}>TOTAL FUTURE VALUE</Typography>
                      <Typography variant="h4" fontWeight="800" sx={{ mt: 1, fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                        ${(calcAmount + calculations.totalEstimate).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </Typography>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: { xs: 2, sm: 3 }, borderColor: 'rgba(212, 175, 55, 0.1)' }} />

                  <Stack direction="row" justifyContent="space-between">
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Personal Yield ({apyYield}%)</Typography>
                      <Typography variant="subtitle1" fontWeight="700" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>+${calculations.personalYield.toFixed(2)}</Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>Network Royalty Est.</Typography>
                      <Typography variant="subtitle1" fontWeight="700" sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}>+${calculations.networkCommissions.toFixed(2)}</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              {/* Chart */}
              <Box sx={{ height: { xs: 180, sm: 220 }, width: '100%', mt: 2 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={alpha('#fff', 0.05)} />
                    <XAxis dataKey="time" stroke={theme.palette.text.secondary} fontSize={10} />
                    <YAxis stroke={theme.palette.text.secondary} fontSize={10} tickFormatter={v => `$${v}`} />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#121214', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: '0.75rem' }}
                      itemStyle={{ fontWeight: 'bold' }}
                    />
                    <Line type="monotone" dataKey="Personal" stroke="#4caf50" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Network" stroke="#2196f3" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="Total" stroke="#D4AF37" strokeWidth={3} dot={{ r: 3, fill: '#D4AF37' }} />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </Stack>
          </Grid>
        </Grid>

        {/* User Position Graph */}
        <Card sx={{ bgcolor: alpha('#121214', 0.4), borderRadius: 4, border: '1px solid rgba(255,255,255,0.05)' }}>
          <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack direction="row" alignItems="center" spacing={1} mb={2}>
              <BarChart3 size={18} color={theme.palette.primary.main} />
              <Typography variant="h6" fontWeight="800" sx={{ fontFamily: '"Cinzel", serif', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
                Your Standing
              </Typography>
            </Stack>
            
            <Box sx={{ height: 120, width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={userPositionData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke={theme.palette.text.secondary} fontSize={10} width={60} />
                  <RechartsTooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {userPositionData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.isUser ? theme.palette.primary.main : alpha(entry.color, 0.3)}
                        stroke={entry.isUser ? '#fff' : 'none'}
                        strokeWidth={entry.isUser ? 2 : 0}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center', fontSize: '0.7rem' }}>
              {totalMembers < 5 ? 
                "Build your first line to move from Beginner to Active!" : 
                `You've recruited ${totalMembers} members. Keep going to reach the next milestone!`}
            </Typography>
          </CardContent>
        </Card>


        {/* User Tips */}
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} mb={2}>
            <Lightbulb size={20} color="#FFD700" />
            <Typography variant="h6" fontWeight="800" sx={{ fontFamily: '"Cinzel", serif' }}>
              Empire Builder Tips
            </Typography>
          </Stack>
          <Grid container spacing={2}>
            {[
              { 
                title: 'Go Deep, Not Just Wide', 
                desc: 'Focus on help your direct referrals build their own lines. Multi-tier commissions accumulate massively.',
                icon: <ArrowRight size={16} /> 
              },
              { 
                title: 'Quality over Quantity', 
                desc: 'One active Grand Duke in your downline can generate more volume than 10 inactive beginners.',
                icon: <ArrowRight size={16} /> 
              },
              { 
                title: 'Reinvest Yield', 
                desc: 'Compound interest is the 8th wonder of the world. Reinvesting SOL into GOLD yields exponential returns.',
                icon: <ArrowRight size={16} /> 
              }
            ].map((tip, i) => (
              <Grid item xs={12} sm={4} key={i}>
                <Card sx={{ height: '100%', bgcolor: alpha('#fff', 0.02), border: '1px solid rgba(255,255,255,0.05)', borderRadius: 3 }}>
                  <CardContent sx={{ p: 2 }}>
                    <Stack direction="row" spacing={1} mb={1} alignItems="center">
                      <Box sx={{ color: 'primary.main' }}>{tip.icon}</Box>
                      <Typography variant="subtitle2" fontWeight="800">{tip.title}</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                      {tip.desc}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Stack>
    </Box>
  );
};

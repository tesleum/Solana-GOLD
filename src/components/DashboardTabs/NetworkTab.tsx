import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Stack, 
  Button, 
  Card, 
  CardContent, 
  Grid, 
  Chip, 
  IconButton as MuiIconButton, 
  LinearProgress,
  List,
  ListItem,
  alpha,
  useTheme
} from '@mui/material';
import { Users, Activity, Copy, CopyCheck, QrCode, BarChart3 } from 'lucide-react';
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon';
import { NetworkTree } from '../NetworkTree';
import { t } from '../../translations';

interface NetworkTabProps {
  effectiveAddress: string | null;
  totalMembers: number;
  userEarnings: number;
  userTotalInvested: number;
  language: string;
  copiedLine: string | null;
  copyReferral: (line: string) => void;
  handleOpenQR: (title: string, value: string) => void;
  getReferralLink: (line: string) => string;
}

export const NetworkTab: React.FC<NetworkTabProps> = ({
  effectiveAddress,
  totalMembers,
  userEarnings,
  userTotalInvested,
  language,
  copiedLine,
  copyReferral,
  handleOpenQR,
  getReferralLink
}) => {
  const theme = useTheme();
  const [networkSubTab, setNetworkSubTab] = useState<'structure' | 'activity' | 'performance'>('structure');

  return (
    <Stack spacing={4} sx={{ animation: 'fadeIn 0.4s ease-out' }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', py: { xs: 1.5, sm: 2 }, mb: 1 }}>
        <Typography 
          variant="h4" 
          fontWeight="900" 
          sx={{ 
            mb: 1, 
            fontSize: { xs: '1.75rem', sm: '2.125rem' },
            fontFamily: '"Cinzel", serif', 
            color: 'primary.main',
            textShadow: `0 2px 8px ${alpha('#D4AF37', 0.3)}`
          }}
        >
          {t('myGoldenNetwork', language)}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: '95%', mx: 'auto', fontStyle: 'italic', fontWeight: 500, opacity: 0.8, fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
          {t('networkDescription', language)}
        </Typography>
      </Box>

      {/* Sub-Tab Selection */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        bgcolor: alpha('#121214', 0.6), 
        borderRadius: '24px', 
        p: 0.75, 
        border: `1px solid ${alpha('#D4AF37', 0.25)}`,
        boxShadow: `0 4px 20px ${alpha('#000', 0.5)}`,
        mb: 1
      }}>
        {(['structure', 'activity', 'performance'] as const).map((tab) => (
          <Button
            key={tab}
            fullWidth
            onClick={() => setNetworkSubTab(tab)}
            sx={{
              borderRadius: '18px',
              py: 1.5,
              fontWeight: 800,
              fontSize: '0.875rem',
              letterSpacing: 1,
              fontFamily: '"Cinzel", serif',
              background: networkSubTab === tab 
                ? 'linear-gradient(to bottom, #FFDF73, #D4AF37)' 
                : 'transparent',
              color: networkSubTab === tab ? '#000' : alpha('#fff', 0.7),
              border: 'none',
              boxShadow: networkSubTab === tab ? `0 0 15px ${alpha('#D4AF37', 0.4)}` : 'none',
              '&:hover': {
                background: networkSubTab === tab 
                  ? 'linear-gradient(to bottom, #FFDF73, #D4AF37)' 
                  : alpha('#D4AF37', 0.08),
                color: networkSubTab === tab ? '#000' : '#fff'
              }
            }}
          >
            {tab === 'structure' && <Users size={18} style={{ marginRight: 8 }} />}
            {tab === 'activity' && <Activity size={18} style={{ marginRight: 8 }} />}
            {tab === 'performance' && <BarChart3 size={18} style={{ marginRight: 8 }} />}
            {tab === 'structure' ? t('myGoldenNetwork', language) : tab === 'activity' ? t('recentActivity', language) : 'Analytics'}
          </Button>
        ))}
      </Box>

      {networkSubTab === 'structure' && (
        <Card sx={{ 
          background: `linear-gradient(135deg, ${alpha('#1a1b1f', 1)} 0%, ${alpha('#2a2b2f', 0.8)} 100%)`,
          backdropFilter: 'blur(10px)',
          border: `1px solid ${alpha('#D4AF37', 0.4)}`,
          boxShadow: `0 12px 40px ${alpha('#000', 0.6)}`,
          position: 'relative',
          overflow: 'hidden',
          borderRadius: '24px'
        }}>
          <Box sx={{ 
            position: 'absolute', 
            top: -60, 
            right: -60, 
            width: 180, 
            height: 180, 
            borderRadius: '50%',
            background: `radial-gradient(circle, ${alpha('#D4AF37', 0.2)} 0%, transparent 70%)`,
            zIndex: 0
          }} />
          
          <CardContent sx={{ p: { xs: 2.5, sm: 4 }, position: 'relative', zIndex: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={4}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="primary.main" fontWeight="800" sx={{ letterSpacing: 2, textTransform: 'uppercase', mb: 1, display: 'block', fontSize: { xs: '0.65rem', sm: '0.75rem' } }}>{t('yourOfficialId', language)}</Typography>
                <Typography variant="h2" fontWeight="900" sx={{ color: '#fff', fontSize: { xs: '0.95rem', sm: '1.8rem' }, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {effectiveAddress ? `${effectiveAddress.substring(0, 12)}...${effectiveAddress.slice(-4)}` : t('walletNotLinked', language)}
                </Typography>
                <Stack direction="row" alignItems="baseline" spacing={1} mt={1.5}>
                  <Typography variant="h4" fontWeight="800" sx={{ color: alpha('#fff', 0.9), fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                    {totalMembers}
                  </Typography>
                  <Typography variant="caption" sx={{ color: alpha('#fff', 0.5), fontWeight: 700, letterSpacing: 1 }}>
                    {t('membersRecruited', language).toUpperCase()}
                  </Typography>
                </Stack>
              </Box>
              <Box sx={{ 
                width: { xs: 48, sm: 64 }, 
                height: { xs: 48, sm: 64 }, 
                bgcolor: alpha('#D4AF37', 0.15), 
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${alpha('#D4AF37', 0.6)}`,
                boxShadow: `0 0 25px ${alpha('#D4AF37', 0.4)}`,
                overflow: 'hidden',
                ml: { xs: 1, sm: 2 }
              }}>
                {effectiveAddress ? (
                  <Jazzicon diameter={64} seed={jsNumberForAddress(effectiveAddress)} />
                ) : (
                  <Users size={32} color="#D4AF37" />
                )}
              </Box>
            </Stack>
            
            <Box sx={{ display: 'flex', gap: { xs: 2.5, sm: 3 }, mb: 4, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="700" letterSpacing={1}>{t('earnings', language).toUpperCase()}</Typography>
                <Typography variant="h5" fontWeight="900" sx={{ mt: 0.5, fontSize: { xs: '1.15rem', sm: '1.5rem' } }}>{userEarnings.toFixed(4)} SOL</Typography>
              </Box>
            </Box>
            
            {userTotalInvested > 0 ? (
              <Card sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.6)}`, borderRadius: '24px', overflow: 'hidden', mb: 4 }}>
                <CardContent sx={{ p: 0 }}>
                  <Box px={3} py={2.5} sx={{ borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: alpha('#D4AF37', 0.05), borderLeft: `4px solid #D4AF37` }}>
                    <Typography variant="h6" fontWeight="900" sx={{ fontFamily: '"Cinzel", serif', color: 'primary.main', letterSpacing: 1 }}>{t('royalRecruitmentLink', language) || 'ROYAL RECRUITMENT LINK'}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, opacity: 0.8 }}>{t('chooseLineDescription', language)}</Typography>
                  </Box>
                  <Box sx={{ p: 3, bgcolor: alpha('#000', 0.2) }}>
                    <Grid container spacing={2}>
                      {['A', 'B', 'C', 'D'].map(line => (
                        <Grid item xs={12} sm={6} key={line}>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 1.5,
                            bgcolor: alpha('#fff', 0.03),
                            p: 1.5,
                            borderRadius: 3,
                            border: `1px solid ${alpha('#D4AF37', 0.15)}`,
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: alpha('#D4AF37', 0.08),
                              border: `1px solid ${alpha('#D4AF37', 0.4)}`,
                              transform: 'translateY(-2px)',
                              boxShadow: `0 4px 15px ${alpha('#D4AF37', 0.1)}`
                            }
                          }}>
                            <Box sx={{ 
                              minWidth: 32, 
                              height: 32, 
                              borderRadius: 1.5, 
                              bgcolor: alpha('#D4AF37', 0.15), 
                              display: 'flex', 
                              justifyContent: 'center', 
                              alignItems: 'center', 
                              fontWeight: 'bold', 
                              color: '#D4AF37' 
                            }}>
                              {line}
                            </Box>
                            <Typography 
                              variant="body2" 
                              sx={{ 
                                fontFamily: 'monospace', 
                                flex: 1, 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis',
                                color: alpha('#fff', 0.9),
                                fontWeight: 500,
                                fontSize: '0.8rem'
                              }}
                            >
                              {getReferralLink(line)}
                            </Typography>
                            <Stack direction="row" spacing={1}>
                              <MuiIconButton 
                                size="small" 
                                onClick={() => copyReferral(line)}
                                sx={{ 
                                  color: copiedLine === line ? '#14F195' : '#D4AF37', 
                                  bgcolor: alpha('#D4AF37', 0.1),
                                  '&:hover': { bgcolor: alpha('#D4AF37', 0.2) }
                                }}
                              >
                                {copiedLine === line ? <CopyCheck size={16} /> : <Copy size={16} />}
                              </MuiIconButton>
                              <MuiIconButton 
                                size="small" 
                                onClick={() => handleOpenQR(`Line ${line} Link`, getReferralLink(line))}
                                sx={{ 
                                  color: '#D4AF37', 
                                  bgcolor: alpha('#D4AF37', 0.1),
                                  '&:hover': { bgcolor: alpha('#D4AF37', 0.2) }
                                }}
                              >
                                <QrCode size={16} />
                              </MuiIconButton>
                            </Stack>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                  
                  <Box px={3} py={2.5} sx={{ borderTop: `1px solid ${theme.palette.divider}`, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: alpha('#D4AF37', 0.05), display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1.5, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' } }}>
                    <Typography variant="h6" fontWeight="900" sx={{ fontFamily: '"Cinzel", serif', letterSpacing: 1, fontSize: { xs: '1rem', sm: '1.25rem' } }}>{t('downlineGenesis', language)}</Typography>
                    <Chip size="small" label="10-Tier Structure" icon={<Activity size={14} />} sx={{ fontWeight: 700, borderRadius: '8px', bgcolor: alpha('#D4AF37', 0.1), color: '#D4AF37', border: `1px solid ${alpha('#D4AF37', 0.2)}` }} />
                  </Box>
                  <Box sx={{ p: { xs: 0.5, sm: 2 }, bgcolor: alpha('#000', 0.15) }}>
                    <NetworkTree address={effectiveAddress || undefined} language={language} />
                  </Box>
                </CardContent>
              </Card>
            ) : (
              <Box sx={{ 
                p: 4, 
                bgcolor: alpha('#000', 0.4), 
                borderRadius: 5, 
                border: `1px dashed ${alpha('#D4AF37', 0.3)}`,
                mb: 4,
                textAlign: 'center',
                boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.5)'
              }}>
                <Typography variant="body1" sx={{ color: alpha('#fff', 0.8), fontWeight: 600 }}>
                  {t('investToActivateLink', language) || 'Invest in GOLD to activate your Royal Recruitment Link and start building your legacy.'}
                </Typography>
              </Box>
            )}
            
            <Box>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                <Typography variant="caption" color="text.secondary" fontWeight="800" sx={{ letterSpacing: 1 }}>{t('experienceMilestone', language)}</Typography>
                <Chip 
                  label={`LEVEL ${Math.floor(totalMembers / 10) + 1}`} 
                  size="small"
                  sx={{ 
                    bgcolor: 'primary.main', 
                    color: '#000', 
                    fontWeight: 900, 
                    fontSize: '0.7rem',
                    boxShadow: `0 0 10px ${alpha('#D4AF37', 0.5)}`
                  }}
                />
              </Stack>
              <LinearProgress 
                variant="determinate" 
                value={(totalMembers % 10) * 10} 
                sx={{ 
                  height: 12, 
                  borderRadius: 6, 
                  bgcolor: alpha('#000', 0.6),
                  border: `1px solid ${alpha('#D4AF37', 0.1)}`,
                  '& .MuiLinearProgress-bar': { 
                    bgcolor: 'primary.main', 
                    borderRadius: 6,
                    boxShadow: `inset 0 0 5px rgba(255,255,255,0.5), 0 0 15px ${alpha('#D4AF37', 0.6)}`
                  } 
                }} 
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Tier Commissions List */}
      {networkSubTab === 'structure' && userTotalInvested > 0 && (
        <Card sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.6)}`, borderRadius: '24px', overflow: 'hidden' }}>
          <CardContent sx={{ p: 0 }}>
            <Box px={3} py={2.5} sx={{ borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: alpha('#fff', 0.01) }}>
              <Typography variant="h6" fontWeight="900" sx={{ fontFamily: '"Cinzel", serif', fontSize: '1.1rem' }}>{t('royalRewards', language)}</Typography>
              <Typography variant="caption" color="text.secondary" fontWeight="800" sx={{ letterSpacing: 1 }}>{t('cashbackRoyalty', language)}</Typography>
            </Box>
            <List disablePadding>
              {[
                { tier: 1, percent: 20, rank: 'Archduke' },
                { tier: 2, percent: 10, rank: 'Grand Duke' },
                { tier: 3, percent: 8, rank: 'Duke' },
                { tier: 4, percent: 6, rank: 'Marquess' },
                { tier: 5, percent: 5, rank: 'Earl' },
                { tier: 6, percent: 4, rank: 'Viscount' },
                { tier: 7, percent: 3, rank: 'Baron' },
                { tier: 8, percent: 2, rank: 'Baronet' },
                { tier: 9, percent: 1, rank: 'Knight' },
                { tier: 10, percent: 1, rank: 'Esquire' },
              ].map(({tier, percent, rank}, i) => (
                <ListItem key={tier} sx={{ 
                  py: 2.5, 
                  px: 3,
                  bgcolor: i < 3 ? alpha('#D4AF37', 0.04) : 'transparent',
                  borderBottom: i < 9 ? `1px solid ${alpha(theme.palette.divider, 0.4)}` : 'none',
                  '&:hover': { bgcolor: alpha('#D4AF37', 0.08) }
                }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: '100%' }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box sx={{ 
                        width: 36, 
                        height: 36, 
                        borderRadius: 1.5, 
                        bgcolor: i < 3 ? 'primary.main' : alpha('#fff', 0.05), 
                        display: 'flex', 
                        justifyContent: 'center', 
                        alignItems: 'center', 
                        fontWeight: '900', 
                        color: i < 3 ? '#000' : '#fff' 
                      }}>
                        {tier}
                      </Box>
                      <Box>
                        <Typography variant="body1" fontWeight="800">{rank}</Typography>
                        <Typography variant="caption" color="text.secondary" fontWeight="700">TIER {tier}</Typography>
                      </Box>
                    </Stack>
                    <Typography variant="h6" fontWeight="900" color="primary.main">{percent}%</Typography>
                  </Stack>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
};

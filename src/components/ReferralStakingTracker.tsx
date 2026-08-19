import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Stack, Card, CardContent, alpha, useTheme, Button,
  Divider, Grid, Chip, Avatar, Tooltip, IconButton, TextField, InputAdornment,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, Paper, Collapse, LinearProgress, Tab, Tabs
} from '@mui/material';
import {
  Users, Award, Coins, CheckCircle2, Clock, Search, Copy, Check,
  ExternalLink, TrendingUp, Sparkles, AlertCircle, Share2, Send,
  ChevronDown, ChevronUp, Filter, ShieldCheck, Zap, ArrowUpRight,
  PieChart as PieChartIcon, BarChart3, HelpCircle, Layers
} from 'lucide-react';
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon';
import { motion, AnimatePresence } from 'motion/react';
import { database } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { t } from '../translations';
import { triggerHaptic } from '../lib/haptic';
import { shareTelegramReferralLink, shareReferral, isTelegramWebApp } from '../lib/telegram';

export interface RefereeStake {
  key: string;
  amount: number;
  durationMonths: number;
  startTime: number;
  endTime: number;
  status: string;
  totalExpectedProfit?: number;
}

export interface RefereeItem {
  address: string;
  telegramId?: string;
  telegramUsername?: string;
  firstName?: string;
  hasStaked: boolean;
  totalStakedUsd: number;
  stakesCount: number;
  activeStakesCount: number;
  stakes: RefereeStake[];
  line: string;
  joinedAt: number;
  lastActive: number;
  rewardStatus: 'qualified' | 'claimed' | 'pending_stake';
  qualifiedRewardUsGold: number;
  needsApproval?: boolean;
}

interface ReferralStakingTrackerProps {
  language: string;
  effectiveAddress: string | null;
  tokenPrice?: number | null;
  onShowToast?: (msg: string, severity?: 'success' | 'info' | 'warning' | 'error') => void;
}

export function ReferralStakingTracker({
  language,
  effectiveAddress,
  tokenPrice = 1.0,
  onShowToast
}: ReferralStakingTrackerProps) {
  useTheme();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'staked' | 'unstaked'>('all');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [diagramMode, setDiagramMode] = useState<'funnel' | 'distribution' | 'volume'>('funnel');

  // Firebase Raw Data States
  const [usersData, setUsersData] = useState<Record<string, any>>({});
  const [rewardsData, setRewardsData] = useState<Record<string, any>>({});
  const [stakesData, setStakesData] = useState<Record<string, any>>({});
  const [telegramUsersData, setTelegramUsersData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  // Sync Firebase Data
  useEffect(() => {
    if (!effectiveAddress) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Listen to all users to locate direct referees
    const usersRef = ref(database, 'users');
    const unsubUsers = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        setUsersData(snapshot.val());
      } else {
        setUsersData({});
      }
    });

    // 2. Listen to user's referral rewards
    const rewardsRef = ref(database, `rewards/${effectiveAddress}`);
    const unsubRewards = onValue(rewardsRef, (snapshot) => {
      if (snapshot.exists()) {
        setRewardsData(snapshot.val());
      } else {
        setRewardsData({});
      }
    });

    // 3. Listen to all stakes to calculate referee staked amounts
    const stakesRef = ref(database, 'stakes');
    const unsubStakes = onValue(stakesRef, (snapshot) => {
      if (snapshot.exists()) {
        setStakesData(snapshot.val());
      } else {
        setStakesData({});
      }
    });

    // 4. Listen to telegramUsers for handles
    const tgRef = ref(database, 'telegramUsers');
    const unsubTg = onValue(tgRef, (snapshot) => {
      if (snapshot.exists()) {
        setTelegramUsersData(snapshot.val());
      } else {
        setTelegramUsersData({});
      }
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubRewards();
      unsubStakes();
      unsubTg();
    };
  }, [effectiveAddress]);

  // Aggregate & Process Referee Data
  const refereesList: RefereeItem[] = useMemo(() => {
    if (!effectiveAddress) return [];

    const refereeMap = new Map<string, RefereeItem>();
    const normalizedUserAddr = effectiveAddress.toLowerCase();

    // A. Gather referees from `users` node where referrer matches
    Object.entries(usersData).forEach(([addr, uData]) => {
      const uReferrer = (uData?.referrer || '').toLowerCase();
      if (uReferrer && (uReferrer === normalizedUserAddr || uReferrer === effectiveAddress)) {
        refereeMap.set(addr, {
          address: addr,
          telegramId: uData?.telegramId,
          telegramUsername: uData?.telegramUsername,
          firstName: uData?.firstName,
          hasStaked: false,
          totalStakedUsd: 0,
          stakesCount: 0,
          activeStakesCount: 0,
          stakes: [],
          line: uData?.line || 'A',
          joinedAt: uData?.joinedAt || Date.now(),
          lastActive: uData?.lastActive || uData?.joinedAt || Date.now(),
          rewardStatus: 'pending_stake',
          qualifiedRewardUsGold: 0,
          needsApproval: false
        });
      }
    });

    // B. Gather referees from `rewards/${effectiveAddress}` node
    Object.values(rewardsData).forEach((r: any) => {
      const refereeAddr = r?.referee;
      if (refereeAddr) {
        let existing = refereeMap.get(refereeAddr);
        if (!existing) {
          existing = {
            address: refereeAddr,
            hasStaked: false,
            totalStakedUsd: 0,
            stakesCount: 0,
            activeStakesCount: 0,
            stakes: [],
            line: 'A',
            joinedAt: r?.timestamp || Date.now(),
            lastActive: r?.completedAt || r?.timestamp || Date.now(),
            rewardStatus: 'pending_stake',
            qualifiedRewardUsGold: 0,
            needsApproval: false
          };
          refereeMap.set(refereeAddr, existing);
        }

        if (r.status === 'needs_approval' || r.status === 'approved' || r.status === 'redeemed' || r.type === 'referral_stake_completed') {
          existing.rewardStatus = 'qualified';
          existing.qualifiedRewardUsGold = 1.0;
          if (r.status === 'needs_approval') {
            existing.needsApproval = true;
          }
          if (r.stakeAmount && existing.totalStakedUsd === 0) {
            existing.totalStakedUsd = parseFloat(r.stakeAmount) || 0;
            existing.hasStaked = true;
          }
        }
      }
    });

    // C. Enhance each referee with live `stakes` data
    refereeMap.forEach((referee, addr) => {
      // Check stakes node for this referee address
      const userStakesObj = stakesData[addr];
      if (userStakesObj) {
        const stakesArr: RefereeStake[] = [];
        let totalStaked = 0;
        let activeCount = 0;

        Object.entries(userStakesObj).forEach(([sKey, sVal]: [string, any]) => {
          const rawAmt = parseFloat(sVal?.amount || 0);
          const rawUsd = parseFloat(sVal?.usdAmount || 0);
          const effectiveUsd = rawUsd > 0 
            ? rawUsd 
            : (rawAmt > 0 ? (tokenPrice && tokenPrice > 0 && rawAmt * tokenPrice >= 4.9 ? rawAmt * tokenPrice : rawAmt) : 0);
          const stakeUsd = effectiveUsd > 0 ? effectiveUsd : rawAmt;

          if (stakeUsd > 0) {
            totalStaked += stakeUsd;
            if (sVal?.status === 'active' || !sVal?.status) {
              activeCount++;
            }
            stakesArr.push({
              key: sKey,
              amount: stakeUsd,
              durationMonths: sVal?.durationMonths || 3,
              startTime: sVal?.startTime || Date.now(),
              endTime: sVal?.endTime || Date.now(),
              status: sVal?.status || 'active',
              totalExpectedProfit: sVal?.totalExpectedProfit || 0
            });
          }
        });

        if (stakesArr.length > 0) {
          referee.stakes = stakesArr.sort((a, b) => b.startTime - a.startTime);
          referee.totalStakedUsd = Math.max(referee.totalStakedUsd, totalStaked);
          referee.stakesCount = stakesArr.length;
          referee.activeStakesCount = activeCount;
          referee.hasStaked = referee.totalStakedUsd >= 5.0; // Staking >= $5 activates Active Staking status
        }
      }

      // Check telegramUsers data for matching handle/ID
      if (!referee.telegramUsername) {
        Object.values(telegramUsersData).forEach((tgUser: any) => {
          if (tgUser?.address && tgUser.address.toLowerCase() === addr.toLowerCase()) {
            referee.telegramUsername = tgUser.username || '';
            referee.telegramId = tgUser.id || '';
            if (tgUser.firstName) referee.firstName = tgUser.firstName;
          }
        });
      }

      // If user has staked >= $5 USD, they activate Active Staking and qualify for 1 usGOLD reward
      if (referee.totalStakedUsd >= 5.0) {
        referee.hasStaked = true;
        referee.rewardStatus = 'qualified';
        referee.qualifiedRewardUsGold = 1.0;
      } else {
        referee.hasStaked = false;
        referee.rewardStatus = 'pending_stake';
        referee.qualifiedRewardUsGold = 0;
      }
    });

    return Array.from(refereeMap.values()).sort((a, b) => {
      // Staked members first, then by total amount staked, then by joined date
      if (a.hasStaked !== b.hasStaked) return a.hasStaked ? -1 : 1;
      if (b.totalStakedUsd !== a.totalStakedUsd) return b.totalStakedUsd - a.totalStakedUsd;
      return b.joinedAt - a.joinedAt;
    });
  }, [effectiveAddress, usersData, rewardsData, stakesData, telegramUsersData]);

  // Derived Summary Metrics
  const metrics = useMemo(() => {
    const total = refereesList.length;
    const staked = refereesList.filter(r => r.hasStaked);
    const unstaked = refereesList.filter(r => !r.hasStaked);
    const totalStakedVolumeUsd = staked.reduce((sum, r) => sum + r.totalStakedUsd, 0);
    const qualifiedRewardCount = staked.length;
    const totalQualifiedUsGold = qualifiedRewardCount * 1.0;
    const conversionRate = total > 0 ? (staked.length / total) * 100 : 0;

    // Vault duration breakdown of staked referrals
    const durationCounts: Record<number, { count: number; volume: number }> = {
      1: { count: 0, volume: 0 },
      3: { count: 0, volume: 0 },
      6: { count: 0, volume: 0 },
      12: { count: 0, volume: 0 }
    };

    staked.forEach(r => {
      if (r.stakes.length > 0) {
        r.stakes.forEach(s => {
          const d = s.durationMonths || 3;
          if (!durationCounts[d]) durationCounts[d] = { count: 0, volume: 0 };
          durationCounts[d].count += 1;
          durationCounts[d].volume += s.amount;
        });
      } else {
        durationCounts[3].count += 1;
        durationCounts[3].volume += r.totalStakedUsd;
      }
    });

    return {
      total,
      stakedCount: staked.length,
      unstakedCount: unstaked.length,
      totalStakedVolumeUsd,
      qualifiedRewardCount,
      totalQualifiedUsGold,
      conversionRate,
      durationCounts
    };
  }, [refereesList]);

  // Filtered & Paginated List
  const filteredReferees = useMemo(() => {
    let result = [...refereesList];

    if (filterTab === 'staked') {
      result = result.filter(r => r.hasStaked);
    } else if (filterTab === 'unstaked') {
      result = result.filter(r => !r.hasStaked);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(r => 
        r.address.toLowerCase().includes(q) ||
        (r.telegramUsername && r.telegramUsername.toLowerCase().includes(q)) ||
        (r.firstName && r.firstName.toLowerCase().includes(q))
      );
    }

    return result;
  }, [refereesList, filterTab, searchQuery]);

  const referralUrl = useMemo(() => {
    if (!effectiveAddress) return 'https://solanagold.pro';
    return `https://solanagold.pro/?start=${effectiveAddress}`;
  }, [effectiveAddress]);

  const handleCopyLink = () => {
    triggerHaptic(15);
    navigator.clipboard.writeText(referralUrl);
    setCopiedLink(true);
    if (onShowToast) onShowToast(t('linkCopied', language) || "Referral link copied to clipboard!", "success");
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleCopyAddress = (addr: string) => {
    triggerHaptic(10);
    navigator.clipboard.writeText(addr);
    setCopiedAddr(addr);
    if (onShowToast) onShowToast(t('copied', language) || "Address copied!", "info");
    setTimeout(() => setCopiedAddr(null), 2000);
  };

  const handleTelegramShare = () => {
    triggerHaptic(15);
    const addr = effectiveAddress || 'GOLDEN';
    shareTelegramReferralLink(
      addr,
      t('shareText', language) || "🪙 Join me on Solana GOLD! Stake usGOLD in yield vaults and earn rewards + 1 usGOLD referral bonus!"
    );
    if (onShowToast) onShowToast(t('shared', language) || "Opened Telegram Share!", "info");
  };

  const handleWebShare = async () => {
    triggerHaptic(15);
    const addr = effectiveAddress || 'GOLDEN';
    const res = await shareReferral(
      addr,
      t('referralStakingNetworkTracker', language),
      t('shareText', language)
    );
    if (res.method === 'clipboard') {
      setCopiedLink(true);
      if (onShowToast) onShowToast(t('linkCopied', language) || "Copied to clipboard!", "success");
      setTimeout(() => setCopiedLink(false), 3000);
    } else if (res.success) {
      if (onShowToast) onShowToast(t('shared', language) || "Shared successfully!", "success");
    }
  };

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    if (addr.length <= 12) return addr;
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <Card 
      component={motion.div}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      sx={{ 
        bgcolor: '#121316',
        border: `1px solid ${alpha('#D4AF37', 0.25)}`,
        borderRadius: '32px',
        boxShadow: '0 16px 56px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        mt: 4,
        mb: 4
      }}
    >
      {/* 1. HEADER BAR */}
      <Box 
        sx={{ 
          p: { xs: 2.5, md: 3.5 }, 
          borderBottom: `1px solid ${alpha('#fff', 0.08)}`, 
          bgcolor: 'linear-gradient(90deg, rgba(212,175,55,0.08) 0%, rgba(20,241,149,0.03) 100%)',
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', md: 'center' },
          gap: 2
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar 
            sx={{ 
              bgcolor: alpha('#D4AF37', 0.15), 
              color: '#FFDF73', 
              width: 52, 
              height: 52,
              border: `1px solid ${alpha('#D4AF37', 0.3)}`,
              boxShadow: `0 0 20px ${alpha('#D4AF37', 0.2)}`
            }}
          >
            <Users size={26} />
          </Avatar>
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Typography 
                variant="h6" 
                fontWeight="950" 
                color="#fff" 
                sx={{ 
                  fontFamily: '"Cinzel", "Vazirmatn", serif', 
                  letterSpacing: 0.5,
                  fontSize: { xs: '1.1rem', md: '1.3rem' }
                }}
              >
                {t('referralStakingNetworkTracker', language)}
              </Typography>
              <Chip 
                icon={<Sparkles size={14} color="#000" />}
                label={t('oneUsGoldRewards', language)} 
                size="small" 
                sx={{ 
                  bgcolor: '#D4AF37', 
                  color: '#000', 
                  fontWeight: '900', 
                  fontSize: '11px',
                  display: { xs: 'none', sm: 'inline-flex' }
                }} 
              />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.8, mt: 0.3 }}>
              {t('referralStakingSubtitle', language)}
            </Typography>
          </Box>
        </Box>

        {/* Quick Action Share & Copy Buttons */}
        <Stack direction="row" spacing={1.5} sx={{ width: { xs: '100%', md: 'auto' } }}>
          <Button
            size="small"
            variant="outlined"
            onClick={handleCopyLink}
            startIcon={copiedLink ? <Check size={16} /> : <Copy size={16} />}
            sx={{
              flex: { xs: 1, md: 'none' },
              borderColor: copiedLink ? '#14F195' : alpha('#D4AF37', 0.4),
              color: copiedLink ? '#14F195' : '#FFDF73',
              borderRadius: '12px',
              fontWeight: '800',
              textTransform: 'none',
              px: 2,
              py: 1,
              bgcolor: copiedLink ? alpha('#14F195', 0.1) : alpha('#D4AF37', 0.05),
              '&:hover': {
                borderColor: '#D4AF37',
                bgcolor: alpha('#D4AF37', 0.15)
              }
            }}
          >
            {copiedLink ? t('linkCopied', language) : t('copyInviteLink', language)}
          </Button>

          {typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function' && !isTelegramWebApp() ? (
            <Button
              size="small"
              variant="outlined"
              onClick={handleWebShare}
              startIcon={<Share2 size={16} />}
              sx={{
                flex: { xs: 1, md: 'none' },
                borderColor: alpha('#14F195', 0.5),
                color: '#14F195',
                borderRadius: '12px',
                fontWeight: '800',
                textTransform: 'none',
                px: 2,
                py: 1,
                bgcolor: alpha('#14F195', 0.05),
                '&:hover': {
                  borderColor: '#14F195',
                  bgcolor: alpha('#14F195', 0.15)
                }
              }}
            >
              {t('share', language)}
            </Button>
          ) : null}

          <Button
            size="small"
            variant="contained"
            onClick={handleTelegramShare}
            startIcon={<Send size={16} />}
            sx={{
              flex: { xs: 1, md: 'none' },
              bgcolor: '#0088cc',
              color: '#fff',
              borderRadius: '12px',
              fontWeight: '800',
              textTransform: 'none',
              px: 2,
              py: 1,
              boxShadow: '0 4px 14px rgba(0, 136, 204, 0.4)',
              '&:hover': {
                bgcolor: '#0077b5'
              }
            }}
          >
            {t('shareOnTelegram', language)}
          </Button>
        </Stack>
      </Box>

      <CardContent sx={{ p: { xs: 2, md: 3.5 } }}>
        {/* 2. SUMMARY KPI METRICS BAR */}
        <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
          {/* Total Referrals */}
          <Grid item xs={6} sm={6} md={3}>
            <Box
              sx={{
                p: 2.5,
                borderRadius: '20px',
                bgcolor: alpha('#fff', 0.03),
                border: `1px solid ${alpha('#fff', 0.08)}`,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: alpha('#D4AF37', 0.3),
                  bgcolor: alpha('#fff', 0.05),
                  transform: 'translateY(-2px)'
                }
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="text.secondary" fontWeight="800" sx={{ letterSpacing: 0.5, fontSize: '11px' }}>
                  {t('totalReferralsKpi', language)}
                </Typography>
                <Avatar sx={{ bgcolor: alpha('#D4AF37', 0.1), color: '#D4AF37', width: 32, height: 32 }}>
                  <Users size={16} />
                </Avatar>
              </Stack>
              <Box sx={{ mt: 1.5 }}>
                <Typography variant="h4" fontWeight="950" color="#fff" sx={{ fontFamily: '"Cinzel", "Vazirmatn", serif' }}>
                  {metrics.total}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <span style={{ color: '#14F195', fontWeight: 800 }}>{metrics.conversionRate.toFixed(0)}%</span> {t('conversionRate', language)}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Staked & Qualified */}
          <Grid item xs={6} sm={6} md={3}>
            <Box
              sx={{
                p: 2.5,
                borderRadius: '20px',
                bgcolor: alpha('#14F195', 0.04),
                border: `1px solid ${alpha('#14F195', 0.25)}`,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: '#14F195',
                  bgcolor: alpha('#14F195', 0.08),
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 24px ${alpha('#14F195', 0.15)}`
                }
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="#14F195" fontWeight="800" sx={{ letterSpacing: 0.5, fontSize: '11px' }}>
                  {t('stakedAndQualifiedKpi', language)}
                </Typography>
                <Avatar sx={{ bgcolor: alpha('#14F195', 0.15), color: '#14F195', width: 32, height: 32 }}>
                  <CheckCircle2 size={16} />
                </Avatar>
              </Stack>
              <Box sx={{ mt: 1.5 }}>
                <Typography variant="h4" fontWeight="950" color="#14F195" sx={{ fontFamily: '"Cinzel", "Vazirmatn", serif' }}>
                  {metrics.stakedCount}
                </Typography>
                <Typography variant="caption" color="#14F195" sx={{ opacity: 0.9, fontWeight: 700, mt: 0.5, display: 'block' }}>
                  {t('qualifiedFor1UsGoldEach', language)}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Not Staked Yet (Pending) */}
          <Grid item xs={6} sm={6} md={3}>
            <Box
              sx={{
                p: 2.5,
                borderRadius: '20px',
                bgcolor: alpha('#ff9800', 0.04),
                border: `1px solid ${alpha('#ff9800', 0.25)}`,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: '#ff9800',
                  bgcolor: alpha('#ff9800', 0.08),
                  transform: 'translateY(-2px)'
                }
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="#ff9800" fontWeight="800" sx={{ letterSpacing: 0.5, fontSize: '11px' }}>
                  {t('notStakedYetKpi', language)}
                </Typography>
                <Avatar sx={{ bgcolor: alpha('#ff9800', 0.15), color: '#ff9800', width: 32, height: 32 }}>
                  <Clock size={16} />
                </Avatar>
              </Stack>
              <Box sx={{ mt: 1.5 }}>
                <Typography variant="h4" fontWeight="950" color="#ff9800" sx={{ fontFamily: '"Cinzel", "Vazirmatn", serif' }}>
                  {metrics.unstakedCount}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.8, mt: 0.5, display: 'block' }}>
                  {t('awaitingMinVaultStake', language)}
                </Typography>
              </Box>
            </Box>
          </Grid>

          {/* Qualified 1 usGOLD Rewards & Volume */}
          <Grid item xs={6} sm={6} md={3}>
            <Box
              sx={{
                p: 2.5,
                borderRadius: '20px',
                bgcolor: alpha('#D4AF37', 0.08),
                border: `1px solid ${alpha('#D4AF37', 0.35)}`,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.3s ease',
                '&:hover': {
                  borderColor: '#FFDF73',
                  bgcolor: alpha('#D4AF37', 0.12),
                  transform: 'translateY(-2px)',
                  boxShadow: `0 8px 24px ${alpha('#D4AF37', 0.2)}`
                }
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" color="#FFDF73" fontWeight="900" sx={{ letterSpacing: 0.5, fontSize: '11px' }}>
                  {t('qualified1UsGoldKpi', language)}
                </Typography>
                <Avatar sx={{ bgcolor: alpha('#D4AF37', 0.2), color: '#FFDF73', width: 32, height: 32 }}>
                  <Award size={16} />
                </Avatar>
              </Stack>
              <Box sx={{ mt: 1.5 }}>
                <Stack direction="row" alignItems="baseline" spacing={0.8}>
                  <Typography variant="h4" fontWeight="950" color="#FFDF73" sx={{ fontFamily: '"Cinzel", "Vazirmatn", serif' }}>
                    {metrics.totalQualifiedUsGold.toFixed(2)}
                  </Typography>
                  <Typography variant="caption" fontWeight="900" color="#D4AF37">usGOLD</Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {t('fromTeamVolume', language).replace('{volume}', metrics.totalStakedVolumeUsd.toFixed(2))}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>

        {/* 3. VISUAL DIAGRAM SECTION (Funnel & Volume Breakdown) */}
        <Box 
          sx={{ 
            p: { xs: 2, md: 3 }, 
            bgcolor: alpha('#000', 0.35), 
            borderRadius: '24px', 
            border: `1px solid ${alpha('#fff', 0.06)}`,
            mb: 3.5
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1.5} sx={{ mb: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: alpha('#D4AF37', 0.1), color: '#FFDF73', width: 36, height: 36 }}>
                <BarChart3 size={18} />
              </Avatar>
              <Box>
                <Typography variant="subtitle1" fontWeight="900" color="#fff">
                  {t('referralStakingDiagram', language)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t('referralStakingDiagramDesc', language)}
                </Typography>
              </Box>
            </Box>

            {/* Diagram Mode Tabs */}
            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant={diagramMode === 'funnel' ? 'contained' : 'outlined'}
                onClick={() => setDiagramMode('funnel')}
                sx={{
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontSize: '11px',
                  fontWeight: '800',
                  py: 0.5,
                  px: 1.5,
                  bgcolor: diagramMode === 'funnel' ? '#D4AF37' : 'transparent',
                  color: diagramMode === 'funnel' ? '#000' : 'text.secondary',
                  borderColor: alpha('#D4AF37', 0.3)
                }}
              >
                {t('conversionFunnel', language)}
              </Button>
              <Button
                size="small"
                variant={diagramMode === 'volume' ? 'contained' : 'outlined'}
                onClick={() => setDiagramMode('volume')}
                sx={{
                  borderRadius: '10px',
                  textTransform: 'none',
                  fontSize: '11px',
                  fontWeight: '800',
                  py: 0.5,
                  px: 1.5,
                  bgcolor: diagramMode === 'volume' ? '#D4AF37' : 'transparent',
                  color: diagramMode === 'volume' ? '#000' : 'text.secondary',
                  borderColor: alpha('#D4AF37', 0.3)
                }}
              >
                {t('vaultDurations', language)}
              </Button>
            </Stack>
          </Stack>

          {/* DIAGRAM CONTENT */}
          {diagramMode === 'funnel' ? (
            <Box>
              {/* Funnel Visual Bars */}
              <Grid container spacing={2} alignItems="center">
                {/* Step 1: Registered */}
                <Grid item xs={12} md={4}>
                  <Box sx={{ p: 2, borderRadius: '16px', bgcolor: alpha('#fff', 0.02), border: `1px solid ${alpha('#fff', 0.05)}` }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="caption" fontWeight="800" color="text.secondary">
                        {t('step1RegisteredReferrals', language)}
                      </Typography>
                      <Chip label={`${metrics.total}`} size="small" sx={{ bgcolor: alpha('#fff', 0.1), color: '#fff', fontWeight: 800, height: 22 }} />
                    </Stack>
                    <LinearProgress variant="determinate" value={100} sx={{ height: 8, borderRadius: 4, bgcolor: alpha('#fff', 0.05), '& .MuiLinearProgress-bar': { bgcolor: '#fff' } }} />
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontSize: '11px' }}>
                      {t('ofNetworkInvitations', language)}
                    </Typography>
                  </Box>
                </Grid>

                {/* Step 2: Staked & Qualified */}
                <Grid item xs={12} md={4}>
                  <Box sx={{ p: 2, borderRadius: '16px', bgcolor: alpha('#14F195', 0.04), border: `1px solid ${alpha('#14F195', 0.2)}` }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="caption" fontWeight="800" color="#14F195">
                        {t('step2StakedMin5', language)}
                      </Typography>
                      <Chip label={`${metrics.stakedCount}`} size="small" sx={{ bgcolor: alpha('#14F195', 0.2), color: '#14F195', fontWeight: 900, height: 22 }} />
                    </Stack>
                    <LinearProgress 
                      variant="determinate" 
                      value={metrics.total > 0 ? (metrics.stakedCount / metrics.total) * 100 : 0} 
                      sx={{ 
                        height: 8, 
                        borderRadius: 4, 
                        bgcolor: alpha('#fff', 0.05), 
                        '& .MuiLinearProgress-bar': { 
                          background: 'linear-gradient(90deg, #00E676 0%, #14F195 100%)' 
                        } 
                      }} 
                    />
                    <Typography variant="caption" color="#14F195" sx={{ display: 'block', mt: 1, fontSize: '11px', fontWeight: 700 }}>
                      {metrics.conversionRate.toFixed(1)}% {t('conversionRate', language)} (${metrics.totalStakedVolumeUsd.toFixed(2)} USD)
                    </Typography>
                  </Box>
                </Grid>

                {/* Step 3: Qualified Rewards */}
                <Grid item xs={12} md={4}>
                  <Box sx={{ p: 2, borderRadius: '16px', bgcolor: alpha('#D4AF37', 0.06), border: `1px solid ${alpha('#D4AF37', 0.3)}` }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="caption" fontWeight="900" color="#FFDF73">
                        {t('step3Qualified1UsGold', language)}
                      </Typography>
                      <Chip label={`+${metrics.totalQualifiedUsGold.toFixed(2)} usGOLD`} size="small" sx={{ bgcolor: '#D4AF37', color: '#000', fontWeight: 900, height: 22 }} />
                    </Stack>
                    <LinearProgress 
                      variant="determinate" 
                      value={metrics.total > 0 ? (metrics.qualifiedRewardCount / metrics.total) * 100 : 0} 
                      sx={{ 
                        height: 8, 
                        borderRadius: 4, 
                        bgcolor: alpha('#fff', 0.05), 
                        '& .MuiLinearProgress-bar': { 
                          background: 'linear-gradient(90deg, #996515 0%, #D4AF37 100%)' 
                        } 
                      }} 
                    />
                    <Typography variant="caption" color="#FFDF73" sx={{ display: 'block', mt: 1, fontSize: '11px', fontWeight: 700 }}>
                      {t('oneUsGoldPerStakingReferee', language)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* Status Proportion Bar */}
              <Box sx={{ mt: 2.5, pt: 2, borderTop: `1px solid ${alpha('#fff', 0.05)}` }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="caption" fontWeight="800" color="text.secondary">
                    {t('networkStatusBreakdown', language)}
                  </Typography>
                  <Stack direction="row" spacing={2}>
                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#14F195', fontWeight: 800 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#14F195' }} />
                      {t('staked', language)} ({metrics.stakedCount})
                    </Typography>
                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#ff9800', fontWeight: 800 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#ff9800' }} />
                      {t('unstaked', language)} ({metrics.unstakedCount})
                    </Typography>
                  </Stack>
                </Stack>

                {/* Split Bar */}
                <Box sx={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', bgcolor: alpha('#fff', 0.05) }}>
                  {metrics.total > 0 ? (
                    <>
                      <Box 
                        sx={{ 
                          width: `${(metrics.stakedCount / metrics.total) * 100}%`, 
                          bgcolor: '#14F195',
                          background: 'linear-gradient(90deg, #00E676 0%, #14F195 100%)',
                          transition: 'width 0.5s ease'
                        }} 
                      />
                      <Box 
                        sx={{ 
                          width: `${(metrics.unstakedCount / metrics.total) * 100}%`, 
                          bgcolor: '#ff9800',
                          background: 'linear-gradient(90deg, #ff9800 0%, #f57c00 100%)',
                          transition: 'width 0.5s ease'
                        }} 
                      />
                    </>
                  ) : (
                    <Box sx={{ width: '100%', bgcolor: alpha('#fff', 0.1) }} />
                  )}
                </Box>
              </Box>
            </Box>
          ) : (
            /* Vault Durations Diagram */
            <Grid container spacing={2}>
              {[
                { months: 1, yieldRate: '+2%', color: '#90caf9' },
                { months: 3, yieldRate: '+6%', color: '#D4AF37' },
                { months: 6, yieldRate: '+12%', color: '#14F195' },
                { months: 12, yieldRate: '+24%', color: '#e040fb' }
              ].map((v) => {
                const data = metrics.durationCounts[v.months] || { count: 0, volume: 0 };
                const pct = metrics.totalStakedVolumeUsd > 0 ? (data.volume / metrics.totalStakedVolumeUsd) * 100 : 0;
                const vaultTitle = t('monthVault', language).replace('{months}', v.months.toString());
                return (
                  <Grid item xs={6} sm={3} key={v.months}>
                    <Box sx={{ p: 2, borderRadius: '16px', bgcolor: alpha('#fff', 0.02), border: `1px solid ${alpha(v.color, 0.2)}` }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" fontWeight="900" sx={{ color: v.color }}>
                          {vaultTitle}
                        </Typography>
                        <Chip label={v.yieldRate} size="small" sx={{ bgcolor: alpha(v.color, 0.15), color: v.color, fontWeight: 900, height: 20, fontSize: '10px' }} />
                      </Stack>
                      <Typography variant="h6" fontWeight="950" color="#fff" sx={{ mt: 1, fontFamily: '"Cinzel", "Vazirmatn", serif' }}>
                        ${data.volume.toFixed(2)} <span style={{ fontSize: '11px', color: alpha('#fff', 0.5) }}>USD</span>
                      </Typography>
                      <LinearProgress variant="determinate" value={pct} sx={{ height: 6, borderRadius: 3, my: 1, bgcolor: alpha('#fff', 0.05), '& .MuiLinearProgress-bar': { bgcolor: v.color } }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                        {t('positionsOfVolume', language).replace('{count}', data.count.toString()).replace('{pct}', pct.toFixed(0))}
                      </Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>

        {/* 4. SEARCH & FILTER CONTROLS */}
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} sx={{ mb: 2.5 }}>
          {/* Tabs */}
          <Tabs
            value={filterTab}
            onChange={(_, val) => setFilterTab(val)}
            sx={{
              minHeight: 42,
              '& .MuiTabs-indicator': { bgcolor: '#D4AF37', height: 3, borderRadius: '3px' },
              '& .MuiTab-root': {
                minHeight: 42,
                color: 'text.secondary',
                fontWeight: '800',
                textTransform: 'none',
                fontSize: '13px',
                px: 2,
                '&.Mui-selected': { color: '#FFDF73' }
              }
            }}
          >
            <Tab 
              value="all" 
              label={t('allReferralsTab', language).replace('{count}', refereesList.length.toString())} 
            />
            <Tab 
              value="staked" 
              label={t('stakedQualifiedTab', language).replace('{count}', metrics.stakedCount.toString())} 
              icon={<CheckCircle2 size={14} color="#14F195" />}
              iconPosition="start"
            />
            <Tab 
              value="unstaked" 
              label={t('notStakedYetTab', language).replace('{count}', metrics.unstakedCount.toString())} 
              icon={<Clock size={14} color="#ff9800" />}
              iconPosition="start"
            />
          </Tabs>

          {/* Search Box */}
          <TextField
            size="small"
            placeholder={t('searchWalletPlaceholder', language)}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={16} color="#D4AF37" />
                </InputAdornment>
              )
            }}
            sx={{
              minWidth: { xs: '100%', md: 280 },
              bgcolor: alpha('#000', 0.4),
              borderRadius: '12px',
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                fontSize: '13px',
                borderRadius: '12px',
                '& fieldset': { borderColor: alpha('#fff', 0.1) },
                '&:hover fieldset': { borderColor: alpha('#D4AF37', 0.4) },
                '&.Mui-focused fieldset': { borderColor: '#D4AF37' }
              }
            }}
          />
        </Stack>

        {/* 5. REFERRALS DATA TABLE */}
        {filteredReferees.length === 0 ? (
          <Box 
            sx={{ 
              py: 8, 
              px: 3, 
              textAlign: 'center', 
              bgcolor: alpha('#000', 0.3), 
              borderRadius: '24px',
              border: `1px dashed ${alpha('#D4AF37', 0.2)}`
            }}
          >
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity }}>
              <Coins size={54} color="#D4AF37" style={{ opacity: 0.3, marginBottom: 16 }} />
            </motion.div>
            <Typography variant="h6" fontWeight="900" color="#fff" mb={1}>
              {refereesList.length === 0 ? t('noReferralsYet', language) : t('noMatchingReferralsFound', language)}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460, mx: 'auto', mb: 3 }}>
              {refereesList.length === 0 
                ? t('noReferralsYetDesc', language) 
                : t('noMatchingReferralsDesc', language)}
            </Typography>

            {refereesList.length === 0 && (
              <Stack direction="row" spacing={1.5} justifyContent="center">
                <Button
                  variant="contained"
                  onClick={handleCopyLink}
                  startIcon={copiedLink ? <Check size={16} /> : <Copy size={16} />}
                  sx={{
                    bgcolor: '#D4AF37',
                    color: '#000',
                    fontWeight: '900',
                    borderRadius: '14px',
                    px: 3,
                    py: 1.2,
                    '&:hover': { bgcolor: '#FFDF73' }
                  }}
                >
                  {copiedLink ? t('linkCopied', language) : t('copyInviteLink', language)}
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleTelegramShare}
                  startIcon={<Send size={16} />}
                  sx={{
                    borderColor: '#0088cc',
                    color: '#0088cc',
                    fontWeight: '800',
                    borderRadius: '14px',
                    px: 2.5,
                    py: 1.2
                  }}
                >
                  {t('shareOnTelegram', language)}
                </Button>
              </Stack>
            )}
          </Box>
        ) : (
          <TableContainer 
            component={Paper} 
            sx={{ 
              bgcolor: alpha('#000', 0.25), 
              borderRadius: '20px', 
              border: `1px solid ${alpha('#fff', 0.06)}`,
              boxShadow: 'none',
              overflowX: 'auto'
            }}
          >
            <Table size="medium">
              <TableHead>
                <TableRow sx={{ bgcolor: alpha('#fff', 0.03) }}>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: '900', fontSize: '11px', letterSpacing: 0.5, borderBottom: `1px solid ${alpha('#fff', 0.08)}` }}>
                    {t('colReferralWallet', language)}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: '900', fontSize: '11px', letterSpacing: 0.5, borderBottom: `1px solid ${alpha('#fff', 0.08)}` }}>
                    {t('colStakingStatus', language)}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: '900', fontSize: '11px', letterSpacing: 0.5, borderBottom: `1px solid ${alpha('#fff', 0.08)}` }}>
                    {t('colStakedAmountUsd', language)}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: '900', fontSize: '11px', letterSpacing: 0.5, borderBottom: `1px solid ${alpha('#fff', 0.08)}` }}>
                    {t('col1UsGoldReward', language)}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: '900', fontSize: '11px', letterSpacing: 0.5, borderBottom: `1px solid ${alpha('#fff', 0.08)}` }}>
                    {t('colLineLevel', language)}
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary', fontWeight: '900', fontSize: '11px', letterSpacing: 0.5, borderBottom: `1px solid ${alpha('#fff', 0.08)}` }}>
                    {t('colJoinedDate', language)}
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'text.secondary', fontWeight: '900', fontSize: '11px', letterSpacing: 0.5, borderBottom: `1px solid ${alpha('#fff', 0.08)}` }}>
                    {t('colVaultDetails', language)}
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredReferees
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((referee) => {
                    const isExpanded = expandedRow === referee.address;
                    const hasStakesList = referee.stakes.length > 0;

                    return (
                      <React.Fragment key={referee.address}>
                        <TableRow 
                          sx={{ 
                            borderBottom: `1px solid ${alpha('#fff', 0.04)}`,
                            bgcolor: referee.hasStaked ? alpha('#14F195', 0.015) : 'transparent',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              bgcolor: alpha('#fff', 0.04)
                            }
                          }}
                        >
                          {/* 1. Wallet Address / Referral Info */}
                          <TableCell sx={{ borderBottom: `1px solid ${alpha('#fff', 0.04)}`, py: 2 }}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              <Box sx={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', border: `1px solid ${referee.hasStaked ? '#14F195' : alpha('#D4AF37', 0.4)}` }}>
                                <Jazzicon diameter={34} seed={jsNumberForAddress(referee.address)} />
                              </Box>
                              <Box>
                                <Stack direction="row" spacing={0.8} alignItems="center">
                                  <Typography variant="body2" fontWeight="800" color="#fff" sx={{ fontFamily: 'monospace' }}>
                                    {formatAddress(referee.address)}
                                  </Typography>
                                  <Tooltip title={copiedAddr === referee.address ? (t('copied', language) || "Copied!") : (t('copyAddress', language) || "Copy Address")}>
                                    <IconButton size="small" onClick={() => handleCopyAddress(referee.address)} sx={{ p: 0.3, color: 'text.secondary', '&:hover': { color: '#D4AF37' } }}>
                                      {copiedAddr === referee.address ? <Check size={12} color="#14F195" /> : <Copy size={12} />}
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title={t('viewOnSolscan', language) || "View on Solscan"}>
                                    <IconButton size="small" onClick={() => window.open(`https://solscan.io/account/${referee.address}`, '_blank')} sx={{ p: 0.3, color: 'text.secondary', '&:hover': { color: '#14F195' } }}>
                                      <ExternalLink size={12} />
                                    </IconButton>
                                  </Tooltip>
                                </Stack>
                                {referee.telegramUsername && (
                                  <Typography variant="caption" sx={{ color: '#0088cc', fontWeight: 700, display: 'block', fontSize: '11px' }}>
                                    @{referee.telegramUsername}
                                  </Typography>
                                )}
                              </Box>
                            </Stack>
                          </TableCell>

                          {/* 2. Staking Status */}
                          <TableCell sx={{ borderBottom: `1px solid ${alpha('#fff', 0.04)}` }}>
                            {referee.hasStaked ? (
                              <Chip 
                                icon={<CheckCircle2 size={13} color="#14F195" />}
                                label={t('statusStakedActive', language)}
                                size="small"
                                sx={{ 
                                  bgcolor: alpha('#14F195', 0.15), 
                                  color: '#14F195', 
                                  fontWeight: '900', 
                                  fontSize: '10px',
                                  border: `1px solid ${alpha('#14F195', 0.3)}`
                                }}
                              />
                            ) : (
                              <Chip 
                                icon={<Clock size={13} color="#ff9800" />}
                                label={t('statusNotStakedYet', language)}
                                size="small"
                                sx={{ 
                                  bgcolor: alpha('#ff9800', 0.12), 
                                  color: '#ff9800', 
                                  fontWeight: '800', 
                                  fontSize: '10px',
                                  border: `1px solid ${alpha('#ff9800', 0.25)}`
                                }}
                              />
                            )}
                          </TableCell>

                          {/* 3. Staked Amount ($ USD) */}
                          <TableCell sx={{ borderBottom: `1px solid ${alpha('#fff', 0.04)}` }}>
                            {referee.hasStaked ? (
                              <Box>
                                <Typography variant="body2" fontWeight="950" color="#FFDF73" sx={{ fontFamily: '"Cinzel", "Vazirmatn", serif' }}>
                                  ${referee.totalStakedUsd.toFixed(2)} <span style={{ fontSize: '10px', color: alpha('#fff', 0.6) }}>USD</span>
                                </Typography>
                                <Typography variant="caption" color="#14F195" sx={{ fontSize: '10px', fontWeight: 800 }}>
                                  {referee.stakesCount > 0 
                                    ? t('vaultPositionsCount', language).replace('{count}', referee.stakesCount.toString()) 
                                    : t('stakedInVault', language)}
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.6, fontFamily: 'monospace' }}>
                                $0.00 USD
                              </Typography>
                            )}
                          </TableCell>

                          {/* 4. 1 usGOLD Reward Status */}
                          <TableCell sx={{ borderBottom: `1px solid ${alpha('#fff', 0.04)}` }}>
                            {referee.hasStaked ? (
                              <Chip 
                                icon={<Award size={14} color="#FFDF73" />}
                                label={t('status1UsGoldQualified', language)}
                                size="small"
                                sx={{ 
                                  bgcolor: alpha('#D4AF37', 0.2), 
                                  color: '#FFDF73', 
                                  fontWeight: '900', 
                                  fontSize: '11px',
                                  border: `1px solid ${alpha('#D4AF37', 0.4)}`,
                                  boxShadow: `0 0 10px ${alpha('#D4AF37', 0.15)}`
                                }}
                              />
                            ) : (
                              <Tooltip title={t('awaitingStakeTooltip', language)}>
                                <Chip 
                                  label={t('statusAwaitingStake', language)}
                                  size="small"
                                  sx={{ 
                                    bgcolor: alpha('#fff', 0.05), 
                                    color: 'text.secondary', 
                                    fontWeight: '700', 
                                    fontSize: '10px' 
                                  }}
                                />
                              </Tooltip>
                            )}
                          </TableCell>

                          {/* 5. Line / Level */}
                          <TableCell sx={{ borderBottom: `1px solid ${alpha('#fff', 0.04)}` }}>
                            <Chip 
                              label={`Line ${referee.line}`}
                              size="small"
                              sx={{ 
                                bgcolor: referee.line === 'A' ? alpha('#2196f3', 0.15) : alpha('#9c27b0', 0.15),
                                color: referee.line === 'A' ? '#90caf9' : '#ce93d8',
                                fontWeight: '800',
                                fontSize: '10px'
                              }}
                            />
                          </TableCell>

                          {/* 6. Joined Date */}
                          <TableCell sx={{ borderBottom: `1px solid ${alpha('#fff', 0.04)}` }}>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(referee.joinedAt).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </Typography>
                          </TableCell>

                          {/* 7. Action / Expand Details */}
                          <TableCell align="right" sx={{ borderBottom: `1px solid ${alpha('#fff', 0.04)}` }}>
                            {hasStakesList ? (
                              <Button
                                size="small"
                                variant="text"
                                onClick={() => setExpandedRow(isExpanded ? null : referee.address)}
                                endIcon={isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                sx={{
                                  color: '#FFDF73',
                                  fontWeight: '800',
                                  fontSize: '11px',
                                  textTransform: 'none'
                                }}
                              >
                                {isExpanded 
                                  ? t('hideVaults', language) 
                                  : t('viewVaults', language).replace('{count}', referee.stakes.length.toString())}
                              </Button>
                            ) : (
                              <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.4 }}>
                                {t('noVaults', language)}
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>

                        {/* Expandable Vault Positions Row */}
                        {hasStakesList && (
                          <TableRow>
                            <TableCell colSpan={7} sx={{ py: 0, borderBottom: isExpanded ? `1px solid ${alpha('#fff', 0.08)}` : 'none' }}>
                              <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                <Box sx={{ py: 2, px: 3, bgcolor: alpha('#000', 0.4), borderRadius: '14px', my: 1, border: `1px solid ${alpha('#D4AF37', 0.15)}` }}>
                                  <Typography variant="caption" fontWeight="900" color="#FFDF73" sx={{ display: 'block', mb: 1.5, letterSpacing: 0.5 }}>
                                    {t('individualPositionsFor', language).replace('{address}', formatAddress(referee.address))}
                                  </Typography>
                                  <Grid container spacing={1.5}>
                                    {referee.stakes.map((stk, sIdx) => (
                                      <Grid item xs={12} sm={6} md={4} key={stk.key || sIdx}>
                                        <Box sx={{ p: 1.5, borderRadius: '12px', bgcolor: alpha('#fff', 0.03), border: `1px solid ${alpha('#fff', 0.06)}` }}>
                                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Typography variant="body2" fontWeight="900" color="#fff">
                                              ${stk.amount.toFixed(2)} USD
                                            </Typography>
                                            <Chip 
                                              label={`${stk.durationMonths}-Month (+${stk.durationMonths * 2}%)`} 
                                              size="small" 
                                              sx={{ bgcolor: alpha('#14F195', 0.15), color: '#14F195', fontWeight: 800, fontSize: '10px', height: 20 }} 
                                            />
                                          </Stack>
                                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                            Status: <span style={{ color: stk.status === 'active' ? '#14F195' : '#FFDF73', fontWeight: 700 }}>{stk.status.toUpperCase()}</span> • Staked: {new Date(stk.startTime).toLocaleDateString()}
                                          </Typography>
                                        </Box>
                                      </Grid>
                                    ))}
                                  </Grid>
                                </Box>
                              </Collapse>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })}
              </TableBody>
            </Table>

            {/* Table Pagination */}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredReferees.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              sx={{
                color: 'text.secondary',
                borderTop: `1px solid ${alpha('#fff', 0.06)}`,
                '& .MuiTablePagination-select': { color: '#fff' },
                '& .MuiTablePagination-actions': { color: '#D4AF37' }
              }}
            />
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Collapse, 
  alpha, 
  useTheme, 
  Chip, 
  ToggleButton, 
  ToggleButtonGroup, 
  TextField, 
  InputAdornment, 
  Tooltip, 
  Stack, 
  Card, 
  CardContent, 
  CardActionArea, 
  Avatar, 
  LinearProgress, 
  Grid,
  Button,
  IconButton
} from '@mui/material';
import { 
  User, 
  ChevronDown, 
  ChevronRight, 
  Users, 
  Star, 
  Filter, 
  BarChart3, 
  TrendingUp, 
  Sparkles,
  Copy,
  Check,
  Info,
  Award,
  Network,
  Search,
  ArrowRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon';
import { useWallet } from '@solana/wallet-adapter-react';
import { database } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { t } from '../translations';

export interface NetworkNode {
  id: string;
  name: string;
  level: number;
  yield?: number;
  teamVolume: number;
  totalMembers?: number;
  children?: NetworkNode[];
  qualifies8?: boolean;
  qualifies6?: boolean;
  qualifies4?: boolean;
  qualifies2?: boolean;
}

const UserAvatar: React.FC<{ name: string; size?: number }> = ({ name, size = 40 }) => {
  const isMe = name === 'Me (You)' || name === 'My Empire';
  const theme = useTheme();
  
  if (isMe) {
    return (
      <Avatar 
        sx={{ 
          width: size, 
          height: size, 
          bgcolor: theme.palette.primary.main,
          color: '#000',
          border: `2px solid ${theme.palette.primary.main}`,
          fontWeight: 'bold',
          fontSize: size * 0.35,
        }}
      >
        YOU
      </Avatar>
    );
  }

  return (
    <Box sx={{ 
      width: size, 
      height: size, 
      borderRadius: '50%', 
      overflow: 'hidden', 
      border: `2px solid ${theme.palette.secondary.main}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: alpha(theme.palette.secondary.main, 0.1)
    }}>
      <Jazzicon diameter={size} seed={jsNumberForAddress(name || '')} />
    </Box>
  );
};

// Simplified flat card for displaying members in a line directory
const MemberCard: React.FC<{ node: NetworkNode; language: string }> = ({ node, language }) => {
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();
  const hasChildren = node.children && node.children.length > 0;

  // Format wallet address nicely for the UI
  const formatAddress = (addr: string) => {
    if (addr.length <= 12) return addr;
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box 
        sx={{ 
          p: 2, 
          bgcolor: alpha('#121214', 0.4),
          backdropFilter: 'blur(8px)',
          border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
          borderRadius: 2,
          mb: 1.5,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            borderColor: alpha(theme.palette.primary.main, 0.25),
            bgcolor: alpha('#121214', 0.6)
          }
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2} justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={2} sx={{ minWidth: 0, flex: 1 }}>
            <UserAvatar name={node.id} size={36} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body1" fontWeight="700" noWrap color="text.primary" sx={{ fontSize: '0.9rem' }}>
                ID: {formatAddress(node.name)}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <Chip 
                  label={`Lvl ${node.level}`} 
                  size="small" 
                  sx={{ 
                    bgcolor: alpha(theme.palette.primary.main, 0.1), 
                    color: 'primary.main',
                    fontWeight: 'bold',
                    height: 18, 
                    fontSize: '0.65rem' 
                  }} 
                />
                <Typography variant="caption" color="text.secondary">
                  • {node.totalMembers || 0} {t('members', language).toLowerCase()}
                </Typography>
              </Stack>
            </Box>
          </Stack>
          
          <Stack direction="row" alignItems="center" spacing={2}>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="caption" color="text.secondary" display="block">
                {t('teamVolume', language)}
              </Typography>
              <Typography variant="body2" fontWeight="bold" color="success.main">
                ${node.teamVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
            </Box>
            {hasChildren && (
              <IconButton 
                size="small" 
                onClick={() => setExpanded(!expanded)} 
                sx={{ color: 'text.secondary' }}
              >
                {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </IconButton>
            )}
          </Stack>
        </Stack>
      </Box>

      {/* Collapsible Children Directory */}
      {hasChildren && (
        <Collapse in={expanded} unmountOnExit>
          <Box sx={{ pl: { xs: 2, sm: 4 }, pr: 0, mb: 1.5, borderLeft: `1px dashed ${alpha(theme.palette.divider, 0.2)}` }}>
            {node.children!.map((child) => (
              <MemberCard key={child.id} node={child} language={language} />
            ))}
          </Box>
        </Collapse>
      )}
    </Box>
  );
};

// Original Tree Node for Visual Explorer Tab
const TreeNode: React.FC<{ node: NetworkNode; isLast?: boolean; language: string }> = ({ node, isLast, language }) => {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const theme = useTheme();

  const isLineNode = node.level === 1 && node.name.startsWith('Line');

  if (isLineNode) {
    return (
      <Card 
        sx={{ 
          mb: 2, 
          bgcolor: alpha('#121214', 0.6), 
          backdropFilter: 'blur(12px)',
          backgroundImage: 'none',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}
      >
        <CardActionArea onClick={() => setExpanded(!expanded)} sx={{ p: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={{ xs: 1.5, sm: 2 }}>
            <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.2), color: 'primary.main', width: { xs: 40, sm: 48 }, height: { xs: 40, sm: 48 }, fontWeight: 'bold' }}>
              {node.name.replace('Line ', '')}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography variant="subtitle1" fontWeight="800" color="primary.main" noWrap>
                  {node.name}
                </Typography>
                <Typography variant="subtitle2" fontWeight="bold">
                  ${node.teamVolume.toFixed(2)}
                </Typography>
              </Stack>
              
              <Box sx={{ width: '100%', mb: 1 }}>
                 <LinearProgress 
                   variant="determinate" 
                   value={Math.min(node.teamVolume / 30000 * 100, 100)} 
                   sx={{ 
                     height: 6, 
                     borderRadius: 4, 
                     bgcolor: alpha(theme.palette.divider, 0.1),
                     '& .MuiLinearProgress-bar': {
                       borderRadius: 4,
                       backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`
                     }
                   }} 
                 />
              </Box>

              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                <Chip size="small" icon={<Star size={10}/>} label={`8%: ${Math.min(node.teamVolume, 3000).toFixed(0)}`} color={node.teamVolume >= 3000 ? "success" : "default"} variant={node.teamVolume >= 3000 ? "filled" : "outlined"} sx={{height: 20, fontSize: '0.6rem', fontWeight: 600}} />
                <Chip size="small" icon={<Star size={10}/>} label={`6%: ${Math.min(node.teamVolume, 5000).toFixed(0)}`} color={node.teamVolume >= 5000 ? "info" : "default"} variant={node.teamVolume >= 5000 ? "filled" : "outlined"} sx={{height: 20, fontSize: '0.6rem', fontWeight: 600}} />
              </Stack>
            </Box>
            <Box sx={{ color: 'text.secondary' }}>
              {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
            </Box>
          </Stack>
        </CardActionArea>
        <Collapse in={expanded} unmountOnExit>
          <Box sx={{ p: { xs: 1, sm: 2 }, pt: 0, bgcolor: alpha('#000', 0.1) }}>
             {hasChildren ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {node.children!.map((child, index) => (
                  <TreeNode key={child.id} node={child} isLast={index === node.children!.length - 1} language={language} />
                ))}
              </Box>
             ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2, fontSize: '0.8rem' }}>
                  {t('noMembersInLine', language)}
                </Typography>
             )}
          </Box>
        </Collapse>
      </Card>
    );
  }

  return (
    <Box sx={{ position: 'relative', pl: node.level <= 1 ? 0 : { xs: 2, sm: 4 }, mt: 1 }}>
      {node.level > 2 && (
        <Box sx={{ position: 'absolute', left: { xs: 8, sm: 16 }, top: 20, width: { xs: 8, sm: 16 }, height: '1px', bgcolor: alpha(theme.palette.divider, 0.5) }} />
      )}
      {node.level > 2 && !isLast && (
        <Box sx={{ position: 'absolute', left: { xs: 8, sm: 16 }, top: 20, bottom: -8, width: '1px', bgcolor: alpha(theme.palette.divider, 0.5) }} />
      )}
      
      <Card 
        sx={{ 
          bgcolor: node.level === 0 ? alpha(theme.palette.primary.main, 0.05) : alpha('#121214', 0.4),
          backdropFilter: 'blur(8px)',
          border: `1px solid ${node.level === 0 ? alpha(theme.palette.primary.main, 0.3) : alpha(theme.palette.divider, 0.08)}`,
          borderRadius: 1.5,
          mb: 0.5
        }}
      >
        <CardActionArea onClick={() => setExpanded(!expanded)} sx={{ p: { xs: 1.25, sm: 1.5 } }}>
          <Stack direction="row" alignItems="center" spacing={{ xs: 1.5, sm: 2 }}>
            <UserAvatar name={node.name} size={node.level === 0 ? 40 : 32} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
               <Typography variant="body2" fontWeight="bold" noWrap sx={{ color: node.level === 0 ? 'primary.main' : 'text.primary', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
                 {node.level === 0 ? t('vault', language) + ' Registry' : `ID: ${node.name}`}
               </Typography>
               <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.25 }}>
                 <Typography variant="caption" color="text.secondary" sx={{ bgcolor: alpha('#fff', 0.1), px: 0.75, py: 0.15, borderRadius: 0.5, fontSize: '0.65rem' }}>
                   Lvl {node.level}
                 </Typography>
                 <Typography variant="caption" fontWeight="bold" sx={{ color: 'success.main', fontSize: '0.65rem' }}>
                   ${node.teamVolume.toFixed(2)}
                 </Typography>
               </Stack>
            </Box>
            
            {hasChildren && (
              <Box sx={{ color: 'text.secondary' }}>
                {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </Box>
            )}
          </Stack>
        </CardActionArea>
      </Card>

      {hasChildren && (
        <Collapse in={expanded} unmountOnExit>
          <Box sx={{ position: 'relative' }}>
             {node.level >= 2 && (
                <Box sx={{ position: 'absolute', left: { xs: 16, sm: 24 }, top: 0, bottom: 16, width: '1px', bgcolor: alpha(theme.palette.divider, 0.2) }} />
             )}
            {node.level <= 100 ? (
              <Box sx={{ mt: 0.5 }}>
                {node.children!.map((child, index) => (
                  <TreeNode 
                    key={child.id} 
                    node={child} 
                    isLast={index === node.children!.length - 1} 
                    language={language}
                  />
                ))}
              </Box>
            ) : (
              <Box sx={{ py: 1, pl: 6 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.75rem' }}>
                    {t('maxDepthReached', language)}
                  </Typography>
              </Box>
            )}
          </Box>
        </Collapse>
      )}
    </Box>
  );
};

export const NetworkTree: React.FC<{ address?: string; language: string }> = ({ address, language }) => {
  const { publicKey } = useWallet();
  const theme = useTheme();
  
  const [treeData, setTreeData] = useState<NetworkNode | null>(null);
  const [allNodes, setAllNodes] = useState<NetworkNode[]>([]);
  const [tabIndex, setTabIndex] = useState(0); // 0 = Line Directory (Simplified), 1 = Pool Qualifiers, 2 = Collapsible Tree Explorer
  const [selectedLine, setSelectedLine] = useState<string>('A'); // Selected line for directory browsing
  const [poolFilterIndex, setPoolFilterIndex] = useState(0); // 0 = Full, 1 = 8%, 2 = 6%, 3 = 4%, 4 = 2%
  
  const [copied, setCopied] = useState(false);
  const [filterLevel, setFilterLevel] = useState<string>('');
  const [filterMembers, setFilterMembers] = useState<string>('');
  const [filterVolume, setFilterVolume] = useState<string>('');

  const activeId = address || publicKey?.toString();
  const hasFilters = filterLevel.trim() !== '' || filterMembers.trim() !== '' || filterVolume.trim() !== '';

  const referralLink = useMemo(() => {
    if (!activeId) return '';
    return `${window.location.origin}?ref=${activeId}`;
  }, [activeId]);

  const handleCopy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredNodes = useMemo(() => {
    if (!hasFilters) return [];
    return allNodes.filter(node => {
       const l = filterLevel ? parseInt(filterLevel, 10) : -1;
       const m = filterMembers ? parseInt(filterMembers, 10) : -1;
       const v = filterVolume ? parseFloat(filterVolume) : -1;
       
       let levelMatch = l === -1 || node.level === l;
       let membersMatch = m === -1 || (node.totalMembers || 0) >= m;
       let volumeMatch = v === -1 || node.teamVolume >= v;
       
       let isUserNode = !node.id.startsWith('line-') && node.id !== activeId;
       
       return levelMatch && membersMatch && volumeMatch && isUserNode;
    });
  }, [hasFilters, allNodes, filterLevel, filterMembers, filterVolume, activeId]);

  const analyticsData = useMemo(() => {
    if (!treeData) return [];
    const lines = ['A', 'B', 'C', 'D'];
    return lines.map(lineStr => {
      const lineNode = treeData.children?.find(c => c.id === `line-${lineStr}`);
      return {
        name: `Line ${lineStr}`,
        volume: lineNode ? lineNode.teamVolume : 0,
        members: lineNode ? (lineNode.totalMembers || 0) : 0,
        node: lineNode
      };
    });
  }, [treeData]);

  const totalNetworkVolume = useMemo(() => {
    return analyticsData.reduce((sum, item) => sum + item.volume, 0);
  }, [analyticsData]);

  const activeLineCount = useMemo(() => {
    return analyticsData.filter(d => d.volume > 0).length;
  }, [analyticsData]);

  const topPerformingLine = useMemo(() => {
    if (analyticsData.length === 0) return 'None';
    const sorted = [...analyticsData].sort((a, b) => b.volume - a.volume);
    return sorted[0].volume > 0 ? sorted[0].name : 'None';
  }, [analyticsData]);

  // Selected line node
  const currentLineNode = useMemo(() => {
    if (!treeData) return null;
    return treeData.children?.find(c => c.id === `line-${selectedLine}`) || null;
  }, [treeData, selectedLine]);

  useEffect(() => {
    if (!activeId) {
      setTreeData(null);
      setAllNodes([]);
      return;
    }
    
    const usersRef = ref(database, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      const myId = activeId;

      if (!data || !data[myId]) {
        setTreeData({
          id: myId,
          name: 'Me (You)',
          level: 0,
          teamVolume: 0,
          children: []
        });
        setAllNodes([]);
        return;
      }

      const flatNodes: NetworkNode[] = [];

      const childrenMap: Record<string, string[]> = {};
      Object.keys(data).forEach(id => {
        const refId = data[id].referrer;
        if (refId) {
          if (!childrenMap[refId]) childrenMap[refId] = [];
          childrenMap[refId].push(id);
        }
      });

      const checkQualifies = (userId: string, minVol: number): boolean => {
         const lines = ['A', 'B', 'C', 'D'];
         for (const line of lines) {
            const lineUsers = Object.keys(data).filter(id => data[id].referrer === userId && (data[id].line === line || (!data[id].line && line === 'A')));
            let vol = 0;
            const visitedSet = new Set<string>();
            lineUsers.forEach(uId => {
               const queue = [uId];
               while (queue.length > 0) {
                  const curr = queue.shift()!;
                  if (visitedSet.has(curr)) continue;
                  visitedSet.add(curr);
                  vol += Number(data[curr]?.totalInvested || 0);
                  const children = childrenMap[curr];
                  if (children) queue.push(...children);
               }
            });
            if (vol < minVol) return false;
         }
         return true;
      };

      const visited = new Set<string>();
      const buildNode = (userId: string, level: number): NetworkNode => {
         if (visited.has(userId)) {
           return {
             id: userId,
             name: userId,
             level: level,
             teamVolume: 0,
             totalMembers: 0,
             children: []
           };
         }
         visited.add(userId);
         let children: NetworkNode[] = [];
         
         if (level !== 0) {
           Object.keys(data).forEach(id => {
              if (data[id].referrer === userId && level < 100) {
                   children.push(buildNode(id, level + 1));
              }
           });
         } else {
            const lines = ['A', 'B', 'C', 'D'];
            lines.forEach(lineStr => {
               const lineUsers = Object.keys(data).filter(id => data[id].referrer === userId && (data[id].line === lineStr || (!data[id].line && lineStr === 'A')));
               let lineVol = 0;
               const lineNodes = lineUsers.map(uId => {
                  const node = buildNode(uId, level + 2);
                  lineVol += node.teamVolume;
                  return node;
               });
               
               children.push({
                  id: `line-${lineStr}`,
                  name: `Line ${lineStr}`,
                  level: level + 1,
                  teamVolume: lineVol,
                  children: lineNodes.length > 0 ? lineNodes : undefined
               });
            });
         }
         
         const childrenVol = children.reduce((acc, c) => acc + (c.teamVolume), 0);
         const myVol = Number(data[userId]?.totalInvested || 0);
         const teamVolume = myVol + childrenVol;
         const totalMembers = children.reduce((acc, c) => acc + (c.totalMembers || 0), 0) + children.length;

         const node: NetworkNode = {
            id: userId,
            name: userId === myId ? 'Me (You)' : `${userId}`,
            level: level,
            teamVolume: teamVolume,
            totalMembers: totalMembers,
            children: children.length > 0 ? children : undefined,
            qualifies8: checkQualifies(userId, 3000),
            qualifies6: checkQualifies(userId, 5000),
            qualifies4: checkQualifies(userId, 10000),
            qualifies2: checkQualifies(userId, 30000)
         };
         if (level !== 1) {
            flatNodes.push(node);
         }
         return node;
      };

      setTreeData(buildNode(myId, 0));
      setAllNodes(flatNodes);
    });

    return () => unsubscribe();
  }, [activeId]);

  if (!activeId) {
     return <Typography color="text.secondary" p={2}>{t('connectWalletViewNet', language)}</Typography>;
  }

  if (!treeData) {
     return <Typography color="text.secondary" p={2}>{t('loadingNetwork', language)}</Typography>;
  }

  const qualifiers8 = allNodes.filter(n => n.qualifies8);
  const qualifiers6 = allNodes.filter(n => n.qualifies6);
  const qualifiers4 = allNodes.filter(n => n.qualifies4);
  const qualifiers2 = allNodes.filter(n => n.qualifies2);

  return (
    <Box sx={{ width: '100%', pb: 4 }}>
      {/* 1. Share / Referral Panel Card */}
      <Card
        sx={{
          mb: 3,
          bgcolor: alpha('#121214', 0.6),
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(212, 175, 55, 0.15)',
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={7}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box 
                  sx={{ 
                    p: 1.25, 
                    bgcolor: alpha('#D4AF37', 0.08), 
                    borderRadius: 2, 
                    border: '1px solid rgba(212, 175, 55, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Network size={22} color="#D4AF37" />
                </Box>
                <Box>
                  <Typography variant="subtitle2" color="primary.main" fontWeight="800" sx={{ letterSpacing: '0.05rem', fontSize: '0.75rem' }}>
                    {t('yourOfficialId', language)}
                  </Typography>
                  <Typography variant="body1" fontWeight="800" color="text.primary" sx={{ fontSize: { xs: '0.85rem', sm: '1rem' } }}>
                    {activeId}
                  </Typography>
                </Box>
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Box 
                sx={{ 
                  p: 1.5, 
                  bgcolor: alpha('#fff', 0.02), 
                  border: '1px solid rgba(255,255,255,0.05)', 
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5
                }}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t('yourLink', language)}
                  </Typography>
                  <Typography variant="body2" color="text.primary" fontWeight="bold" noWrap sx={{ fontSize: '0.8rem' }}>
                    {referralLink}
                  </Typography>
                </Box>
                <Button 
                  variant="contained" 
                  size="small" 
                  onClick={handleCopy}
                  startIcon={copied ? <Check size={14} /> : <Copy size={14} />}
                  sx={{ 
                    bgcolor: copied ? 'success.main' : 'primary.main', 
                    color: '#000',
                    fontWeight: 'bold',
                    px: 2,
                    py: 1,
                    textTransform: 'none',
                    borderRadius: 1.5,
                    whiteSpace: 'nowrap',
                    '&:hover': {
                      bgcolor: copied ? 'success.dark' : 'primary.dark'
                    }
                  }}
                >
                  {copied ? t('copied', language) : t('copyLink', language)}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 2. Overview Statistics */}
      <Card
        sx={{
          mb: 3,
          bgcolor: alpha('#121214', 0.6),
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(212, 175, 55, 0.15)',
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          overflow: 'hidden'
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
            <Box sx={{ p: 1, bgcolor: alpha('#D4AF37', 0.08), borderRadius: 2, border: '1px solid rgba(212, 175, 55, 0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BarChart3 size={20} color="#D4AF37" />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="800" sx={{ fontFamily: '"Cinzel", "Vazirmatn", serif', letterSpacing: '0.05rem', fontSize: { xs: '1rem', sm: '1.15rem' } }}>
                {t('networkAnalytics', language)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t('netAnalyticDesc', language)}
              </Typography>
            </Box>
          </Stack>

          <Grid container spacing={3}>
            {/* Bento statistics */}
            <Grid item xs={12} md={5}>
              <Stack spacing={2}>
                <Box sx={{ p: 2, bgcolor: alpha('#fff', 0.02), border: '1px solid rgba(255,255,255,0.05)', borderRadius: 2.5 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t('totalNetVolume', language)}
                  </Typography>
                  <Typography variant="h4" fontWeight="900" color="primary.main" sx={{ mt: 0.5, fontSize: { xs: '1.5rem', sm: '2.1rem' } }}>
                    ${totalNetworkVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box sx={{ p: 2, bgcolor: alpha('#10b981', 0.04), border: '1px solid rgba(16, 185, 129, 0.15)', borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem' }}>
                        {t('activeLines', language)}
                      </Typography>
                      <Typography variant="h6" fontWeight="bold" sx={{ color: '#10b981', mt: 0.5, fontSize: '1.1rem' }}>
                        {activeLineCount} / 4
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ p: 2, bgcolor: alpha('#3b82f6', 0.04), border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.7rem' }}>
                        {t('highestLine', language)}
                      </Typography>
                      <Typography variant="h6" fontWeight="bold" sx={{ color: '#3b82f6', mt: 0.5, fontSize: '1.1rem' }}>
                        {topPerformingLine !== 'None' ? topPerformingLine.replace('Line ', '') : 'None'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Stack>
            </Grid>

            {/* Recharts chart */}
            <Grid item xs={12} md={7}>
              <Box sx={{ height: { xs: 130, sm: 165 }, width: '100%', pt: 1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analyticsData}
                    margin={{ top: 5, right: 10, left: -25, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="name"
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#888888"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `$${value}`}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: '#121214',
                        borderColor: 'rgba(212, 175, 55, 0.3)',
                        borderRadius: '8px',
                        color: '#fff',
                      }}
                      formatter={(value: any) => [`$${parseFloat(value).toFixed(2)}`, 'Volume']}
                    />
                    <Bar
                      dataKey="volume"
                      radius={[4, 4, 0, 0]}
                    >
                      {analyticsData.map((entry, index) => {
                        const colors = ['#D4AF37', '#0288d1', '#9c27b0', '#e65100'];
                        return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 3. Navigation Modes Tabs */}
      <Box sx={{ mb: 3 }}>
        <ToggleButtonGroup
          value={tabIndex}
          exclusive
          onChange={(_, v) => { if (v !== null) setTabIndex(v); }}
          fullWidth
          sx={{
            '& .MuiToggleButton-root': {
              borderColor: alpha(theme.palette.primary.main, 0.15),
              color: 'text.secondary',
              textTransform: 'none',
              fontWeight: 700,
              py: 1.25,
              fontSize: { xs: '0.75rem', sm: '0.85rem' },
              '&.Mui-selected': {
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                color: 'primary.main',
                borderBottom: `2px solid ${theme.palette.primary.main}`,
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                }
              }
            }
          }}
        >
          <ToggleButton value={0}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Users size={16} />
              <Typography variant="body2" fontWeight="bold">{t('myGoldenNetwork', language)}</Typography>
            </Stack>
          </ToggleButton>
          <ToggleButton value={1}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Award size={16} />
              <Typography variant="body2" fontWeight="bold">{t('globalPools', language)}</Typography>
            </Stack>
          </ToggleButton>
          <ToggleButton value={2}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Network size={16} />
              <Typography variant="body2" fontWeight="bold">{t('visualTree', language)}</Typography>
            </Stack>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Mode 0: Interactive Line Directory (Simplified & Easy to understand) */}
      {tabIndex === 0 && (
        <Box>
          {/* Help Info Guide */}
          <Box 
            sx={{ 
              p: 2, 
              mb: 3, 
              bgcolor: alpha(theme.palette.primary.main, 0.03), 
              border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`, 
              borderRadius: 2,
              display: 'flex',
              gap: 2,
              alignItems: 'flex-start'
            }}
          >
            <Info size={18} color={theme.palette.primary.main} style={{ marginTop: 2, flexShrink: 0 }} />
            <Box>
              <Typography variant="subtitle2" color="primary.main" fontWeight="bold" sx={{ fontSize: '0.85rem' }}>
                How Syndicate Lines Work
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.8rem', lineHeight: 1.5 }}>
                Your downline network is separated into 4 distinct Lines (A, B, C, D). Adding referrals distributes power across these lines. 
                Select a Line Card below to search, filter, and explore all members currently registered under that line.
              </Typography>
            </Box>
          </Box>

          {/* 4 Line Cards Grid */}
          <Typography variant="subtitle2" fontWeight="800" color="text.secondary" sx={{ mb: 1.5, letterSpacing: '0.05rem', fontSize: '0.75rem', textTransform: 'uppercase' }}>
            Select Line to Browse
          </Typography>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {analyticsData.map((line, idx) => {
              const letter = line.name.replace('Line ', '');
              const isSelected = selectedLine === letter;
              
              // Define requirements for pools
              const vol = line.volume;
              let currentProgress = (vol / 3000) * 100;
              let currentTier = 'None';
              if (vol >= 30000) { currentProgress = 100; currentTier = '2% Pool'; }
              else if (vol >= 10000) { currentProgress = (vol / 30000) * 100; currentTier = '4% Pool'; }
              else if (vol >= 5000) { currentProgress = (vol / 10000) * 100; currentTier = '6% Pool'; }
              else if (vol >= 3000) { currentProgress = (vol / 5000) * 100; currentTier = '8% Pool'; }

              return (
                <Grid item xs={6} md={3} key={idx}>
                  <Card
                    sx={{
                      bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.05) : alpha('#121214', 0.4),
                      border: `1px solid ${isSelected ? theme.palette.primary.main : alpha(theme.palette.divider, 0.1)}`,
                      borderRadius: 2,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: isSelected ? `0 4px 16px ${alpha(theme.palette.primary.main, 0.1)}` : 'none',
                      '&:hover': {
                        borderColor: isSelected ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.3),
                        bgcolor: isSelected ? alpha(theme.palette.primary.main, 0.06) : alpha('#121214', 0.6)
                      }
                    }}
                    onClick={() => setSelectedLine(letter)}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
                        <Avatar 
                          sx={{ 
                            bgcolor: isSelected ? 'primary.main' : alpha(theme.palette.primary.main, 0.1), 
                            color: isSelected ? '#000' : 'primary.main',
                            width: 32, 
                            height: 32, 
                            fontWeight: 'bold',
                            fontSize: '0.85rem'
                          }}
                        >
                          {letter}
                        </Avatar>
                        <Chip 
                          label={`${line.members} ${t('members', language).toLowerCase()}`} 
                          size="small"
                          sx={{ height: 18, fontSize: '0.6rem', bgcolor: alpha('#fff', 0.03), border: '1px solid rgba(255,255,255,0.05)' }}
                        />
                      </Stack>
                      
                      <Typography variant="caption" color="text.secondary" display="block">
                        {t('networkVolume', language)}
                      </Typography>
                      <Typography variant="body1" fontWeight="800" sx={{ mt: 0.25, fontSize: '1rem' }}>
                        ${vol.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </Typography>

                      <Box sx={{ mt: 1.5 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.min(currentProgress, 100)} 
                          sx={{ 
                            height: 4, 
                            borderRadius: 1, 
                            bgcolor: alpha(theme.palette.divider, 0.1),
                            '& .MuiLinearProgress-bar': {
                              bgcolor: isSelected ? 'primary.main' : 'primary.dark'
                            }
                          }}
                        />
                        <Stack direction="row" justifyContent="space-between" alignItems="center" mt={0.5}>
                          <Typography variant="caption" sx={{ fontSize: '0.55rem', color: 'text.secondary' }}>
                            Qualified:
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.55rem', color: currentTier !== 'None' ? 'success.main' : 'text.secondary', fontWeight: 'bold' }}>
                            {currentTier !== 'None' ? currentTier : 'None'}
                          </Typography>
                        </Stack>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* Directory Filter Panel */}
          <Card
            sx={{
              p: 2.5,
              mb: 3,
              bgcolor: alpha('#121214', 0.4),
              border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
              borderRadius: 2
            }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <Box sx={{ flex: 1, width: '100%' }}>
                <Typography variant="subtitle1" fontWeight="800" color="primary.main">
                  Line {selectedLine} Directory
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Showing structured members and performance metrics registered under Line {selectedLine}.
                </Typography>
              </Box>

              {/* Dynamic Filter Textfields */}
              <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                <TextField
                  size="small"
                  label={t('maxLevel', language)}
                  type="number"
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  sx={{ width: 80 }}
                  InputProps={{ sx: { fontSize: '0.75rem' } }}
                />
                <TextField
                  size="small"
                  label="Min Vol ($)"
                  type="number"
                  value={filterVolume}
                  onChange={(e) => setFilterVolume(e.target.value)}
                  sx={{ width: 110 }}
                  InputProps={{ sx: { fontSize: '0.75rem' } }}
                />
                {hasFilters && (
                  <Button 
                    variant="text" 
                    size="small" 
                    onClick={() => { setFilterLevel(''); setFilterMembers(''); setFilterVolume(''); }}
                    sx={{ color: 'text.secondary', textTransform: 'none', fontSize: '0.75rem' }}
                  >
                    Clear
                  </Button>
                )}
              </Stack>
            </Stack>

            <Box sx={{ mt: 3 }}>
              {hasFilters ? (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1.5 }}>
                    Filtered Results ({filteredNodes.filter(n => {
                      // Ensure node is part of the currently selected line path
                      let isChildOfLine = false;
                      const checkInLine = (parentNode: NetworkNode | null) => {
                        if (!parentNode || !parentNode.children) return;
                        parentNode.children.forEach(c => {
                          if (c.id === n.id) { isChildOfLine = true; return; }
                          checkInLine(c);
                        });
                      };
                      checkInLine(currentLineNode);
                      return isChildOfLine;
                    }).length})
                  </Typography>
                  {filteredNodes.filter(n => {
                    let isChildOfLine = false;
                    const checkInLine = (parentNode: NetworkNode | null) => {
                      if (!parentNode || !parentNode.children) return;
                      parentNode.children.forEach(c => {
                        if (c.id === n.id) { isChildOfLine = true; return; }
                        checkInLine(c);
                      });
                    };
                    checkInLine(currentLineNode);
                    return isChildOfLine;
                  }).length > 0 ? (
                    filteredNodes.filter(n => {
                      let isChildOfLine = false;
                      const checkInLine = (parentNode: NetworkNode | null) => {
                        if (!parentNode || !parentNode.children) return;
                        parentNode.children.forEach(c => {
                          if (c.id === n.id) { isChildOfLine = true; return; }
                          checkInLine(c);
                        });
                      };
                      checkInLine(currentLineNode);
                      return isChildOfLine;
                    }).map(node => <MemberCard key={node.id} node={node} language={language} />)
                  ) : (
                    <Typography color="text.secondary" variant="body2" sx={{ fontStyle: 'italic', py: 1 }}>
                      {t('noFilterMatch', language)}
                    </Typography>
                  )}
                </Box>
              ) : (
                <Box>
                  {currentLineNode && currentLineNode.children && currentLineNode.children.length > 0 ? (
                    currentLineNode.children.map(child => (
                      <MemberCard key={child.id} node={child} language={language} />
                    ))
                  ) : (
                    <Typography color="text.secondary" variant="body2" sx={{ fontStyle: 'italic', py: 2, textAlign: 'center' }}>
                      {t('noMembersInLine', language)}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </Card>
        </Box>
      )}

      {/* Mode 1: Global Pools (Qualification and Explanation) */}
      {tabIndex === 1 && (
        <Box>
          {/* Pools Guide Grid */}
          <Grid container spacing={2.5} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: alpha('#121214', 0.4), border: `1px solid ${alpha(theme.palette.divider, 0.08)}`, borderRadius: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="primary.main" gutterBottom>
                    How to Qualify for App Pools
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontSize: '0.8rem', lineHeight: 1.6 }}>
                    App Pools reward our strongest syndicate leaders by distributing a permanent percentage of all protocol-wide gold mints. 
                    To qualify for a pool, your total team volume across <strong>all 4 of your main lines (A, B, C, D)</strong> must individually meet or exceed the pool threshold.
                  </Typography>
                  <Stack spacing={1.5}>
                    <Box sx={{ p: 1.5, bgcolor: alpha('#fff', 0.02), borderRadius: 1.5, display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight="bold">8% App Pool</Typography>
                      <Typography variant="body2" color="primary.main" fontWeight="bold">$3,000 / line</Typography>
                    </Box>
                    <Box sx={{ p: 1.5, bgcolor: alpha('#fff', 0.02), borderRadius: 1.5, display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight="bold">6% App Pool</Typography>
                      <Typography variant="body2" color="primary.main" fontWeight="bold">$5,000 / line</Typography>
                    </Box>
                    <Box sx={{ p: 1.5, bgcolor: alpha('#fff', 0.02), borderRadius: 1.5, display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight="bold">4% App Pool</Typography>
                      <Typography variant="body2" color="primary.main" fontWeight="bold">$10,000 / line</Typography>
                    </Box>
                    <Box sx={{ p: 1.5, bgcolor: alpha('#fff', 0.02), borderRadius: 1.5, display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" fontWeight="bold">2% App Pool</Typography>
                      <Typography variant="body2" color="primary.main" fontWeight="bold">$30,000 / line</Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ bgcolor: alpha('#121214', 0.4), border: `1px solid ${alpha(theme.palette.divider, 0.08)}`, borderRadius: 2 }}>
                <CardContent sx={{ p: 2.5 }}>
                  <Typography variant="subtitle1" fontWeight="bold" color="primary.main" gutterBottom>
                    {t('syndicateQualifications', language)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, fontSize: '0.8rem' }}>
                    {t('poolQualificationDesc', language)}
                  </Typography>
                  
                  <Stack spacing={2}>
                    {/* Pool status blocks */}
                    <Box sx={{ p: 1.5, bgcolor: treeData.qualifies8 ? alpha('#10b981', 0.05) : alpha('#fff', 0.01), border: `1px solid ${treeData.qualifies8 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)'}`, borderRadius: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" fontWeight="bold">{t('poolQualification', language).replace('{pool}', '8')}</Typography>
                          <Typography variant="caption" color="text.secondary">{t('minVolumePerLine', language).replace('${amount}', '3,000')}</Typography>
                        </Box>
                        <Chip 
                          label={treeData.qualifies8 ? t('qualified', language) : t('notQualified', language)} 
                          size="small" 
                          color={treeData.qualifies8 ? 'success' : 'default'}
                          sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}
                        />
                      </Stack>
                    </Box>

                    <Box sx={{ p: 1.5, bgcolor: treeData.qualifies6 ? alpha('#10b981', 0.05) : alpha('#fff', 0.01), border: `1px solid ${treeData.qualifies6 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)'}`, borderRadius: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" fontWeight="bold">{t('poolQualification', language).replace('{pool}', '6')}</Typography>
                          <Typography variant="caption" color="text.secondary">{t('minVolumePerLine', language).replace('${amount}', '5,000')}</Typography>
                        </Box>
                        <Chip 
                          label={treeData.qualifies6 ? t('qualified', language) : t('notQualified', language)} 
                          size="small" 
                          color={treeData.qualifies6 ? 'success' : 'default'}
                          sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}
                        />
                      </Stack>
                    </Box>

                    <Box sx={{ p: 1.5, bgcolor: treeData.qualifies4 ? alpha('#10b981', 0.05) : alpha('#fff', 0.01), border: `1px solid ${treeData.qualifies4 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)'}`, borderRadius: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" fontWeight="bold">{t('poolQualification', language).replace('{pool}', '4')}</Typography>
                          <Typography variant="caption" color="text.secondary">{t('minVolumePerLine', language).replace('${amount}', '10,000')}</Typography>
                        </Box>
                        <Chip 
                          label={treeData.qualifies4 ? t('qualified', language) : t('notQualified', language)} 
                          size="small" 
                          color={treeData.qualifies4 ? 'success' : 'default'}
                          sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}
                        />
                      </Stack>
                    </Box>

                    <Box sx={{ p: 1.5, bgcolor: treeData.qualifies2 ? alpha('#10b981', 0.05) : alpha('#fff', 0.01), border: `1px solid ${treeData.qualifies2 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)'}`, borderRadius: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="body2" fontWeight="bold">{t('poolQualification', language).replace('{pool}', '2')}</Typography>
                          <Typography variant="caption" color="text.secondary">{t('minVolumePerLine', language).replace('${amount}', '30,000')}</Typography>
                        </Box>
                        <Chip 
                          label={treeData.qualifies2 ? t('qualified', language) : t('notQualified', language)} 
                          size="small" 
                          color={treeData.qualifies2 ? 'success' : 'default'}
                          sx={{ fontWeight: 'bold', fontSize: '0.65rem' }}
                        />
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Directory of all Qualifiers in selected Pool */}
          <Card sx={{ p: 2.5, bgcolor: alpha('#121214', 0.4), border: `1px solid ${alpha(theme.palette.divider, 0.08)}`, borderRadius: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
              <Box>
                <Typography variant="subtitle1" fontWeight="bold" color="primary.main">
                  Explore Pool Qualifiers
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Browse list of all users in your syndicate qualifying for specific pools.
                </Typography>
              </Box>
              <ToggleButtonGroup
                value={poolFilterIndex}
                exclusive
                onChange={(_, v) => { if (v !== null) setPoolFilterIndex(v); }}
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    borderColor: alpha(theme.palette.primary.main, 0.15),
                    color: 'text.secondary',
                    fontWeight: 'bold',
                    py: 0.5,
                    px: 1.5,
                    fontSize: '0.7rem',
                    '&.Mui-selected': {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                      color: 'primary.main',
                    }
                  }
                }}
              >
                <ToggleButton value={0}>8% ({qualifiers8.length})</ToggleButton>
                <ToggleButton value={1}>6% ({qualifiers6.length})</ToggleButton>
                <ToggleButton value={2}>4% ({qualifiers4.length})</ToggleButton>
                <ToggleButton value={3}>2% ({qualifiers2.length})</ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            <Box sx={{ mt: 2 }}>
              {poolFilterIndex === 0 && (
                <Box>
                  {qualifiers8.length > 0 ? (
                    qualifiers8.map(q => <MemberCard key={q.id} node={q} language={language} />)
                  ) : (
                    <Typography color="text.secondary" variant="body2" sx={{ fontStyle: 'italic', py: 1 }}>
                      {t('noQualifiers', language).replace('{pool}', '8')}
                    </Typography>
                  )}
                </Box>
              )}
              {poolFilterIndex === 1 && (
                <Box>
                  {qualifiers6.length > 0 ? (
                    qualifiers6.map(q => <MemberCard key={q.id} node={q} language={language} />)
                  ) : (
                    <Typography color="text.secondary" variant="body2" sx={{ fontStyle: 'italic', py: 1 }}>
                      {t('noQualifiers', language).replace('{pool}', '6')}
                    </Typography>
                  )}
                </Box>
              )}
              {poolFilterIndex === 2 && (
                <Box>
                  {qualifiers4.length > 0 ? (
                    qualifiers4.map(q => <MemberCard key={q.id} node={q} language={language} />)
                  ) : (
                    <Typography color="text.secondary" variant="body2" sx={{ fontStyle: 'italic', py: 1 }}>
                      {t('noQualifiers', language).replace('{pool}', '4')}
                    </Typography>
                  )}
                </Box>
              )}
              {poolFilterIndex === 3 && (
                <Box>
                  {qualifiers2.length > 0 ? (
                    qualifiers2.map(q => <MemberCard key={q.id} node={q} language={language} />)
                  ) : (
                    <Typography color="text.secondary" variant="body2" sx={{ fontStyle: 'italic', py: 1 }}>
                      {t('noQualifiers', language).replace('{pool}', '2')}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
          </Card>
        </Box>
      )}

      {/* Mode 2: Full Collapsible Tree Explorer */}
      {tabIndex === 2 && (
        <Box>
          <Box 
            sx={{ 
              p: 2, 
              mb: 3, 
              bgcolor: alpha(theme.palette.secondary.main, 0.03), 
              border: `1px solid ${alpha(theme.palette.secondary.main, 0.15)}`, 
              borderRadius: 2,
              display: 'flex',
              gap: 2,
              alignItems: 'flex-start'
            }}
          >
            <Info size={18} color={theme.palette.secondary.main} style={{ marginTop: 2, flexShrink: 0 }} />
            <Box>
              <Typography variant="subtitle2" color="secondary.main" fontWeight="bold" sx={{ fontSize: '0.85rem' }}>
                Visual Collapsible Tree
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.8rem', lineHeight: 1.5 }}>
                Explore your downline in a nested tree directory. Click on any node to expand and collapse its sub-referrals recursively.
              </Typography>
            </Box>
          </Box>

          <Card sx={{ p: 2, bgcolor: alpha('#121214', 0.4), border: `1px solid ${alpha(theme.palette.divider, 0.08)}`, borderRadius: 2 }}>
            <TreeNode node={treeData} isLast={true} language={language} />
          </Card>
        </Box>
      )}
    </Box>
  );
};



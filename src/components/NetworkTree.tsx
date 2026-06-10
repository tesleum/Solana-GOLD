import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Collapse, alpha, useTheme, Tabs, Tab, Chip, ToggleButton, ToggleButtonGroup, TextField, InputAdornment, Tooltip, Stack, Card, CardContent, CardActionArea, Avatar, LinearProgress, Grid } from '@mui/material';
import { User, ChevronDown, ChevronRight, Users, Star, Filter, BarChart3, TrendingUp, Sparkles } from 'lucide-react';
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
      {/* Tree Line Connector */}
      {node.level > 2 && (
        <Box sx={{ position: 'absolute', left: { xs: 8, sm: 16 }, top: 20, width: { xs: 8, sm: 16 }, height: '1px', bgcolor: alpha(theme.palette.divider, 0.5) }} />
      )}
      {/* Vertical Line from Parent */}
      {node.level > 2 && !isLast && (
        <Box sx={{ position: 'absolute', left: { xs: 8, sm: 16 }, top: 20, bottom: -8, width: '1px', bgcolor: alpha(theme.palette.divider, 0.5) }} />
      )}
      
      {/* Node Content */}
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

      {/* Children */}
      {hasChildren && (
        <Collapse in={expanded} unmountOnExit>
          <Box sx={{ position: 'relative' }}>
             {/* Vertical line connecting children to this node */}
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
  const [tabIndex, setTabIndex] = useState(0);

  const [filterLevel, setFilterLevel] = useState<string>('');
  const [filterMembers, setFilterMembers] = useState<string>('');
  const [filterVolume, setFilterVolume] = useState<string>('');

  const activeId = address || publicKey?.toString();

  const hasFilters = filterLevel.trim() !== '' || filterMembers.trim() !== '' || filterVolume.trim() !== '';
  
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
      };
    });
  }, [treeData]);

  const totalNetworkVolume = useMemo(() => {
    return analyticsData.reduce((sum, item) => sum + item.volume, 0);
  }, [analyticsData]);

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

      // Pre-build childrenMap for fast synchronous volume checks
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

      // Build tree
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
              if (data[id].referrer === userId && level < 100) { // Limit to 100 levels to support all generations
                   children.push(buildNode(id, level + 1));
              }
           });
         } else {
            const lines = ['A', 'B', 'C', 'D'];
            lines.forEach(lineStr => {
               const lineUsers = Object.keys(data).filter(id => data[id].referrer === userId && (data[id].line === lineStr || (!data[id].line && lineStr === 'A')));
               let lineVol = 0;
               const lineNodes = lineUsers.map(uId => {
                  const node = buildNode(uId, level + 2); // children of Line node will be level + 2
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
            name: userId === myId ? 'Me (You)' : `${userId}`, // The name logic is handled inside Avatar component now. But wait, I changed it to use last 4 cars there. So pass the full userId here.
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

  const isQualifier = (node: NetworkNode, minVol: number) => {
     if (!node.children || node.children.length < 4) return false;
     // Sort children by volume
     const top4 = [...node.children].sort((a, b) => b.teamVolume - a.teamVolume).slice(0, 4);
     return top4.every(c => c.teamVolume >= minVol);
  };

  const qualifiers8 = allNodes.filter(n => n.qualifies8);
  const qualifiers6 = allNodes.filter(n => n.qualifies6);
  const qualifiers4 = allNodes.filter(n => n.qualifies4);
  const qualifiers2 = allNodes.filter(n => n.qualifies2);

  return (
    <Box sx={{ width: '100%' }}>
      {/* Network Analytics Section */}
      <Card
        id="network-analytics-section"
        sx={{
          mb: 3,
          bgcolor: alpha('#121214', 0.6),
          backdropFilter: 'blur(12px)',
          backgroundImage: 'none',
          border: '1px solid rgba(212, 175, 55, 0.25)',
          borderRadius: 2,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
            <Box sx={{ p: 1, bgcolor: alpha('#D4AF37', 0.1), borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
              <BarChart3 size={20} color="#D4AF37" />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="800" sx={{ color: 'text.primary', fontFamily: '"Cinzel", serif', letterSpacing: '0.05rem', fontSize: { xs: '1rem', sm: '1.250rem' } }}>
                {t('networkAnalytics', language)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}>
                {t('netAnalyticDesc', language)}
              </Typography>
            </Box>
          </Stack>

          <Grid container spacing={{ xs: 2, md: 3 }} alignItems="center">
            {/* Summary Metrics */}
            <Grid item xs={12} md={5}>
              <Stack spacing={2}>
                <Box sx={{ p: 2, bgcolor: alpha('#fff', 0.02), border: '1px solid rgba(255,255,255,0.05)', borderRadius: 3 }}>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {t('totalNetVolume', language)}
                  </Typography>
                  <Typography variant="h4" fontWeight="800" color="primary.main" sx={{ mt: 0.5, fontFamily: '"Montserrat", sans-serif', fontSize: { xs: '1.5rem', sm: '2rem' } }}>
                    ${totalNetworkVolume.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </Typography>
                </Box>

                <Grid container spacing={1.5}>
                  <Grid item xs={6}>
                    <Box sx={{ p: 1.5, bgcolor: alpha('#10b981', 0.05), border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>
                        {t('activeLines', language)}
                      </Typography>
                      <Typography variant="subtitle1" fontWeight="700" sx={{ color: '#10b981', fontSize: '1rem' }}>
                        {analyticsData.filter(d => d.volume > 0).length} / 4
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ p: 1.5, bgcolor: alpha('#3b82f6', 0.05), border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 2 }}>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ fontSize: '0.65rem' }}>
                        {t('highestLine', language)}
                      </Typography>
                      <Typography variant="subtitle1" fontWeight="700" sx={{ color: '#3b82f6', fontSize: '1rem' }}>
                        {analyticsData.length > 0 ? (
                          [...analyticsData].sort((a,b) => b.volume - a.volume)[0].volume > 0 ? (
                            `${[...analyticsData].sort((a,b) => b.volume - a.volume)[0].name.split(' ')[1]}`
                          ) : 'None'
                        ) : 'None'}
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Stack>
            </Grid>

            {/* Small Bar Chart */}
            <Grid item xs={12} md={7}>
              <Box sx={{ height: { xs: 120, sm: 160 }, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analyticsData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
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
                        borderColor: 'rgba(212, 175, 55, 0.4)',
                        borderRadius: '8px',
                        color: '#fff',
                        fontFamily: '"Inter", sans-serif',
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

      <Box sx={{ mb: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          label={t('maxLevel', language)}
          type="number"
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          placeholder="e.g. 5"
          InputProps={{
             startAdornment: <InputAdornment position="start"><Filter size={14} /></InputAdornment>,
             sx: { fontSize: '0.8rem' }
          }}
          sx={{ flex: { xs: '1 1 100%', sm: 1 }, minWidth: 100 }}
        />
        <TextField
          size="small"
          label={t('minMembers', language)}
          type="number"
          value={filterMembers}
          onChange={(e) => setFilterMembers(e.target.value)}
          placeholder="e.g. 10"
          InputProps={{
             startAdornment: <InputAdornment position="start"><Users size={14} /></InputAdornment>,
             sx: { fontSize: '0.8rem' }
          }}
          sx={{ flex: { xs: '1 1 45%', sm: 1 }, minWidth: 100 }}
        />
        <TextField
          size="small"
          label={t('minVol', language)}
          type="number"
          value={filterVolume}
          onChange={(e) => setFilterVolume(e.target.value)}
          placeholder="e.g. 1000"
          InputProps={{
             startAdornment: <InputAdornment position="start">$</InputAdornment>,
             sx: { fontSize: '0.8rem' }
          }}
          sx={{ flex: { xs: '1 1 45%', sm: 1 }, minWidth: 100 }}
        />
      </Box>

      <Box sx={{ mb: 3 }}>
        <ToggleButtonGroup
          value={tabIndex}
          exclusive
          onChange={(_, v) => { if (v !== null) setTabIndex(v); }}
          fullWidth
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              borderColor: alpha(theme.palette.primary.main, 0.2),
              color: 'text.secondary',
              textTransform: 'none',
              fontWeight: 600,
              py: 0.75,
              fontSize: { xs: '0.65rem', sm: '0.75rem' },
              '&.Mui-selected': {
                bgcolor: alpha(theme.palette.primary.main, 0.1),
                color: 'primary.main',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.15),
                }
              }
            }
          }}
        >
          <ToggleButton value={0}>
             {t('full', language)}
          </ToggleButton>
          <ToggleButton value={1}>
             8% ({qualifiers8.length})
          </ToggleButton>
          <ToggleButton value={2}>
             6% ({qualifiers6.length})
          </ToggleButton>
          <ToggleButton value={3}>
             4% ({qualifiers4.length})
          </ToggleButton>
          <ToggleButton value={4}>
             2% ({qualifiers2.length})
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      
      {hasFilters ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary', fontSize: '0.8rem' }}>Filter Results ({filteredNodes.length})</Typography>
          {filteredNodes.length > 0 ? (
            filteredNodes.map(node => <TreeNode key={node.id} node={node} isLast={true} language={language} />)
          ) : (
            <Typography color="text.secondary" variant="body2">{t('noFilterMatch', language)}</Typography>
          )}
        </Box>
      ) : (
        <Box>
          {tabIndex === 0 && (
            <Box>
              <TreeNode node={treeData} isLast={true} language={language} />
            </Box>
          )}

          {tabIndex > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
               {tabIndex === 1 && qualifiers8.map(q => <TreeNode key={q.id} node={q} isLast={true} language={language} />)}
               {tabIndex === 1 && qualifiers8.length === 0 && <Typography color="text.secondary" variant="body2">{t('noQualifiers', language).replace('{pool}', '8')}</Typography>}
               
               {tabIndex === 2 && qualifiers6.map(q => <TreeNode key={q.id} node={q} isLast={true} language={language} />)}
               {tabIndex === 2 && qualifiers6.length === 0 && <Typography color="text.secondary" variant="body2">{t('noQualifiers', language).replace('{pool}', '6')}</Typography>}
               
               {tabIndex === 3 && qualifiers4.map(q => <TreeNode key={q.id} node={q} isLast={true} language={language} />)}
               {tabIndex === 3 && qualifiers4.length === 0 && <Typography color="text.secondary" variant="body2">{t('noQualifiers', language).replace('{pool}', '4')}</Typography>}

               {tabIndex === 4 && qualifiers2.map(q => <TreeNode key={q.id} node={q} isLast={true} language={language} />)}
               {tabIndex === 4 && qualifiers2.length === 0 && <Typography color="text.secondary" variant="body2">{t('noQualifiers', language).replace('{pool}', '2')}</Typography>}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};


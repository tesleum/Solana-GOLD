import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Collapse, alpha, useTheme, Tabs, Tab, Chip, ToggleButton, ToggleButtonGroup, TextField, InputAdornment, Tooltip, Stack, Card, CardContent, CardActionArea, Avatar, LinearProgress, Grid } from '@mui/material';
import { User, ChevronDown, ChevronRight, Users, Star, Filter } from 'lucide-react';
import Jazzicon, { jsNumberForAddress } from 'react-jazzicon';
import { useWallet } from '@solana/wallet-adapter-react';
import { database } from '../firebase';
import { ref, onValue } from 'firebase/database';

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

const TreeNode: React.FC<{ node: NetworkNode; isLast?: boolean }> = ({ node, isLast }) => {
  const [expanded, setExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const theme = useTheme();

  const isLineNode = node.level === 1 && node.name.startsWith('Line');

  if (isLineNode) {
    return (
      <Card 
        sx={{ 
          mb: 2, 
          bgcolor: alpha('#000', 0.2), 
          backgroundImage: 'none',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          borderRadius: 3,
          overflow: 'hidden'
        }}
      >
        <CardActionArea onClick={() => setExpanded(!expanded)} sx={{ p: 2 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.2), color: 'primary.main', width: 48, height: 48, fontWeight: 'bold' }}>
              {node.name.replace('Line ', '')}
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6" fontWeight="800" color="primary.main">
                  {node.name}
                </Typography>
                <Typography variant="subtitle1" fontWeight="bold">
                  ${node.teamVolume.toFixed(2)} Vol
                </Typography>
              </Stack>
              
              <Box sx={{ width: '100%', mb: 1 }}>
                 {/* Visual progress relative to max pool goal (30k) */}
                 <LinearProgress 
                   variant="determinate" 
                   value={Math.min(node.teamVolume / 30000 * 100, 100)} 
                   sx={{ 
                     height: 8, 
                     borderRadius: 4, 
                     bgcolor: alpha(theme.palette.divider, 0.1),
                     '& .MuiLinearProgress-bar': {
                       borderRadius: 4,
                       backgroundImage: `linear-gradient(90deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`
                     }
                   }} 
                 />
              </Box>

              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                <Chip size="small" icon={<Star size={12}/>} label={`8% (3k): ${Math.min(node.teamVolume, 3000).toFixed(0)}`} color={node.teamVolume >= 3000 ? "success" : "default"} variant={node.teamVolume >= 3000 ? "filled" : "outlined"} sx={{height: 24, fontSize: '0.7rem', fontWeight: 600}} />
                <Chip size="small" icon={<Star size={12}/>} label={`6% (5k): ${Math.min(node.teamVolume, 5000).toFixed(0)}`} color={node.teamVolume >= 5000 ? "info" : "default"} variant={node.teamVolume >= 5000 ? "filled" : "outlined"} sx={{height: 24, fontSize: '0.7rem', fontWeight: 600}} />
                <Chip size="small" icon={<Star size={12}/>} label={`4% (10k): ${Math.min(node.teamVolume, 10000).toFixed(0)}`} color={node.teamVolume >= 10000 ? "secondary" : "default"} variant={node.teamVolume >= 10000 ? "filled" : "outlined"} sx={{height: 24, fontSize: '0.7rem', fontWeight: 600}} />
                <Chip size="small" icon={<Star size={12}/>} label={`2% (30k): ${Math.min(node.teamVolume, 30000).toFixed(0)}`} color={node.teamVolume >= 30000 ? "warning" : "default"} variant={node.teamVolume >= 30000 ? "filled" : "outlined"} sx={{height: 24, fontSize: '0.7rem', fontWeight: 600}} />
              </Stack>
            </Box>
            <Box sx={{ color: 'text.secondary' }}>
              {expanded ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
            </Box>
          </Stack>
        </CardActionArea>
        <Collapse in={expanded} unmountOnExit>
          <Box sx={{ p: 2, pt: 0, bgcolor: alpha('#000', 0.1) }}>
             {hasChildren ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {node.children!.map((child, index) => (
                  <TreeNode key={child.id} node={child} isLast={index === node.children!.length - 1} />
                ))}
              </Box>
             ) : (
               <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                 No members in this line yet.
               </Typography>
             )}
          </Box>
        </Collapse>
      </Card>
    );
  }

  return (
    <Box sx={{ position: 'relative', pl: node.level <= 1 ? 0 : 4, mt: 1 }}>
      {/* Tree Line Connector */}
      {node.level > 2 && (
        <Box sx={{ position: 'absolute', left: 16, top: 24, width: 16, height: '1px', bgcolor: alpha(theme.palette.divider, 0.5) }} />
      )}
      {/* Vertical Line from Parent */}
      {node.level > 2 && !isLast && (
        <Box sx={{ position: 'absolute', left: 16, top: 24, bottom: -8, width: '1px', bgcolor: alpha(theme.palette.divider, 0.5) }} />
      )}
      
      {/* Node Content */}
      <Card 
        sx={{ 
          bgcolor: node.level === 0 ? alpha(theme.palette.primary.main, 0.05) : alpha('#fff', 0.03),
          border: `1px solid ${node.level === 0 ? alpha(theme.palette.primary.main, 0.3) : alpha(theme.palette.divider, 0.05)}`,
          borderRadius: 2,
          mb: 1
        }}
      >
        <CardActionArea onClick={() => setExpanded(!expanded)} sx={{ p: 1.5 }}>
          <Stack direction="row" alignItems="center" spacing={2}>
            <UserAvatar name={node.name} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
               <Typography variant="body1" fontWeight="bold" noWrap sx={{ color: node.level === 0 ? 'primary.main' : 'text.primary' }}>
                 {node.level === 0 ? 'My Empire' : `ID: ${node.name}`}
               </Typography>
               <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                 <Typography variant="caption" color="text.secondary" sx={{ bgcolor: alpha('#fff', 0.1), px: 1, py: 0.25, borderRadius: 1 }}>
                   Level {node.level}
                 </Typography>
                 <Typography variant="caption" fontWeight="bold" sx={{ color: 'success.main' }}>
                   Vol: ${node.teamVolume.toFixed(2)}
                 </Typography>
                 {hasChildren && (
                   <Typography variant="caption" color="text.secondary">
                     • {node.children!.length} Direct Refs
                   </Typography>
                 )}
               </Stack>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 0.5 }}>
               {node.level > 1 && node.teamVolume >= 30000 && <Star size={14} color="#ff9800" />}
               {node.level > 1 && node.teamVolume >= 10000 && node.teamVolume < 30000 && <Star size={14} color="#9c27b0" />}
               {node.level > 1 && node.teamVolume >= 5000 && node.teamVolume < 10000 && <Star size={14} color="#0288d1" />}
               {node.level > 1 && node.teamVolume >= 3000 && node.teamVolume < 5000 && <Star size={14} color="#2e7d32" />}
            </Box>

            {hasChildren && (
              <Box sx={{ color: 'text.secondary' }}>
                {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
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
               <Box sx={{ position: 'absolute', left: 24, top: 0, bottom: 16, width: '1px', bgcolor: alpha(theme.palette.divider, 0.2) }} />
             )}
            {node.level <= 100 ? (
              <Box sx={{ mt: 1 }}>
                {node.children!.map((child, index) => (
                  <TreeNode 
                    key={child.id} 
                    node={child} 
                    isLast={index === node.children!.length - 1} 
                  />
                ))}
              </Box>
            ) : (
              <Box sx={{ py: 1, pl: 6 }}>
                 <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                   Maximum display depth reached.
                 </Typography>
              </Box>
            )}
          </Box>
        </Collapse>
      )}
    </Box>
  );
};

export const NetworkTree: React.FC<{ address?: string }> = ({ address }) => {
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
     return <Typography color="text.secondary" p={2}>Connect wallet or enter address to view network tree.</Typography>;
  }

  if (!treeData) {
     return <Typography color="text.secondary" p={2}>Loading network...</Typography>;
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
      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField
          size="small"
          label="Max Level"
          type="number"
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          placeholder="e.g. 5"
          InputProps={{
             startAdornment: <InputAdornment position="start"><Filter size={14} /></InputAdornment>,
          }}
          sx={{ flex: 1, minWidth: 120 }}
        />
        <TextField
          size="small"
          label="Min Members"
          type="number"
          value={filterMembers}
          onChange={(e) => setFilterMembers(e.target.value)}
          placeholder="e.g. 10"
          InputProps={{
             startAdornment: <InputAdornment position="start"><Users size={14} /></InputAdornment>,
          }}
          sx={{ flex: 1, minWidth: 120 }}
        />
        <TextField
          size="small"
          label="Min Vol ($)"
          type="number"
          value={filterVolume}
          onChange={(e) => setFilterVolume(e.target.value)}
          placeholder="e.g. 1000"
          InputProps={{
             startAdornment: <InputAdornment position="start">$</InputAdornment>,
          }}
          sx={{ flex: 1, minWidth: 120 }}
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
              py: 1,
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
            <Users size={16} /> Full
          </ToggleButton>
          <ToggleButton value={1}>
            <Star size={16} /> 8% ({qualifiers8.length})
          </ToggleButton>
          <ToggleButton value={2}>
            <Star size={16} /> 6% ({qualifiers6.length})
          </ToggleButton>
          <ToggleButton value={3}>
            <Star size={16} /> 4% ({qualifiers4.length})
          </ToggleButton>
          <ToggleButton value={4}>
            <Star size={16} /> 2% ({qualifiers2.length})
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
      
      {hasFilters ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>Filter Results ({filteredNodes.length})</Typography>
          {filteredNodes.length > 0 ? (
            filteredNodes.map(node => <TreeNode key={node.id} node={node} isLast={true} />)
          ) : (
            <Typography color="text.secondary">No nodes match the selected filters.</Typography>
          )}
        </Box>
      ) : (
        <Box>
          {tabIndex === 0 && (
            <Box>
              <TreeNode node={treeData} isLast={true} />
            </Box>
          )}

          {tabIndex > 0 && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
               {tabIndex === 1 && qualifiers8.map(q => <TreeNode key={q.id} node={q} isLast={true} />)}
               {tabIndex === 1 && qualifiers8.length === 0 && <Typography color="text.secondary">No qualifiers in the 8% pool yet.</Typography>}
               
               {tabIndex === 2 && qualifiers6.map(q => <TreeNode key={q.id} node={q} isLast={true} />)}
               {tabIndex === 2 && qualifiers6.length === 0 && <Typography color="text.secondary">No qualifiers in the 6% pool yet.</Typography>}
               
               {tabIndex === 3 && qualifiers4.map(q => <TreeNode key={q.id} node={q} isLast={true} />)}
               {tabIndex === 3 && qualifiers4.length === 0 && <Typography color="text.secondary">No qualifiers in the 4% pool yet.</Typography>}

               {tabIndex === 4 && qualifiers2.map(q => <TreeNode key={q.id} node={q} isLast={true} />)}
               {tabIndex === 4 && qualifiers2.length === 0 && <Typography color="text.secondary">No qualifiers in the 2% pool yet.</Typography>}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};


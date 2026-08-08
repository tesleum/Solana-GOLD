import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { database, auth } from "./firebase";
import { ref, onValue, set, get, update, push } from "firebase/database";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User 
} from "firebase/auth";
import axios from "axios";
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  CircularProgress,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Container,
  Paper,
  Grid,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  Collapse,
  TextField,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TablePagination,
  BottomNavigation,
  BottomNavigationAction,
  Stack,
  alpha,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { PublicKey } from "@solana/web3.js";
import { NetworkTree } from "./components/NetworkTree";
import {
  LayoutDashboard,
  Users,
  Network,
  ArrowRightLeft,
  Settings,
  Layers,
  Database,
  Component,
  Disc,
  Aperture,
  Wrench,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Plus,
  Trash2,
  Coins,
  Search,
  RefreshCw,
  Copy,
  Gift,
  Check,
} from "lucide-react";

const drawerWidth = 240;

export default function AdminPanel() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingDB, setLoadingDB] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authButtonLoading, setAuthButtonLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingAuth(false);
      if (currentUser) {
        const checkRef = ref(database, "mlmSettings");
        onValue(checkRef, () => {
          setLoadingDB(false);
        }, { onlyOnce: true });
      } else {
        setLoadingDB(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthButtonLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || "Failed to authenticate.";
      if (err.code === "auth/user-not-found") {
        errMsg = "Admin user not found. Toggle 'Sign Up' if you need to create an account.";
      } else if (err.code === "auth/wrong-password") {
        errMsg = "Incorrect password.";
      } else if (err.code === "auth/invalid-email") {
        errMsg = "Please enter a valid email address.";
      } else if (err.code === "auth/weak-password") {
        errMsg = "Password must be at least 6 characters.";
      } else if (err.code === "auth/email-already-in-use") {
        errMsg = "An account with this email already exists.";
      }
      setAuthError(errMsg);
    } finally {
      setAuthButtonLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
    } catch (err) {
      console.error("Logout error", err);
    }
  };

  if (loadingAuth || (user && loadingDB)) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: "column", 
        gap: 3, 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        background: "radial-gradient(circle at center, #16161a 0%, #000000 100%)" 
      }}>
        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CircularProgress 
            size={80} 
            thickness={2} 
            sx={{ color: alpha('#D4AF37', 0.2) }} 
          />
          <CircularProgress 
            size={80} 
            thickness={2} 
            sx={{ 
              color: '#D4AF37', 
              position: 'absolute',
              animationDuration: '1.5s',
              '& .MuiCircularProgress-circle': {
                strokeLinecap: 'round',
              }
            }} 
          />
          <Box sx={{ position: 'absolute', animation: 'pulse 2s infinite' }}>
            <Settings size={32} color="#D4AF37" />
          </Box>
        </Box>
        <Stack spacing={1} alignItems="center">
          <Typography variant="body2" sx={{ 
            color: '#D4AF37', 
            fontWeight: 800, 
            letterSpacing: '0.2rem', 
            fontFamily: '"Cinzel", serif',
            textShadow: '0 0 10px rgba(212, 175, 55, 0.5)'
          }}>
            SOLANA GOLD
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1rem' }}>
            {loadingAuth ? 'ESTABLISHING SECURE CONNECTION...' : 'SYNCHRONIZING SYSTEM LEDGER...'}
          </Typography>
        </Stack>
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "radial-gradient(circle at center, #16161a 0%, #000000 100%)",
        padding: 3,
      }}>
        <Container maxWidth="xs" id="admin-login-container">
          <Paper elevation={24} sx={{
            p: 4,
            borderRadius: 4,
            border: "1px solid rgba(212, 175, 55, 0.2)",
            backgroundColor: "#121214",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}>
            <Box sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              bgcolor: "rgba(212, 175, 55, 0.1)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              mb: 2,
              border: "1px solid #D4AF37"
            }}>
              <Settings size={28} color="#D4AF37" />
            </Box>
            
            <Typography variant="h5" align="center" sx={{ fontFamily: '"Montserrat", "Inter", sans-serif', fontWeight: 700, mb: 1, color: "#fff" }}>
              Solana Gold
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 3 }}>
              {isSignUp ? "Create Admin Credentials" : "Admin Panel Sign In"}
            </Typography>

            {authError && (
              <Alert severity="error" sx={{ width: "100%", mb: 2, borderRadius: 2 }}>
                {authError}
              </Alert>
            )}

            <Box component="form" onSubmit={handleAuth} sx={{ width: "100%" }}>
              <TextField
                label="Admin Email"
                fullWidth
                margin="normal"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                InputProps={{
                  sx: { borderRadius: 3 }
                }}
              />
              <TextField
                label="Password"
                fullWidth
                margin="normal"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                InputProps={{
                  sx: { borderRadius: 3 }
                }}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={authButtonLoading}
                sx={{
                  mt: 3,
                  mb: 2,
                  py: 1.5,
                  borderRadius: 3,
                  fontWeight: "bold",
                  textTransform: "none",
                  backgroundColor: "#D4AF37",
                  color: "#121214",
                  "&:hover": {
                    backgroundColor: "#F3E5AB"
                  }
                }}
              >
                {authButtonLoading ? (
                  <CircularProgress size={24} sx={{ color: "#121214" }} />
                ) : (
                  isSignUp ? "Sign Up as Admin" : "Sign In"
                )}
              </Button>
            </Box>

            <Button
              fullWidth
              variant="text"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setAuthError("");
              }}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                color: "#D4AF37",
                "&:hover": {
                  backgroundColor: "rgba(212, 175, 55, 0.05)"
                }
              }}
            >
              {isSignUp ? "Already have an account? Sign In" : "Don't have an admin account? Sign Up"}
            </Button>
          </Paper>
        </Container>
      </Box>
    );
  }

  const menuItems = [
    { text: "Dashboard", icon: <LayoutDashboard />, path: "/admin" },
    { text: "Users", icon: <Users />, path: "/admin/users" },
    { text: "Unilevel MLM", icon: <Network />, path: "/admin/mlm" },
    { text: "Staking", icon: <Layers />, path: "/admin/staking" },
    {
      text: "Transactions",
      icon: <ArrowRightLeft />,
      path: "/admin/transactions",
    },
    { text: "Approvals", icon: <Coins />, path: "/admin/approvals" },
    { text: "Settings", icon: <Settings />, path: "/admin/settings" },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => navigate("/")}
            sx={{ mr: 2 }}
          >
            <ArrowLeft />
          </IconButton>
          <Typography
            variant="h6"
            noWrap
            component="div"
            sx={{ fontFamily: '"Cinzel", serif', fontWeight: "bold", flexGrow: 1 }}
          >
            Solana Gold Admin Panel
          </Typography>
          <Button 
            color="inherit" 
            onClick={handleLogout}
            sx={{ 
              borderRadius: 2, 
              border: "1px solid rgba(212, 175, 55, 0.3)",
              color: "#D4AF37",
              px: 3,
              minHeight: "36px",
              fontSize: "0.85rem",
              fontWeight: 600,
              "&:hover": {
                bgcolor: "rgba(212, 175, 55, 0.1)",
                borderColor: "#D4AF37"
              }
            }}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", md: "block" },
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: "border-box",
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: "auto" }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  selected={
                    location.pathname === item.path ||
                    (location.pathname === "/admin/" && item.path === "/admin")
                  }
                  onClick={() => navigate(item.path)}
                >
                  <ListItemIcon
                    sx={{
                      color:
                        location.pathname === item.path
                          ? "primary.main"
                          : "inherit",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    sx={{
                      color:
                        location.pathname === item.path
                          ? "primary.main"
                          : "inherit",
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3 }, pb: { xs: '96px', md: 3 }, minWidth: 0, overflowX: "hidden" }}>
        <Toolbar />
        <Container maxWidth="lg" sx={{ px: { xs: 0, sm: 2 } }}>
          <Routes>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="users" element={<UsersManagement />} />
            <Route path="mlm" element={<UnilevelMLM />} />
            <Route path="staking" element={<AdminStaking />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="approvals" element={<ReferralApprovals />} />
            <Route path="settings" element={<AdminSettings />} />
          </Routes>
        </Container>
      </Box>

      {/* Material 3 Styled Bottom Navigation Bar for Mobile */}
      <Paper 
        elevation={0} 
        sx={{ 
          position: 'fixed', 
          bottom: 0, 
          left: 0, 
          right: 0, 
          display: { xs: 'block', md: 'none' }, 
          zIndex: 1100,
          borderTop: '1px solid rgba(255, 255, 255, 0.05)',
          bgcolor: '#121214',
          backgroundImage: 'none',
          pb: 'env(safe-area-inset-bottom)',
        }}
      >
        <BottomNavigation
          value={
            (() => {
              const idx = menuItems.findIndex(item => 
                location.pathname === item.path || 
                (location.pathname === "/admin/" && item.path === "/admin")
              );
              return idx === -1 ? 0 : idx;
            })()
          }
          onChange={(_, newValue) => {
            if (newValue >= 0 && newValue < menuItems.length) {
              navigate(menuItems[newValue].path);
            }
          }}
          showLabels
          sx={{
            height: 80,
            bgcolor: 'transparent',
            '& .MuiBottomNavigationAction-root': {
              color: 'rgba(255, 255, 255, 0.6)',
              minWidth: 'auto',
              py: 2,
              '&.Mui-selected': {
                color: '#fff',
                '& .pill-indicator': {
                  opacity: 1,
                  transform: 'scaleX(1)',
                },
                '& svg': {
                  color: '#121214',
                }
              },
            },
            '& .MuiBottomNavigationAction-label': {
              fontSize: '0.75rem',
              fontWeight: 500,
              mt: 1,
              transition: 'all 0.2s',
              '&.Mui-selected': {
                fontSize: '0.75rem',
                fontWeight: 800,
              },
            }
          }}
        >
          {menuItems.map((item) => (
            <BottomNavigationAction
              key={item.text}
              label={item.text}
              icon={
                <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Box 
                    className="pill-indicator" 
                    sx={{ 
                      position: 'absolute', 
                      width: '64px', 
                      height: '32px', 
                      bgcolor: '#D4AF37', 
                      borderRadius: '16px', 
                      opacity: 0, 
                      transform: 'scaleX(0.5)', 
                      transition: 'all 0.3s cubic-bezier(0.2, 0, 0, 1)', 
                      zIndex: 0 
                    }} 
                  />
                  <Box sx={{ position: 'relative', zIndex: 1, display: 'flex' }}>
                    {item.icon}
                  </Box>
                </Box>
              }
            />
          ))}
        </BottomNavigation>
      </Paper>

      <style>{`
        @keyframes pulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </Box>
  );
}

function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    investments: 0,
    commissions: 0,
    txCount: 0,
  });

  useEffect(() => {
    const txRef = ref(database, "transactions");
    const usersRef = ref(database, "users");

    const unsubscribeTxs = onValue(txRef, (txSnapshot) => {
      onValue(usersRef, (usersSnapshot) => {
        const txData = txSnapshot.val() || {};
        const usersData = usersSnapshot.val() || {};

        let usersCount = Object.keys(usersData).length;
        let totalInvestments = 0;
        let totalCommissions = 0;
        let totalTxs = 0;

        // Fallback for users that have transactions but might not be in the 'users' object
        Object.keys(txData).forEach((userId) => {
          if (!usersData[userId]) {
            usersCount++;
          }
          const userTxs = txData[userId];
          Object.keys(userTxs).forEach((txId) => {
            totalTxs++;
            const tx = userTxs[txId];
            if (tx.type === "buy") {
              const amount = parseFloat(tx.amount);
              totalInvestments += (isNaN(amount) || amount === 0) ? 10 : amount; // fallback to $10 if generic
            } else if (tx.type === "referral") {
              const amount = parseFloat(tx.amount) || 0;
              totalCommissions += amount; // Approximate
            }
          });
        });

        setStats({
          users: usersCount,
          investments: totalInvestments,
          commissions: totalCommissions,
          txCount: totalTxs,
        });
      }, { onlyOnce: true });
    });
    return () => unsubscribeTxs();
  }, []);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4 }}>
        Dashboard
      </Typography>
      <Grid container spacing={3}>
        {[
          {
            title: "Total Users",
            value: stats.users.toString(),
            icon: <Users size={40} opacity={0.2} />,
          },
          {
            title: "Total Investment",
            value: `$${stats.investments.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
            icon: <Database size={40} opacity={0.2} />,
          },
          {
            title: "Commission Paid",
            value: `${stats.commissions.toLocaleString(undefined, { minimumFractionDigits: 3 })} $usGOLD`,
            icon: <Network size={40} opacity={0.2} />,
          },
          {
            title: "Active Transactions",
            value: stats.txCount.toString(),
            icon: <ArrowRightLeft size={40} opacity={0.2} />,
          },
        ].map((stat, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Card>
              <CardContent sx={{ position: "relative" }}>
                <Typography color="text.secondary" gutterBottom>
                  {stat.title}
                </Typography>
                <Typography variant="h4" color="primary.main">
                  {stat.value}
                </Typography>
                <Box
                  sx={{
                    position: "absolute",
                    right: 16,
                    top: 24,
                    color: "primary.main",
                  }}
                >
                  {stat.icon}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

function UserRow({ row }: { row: any }) {
  const [open, setOpen] = useState(false);
  const [openTree, setOpenTree] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <React.Fragment>
      <TableRow 
        hover
        sx={{ 
          "& > *": { borderBottom: "unset" },
          bgcolor: open ? alpha(theme.palette.primary.main, 0.02) : 'transparent',
          transition: 'background-color 0.2s'
        }}
      >
        <TableCell sx={{ width: 48, p: 1 }}>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
            sx={{ color: open ? 'primary.main' : 'inherit' }}
          >
            {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </IconButton>
        </TableCell>
        <TableCell sx={{ py: 1.5, fontWeight: 500 }}>
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>
            {isMobile && row.address && row.address.length > 12 ? `${row.address.substring(0, 6)}...${row.address.substring(row.address.length - 6)}` : row.address}
          </Typography>
        </TableCell>
        <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Lvl {row.refLvl}</TableCell>
        <TableCell sx={{ display: { xs: 'none', md: 'table-cell' }, fontSize: '0.75rem', color: 'text.secondary' }}>{row.joinedDate}</TableCell>
        <TableCell>
          <Chip
            label={isMobile ? row.status.charAt(0).toUpperCase() : row.status}
            color={row.status === "active" ? "success" : "default"}
            size="small"
            variant={row.status === "active" ? "filled" : "outlined"}
            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}
          />
        </TableCell>
        <TableCell align="right" sx={{ py: 1 }}>
          <Button
            size="small"
            variant="text"
            onClick={() => setOpenTree(true)}
            sx={{ 
              fontSize: '0.7rem', 
              fontWeight: 800, 
              minWidth: 0,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              px: { xs: 1, sm: 2 }
            }}
          >
            {isMobile ? <Network size={16} /> : "View Tree"}
          </Button>
        </TableCell>
      </TableRow>
      <Dialog
        open={openTree}
        onClose={() => setOpenTree(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontFamily: '"Cinzel", serif', fontSize: '1.1rem', fontWeight: 800 }}>Network Tree: {row.id.substring(0, 8)}...</DialogTitle>
        <DialogContent dividers sx={{ p: { xs: 1, sm: 2 } }}>
          <NetworkTree address={row.id} language="EN" />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTree(false)} sx={{ fontWeight: 600 }}>Close</Button>
        </DialogActions>
      </Dialog>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0, borderBottom: open ? `1px solid ${theme.palette.divider}` : 'none' }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: { xs: 1, sm: 2 } }}>
              <Typography variant="overline" sx={{ fontWeight: 800, color: 'primary.main', mb: 2, display: 'block' }}>
                Performance Metrics
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={4}>
                  <Box sx={{ p: 1.5, bgcolor: alpha('#fff', 0.02), borderRadius: 2, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Typography variant="caption" color="text.secondary" display="block">Investment</Typography>
                    <Typography variant="subtitle2" fontWeight="700" color="primary.main">{row.totalInvestment}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <Box sx={{ p: 1.5, bgcolor: alpha('#fff', 0.02), borderRadius: 2, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Typography variant="caption" color="text.secondary" display="block">Commission</Typography>
                    <Typography variant="subtitle2" fontWeight="700" color="success.main">{row.commissionEarned ? row.commissionEarned.split(' ')[0] : '0.00'}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Box sx={{ p: 1.5, bgcolor: alpha('#fff', 0.02), borderRadius: 2, border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Typography variant="caption" color="text.secondary" display="block">Direct Referrals</Typography>
                    <Typography variant="subtitle2" fontWeight="700">{row.directs} Members</Typography>
                  </Box>
                </Grid>
              </Grid>

              <Typography variant="overline" sx={{ fontWeight: 800, color: 'text.secondary', mt: 3, mb: 1, display: 'block' }}>
                Recent Activities
              </Typography>
              {row.history && row.history.length > 0 ? (
                <TableContainer
                  component={Paper}
                  sx={{
                    bgcolor: "transparent",
                    backgroundImage: "none",
                    boxShadow: "none",
                    border: (theme) => `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    borderRadius: 2,
                    mb: 2,
                    overflowX: "auto",
                    WebkitOverflowScrolling: "touch",
                    width: "100%"
                  }}
                >
                  <Table size="small" sx={{ minWidth: { xs: 450, sm: "100%" } }}>
                    <TableHead sx={{ bgcolor: alpha('#fff', 0.03) }}>
                      <TableRow>
                        <TableCell sx={{ fontSize: '0.65rem', fontWeight: 800 }}>DATE</TableCell>
                        <TableCell sx={{ fontSize: '0.65rem', fontWeight: 800 }}>TYPE</TableCell>
                        <TableCell sx={{ fontSize: '0.65rem', fontWeight: 800 }}>AMOUNT</TableCell>
                        {!isMobile && <TableCell sx={{ fontSize: '0.65rem', fontWeight: 800 }}>STATUS</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {row.history.map((tx: any) => (
                        <TableRow key={tx.id} hover>
                          <TableCell sx={{ fontSize: '0.7rem', py: 1 }}>{tx.date ? tx.date.split(' ')[0] : 'N/A'}</TableCell>
                          <TableCell sx={{ fontSize: '0.7rem', py: 1, textTransform: 'capitalize' }}>{tx.type}</TableCell>
                          <TableCell sx={{ fontSize: '0.7rem', py: 1, fontWeight: 700 }}>{tx.amount}</TableCell>
                          {!isMobile && (
                            <TableCell sx={{ py: 0.5 }}>
                              <Chip
                                label={tx.status}
                                color={tx.status === "Completed" ? "success" : "warning"}
                                size="small"
                                sx={{ height: 16, fontSize: '0.6rem', fontWeight: 800 }}
                              />
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', py: 1 }}>
                  No recent activities recorded.
                </Typography>
              )}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}

function UsersManagement() {
  const theme = useTheme();
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  useEffect(() => {
    const txRef = ref(database, "transactions");
    const usersRef = ref(database, "users");

    // Subscribe to both to calculate directs and levels
    const unsubscribeTxs = onValue(txRef, (txSnapshot) => {
      onValue(
        usersRef,
        (usersSnapshot) => {
          const txData = txSnapshot.val();
          const usersData = usersSnapshot.val() || {};

          if (txData) {
            const usersList: any[] = [];

            const directsMap: Record<string, number> = {};
            Object.values(usersData).forEach((u: any) => {
              if (u.referrer) {
                directsMap[u.referrer] = (directsMap[u.referrer] || 0) + 1;
              }
            });

            Object.keys(usersData).forEach((userId) => {
              const uData = usersData[userId] || {};
              const userTxsMap = txData ? txData[userId] || {} : {};
              let totalInv = uData.totalInvested || 0;
              let commEarned = uData.earnings || 0;
              const userHistory: any[] = [];

              Object.keys(userTxsMap).forEach((txId) => {
                const tx = userTxsMap[txId];
                const numericalAmount = parseFloat(tx.amount) || 0;
                userHistory.push({
                  id: txId,
                  date: tx.time,
                  type: tx.type === "buy" ? "Investment" : "Commission",
                  amount: `$${numericalAmount.toFixed(2)}`,
                  status: "Completed",
                  timestamp: tx.timestamp || 0,
                });
              });
              userHistory.sort((a, b) => b.timestamp - a.timestamp);

              // Calculate level by tracing uplines
              let level = 1;
              let current = usersData[userId]?.referrer;
              let depth = 0;
              while (current && usersData[current] && depth < 20) {
                level++;
                current = usersData[current].referrer;
                depth++;
              }

              // Calculate directs
              const directs = directsMap[userId] || 0;

              usersList.push({
                id: userId,
                address:
                  userId.length > 10
                    ? `${userId.substring(0, 6)}...${userId.substring(userId.length - 4)}`
                    : userId,
                refLvl: level,
                joinedDate:
                  userHistory.length > 0
                    ? userHistory[userHistory.length - 1].date
                    : "Unknown",
                status: "active",
                totalInvestment: `$${totalInv.toFixed(2)}`,
                commissionEarned: `${commEarned.toFixed(3)} $usGOLD`,
                directs: directs,
                history: userHistory,
              });
            });
            setUsers(usersList);
          } else {
            setUsers([]);
          }
        },
        { onlyOnce: true },
      );
    });

    return () => unsubscribeTxs();
  }, []);

  return (
    <Box>
      <Typography 
        variant="h4" 
        sx={{ 
          mb: 4, 
          fontFamily: '"Cinzel", serif', 
          fontWeight: 800,
          fontSize: { xs: '1.5rem', sm: '2.125rem' } 
        }}
      >
        Users Management
      </Typography>
      <TableContainer 
        component={Paper}
        sx={{ 
          bgcolor: alpha('#121214', 0.4), 
          backdropFilter: 'blur(10px)',
          backgroundImage: 'none',
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          width: '100%'
        }}
      >
        <Table size="small" sx={{ minWidth: { xs: 550, sm: '100%' } }}>
          <TableHead sx={{ bgcolor: alpha('#fff', 0.05) }}>
            <TableRow>
              <TableCell width={50} />
              <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main', textTransform: 'uppercase' }}>Wallet</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main', textTransform: 'uppercase', display: { xs: 'none', sm: 'table-cell' } }}>Level</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main', textTransform: 'uppercase', display: { xs: 'none', md: 'table-cell' } }}>Joined</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main', textTransform: 'uppercase' }}>Status</TableCell>
              <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main', textTransform: 'uppercase' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row) => (
                <UserRow key={row.id} row={row} />
              ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 100]}
          component="div"
          count={users.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </Box>
  );
}

function UnilevelMLM() {
  const [levels, setLevels] = useState<
    { level: number; percent: number; totalUsers: number }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editPercent, setEditPercent] = useState<string>("");
  const [editUsers, setEditUsers] = useState<string>("");

  useEffect(() => {
    const mlmRef = ref(database, "mlmSettings/levels");
    const unsubscribe = onValue(mlmRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert object/array to sorted array
        let loadedLevels: any[] = [];
        if (Array.isArray(data)) {
          loadedLevels = data.filter(Boolean).map((l, i) => ({
            ...l,
            level: l.level || i + 1,
          }));
        } else {
          loadedLevels = Object.keys(data).map((k) => ({
            ...data[k],
            level: data[k].level || Number(k),
          }));
        }
        loadedLevels.sort((a, b) => a.level - b.level);
        setLevels(loadedLevels);
      } else {
        // Default levels if DB is empty
        const defaultLevels = [
          { level: 1, percent: 20, totalUsers: 0 },
          { level: 2, percent: 10, totalUsers: 0 },
          { level: 3, percent: 8, totalUsers: 0 },
          { level: 4, percent: 6, totalUsers: 0 },
          { level: 5, percent: 5, totalUsers: 0 },
          { level: 6, percent: 4, totalUsers: 0 },
          { level: 7, percent: 3, totalUsers: 0 },
          { level: 8, percent: 2, totalUsers: 0 },
          { level: 9, percent: 1, totalUsers: 0 },
          { level: 10, percent: 1, totalUsers: 0 },
        ];
        setLevels(defaultLevels);
        set(mlmRef, defaultLevels);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddLevel = () => {
    const newLevelNum = levels.length + 1;
    const newLevels = [
      ...levels,
      { level: newLevelNum, percent: 0, totalUsers: 0 },
    ];
    const mlmRef = ref(database, "mlmSettings/levels");
    set(mlmRef, newLevels);
  };

  const handleEditLevel = (index: number) => {
    setEditingIndex(index);
    setEditPercent(levels[index].percent.toString());
    setEditUsers((levels[index].totalUsers || 0).toString());
  };

  const handleSaveLevel = (index: number) => {
    const updatedLevels = [...levels];
    const p = parseFloat(editPercent);
    const u = parseInt(editUsers, 10);
    updatedLevels[index] = {
      ...updatedLevels[index],
      percent: isNaN(p) ? 0 : p,
      totalUsers: isNaN(u) ? 0 : u,
    };

    // To ensure exact keys and structure across the app, store as object indexed by 0..N
    const mlmRef = ref(database, "mlmSettings/levels");
    set(mlmRef, updatedLevels).then(() => {
      setEditingIndex(null);
    });
  };

  const handleDeleteLevel = (levelIndex: number) => {
    const updatedLevels = levels
      .filter((_, i) => i !== levelIndex)
      .map((l, i) => ({ ...l, level: i + 1 }));
    const mlmRef = ref(database, "mlmSettings/levels");
    set(mlmRef, updatedLevels);
  };

  if (loading) return <Typography>Loading...</Typography>;

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Typography variant="h4">Unilevel MLM Structure</Typography>
      </Box>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {levels.map((l, index) => (
          <Grid item xs={12} sm={6} md={3} key={l.level}>
            <Card>
              <CardContent sx={{ position: "relative" }}>
                <IconButton
                  size="small"
                  color="error"
                  sx={{ position: "absolute", top: 8, right: 8 }}
                  onClick={() => handleDeleteLevel(index)}
                >
                  <Typography variant="caption" fontWeight="bold">
                    X
                  </Typography>
                </IconButton>
                <Typography color="text.secondary" gutterBottom>
                  Level {l.level}
                </Typography>
                {editingIndex === index ? (
                  <>
                    <TextField
                      label="Percent"
                      variant="outlined"
                      size="small"
                      type="number"
                      value={editPercent}
                      onChange={(e) => setEditPercent(e.target.value)}
                      InputProps={{
                        endAdornment: (
                          <Typography color="text.secondary">%</Typography>
                        ),
                      }}
                      sx={{ mt: 1, mb: 2, width: "100%" }}
                    />
                    <TextField
                      label="Total Users Required"
                      variant="outlined"
                      size="small"
                      type="number"
                      value={editUsers}
                      onChange={(e) => setEditUsers(e.target.value)}
                      helperText="Min. direct referrals to unlock. Set 0 for no requirement (Unlimited)."
                      sx={{ width: "100%", mb: 2 }}
                    />
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      fullWidth
                      onClick={() => handleSaveLevel(index)}
                    >
                      Save
                    </Button>
                  </>
                ) : (
                  <>
                    <Typography variant="h3" color="primary.main">
                      {l.percent}%
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 1, mb: 2 }}
                    >
                      {l.totalUsers && l.totalUsers > 0
                        ? `${l.totalUsers} Active Downlines Required`
                        : "No Requirement (Unlimited)"}
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      fullWidth
                      onClick={() => handleEditLevel(index)}
                    >
                      Edit
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
      <Button variant="contained" color="primary" onClick={handleAddLevel}>
        Add New Level
      </Button>
    </Box>
  );
}

function Transactions() {
  const [txs, setTxs] = useState<any[]>([]);
  const [filterType, setFilterType] = useState("all");
  const [sortOrder, setSortOrder] = useState("desc");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  useEffect(() => {
    const txRef = ref(database, "transactions");
    const unsubscribe = onValue(txRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const allTxs: any[] = [];
        // data keys are user addresses
        Object.keys(data).forEach((userAddr) => {
          const userTxs = data[userAddr];
          Object.keys(userTxs).forEach((txId) => {
              const tx = userTxs[txId];
              const numericalAmount = parseFloat(tx.amount) || 0;
              allTxs.push({
                id: txId,
                user: userAddr,
                type: tx.type,
                amount: `$${numericalAmount.toFixed(2)}`,
                date: tx.time,
                txId: tx.txId,
                timestamp: tx.timestamp || 0,
                status: "Completed",
              });
          });
        });
        setTxs(allTxs);
      } else {
        setTxs([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const filteredAndSortedTxs = txs
    .filter((tx) => filterType === "all" || tx.type === filterType)
    .sort((a, b) =>
      sortOrder === "desc"
        ? b.timestamp - a.timestamp
        : a.timestamp - b.timestamp,
    );

  return (
    <Box>
      <Typography 
        variant="h4" 
        sx={{ 
          mb: 4, 
          fontFamily: '"Cinzel", serif', 
          fontWeight: 800,
          fontSize: { xs: '1.5rem', sm: '2.125rem' } 
        }}
      >
        Transactions
      </Typography>

      <Box sx={{ display: "flex", gap: { xs: 1.5, sm: 2 }, mb: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
        <FormControl sx={{ minWidth: { xs: '100%', sm: 200 } }} size="small">
          <InputLabel>Filter by Type</InputLabel>
          <Select
            value={filterType}
            label="Filter by Type"
            onChange={(e) => setFilterType(e.target.value)}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="buy">Buy</MenuItem>
            <MenuItem value="referral">Referral</MenuItem>
            <MenuItem value="pool_bonus">Pool Bonus</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: { xs: '100%', sm: 200 } }} size="small">
          <InputLabel>Sort by Date</InputLabel>
          <Select
            value={sortOrder}
            label="Sort by Date"
            onChange={(e) => setSortOrder(e.target.value)}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="desc">Newest First</MenuItem>
            <MenuItem value="asc">Oldest First</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer 
        component={Paper} 
        sx={{ 
          bgcolor: alpha('#121214', 0.4), 
          backdropFilter: 'blur(10px)',
          backgroundImage: 'none',
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          width: '100%'
        }}
      >
        <Table size={isMobile ? "small" : "medium"} sx={{ minWidth: { xs: 500, sm: '100%' } }}>
          <TableHead sx={{ bgcolor: alpha('#fff', 0.05) }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main', textTransform: 'uppercase' }}>Type</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main', textTransform: 'uppercase' }}>User</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main', textTransform: 'uppercase' }}>Amount</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main', textTransform: 'uppercase', display: { xs: 'none', md: 'table-cell' } }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main', textTransform: 'uppercase', display: { xs: 'none', lg: 'table-cell' } }}>TX Hash</TableCell>
              <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main', textTransform: 'uppercase' }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAndSortedTxs.map((row) => (
              <TableRow key={row.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                <TableCell sx={{ py: 1.5 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: '50%', 
                      bgcolor: row.type === 'buy' ? 'info.main' : row.type === 'referral' ? 'success.main' : 'warning.main' 
                    }} />
                    <Typography variant="body2" fontWeight="700" sx={{ textTransform: 'capitalize', fontSize: '0.85rem' }}>
                      {row.type}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell sx={{ py: 1.5 }}>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.75rem' }}>
                    {isMobile ? `${row.user.substring(0, 4)}...${row.user.substring(row.user.length - 4)}` : row.user}
                  </Typography>
                </TableCell>
                <TableCell sx={{ py: 1.5 }}>
                  <Typography variant="body2" fontWeight="800" sx={{ color: '#fff' }}>
                    {row.amount}
                  </Typography>
                </TableCell>
                <TableCell sx={{ py: 1.5, display: { xs: 'none', md: 'table-cell' }, color: 'text.secondary', fontSize: '0.75rem' }}>
                  {row.date}
                </TableCell>
                <TableCell sx={{ py: 1.5, display: { xs: 'none', lg: 'table-cell' } }}>
                  {row.txId ? (
                    <Button
                      href={`https://solscan.io/tx/${row.txId}`}
                      target="_blank"
                      rel="noreferrer"
                      component="a"
                      size="small"
                      variant="text"
                      sx={{ 
                        color: "#D4AF37", 
                        fontFamily: 'monospace', 
                        fontSize: '0.7rem',
                        minWidth: 0,
                        p: 0,
                        textTransform: 'none'
                      }}
                    >
                      {row.txId.substring(0, 8)}...
                    </Button>
                  ) : (
                    <Typography variant="caption" color="text.disabled">N/A</Typography>
                  )}
                </TableCell>
                <TableCell sx={{ py: 1.5 }}>
                  <Chip
                    label={row.status}
                    color={
                      row.status === "Completed"
                        ? "success"
                        : row.status === "Pending"
                          ? "warning"
                          : "error"
                    }
                    size="small"
                    variant="outlined"
                    sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function AdminSettings() {
  const [adminWallet1, setAdminWallet1] = useState(
    "BASAeBAszKMALU1ho4kdYEZzPcbzGrqUm4RWmhAFrvJs",
  );
  const [adminWallet2, setAdminWallet2] = useState(
    "ECJNrSWv4UEMkMQhEUyHuycoVt1hQPyoLsFRfFVaVAPy",
  );
  const [adminWallet3, setAdminWallet3] = useState(
    "4SXeSeJAoi1xyzieCa4SSkDi5qEwABFLWxtpE3wzXLSY",
  );
  const [adminWallet4, setAdminWallet4] = useState(
    "8i8bT6z2ez48EwHtshnXwdV63WreHXT7guFZnRWizqqN",
  );
  const [adminWallet5, setAdminWallet5] = useState(
    "8Nf8G28zV2rk91hw41dpt1aL2eBk2zirqZZAbpJ1cAS8",
  );
  const [apyYield, setApyYield] = useState("8");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [adminVolumes, setAdminVolumes] = useState<{
    w1: number;
    w2: number;
    w3: number;
    w4: number;
    w5: number;
    total: number;
  }>({ w1: 0, w2: 0, w3: 0, w4: 0, w5: 0, total: 0 });
  const [openHistory, setOpenHistory] = useState<number | null>(null);
  const [globalTxs, setGlobalTxs] = useState<any[]>([]);

  useEffect(() => {
    const walletsRef = ref(database, "mlmSettings/adminWallets");
    onValue(walletsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setAdminWallet1(
          data.wallet1 || "BASAeBAszKMALU1ho4kdYEZzPcbzGrqUm4RWmhAFrvJs",
        );
        setAdminWallet2(
          data.wallet2 || "ECJNrSWv4UEMkMQhEUyHuycoVt1hQPyoLsFRfFVaVAPy",
        );
        setAdminWallet3(
          data.wallet3 || "4SXeSeJAoi1xyzieCa4SSkDi5qEwABFLWxtpE3wzXLSY",
        );
        setAdminWallet4(
          data.wallet4 || "8i8bT6z2ez48EwHtshnXwdV63WreHXT7guFZnRWizqqN",
        );
        setAdminWallet5(
          data.wallet5 || "8Nf8G28zV2rk91hw41dpt1aL2eBk2zirqZZAbpJ1cAS8",
        );
      }
    });

    const settingsRef = ref(database, "mlmSettings/general");
    onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setApyYield(data.apyYield || "8");
      }
    });

    const mlmRef = ref(database, "global_transactions");
    onValue(mlmRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        let totalUsd = 0;
        const txs: any[] = [];
        Object.keys(data).forEach((k) => {
          const tx = data[k];
          if (tx.type === "buy") {
            // Note: tx.amount is actually the USD value
            totalUsd += tx.amount || 0;
            txs.push({ ...tx, id: k });
          }
        });
        txs.sort((a, b) => b.timestamp - a.timestamp);
        setGlobalTxs(txs);
        // Compute shares
        setAdminVolumes({
          w1: totalUsd * 0.2,
          w2: totalUsd * 0.08,
          w3: totalUsd * 0.06,
          w4: totalUsd * 0.04,
          w5: totalUsd * 0.02,
          total: totalUsd,
        });
      }
    });
  }, []);

  const validateSolanaAddress = (address: string) => {
    if (!address) return true; // Optional if you want to allow empty, but here we probably want valid keys
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = () => {
    const newErrors: { [key: string]: string } = {};

    if (!validateSolanaAddress(adminWallet1))
      newErrors.wallet1 = "Invalid Solana address";
    if (!validateSolanaAddress(adminWallet2))
      newErrors.wallet2 = "Invalid Solana address";
    if (!validateSolanaAddress(adminWallet3))
      newErrors.wallet3 = "Invalid Solana address";
    if (!validateSolanaAddress(adminWallet4))
      newErrors.wallet4 = "Invalid Solana address";
    if (!validateSolanaAddress(adminWallet5))
      newErrors.wallet5 = "Invalid Solana address";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setSaving(true);
    const saveAdminWallets = set(ref(database, "mlmSettings/adminWallets"), {
      wallet1: adminWallet1,
      wallet2: adminWallet2,
      wallet3: adminWallet3,
      wallet4: adminWallet4,
      wallet5: adminWallet5,
    });

    const saveGeneralSettings = set(ref(database, "mlmSettings/general"), {
      apyYield: apyYield,
    });

    Promise.all([saveAdminWallets, saveGeneralSettings])
      .then(() => {
        setSaving(false);
        alert("Settings saved!");
      })
      .catch((err) => {
        setSaving(false);
        console.error(err);
        alert("Error saving settings");
      });
  };

  const renderWallet = (
    num: number,
    title: string,
    value: string,
    setter: any,
    error: string,
    tvl: number,
    percent: number,
  ) => (
    <Box>
      <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
        <TextField
          label={title}
          fullWidth
          value={value}
          placeholder="Solana Address"
          InputProps={{ readOnly: true }}
          error={!!error}
          helperText={error}
        />
        <Button
          variant="outlined"
          onClick={() => setOpenHistory(num)}
          sx={{ flexShrink: 0, height: 56 }}
        >
          History
        </Button>
      </Box>
      <Typography
        variant="caption"
        sx={{ display: "block", mt: 1, ml: 1, color: "text.secondary" }}
      >
        TVL (Historic): ${tvl.toFixed(2)}
      </Typography>

      <Dialog
        open={openHistory === num}
        onClose={() => setOpenHistory(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{title} - Transactions</DialogTitle>
        <DialogContent dividers>
          <Typography variant="subtitle2" sx={{ mb: 2 }}>
            TVL (Historic): ${tvl.toFixed(2)}
          </Typography>
          <List>
            {globalTxs.length === 0 && (
              <Typography color="text.secondary">
                No historic transactions.
              </Typography>
            )}
            {globalTxs.map((tx) => (
              <ListItem key={tx.id} divider>
                <ListItemText
                  primary={`$${(tx.amount * percent).toFixed(2)}`}
                  secondary={
                    <>
                      {new Date(tx.timestamp).toLocaleString()} •{" "}
                      {tx.txId ? (
                        <a
                          href={`https://solscan.io/tx/${tx.txId}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "#D4AF37" }}
                        >
                          {tx.txId.substring(0, 8)}...
                        </a>
                      ) : (
                        "N/A"
                      )}
                    </>
                  }
                />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenHistory(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 4 }}>
        System Settings
      </Typography>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Admin Wallets (Distribution)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Set the wallet addresses that will receive the distributions for MLM
            referrals wallet addresses when user pay (except admin wallets (20%)
            and app pools(8%,6%,4%,2%): MLM unilevel 60% remain to: deposits for
            referree wallet addresses and pay according to unilevel structure:
            Level 1 address=20% , Level 2 address = 10% , Level 3 address = 8%,
            Level 4 address = 6%, Level 5 address = 5%, Level 6 address = 4%,
            Level 7 address = 3%, Level 8 address = 2%, Level 9 address =
            1%,Level 10 address = 1%
          </Typography>
          {Object.keys(errors).length > 0 && (
            <Alert severity="error" sx={{ mb: 3 }}>
              Please correct the invalid Solana addresses before saving.
            </Alert>
          )}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {renderWallet(
              1,
              "Admin Wallet 1 (Leadership: 20% + MLM Remainder)",
              adminWallet1,
              setAdminWallet1,
              errors.wallet1,
              adminVolumes.w1,
              0.2,
            )}
            {renderWallet(
              2,
              "App Pool A (8% - 3000 volume/line)",
              adminWallet2,
              setAdminWallet2,
              errors.wallet2,
              adminVolumes.w2,
              0.08,
            )}
            {renderWallet(
              3,
              "App Pool B (6% - 5000 volume/line)",
              adminWallet3,
              setAdminWallet3,
              errors.wallet3,
              adminVolumes.w3,
              0.06,
            )}
            {renderWallet(
              4,
              "App Pool C (4% - 10000 volume/line)",
              adminWallet4,
              setAdminWallet4,
              errors.wallet4,
              adminVolumes.w4,
              0.04,
            )}
            {renderWallet(
              5,
              "App Pool D (2% - 30000 volume/line)",
              adminWallet5,
              setAdminWallet5,
              errors.wallet5,
              adminVolumes.w5,
              0.02,
            )}

            <TextField
              label="APY Yield (%)"
              fullWidth
              value={apyYield}
              onChange={(e) => setApyYield(e.target.value)}
              placeholder="e.g. 8"
              type="number"
            />
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving}
              sx={{ alignSelf: "flex-start" }}
            >
              {saving ? "Saving..." : "Save Wallets"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}

function ReferralApprovals() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [rewards, setRewards] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("needs_approval"); // needs_approval, pending, approved, all
  const [loading, setLoading] = useState<boolean>(true);
  const [actioningKey, setActioningKey] = useState<string | null>(null);

  useEffect(() => {
    const rewardsRef = ref(database, "rewards");
    const unsubscribe = onValue(rewardsRef, (snapshot) => {
      setLoading(true);
      if (snapshot.exists()) {
        const data = snapshot.val();
        const loaded: any[] = [];
        Object.keys(data).forEach((referrerId) => {
          const userRewards = data[referrerId];
          Object.keys(userRewards).forEach((rewardKey) => {
            loaded.push({
              key: rewardKey,
              referrerId,
              ...userRewards[rewardKey],
            });
          });
        });
        setRewards(loaded);
      } else {
        setRewards([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleApprove = async (reward: any) => {
    setActioningKey(reward.key);
    try {
      // 1. Update reward status in rewards/${referrerId}/${rewardKey}
      const rewardPath = `rewards/${reward.referrerId}/${reward.key}`;
      await update(ref(database, rewardPath), {
        status: "approved",
        approvedAt: Date.now()
      });

      // 2. Add transaction of type 'referral_reward' to transactions/${referrerId}
      const txPath = `transactions/${reward.referrerId}`;
      await push(ref(database, txPath), {
        type: 'referral_reward',
        amount: '1.0000 usGOLD',
        price: 'Referral',
        details: `Referral Reward for referee: ${reward.referee}`,
        time: new Date().toLocaleString(),
        timestamp: Date.now()
      });

      // 3. Update referrer's earnings and claimedCommissions in user profile
      const userRef = ref(database, `users/${reward.referrerId}`);
      const userSnap = await get(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.val();
        await update(userRef, {
          earnings: (userData.earnings || 0) + 1,
          claimedCommissions: (userData.claimedCommissions || 0) + 1,
          lastActive: Date.now()
        });
      }

      // 4. Log globally
      await push(ref(database, `global_transactions`), {
        type: 'referral_reward_redeemed',
        user: reward.referrerId,
        referee: reward.referee,
        amount: 1,
        timestamp: Date.now()
      });

      alert("Success! Approved referral reward of 1 usGOLD and credited to referrer wallet.");
    } catch (err) {
      console.error("Failed to approve referral reward:", err);
      alert("Failed to approve reward. Please try again.");
    } finally {
      setActioningKey(null);
    }
  };

  const filteredRewards = rewards.filter((r) => {
    if (filter === "all") return true;
    if (filter === "approved") return r.status === "approved" || r.status === "redeemed" || r.type === "referral_stake_completed";
    return r.status === filter;
  }).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  return (
    <Box>
      <Typography 
        variant="h4" 
        sx={{ 
          mb: 4, 
          fontFamily: '"Cinzel", serif', 
          fontWeight: 800,
          fontSize: { xs: '1.5rem', sm: '2.125rem' } 
        }}
      >
        Referral Rewards Approvals
      </Typography>

      <Box sx={{ display: "flex", gap: { xs: 1.5, sm: 2 }, mb: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
        <FormControl sx={{ minWidth: { xs: '100%', sm: 200 } }} size="small">
          <InputLabel>Filter by Status</InputLabel>
          <Select
            value={filter}
            label="Filter by Status"
            onChange={(e) => setFilter(e.target.value)}
            sx={{ borderRadius: 2 }}
          >
            <MenuItem value="needs_approval">Waiting for Approval</MenuItem>
            <MenuItem value="pending">Pending (Referee has not staked)</MenuItem>
            <MenuItem value="approved">Approved & Redeemed</MenuItem>
            <MenuItem value="all">All Rewards</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : filteredRewards.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3, border: '1px solid rgba(255,255,255,0.05)' }}>
          <Typography color="text.secondary">No referral rewards found for this filter.</Typography>
        </Paper>
      ) : (
        <Paper 
          elevation={0}
          sx={{ 
            p: 0, 
            bgcolor: '#121214', 
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            overflowX: 'auto',
            width: '100%'
          }}
        >
          <Table size={isMobile ? "small" : "medium"}>
            <TableHead sx={{ bgcolor: alpha('#fff', 0.05) }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main', textTransform: 'uppercase' }}>Referrer (Recipient)</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main', textTransform: 'uppercase' }}>Referee (Invitee)</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main', textTransform: 'uppercase' }}>Amount</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main', textTransform: 'uppercase' }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main', textTransform: 'uppercase', display: { xs: 'none', md: 'table-cell' } }}>Date Created</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main', textTransform: 'uppercase', textAlign: 'right' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredRewards.map((row) => (
                <TableRow key={row.key} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell sx={{ py: 1.5 }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#fff', fontSize: '0.75rem' }}>
                      {isMobile ? `${row.referrerId.substring(0, 5)}...${row.referrerId.substring(row.referrerId.length - 5)}` : row.referrerId}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1.5 }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.75rem' }}>
                      {isMobile ? `${row.referee.substring(0, 5)}...${row.referee.substring(row.referee.length - 5)}` : row.referee}
                    </Typography>
                    {row.stakeAmount && (
                      <Typography variant="caption" display="block" sx={{ color: '#D4AF37', mt: 0.5, fontSize: '0.7rem', fontWeight: 'bold' }}>
                        Staked: {row.stakeAmount} usGOLD ({row.stakeDurationMonths}m) | {row.solPaid} SOL
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ py: 1.5 }}>
                    <Typography variant="body2" fontWeight="800" sx={{ color: '#fff' }}>
                      1 usGOLD
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1.5 }}>
                    <Chip 
                      label={
                        row.status === "needs_approval" ? "Waiting Approval" :
                        row.status === "pending" ? "Pending" : "Redeemed"
                      }
                      size="small"
                      color={
                        row.status === "needs_approval" ? "warning" :
                        row.status === "pending" ? "default" : "success"
                      }
                      variant="filled"
                    />
                  </TableCell>
                  <TableCell sx={{ py: 1.5, display: { xs: 'none', md: 'table-cell' }, color: 'text.secondary', fontSize: '0.75rem' }}>
                    {new Date(row.timestamp || Date.now()).toLocaleString()}
                  </TableCell>
                  <TableCell sx={{ py: 1.5, textAlign: 'right' }}>
                    {row.status === "needs_approval" && (
                      <Button
                        variant="contained"
                        size="small"
                        color="success"
                        disabled={actioningKey === row.key}
                        onClick={() => handleApprove(row)}
                        sx={{ fontSize: '0.75rem', py: 0.5, borderRadius: '8px' }}
                      >
                        {actioningKey === row.key ? "Crediting..." : "Approve & Credit"}
                      </Button>
                    )}
                    {row.status === "pending" && (
                      <Typography variant="caption" color="text.secondary">Waiting Referee Stake</Typography>
                    )}
                    {(row.status === "approved" || row.status === "redeemed" || row.type === "referral_stake_completed") && (
                      <Typography variant="caption" sx={{ color: '#14F195', fontWeight: 'bold' }}>Credited</Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Box>
  );
}

export function AdminStaking() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // Real-time states
  const [stakes, setStakes] = useState<any[]>([]);
  const [countdowns, setCountdowns] = useState<any>({});
  const [rewards, setRewards] = useState<any[]>([]);
  const [users, setUsers] = useState<any>({});
  const [tgConfig, setTgConfig] = useState({
    botToken: "",
    adminChatId: "",
    userNotificationsEnabled: true
  });

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"stakes" | "pendingRewards" | "stakingLedger" | "firebase">("stakes");
  const [allTransactions, setAllTransactions] = useState<any[]>([]);

  // Actions states
  const [selectedStake, setSelectedStake] = useState<any | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editAmount, setEditAmount] = useState("");
  const [editDuration, setEditDuration] = useState("3");
  const [actioningKey, setActioningKey] = useState<string | null>(null);

  // Firebase Messaging Configuration State
  const [fcmConfig, setFcmConfig] = useState({
    senderId: "909106359671",
    vapidKey: "BJMkzhG0R1kBdo3WVaLd4rElismg-DgG3hNTfoVPvcnOAglMJSr6SZQHC953Dq4sT7EIVLWIEbHtf7v5iff30mA",
    userNotificationsEnabled: true
  });
  const [savingFcm, setSavingFcm] = useState(false);
  const [fcmTestLoading, setFcmTestLoading] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);

  // Single notification state
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);
  const [notifyUserAddress, setNotifyUserAddress] = useState("");
  const [customNotifyMsg, setCustomNotifyMsg] = useState("");
  const [sendingNotify, setSendingNotify] = useState(false);

  // Manual Reward Grant State
  const [manualGrantOpen, setManualGrantOpen] = useState(false);
  const [manualReferrer, setManualReferrer] = useState("");
  const [manualReferee, setManualReferee] = useState("");
  const [manualAmount, setManualAmount] = useState("1");
  const [grantingReward, setGrantingReward] = useState(false);
  const [pendingRewardSearch, setPendingRewardSearch] = useState("");
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const handleGrantManualReward = async () => {
    const referrerAddr = manualReferrer.trim();
    if (!referrerAddr) {
      alert("Please enter a Referrer Wallet Address.");
      return;
    }
    const amt = parseFloat(manualAmount) || 1;
    setGrantingReward(true);
    try {
      const rewardRef = ref(database, `rewards/${referrerAddr}`);
      const newRewardRef = push(rewardRef);
      await set(newRewardRef, {
        type: "referral_reward",
        amount: amt,
        referee: manualReferee.trim() || "Manual Admin Grant",
        status: "approved",
        timestamp: Date.now(),
        approvedAt: Date.now(),
        stakeAmount: "Manual Admin Payout"
      });

      const txPath = `transactions/${referrerAddr}`;
      await push(ref(database, txPath), {
        type: 'referral_reward',
        amount: `${amt.toFixed(4)} usGOLD`,
        price: 'Referral',
        details: `Manual Referral Reward for referee: ${manualReferee.trim() || 'Manual Grant'}`,
        time: new Date().toLocaleString(),
        timestamp: Date.now()
      });

      const userRef = ref(database, `users/${referrerAddr}`);
      const userSnap = await get(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.val();
        await update(userRef, {
          earnings: (userData.earnings || 0) + amt,
          claimedCommissions: (userData.claimedCommissions || 0) + amt,
          lastActive: Date.now()
        });
      }

      await push(ref(database, `global_transactions`), {
        type: 'referral_reward_redeemed',
        user: referrerAddr,
        referee: manualReferee.trim() || 'Manual Grant',
        amount: amt,
        timestamp: Date.now()
      });

      try {
        await axios.post("/api/fcm/notify", {
          title: "🎉 1 usGOLD Referral Reward Credited!",
          body: `Your ${amt} usGOLD referral commission has been credited directly to your wallet balance by Admin!`,
          target: referrerAddr
        });
      } catch (fcmErr) {
        console.warn("Could not notify referrer via FCM:", fcmErr);
      }

      alert(`Successfully credited ${amt} usGOLD referral reward to ${referrerAddr}!`);
      setManualGrantOpen(false);
      setManualReferrer("");
      setManualReferee("");
      setManualAmount("1");
    } catch (err: any) {
      console.error(err);
      alert(`Failed to grant manual reward: ${err.message}`);
    } finally {
      setGrantingReward(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    const stakesRef = ref(database, "stakes");
    const unsubStakes = onValue(stakesRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const list: any[] = [];
        Object.keys(val).forEach((userAddr) => {
          const userStakes = val[userAddr];
          if (userStakes) {
            Object.keys(userStakes).forEach((stakeId) => {
              list.push({
                id: stakeId,
                userAddress: userAddr,
                ...userStakes[stakeId]
              });
            });
          }
        });
        setStakes(list);
      } else {
        setStakes([]);
      }
      setLoading(false);
    });

    const countdownsRef = ref(database, "stakesCountdown");
    const unsubCountdowns = onValue(countdownsRef, (snapshot) => {
      if (snapshot.exists()) {
        setCountdowns(snapshot.val());
      } else {
        setCountdowns({});
      }
    });

    const rewardsRef = ref(database, "rewards");
    const unsubRewards = onValue(rewardsRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const list: any[] = [];
        Object.keys(val).forEach((referrerId) => {
          const userRewards = val[referrerId];
          Object.keys(userRewards).forEach((rewardKey) => {
            list.push({
              key: rewardKey,
              referrerId,
              ...userRewards[rewardKey]
            });
          });
        });
        setRewards(list);
      } else {
        setRewards([]);
      }
    });

    const usersRef = ref(database, "users");
    const unsubUsers = onValue(usersRef, (snapshot) => {
      if (snapshot.exists()) {
        setUsers(snapshot.val());
      } else {
        setUsers({});
      }
    });

    const configRef = ref(database, "mlmSettings/fcmConfig");
    const unsubConfig = onValue(configRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        setFcmConfig({
          senderId: val.senderId || "909106359671",
          vapidKey: val.vapidKey || "BJMkzhG0R1kBdo3WVaLd4rElismg-DgG3hNTfoVPvcnOAglMJSr6SZQHC953Dq4sT7EIVLWIEbHtf7v5iff30mA",
          userNotificationsEnabled: val.userNotificationsEnabled !== false
        });
      }
    });

    const txsRef = ref(database, "transactions");
    const unsubTxs = onValue(txsRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        const list: any[] = [];
        Object.keys(val).forEach((userAddr) => {
          const userTxs = val[userAddr];
          if (userTxs) {
            Object.keys(userTxs).forEach((txId) => {
              list.push({
                id: txId,
                userAddress: userAddr,
                ...userTxs[txId]
              });
            });
          }
        });
        setAllTransactions(list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
      } else {
        setAllTransactions([]);
      }
    });

    return () => {
      unsubStakes();
      unsubCountdowns();
      unsubRewards();
      unsubUsers();
      unsubConfig();
      unsubTxs();
    };
  }, []);

  // Filter stakes
  const filteredStakes = stakes.filter((st) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      st.userAddress.toLowerCase().includes(query) ||
      st.id.toLowerCase().includes(query) ||
      (st.status || "").toLowerCase().includes(query)
    );
  }).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  // Filter pending rewards (referrals pending 1 usgold)
  const pendingRewards = rewards.filter((r) => r.status === "pending" || r.status === "needs_approval");

  // Actions
  const handleCompleteEarly = async (st: any) => {
    if (!window.confirm("Are you sure you want to complete this stake early? This sets the endTime to now, forcing the next server cycle to mark it complete.")) return;
    try {
      await update(ref(database, `stakes/${st.userAddress}/${st.id}`), {
        endTime: Date.now()
      });
      alert("Successfully requested early completion. The server countdown processor will process this in a few seconds.");
    } catch (err) {
      console.error(err);
      alert("Error completing stake early.");
    }
  };

  const handleDeleteStake = async (st: any) => {
    if (!window.confirm("Are you sure you want to delete this stake? This action cannot be undone.")) return;
    try {
      await set(ref(database, `stakes/${st.userAddress}/${st.id}`), null);
      await set(ref(database, `stakesCountdown/${st.userAddress}/${st.id}`), null);
      alert("Stake deleted successfully.");
    } catch (err) {
      console.error(err);
      alert("Error deleting stake.");
    }
  };

  const handleEditStake = (st: any) => {
    setSelectedStake(st);
    setEditAmount(st.amount.toString());
    setEditDuration(st.durationMonths.toString());
    setEditDialogOpen(true);
  };

  const handleSaveEditStake = async () => {
    if (!selectedStake) return;
    const amt = parseFloat(editAmount);
    const months = parseInt(editDuration, 10);
    if (isNaN(amt) || amt <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    try {
      const profitRate = months * 0.02;
      const durationDays = months * 30;
      const durationMs = durationDays * 86400 * 1000;
      const endTime = (selectedStake.startTime || Date.now()) + durationMs;
      const totalExpectedProfit = amt * profitRate;

      await update(ref(database, `stakes/${selectedStake.userAddress}/${selectedStake.id}`), {
        amount: amt,
        durationMonths: months,
        profitRate,
        endTime,
        totalExpectedProfit
      });

      setEditDialogOpen(false);
      setSelectedStake(null);
      alert("Stake updated successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to update stake.");
    }
  };

  const handleSaveFcmConfig = async () => {
    setSavingFcm(true);
    try {
      await set(ref(database, "mlmSettings/fcmConfig"), fcmConfig);
      alert("Firebase Messaging Configuration saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save Firebase configuration.");
    } finally {
      setSavingFcm(false);
    }
  };

  const handleTestFcm = async () => {
    if (!fcmConfig.senderId) {
      alert("Please configure Firebase Sender ID first.");
      return;
    }
    setFcmTestLoading(true);
    try {
      await axios.post("/api/fcm/notify", {
        title: "🔔 Firebase Notification Active!",
        body: "This is an official test notification confirming your Firebase Messaging API setup works!",
        target: "all"
      });
      alert("FCM test broadcast issued successfully! Sent to all online subscribers and database inboxes.");
    } catch (err: any) {
      console.error(err);
      alert(`Failed to send FCM test: ${err.response?.data?.error || err.message}`);
    } finally {
      setFcmTestLoading(false);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastMsg.trim()) {
      alert("Please enter a message to broadcast.");
      return;
    }
    setBroadcasting(true);
    try {
      const res = await axios.post("/api/fcm/notify", {
        title: "📢 Official Announcement",
        body: broadcastMsg,
        target: "all"
      });
      alert(`Broadcast sent! FCM Push Notification + Database Sync targets contacted: ${res.data?.results?.length || 0}`);
      setBroadcastMsg("");
    } catch (err: any) {
      console.error(err);
      alert(`Broadcast failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setBroadcasting(false);
    }
  };

  const handleOpenNotifyUser = (userAddress: string) => {
    setNotifyUserAddress(userAddress);
    const userProfile = users[userAddress];
    const fcmToken = userProfile?.fcmToken || "";
    if (!fcmToken) {
      alert("Note: This user has not enabled push alerts. The message will be securely queued to their in-app database inbox.");
    }
    setCustomNotifyMsg(`Hello! This is an update regarding your Solana Gold usGOLD staking vault.`);
    setNotifyDialogOpen(true);
  };

  const handleSendDirectNotify = async () => {
    if (!customNotifyMsg.trim()) return;

    setSendingNotify(true);
    try {
      await axios.post("/api/fcm/notify", {
        title: "✉️ Message from Solana Gold Support",
        body: customNotifyMsg,
        target: notifyUserAddress
      });
      alert("Notification dispatched successfully to target user's device & inbox!");
      setNotifyDialogOpen(false);
    } catch (err: any) {
      console.error(err);
      alert(`Failed to send: ${err.response?.data?.error || err.message}`);
    } finally {
      setSendingNotify(false);
    }
  };

  // Inline Referral Approval helper
  const handleApproveReward = async (reward: any) => {
    setActioningKey(reward.key);
    try {
      const rewardPath = `rewards/${reward.referrerId}/${reward.key}`;
      await update(ref(database, rewardPath), {
        status: "approved",
        approvedAt: Date.now()
      });

      const txPath = `transactions/${reward.referrerId}`;
      await push(ref(database, txPath), {
        type: 'referral_reward',
        amount: '1.0000 usGOLD',
        price: 'Referral',
        details: `Referral Reward for referee: ${reward.referee}`,
        time: new Date().toLocaleString(),
        timestamp: Date.now()
      });

      const userRef = ref(database, `users/${reward.referrerId}`);
      const userSnap = await get(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.val();
        await update(userRef, {
          earnings: (userData.earnings || 0) + 1,
          claimedCommissions: (userData.claimedCommissions || 0) + 1,
          lastActive: Date.now()
        });
      }

      await push(ref(database, `global_transactions`), {
        type: 'referral_reward_redeemed',
        user: reward.referrerId,
        referee: reward.referee,
        amount: 1,
        timestamp: Date.now()
      });

      // Notify referrer on Firebase Messaging!
      if (reward.referrerId) {
        try {
          await axios.post("/api/fcm/notify", {
            title: "🎉 Referral Reward Approved!",
            body: `Your 1.0000 usGOLD referral commission has been approved and credited to your wallet balance! Thank you for sharing Solana Gold.`,
            target: reward.referrerId
          });
        } catch (fcmErr) {
          console.warn("Could not notify referrer on FCM:", fcmErr);
        }
      }

      alert("Approved referral reward of 1 usGOLD and credited successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to approve reward.");
    } finally {
      setActioningKey(null);
    }
  };

  // Calculations
  const totalStakedVolume = stakes.reduce((sum, st) => sum + (parseFloat(st.amount) || 0), 0);
  const activeStakesCount = stakes.filter(st => st.status === "active").length;

  return (
    <Box>
      <Typography 
        variant="h4" 
        sx={{ 
          mb: 4, 
          fontFamily: '"Cinzel", serif', 
          fontWeight: 800,
          fontSize: { xs: '1.5rem', sm: '2.125rem' } 
        }}
      >
        Staking Management
      </Typography>

      {/* Metrics Dashboard */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ position: "relative" }}>
              <Typography color="text.secondary" gutterBottom>Total usGOLD Staked</Typography>
              <Typography variant="h4" color="primary.main">{totalStakedVolume.toLocaleString()} usGOLD</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ position: "relative" }}>
              <Typography color="text.secondary" gutterBottom>Active Vaults</Typography>
              <Typography variant="h4" color="success.main">{activeStakesCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ position: "relative" }}>
              <Typography color="text.secondary" gutterBottom>Pending Referrals</Typography>
              <Typography variant="h4" color="warning.main">{pendingRewards.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ position: "relative" }}>
              <Typography color="text.secondary" gutterBottom>FCM Registered Users</Typography>
              <Typography variant="h4" color="info.main">
                {Object.values(users).filter((u: any) => !!u.fcmToken).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Section Tabs */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button 
          variant={activeTab === "stakes" ? "contained" : "outlined"}
          onClick={() => setActiveTab("stakes")}
          sx={{ borderRadius: 2 }}
        >
          User Stakes List
        </Button>
        <Button 
          variant={activeTab === "pendingRewards" ? "contained" : "outlined"}
          onClick={() => setActiveTab("pendingRewards")}
          sx={{ borderRadius: 2 }}
        >
          Referrals Pending ({pendingRewards.length})
        </Button>
        <Button 
          variant={activeTab === "stakingLedger" ? "contained" : "outlined"}
          onClick={() => setActiveTab("stakingLedger")}
          sx={{ borderRadius: 2 }}
        >
          All Staking Transactions ({allTransactions.length})
        </Button>
        <Button 
          variant={activeTab === "firebase" ? "contained" : "outlined"}
          onClick={() => setActiveTab("firebase")}
          sx={{ borderRadius: 2 }}
        >
          Firebase Settings & Broadcasts
        </Button>
      </Stack>

      {activeTab === "stakes" && (
        <Box>
          <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
            <TextField
              size="small"
              placeholder="Search by User Address, Stake ID, Status..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ flexGrow: 1 }}
              InputProps={{
                startAdornment: <Search size={18} style={{ marginRight: 8, opacity: 0.5 }} />
              }}
            />
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : filteredStakes.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No stakes found match this filter.</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} sx={{ bgcolor: '#121214', borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: alpha('#fff', 0.05) }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main' }}>User Wallet</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main' }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main' }}>Duration</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main' }}>Time Left / Countdown</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main', textAlign: 'right' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredStakes.map((st) => {
                    const cd = countdowns[st.userAddress]?.[st.id] || {};
                    const hoursLeft = cd.remainingSec ? Math.floor(cd.remainingSec / 3600) : 0;
                    const daysLeft = Math.floor(hoursLeft / 24);
                    const remHours = hoursLeft % 24;
                    const isCompleted = st.status === "completed" || (cd.remainingSec !== undefined && cd.remainingSec <= 0);

                    return (
                      <TableRow key={st.id} hover>
                        <TableCell sx={{ py: 1.5 }}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                            {st.userAddress}
                          </Typography>
                          {users[st.userAddress]?.fcmToken && (
                            <Chip 
                              label="FCM Push Active" 
                              size="small" 
                              color="info" 
                              variant="outlined"
                              sx={{ height: 16, fontSize: '8px', mt: 0.5 }} 
                            />
                          )}
                        </TableCell>
                        <TableCell sx={{ py: 1.5, fontWeight: 700 }}>
                          {st.amount} usGOLD
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          {st.durationMonths} Months
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          <Chip 
                            label={isCompleted ? "Completed" : "Active"} 
                            color={isCompleted ? "success" : "warning"} 
                            size="small"
                            sx={{ height: 20, fontSize: '0.65rem', fontWeight: 800 }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 1.5 }}>
                          {isCompleted ? (
                            <Typography variant="caption" color="success.main" sx={{ fontWeight: 'bold' }}>Payout Complete</Typography>
                          ) : cd.remainingSec !== undefined ? (
                            <Box sx={{ width: '100%' }}>
                              <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                                {daysLeft > 0 ? `${daysLeft}d ` : ""}{remHours}h remaining
                              </Typography>
                              <LinearProgress 
                                variant="determinate" 
                                value={cd.progressPercent || 0} 
                                sx={{ height: 4, borderRadius: 2, bgcolor: alpha('#fff', 0.05) }} 
                              />
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.secondary">Calibrating...</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ py: 1.5, textAlign: 'right' }}>
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button 
                              size="small" 
                              variant="text" 
                              onClick={() => handleOpenNotifyUser(st.userAddress)}
                              sx={{ fontSize: '0.7rem', color: 'info.main' }}
                            >
                              Message
                            </Button>
                            {!isCompleted && (
                              <Button 
                                size="small" 
                                variant="text" 
                                color="success"
                                onClick={() => handleCompleteEarly(st)}
                                sx={{ fontSize: '0.7rem' }}
                              >
                                Finish early
                              </Button>
                            )}
                            <Button 
                              size="small" 
                              variant="text" 
                              onClick={() => handleEditStake(st)}
                              sx={{ fontSize: '0.7rem', color: '#D4AF37' }}
                            >
                              Edit
                            </Button>
                            <Button 
                              size="small" 
                              variant="text" 
                              color="error"
                              onClick={() => handleDeleteStake(st)}
                              sx={{ fontSize: '0.7rem' }}
                            >
                              Delete
                            </Button>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {activeTab === "pendingRewards" && (
        <Box>
          {/* Header & Actions */}
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "flex-start", sm: "center" }} spacing={2} sx={{ mb: 3 }}>
            <Box>
              <Typography variant="h6" fontWeight="900" sx={{ color: "#fff", fontFamily: '"Cinzel", serif' }}>
                Referral Rewards & 1 usGOLD Approvals
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Review pending referral rewards generated when invited friends stake in vaults. Approve rewards to pay 1 usGOLD directly to the referrer's wallet.
              </Typography>
            </Box>
            <Button
              variant="contained"
              color="warning"
              startIcon={<Gift size={18} />}
              onClick={() => setManualGrantOpen(true)}
              sx={{ borderRadius: "10px", fontWeight: "800", textTransform: "none", px: 2.5, py: 1 }}
            >
              + Manual Grant 1 usGOLD
            </Button>
          </Stack>

          {/* Stat Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, bgcolor: "#141518", borderRadius: "14px", border: `1px solid ${alpha("#ff9800", 0.3)}` }}>
                <Typography variant="caption" color="warning.main" fontWeight="800">
                  Awaiting Admin Approval
                </Typography>
                <Typography variant="h4" fontWeight="900" color="#ff9800" sx={{ my: 0.5 }}>
                  {pendingRewards.filter(r => r.status === "needs_approval").length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Referees staked usGOLD! Admin action required
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, bgcolor: "#141518", borderRadius: "14px", border: `1px solid ${alpha("#D4AF37", 0.3)}` }}>
                <Typography variant="caption" color="#FFDF73" fontWeight="800">
                  Total Pending usGOLD Value
                </Typography>
                <Typography variant="h4" fontWeight="900" color="#D4AF37" sx={{ my: 0.5 }}>
                  {(pendingRewards.filter(r => r.status === "needs_approval").length * 1).toFixed(2)} usGOLD
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Ready to be credited to referrers
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, bgcolor: "#141518", borderRadius: "14px", border: `1px solid ${alpha("#fff", 0.1)}` }}>
                <Typography variant="caption" color="text.secondary" fontWeight="800">
                  Awaiting Referee Stake
                </Typography>
                <Typography variant="h4" fontWeight="900" color="#fff" sx={{ my: 0.5 }}>
                  {pendingRewards.filter(r => r.status === "pending").length}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Friends registered but haven't staked yet
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Search Filter Bar */}
          <Paper sx={{ p: 2, mb: 3, bgcolor: "#141518", borderRadius: "14px" }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Search by Referrer Address or Referee Address..."
              value={pendingRewardSearch}
              onChange={(e) => setPendingRewardSearch(e.target.value)}
              InputProps={{
                startAdornment: <Search size={18} style={{ marginRight: 8, opacity: 0.6 }} />
              }}
            />
          </Paper>

          {/* Rewards List Table */}
          {pendingRewards.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center', bgcolor: "#141518", borderRadius: "16px" }}>
              <Gift size={40} color="#D4AF37" style={{ opacity: 0.5, marginBottom: 12 }} />
              <Typography variant="h6" fontWeight="800" color="#fff">No Pending Referral Rewards</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                No referee stakes are currently waiting for admin approval. You can use "+ Manual Grant 1 usGOLD" to manually credit any user.
              </Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} sx={{ bgcolor: '#121214', borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: alpha('#fff', 0.05) }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main' }}>Referrer (Recipient)</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main' }}>Referee (Invitee Friend)</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main' }}>Referee Stake Details</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main' }}>Reward</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main' }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main', textAlign: 'right' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingRewards
                    .filter(r => {
                      if (!pendingRewardSearch.trim()) return true;
                      const q = pendingRewardSearch.toLowerCase();
                      return (
                        (r.referrerId && r.referrerId.toLowerCase().includes(q)) ||
                        (r.referee && r.referee.toLowerCase().includes(q))
                      );
                    })
                    .map((row) => {
                      const isNeedsApproval = row.status === "needs_approval";
                      return (
                        <TableRow key={row.key} hover>
                          <TableCell sx={{ py: 1.5 }}>
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: "bold" }}>
                                {row.referrerId}
                              </Typography>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  navigator.clipboard.writeText(row.referrerId);
                                  setCopiedAddress(row.referrerId);
                                  setTimeout(() => setCopiedAddress(null), 2000);
                                }}
                              >
                                {copiedAddress === row.referrerId ? <Check size={12} color="#4caf50" /> : <Copy size={12} />}
                              </IconButton>
                            </Stack>
                            {users[row.referrerId]?.fcmToken && (
                              <Chip label="FCM Active" size="small" color="info" variant="outlined" sx={{ height: 16, fontSize: '8px', mt: 0.5 }} />
                            )}
                          </TableCell>

                          <TableCell sx={{ py: 1.5 }}>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'text.secondary' }}>
                              {row.referee}
                            </Typography>
                          </TableCell>

                          <TableCell sx={{ py: 1.5 }}>
                            {row.stakeAmount ? (
                              <Typography variant="caption" sx={{ color: '#D4AF37', fontWeight: 'bold', display: 'block' }}>
                                Staked {row.stakeAmount} usGOLD ({row.stakeDurationMonths}m) | {row.solPaid} SOL
                              </Typography>
                            ) : (
                              <Typography variant="caption" color="text.secondary">
                                Registered via Referral Link
                              </Typography>
                            )}
                            <Typography variant="caption" color="text.secondary" sx={{ fontSize: "10px" }}>
                              {new Date(row.timestamp || Date.now()).toLocaleString()}
                            </Typography>
                          </TableCell>

                          <TableCell sx={{ py: 1.5 }}>
                            <Typography variant="body2" fontWeight="900" color="#FFDF73">
                              1.0000 usGOLD
                            </Typography>
                          </TableCell>

                          <TableCell sx={{ py: 1.5 }}>
                            {isNeedsApproval ? (
                              <Chip 
                                label="🟡 Waiting Admin Approval" 
                                size="small" 
                                color="warning"
                                variant="filled"
                                sx={{ fontWeight: "800", fontSize: "10px" }}
                              />
                            ) : (
                              <Chip 
                                label="⏳ Pending Friend Stake" 
                                size="small" 
                                variant="outlined"
                                sx={{ fontSize: "10px" }}
                              />
                            )}
                          </TableCell>

                          <TableCell sx={{ py: 1.5, textAlign: 'right' }}>
                            {isNeedsApproval ? (
                              <Button 
                                variant="contained" 
                                size="small" 
                                color="success" 
                                disabled={actioningKey === row.key}
                                onClick={() => handleApproveReward(row)}
                                startIcon={<Check size={14} />}
                                sx={{ borderRadius: '8px', fontSize: '11px', px: 2, py: 0.6, fontWeight: "900" }}
                              >
                                {actioningKey === row.key ? "Crediting..." : "Approve & Pay 1 usGOLD"}
                              </Button>
                            ) : (
                              <Button 
                                variant="outlined" 
                                size="small" 
                                color="warning" 
                                disabled={actioningKey === row.key}
                                onClick={() => handleApproveReward(row)}
                                sx={{ borderRadius: '8px', fontSize: '10px', px: 1.5, py: 0.4 }}
                              >
                                Force Approve 1 usGOLD
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {activeTab === "stakingLedger" && (
        <Box>
          <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
            <TextField
              size="small"
              placeholder="Search by User Address, Transaction Type, Amount..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ flexGrow: 1 }}
              InputProps={{
                startAdornment: <Search size={18} style={{ marginRight: 8, opacity: 0.5 }} />
              }}
            />
          </Box>

          {allTransactions.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography color="text.secondary">No staking transactions recorded in database ledger yet.</Typography>
            </Paper>
          ) : (
            <TableContainer component={Paper} sx={{ bgcolor: '#121214', borderRadius: 3, border: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: alpha('#fff', 0.05) }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main' }}>User Wallet Address</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main' }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main' }}>Amount / Payment</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main' }}>Details</TableCell>
                    <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem', color: 'primary.main' }}>Timestamp</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allTransactions
                    .filter(tx => {
                      if (!searchQuery) return true;
                      const q = searchQuery.toLowerCase();
                      return (
                        (tx.userAddress || "").toLowerCase().includes(q) ||
                        (tx.type || "").toLowerCase().includes(q) ||
                        (tx.details || "").toLowerCase().includes(q) ||
                        String(tx.amount || "").toLowerCase().includes(q)
                      );
                    })
                    .map((tx, idx) => {
                      const isStakeCreated = tx.type === 'stake_created';
                      const isStakeClaimed = tx.type === 'stake_claimed';
                      const isStakeCanceled = tx.type === 'stake_canceled';
                      const isReferral = tx.type?.includes('referral');

                      const chipLabel = isStakeCreated
                        ? '🟢 Vault Created'
                        : isStakeClaimed
                        ? '⚡ Yield Claimed'
                        : isStakeCanceled
                        ? '🔴 Vault Cancelled (-10%)'
                        : isReferral
                        ? '🟡 Referral Bonus'
                        : tx.type || 'Activity';

                      const chipColor = isStakeCreated ? 'primary' : isStakeClaimed ? 'success' : isStakeCanceled ? 'error' : isReferral ? 'warning' : 'info';

                      return (
                        <TableRow key={tx.id || idx} hover>
                          <TableCell sx={{ py: 1.5 }}>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem', fontWeight: 800 }}>
                              {tx.userAddress}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Chip 
                              label={chipLabel} 
                              size="small" 
                              color={chipColor as any} 
                              variant="filled" 
                              sx={{ fontWeight: '800', fontSize: '10px' }} 
                            />
                          </TableCell>
                          <TableCell sx={{ py: 1.5, fontWeight: 800, color: '#FFDF73' }}>
                            {tx.amount || tx.price || "+0"}
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              {tx.details || "Vault Activity"}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Typography variant="caption" color="text.secondary">
                              {tx.timestamp ? new Date(tx.timestamp).toLocaleString() : (tx.time || "Recent")}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {activeTab === "firebase" && (
        <Grid container spacing={4}>
          {/* FCM Setup Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: '#141518', borderRadius: '16px', border: `1px solid ${alpha('#D4AF37', 0.2)}` }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 1, fontFamily: '"Cinzel", serif', fontWeight: 800 }}>Firebase Push Configuration</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Configure your official Firebase Cloud Messaging API settings to deliver real-time system & user notifications automatically.
                </Typography>

                <Stack spacing={2.5}>
                  <TextField
                    label="Firebase Sender ID"
                    fullWidth
                    value={fcmConfig.senderId}
                    onChange={(e) => setFcmConfig({ ...fcmConfig, senderId: e.target.value })}
                    placeholder="e.g. 909106359671"
                  />
                  <TextField
                    label="Web Push VAPID Public Key"
                    fullWidth
                    value={fcmConfig.vapidKey}
                    onChange={(e) => setFcmConfig({ ...fcmConfig, vapidKey: e.target.value })}
                    placeholder="e.g. BJMkzhG0R1kBdo3WVaLd4rElismg-DgG3hNTfoVPvcnOAglMJSr6SZQHC953Dq4sT7EIVLWIEbHtf7v5iff30mA"
                  />

                  <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                    <Button 
                      variant="contained" 
                      color="primary" 
                      onClick={handleSaveFcmConfig} 
                      disabled={savingFcm}
                    >
                      {savingFcm ? "Saving..." : "Save Config"}
                    </Button>
                    <Button 
                      variant="outlined" 
                      color="info" 
                      onClick={handleTestFcm} 
                      disabled={fcmTestLoading}
                    >
                      {fcmTestLoading ? "Testing..." : "Send FCM Test"}
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Broadcast Center Card */}
          <Grid item xs={12} md={6}>
            <Card sx={{ bgcolor: '#141518', borderRadius: '16px', border: `1px solid ${alpha('#fff', 0.05)}` }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 1, fontFamily: '"Cinzel", serif', fontWeight: 800 }}>FCM Broadcast Center</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Send a push notification announcement to ALL users registered with Firebase Cloud Messaging.
                </Typography>

                <Stack spacing={2.5}>
                  <TextField
                    label="Broadcast Announcement Message"
                    multiline
                    rows={4}
                    fullWidth
                    value={broadcastMsg}
                    onChange={(e) => setBroadcastMsg(e.target.value)}
                    placeholder="Example: 🚀 Staking yields have been processed for all active pools! Check your accruals."
                  />

                  <Button 
                    variant="contained" 
                    color="warning" 
                    onClick={handleSendBroadcast} 
                    disabled={broadcasting || !broadcastMsg.trim()}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    {broadcasting ? "Broadcasting..." : "Broadcast to All"}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Edit Stake Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit Staking Vault Details</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Staked Amount (usGOLD)"
              type="number"
              fullWidth
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
            />
            <FormControl fullWidth>
              <InputLabel>Vault Duration</InputLabel>
              <Select
                value={editDuration}
                label="Vault Duration"
                onChange={(e) => setEditDuration(e.target.value)}
              >
                <MenuItem value="1">1 Month (2% Yield)</MenuItem>
                <MenuItem value="3">3 Months (6% Yield)</MenuItem>
                <MenuItem value="6">6 Months (12% Yield)</MenuItem>
                <MenuItem value="12">12 Months (24% Yield)</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="primary" onClick={handleSaveEditStake}>Save Changes</Button>
        </DialogActions>
      </Dialog>

      {/* Direct Notification Dialog */}
      <Dialog open={notifyDialogOpen} onClose={() => setNotifyDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Direct Firebase Push Notification</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Sending direct message to user: <b>{notifyUserAddress.substring(0, 8)}...</b>
            </Typography>
            <TextField
              label="Notification Body"
              multiline
              rows={4}
              fullWidth
              value={customNotifyMsg}
              onChange={(e) => setCustomNotifyMsg(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNotifyDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" color="info" onClick={handleSendDirectNotify} disabled={sendingNotify || !customNotifyMsg.trim()}>
            {sendingNotify ? "Sending..." : "Send Message"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manual Referral Reward Grant Dialog */}
      <Dialog open={manualGrantOpen} onClose={() => setManualGrantOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: "900", fontFamily: '"Cinzel", serif' }}>
          Manual 1 usGOLD Referral Reward Credit
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Alert severity="info">
              Manually credit 1 usGOLD (or custom amount) referral reward directly to any referrer wallet. This will immediately update their earnings balance, log a transaction, and notify them.
            </Alert>

            <TextField
              label="Referrer Wallet Address (Recipient)"
              fullWidth
              placeholder="e.g. 5x8Q... or Solana/Web3 Address"
              value={manualReferrer}
              onChange={(e) => setManualReferrer(e.target.value)}
              required
            />

            <TextField
              label="Referee Wallet Address (Invited Friend - Optional)"
              fullWidth
              placeholder="e.g. Friend address or 'Manual Admin Grant'"
              value={manualReferee}
              onChange={(e) => setManualReferee(e.target.value)}
            />

            <TextField
              label="Reward Amount (usGOLD)"
              fullWidth
              type="number"
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
              inputProps={{ step: "0.1", min: "0.1" }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setManualGrantOpen(false)} color="inherit">Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleGrantManualReward}
            disabled={grantingReward || !manualReferrer.trim()}
            sx={{ fontWeight: "900", px: 3 }}
          >
            {grantingReward ? "Crediting..." : "Approve & Pay usGOLD"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}



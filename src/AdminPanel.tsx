import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { database, auth } from "./firebase";
import { ref, onValue, set } from "firebase/database";
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
    {
      text: "Transactions",
      icon: <ArrowRightLeft />,
      path: "/admin/transactions",
    },
    { text: "Futures", icon: <TrendingUp />, path: "/admin/futures" },
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
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, sm: 3 }, pb: { xs: '96px', md: 3 } }}>
        <Toolbar />
        <Container maxWidth="lg" sx={{ px: { xs: 0, sm: 2 } }}>
          <Routes>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="users" element={<UsersManagement />} />
            <Route path="mlm" element={<UnilevelMLM />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="futures" element={<FuturesManagement />} />
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
            {row.address}
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
                    <Typography variant="subtitle2" fontWeight="700" color="success.main">{row.commissionEarned.split(' ')[0]}</Typography>
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
                    mb: 2
                  }}
                >
                  <Table size="small">
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
                          <TableCell sx={{ fontSize: '0.7rem', py: 1 }}>{tx.date.split(' ')[0]}</TableCell>
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
          overflowX: 'auto'
        }}
      >
        <Table size="small">
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
          overflowX: 'auto'
        }}
      >
        <Table size={isMobile ? "small" : "medium"}>
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
  const [futuresTokens, setFuturesTokens] = useState("XBTUSDTM,ETHUSDTM,SOLUSDTM,XRPUSDTM,ADAUSDTM");
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
        setFuturesTokens(data.futuresTokens || "XBTUSDTM,ETHUSDTM,SOLUSDTM,XRPUSDTM,ADAUSDTM");
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
      futuresTokens: futuresTokens,
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
            <TextField
              label="KuCoin Futures Tokens (comma separated)"
              fullWidth
              value={futuresTokens}
              onChange={(e) => setFuturesTokens(e.target.value)}
              placeholder="e.g. XBTUSDTM,ETHUSDTM"
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

function FuturesManagement() {
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState<"active" | "discover" | "manual">("active");
  const [futuresTokensStr, setFuturesTokensStr] = useState("");
  const [tokensList, setTokensList] = useState<string[]>([]);
  const [allContracts, setAllContracts] = useState<any[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [quoteFilter, setQuoteFilter] = useState("all");
  
  // Manual adding state
  const [manualSymbol, setManualSymbol] = useState("");
  const [manualError, setManualError] = useState("");

  // Confirmation dialog state
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [pendingSymbol, setPendingSymbol] = useState("");

  // Alert/Snackbar simulation state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastSeverity, setToastSeverity] = useState<"success" | "error" | "info">("success");

  // Load configured tokens from Firebase general settings
  useEffect(() => {
    const settingsRef = ref(database, "mlmSettings/general");
    const unsub = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const tokensStr = data.futuresTokens || "XBTUSDTM,ETHUSDTM,SOLUSDTM,XRPUSDTM,ADAUSDTM";
        setFuturesTokensStr(tokensStr);
        setTokensList(tokensStr.split(",").map((s: string) => s.trim()).filter(Boolean));
      } else {
        const defaultStr = "XBTUSDTM,ETHUSDTM,SOLUSDTM,XRPUSDTM,ADAUSDTM";
        setFuturesTokensStr(defaultStr);
        setTokensList(defaultStr.split(",").map((s: string) => s.trim()).filter(Boolean));
      }
    });
    return () => unsub();
  }, []);

  // Fetch active contracts from KuCoin Futures API proxy
  const fetchKuCoinContracts = async () => {
    setLoadingContracts(true);
    try {
      const res = await axios.get("/api/kucoin/contracts/active");
      if (res.data && Array.isArray(res.data.data)) {
        setAllContracts(res.data.data);
      } else if (res.data && Array.isArray(res.data)) {
        setAllContracts(res.data);
      } else {
        console.warn("Unexpected Kucoin Active Contracts response structure:", res.data);
      }
    } catch (err) {
      console.error("Failed to fetch KuCoin active contracts:", err);
      showToast("Could not fetch real-time market data from KuCoin. Showing offline/cached list.", "error");
    } finally {
      setLoadingContracts(false);
    }
  };

  useEffect(() => {
    fetchKuCoinContracts();
  }, []);

  const showToast = (msg: string, severity: "success" | "error" | "info" = "success") => {
    setToastMessage(msg);
    setToastSeverity(severity);
    setTimeout(() => {
      setToastMessage(null);
    }, 5000);
  };

  // Save the complete array back to Firebase as comma-separated string
  const saveTokensToFirebase = async (updatedList: string[]) => {
    setSaving(true);
    const newStr = updatedList.join(",");
    try {
      await set(ref(database, "mlmSettings/general/futuresTokens"), newStr);
      showToast("Futures terminal tokens updated successfully!", "success");
    } catch (err: any) {
      console.error("Failed to save futures tokens:", err);
      showToast(err.message || "Failed to update futures tokens in Firebase.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Enable a token
  const handleEnableToken = async (symbol: string) => {
    const sym = symbol.toUpperCase().trim();
    if (!sym) return;
    if (tokensList.includes(sym)) {
      showToast(`${sym} is already enabled.`, "info");
      return;
    }
    const updated = [...tokensList, sym];
    await saveTokensToFirebase(updated);
  };

  // Disable a token
  const handleDisableToken = async (symbol: string) => {
    const sym = symbol.toUpperCase().trim();
    const updated = tokensList.filter((s) => s !== sym);
    await saveTokensToFirebase(updated);
  };

  // Manual submit
  const handleManualAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError("");
    const sym = manualSymbol.toUpperCase().trim();
    if (!sym) {
      setManualError("Please enter a valid contract symbol.");
      return;
    }
    if (tokensList.includes(sym)) {
      setManualError("This token is already enabled.");
      return;
    }
    
    // Warn if it is not found in active contracts from KuCoin, but still allow it (override)
    const existsInKuCoin = allContracts.some(c => c.symbol === sym);
    if (allContracts.length > 0 && !existsInKuCoin) {
      setPendingSymbol(sym);
      setOpenConfirmDialog(true);
      return;
    }

    const updated = [...tokensList, sym];
    await saveTokensToFirebase(updated);
    setManualSymbol("");
    setActiveTab("active");
  };

  // Match configured tokens with KuCoin metadata
  const configuredTokensMetadata = tokensList.map((symbol) => {
    const match = allContracts.find((c) => c.symbol === symbol);
    return {
      symbol,
      isActive: !!match,
      baseCurrency: match?.baseCurrency || symbol.replace(/USDTM|USD|M$/, ""),
      quoteCurrency: match?.quoteCurrency || "USDT",
      multiplier: match?.multiplier || "-",
      makerFeeRate: match?.makerFeeRate ? `${(parseFloat(match.makerFeeRate) * 100).toFixed(4)}%` : "-",
      takerFeeRate: match?.takerFeeRate ? `${(parseFloat(match.takerFeeRate) * 100).toFixed(4)}%` : "-",
      maxLeverage: match?.maxLeverage || "100",
      volume24h: match?.volume24h ? parseFloat(match.volume24h).toLocaleString() : "-",
    };
  });

  // Filter discoverable contracts from KuCoin
  const discoverableContracts = allContracts.filter((c) => {
    const matchesSearch = c.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (c.baseCurrency && c.baseCurrency.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesQuote = quoteFilter === "all" || c.quoteCurrency === quoteFilter;
    const notAlreadyEnabled = !tokensList.includes(c.symbol);

    return matchesSearch && matchesQuote && notAlreadyEnabled;
  });

  return (
    <Box sx={{ pb: 6 }}>
      {/* Page Title & Back link */}
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 4 }}>
        <Box sx={{
          width: 56,
          height: 56,
          borderRadius: "16px",
          bgcolor: "rgba(212, 175, 55, 0.1)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          border: "1px solid rgba(212, 175, 55, 0.3)"
        }}>
          <TrendingUp size={28} color="#D4AF37" />
        </Box>
        <Box>
          <Typography variant="h4" sx={{ fontFamily: '"Montserrat", "Inter", sans-serif', fontWeight: 800, color: "#fff" }}>
            Futures Market Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Configure the active derivative contracts available in the trading terminal.
          </Typography>
        </Box>
      </Stack>

      {/* Inline Feedback Alerts */}
      {toastMessage && (
        <Alert 
          severity={toastSeverity} 
          sx={{ 
            mb: 3, 
            borderRadius: "16px", 
            border: `1px solid ${toastSeverity === "success" ? "rgba(46, 125, 50, 0.3)" : "rgba(211, 47, 47, 0.3)"}`,
            bgcolor: "#121214"
          }}
        >
          {toastMessage}
        </Alert>
      )}

      {/* Aesthetic Custom Tab Navigation */}
      <Stack direction="row" spacing={1} sx={{ mb: 4, bgcolor: "rgba(255,255,255,0.02)", p: 0.75, borderRadius: "20px", width: "fit-content", border: "1px solid rgba(255,255,255,0.05)" }}>
        <Button
          onClick={() => setActiveTab("active")}
          sx={{
            px: 3,
            py: 1,
            borderRadius: "16px",
            textTransform: "none",
            fontWeight: activeTab === "active" ? 800 : 500,
            bgcolor: activeTab === "active" ? "rgba(212, 175, 55, 0.15)" : "transparent",
            color: activeTab === "active" ? "#D4AF37" : "rgba(255,255,255,0.6)",
            border: activeTab === "active" ? "1px solid rgba(212, 175, 55, 0.3)" : "1px solid transparent",
            "&:hover": { bgcolor: "rgba(212, 175, 55, 0.08)" }
          }}
        >
          Active Terminals ({tokensList.length})
        </Button>
        <Button
          onClick={() => setActiveTab("discover")}
          sx={{
            px: 3,
            py: 1,
            borderRadius: "16px",
            textTransform: "none",
            fontWeight: activeTab === "discover" ? 800 : 500,
            bgcolor: activeTab === "discover" ? "rgba(212, 175, 55, 0.15)" : "transparent",
            color: activeTab === "discover" ? "#D4AF37" : "rgba(255,255,255,0.6)",
            border: activeTab === "discover" ? "1px solid rgba(212, 175, 55, 0.3)" : "1px solid transparent",
            "&:hover": { bgcolor: "rgba(212, 175, 55, 0.08)" }
          }}
        >
          Discover Markets
        </Button>
        <Button
          onClick={() => setActiveTab("manual")}
          sx={{
            px: 3,
            py: 1,
            borderRadius: "16px",
            textTransform: "none",
            fontWeight: activeTab === "manual" ? 800 : 500,
            bgcolor: activeTab === "manual" ? "rgba(212, 175, 55, 0.15)" : "transparent",
            color: activeTab === "manual" ? "#D4AF37" : "rgba(255,255,255,0.6)",
            border: activeTab === "manual" ? "1px solid rgba(212, 175, 55, 0.3)" : "1px solid transparent",
            "&:hover": { bgcolor: "rgba(212, 175, 55, 0.08)" }
          }}
        >
          Manual Override
        </Button>
      </Stack>

      {/* Tab 1: Configured Tokens */}
      {activeTab === "active" && (
        <Card sx={{
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.05)",
          bgcolor: "#121214",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
        }}>
          <CardContent sx={{ p: 4 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 700, color: "#fff" }}>
                Active Futures Contracts
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={fetchKuCoinContracts}
                disabled={loadingContracts}
                startIcon={<RefreshCw size={14} className={loadingContracts ? "animate-spin" : ""} />}
                sx={{
                  borderRadius: "12px",
                  borderColor: "rgba(212,175,55,0.3)",
                  color: "#D4AF37",
                  textTransform: "none",
                  "&:hover": { borderColor: "#D4AF37", bgcolor: "rgba(212,175,55,0.05)" }
                }}
              >
                Sync Market Data
              </Button>
            </Stack>

            <TableContainer component={Paper} sx={{ bgcolor: "transparent", backgroundImage: "none", border: "1px solid rgba(255,255,255,0.03)", borderRadius: "16px", overflow: "hidden" }}>
              <Table>
                <TableHead sx={{ bgcolor: "rgba(255,255,255,0.02)" }}>
                  <TableRow>
                    <TableCell sx={{ color: "rgba(255,255,255,0.4)", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Symbol</TableCell>
                    <TableCell sx={{ color: "rgba(255,255,255,0.4)", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Base Coin</TableCell>
                    <TableCell sx={{ color: "rgba(255,255,255,0.4)", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Multiplier</TableCell>
                    <TableCell sx={{ color: "rgba(255,255,255,0.4)", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Max Leverage</TableCell>
                    <TableCell sx={{ color: "rgba(255,255,255,0.4)", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Maker Fee</TableCell>
                    <TableCell sx={{ color: "rgba(255,255,255,0.4)", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Taker Fee</TableCell>
                    <TableCell sx={{ color: "rgba(255,255,255,0.4)", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Status</TableCell>
                    <TableCell align="right" sx={{ color: "rgba(255,255,255,0.4)", fontWeight: 700, borderBottom: "1px solid rgba(255,255,255,0.05)" }}>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {configuredTokensMetadata.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 6, color: "rgba(255,255,255,0.3)" }}>
                        No active contracts configured. Switch to Discovery or Manual mode to enable contracts.
                      </TableCell>
                    </TableRow>
                  ) : (
                    configuredTokensMetadata.map((row) => (
                      <TableRow key={row.symbol} sx={{ "&:hover": { bgcolor: "rgba(255,255,255,0.01)" } }}>
                        <TableCell sx={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Box sx={{
                              p: 1,
                              bgcolor: "rgba(212,175,55,0.05)",
                              borderRadius: "10px",
                              border: "1px solid rgba(212,175,55,0.15)",
                              display: "flex",
                              alignItems: "center"
                            }}>
                              <Coins size={16} color="#D4AF37" />
                            </Box>
                            <Typography sx={{ color: "#fff", fontWeight: 700 }}>
                              {row.symbol}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell sx={{ borderBottom: "1px solid rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.8)" }}>
                          {row.baseCurrency}
                        </TableCell>
                        <TableCell sx={{ borderBottom: "1px solid rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.8)" }}>
                          {row.multiplier}
                        </TableCell>
                        <TableCell sx={{ borderBottom: "1px solid rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.8)" }}>
                          {row.maxLeverage}x
                        </TableCell>
                        <TableCell sx={{ borderBottom: "1px solid rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.6)" }}>
                          {row.makerFeeRate}
                        </TableCell>
                        <TableCell sx={{ borderBottom: "1px solid rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.6)" }}>
                          {row.takerFeeRate}
                        </TableCell>
                        <TableCell sx={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                          {row.isActive ? (
                            <Chip
                              label="Online"
                              size="small"
                              sx={{
                                bgcolor: "rgba(46, 125, 50, 0.1)",
                                color: "#4caf50",
                                border: "1px solid rgba(46, 125, 50, 0.2)",
                                fontWeight: 600,
                                borderRadius: "8px"
                              }}
                            />
                          ) : (
                            <Chip
                              label="Offline/Custom"
                              size="small"
                              sx={{
                                bgcolor: "rgba(237, 108, 2, 0.1)",
                                color: "#ff9800",
                                border: "1px solid rgba(237, 108, 2, 0.2)",
                                fontWeight: 600,
                                borderRadius: "8px"
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                          <Button
                            variant="outlined"
                            color="error"
                            size="small"
                            onClick={() => handleDisableToken(row.symbol)}
                            disabled={saving}
                            startIcon={<Trash2 size={12} />}
                            sx={{
                              borderRadius: "10px",
                              textTransform: "none",
                              border: "1px solid rgba(211,47,47,0.2)",
                              "&:hover": { border: "1px solid #d32f2f", bgcolor: "rgba(211,47,47,0.05)" }
                            }}
                          >
                            Disable
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Discover Markets from KuCoin */}
      {activeTab === "discover" && (
        <Card sx={{
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.05)",
          bgcolor: "#121214",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
        }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 700, color: "#fff", mb: 1 }}>
              KuCoin Futures Discovery
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Browse real derivative products active on KuCoin Exchange and enable them for your users in one click.
            </Typography>

            {/* Filters Row */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={8}>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Search symbol or currency (e.g. BTC, ETH, PEPE)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: <Search size={18} style={{ marginRight: 8, opacity: 0.5 }} />,
                    sx: {
                      borderRadius: "16px",
                      bgcolor: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      "& fieldset": { border: "none" }
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <Select
                    value={quoteFilter}
                    onChange={(e) => setQuoteFilter(e.target.value)}
                    sx={{
                      borderRadius: "16px",
                      bgcolor: "rgba(255,255,255,0.02)",
                      border: "1px solid rgba(255,255,255,0.05)",
                      color: "#fff",
                      "& .MuiOutlinedInput-notchedOutline": { border: "none" }
                    }}
                  >
                    <MenuItem value="all">All Quote Currencies</MenuItem>
                    <MenuItem value="USDT">USDT Margined</MenuItem>
                    <MenuItem value="USD">USD Margined</MenuItem>
                    <MenuItem value="BTC">BTC Margined</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            {loadingContracts ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress sx={{ color: "#D4AF37" }} />
              </Box>
            ) : (
              <TableContainer component={Paper} sx={{ bgcolor: "transparent", backgroundImage: "none", border: "1px solid rgba(255,255,255,0.03)", borderRadius: "16px", maxHeight: "500px", overflow: "auto" }}>
                <Table stickyHeader>
                  <TableHead sx={{ "& th": { bgcolor: "#121214 !important", color: "rgba(255,255,255,0.4)", fontWeight: 700 } }}>
                    <TableRow>
                      <TableCell>Symbol</TableCell>
                      <TableCell>Base Asset</TableCell>
                      <TableCell>Quote Asset</TableCell>
                      <TableCell>Max Leverage</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {discoverableContracts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 6, color: "rgba(255,255,255,0.3)" }}>
                          {allContracts.length === 0 ? "Failed to connect to KuCoin. Please try syncing." : "No matching contract symbols found."}
                        </TableCell>
                      </TableRow>
                    ) : (
                      discoverableContracts.slice(0, 50).map((row) => (
                        <TableRow key={row.symbol} sx={{ "&:hover": { bgcolor: "rgba(255,255,255,0.01)" } }}>
                          <TableCell sx={{ borderBottom: "1px solid rgba(255,255,255,0.03)", color: "#fff", fontWeight: 700 }}>
                            {row.symbol}
                          </TableCell>
                          <TableCell sx={{ borderBottom: "1px solid rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.8)" }}>
                            {row.baseCurrency}
                          </TableCell>
                          <TableCell sx={{ borderBottom: "1px solid rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.8)" }}>
                            {row.quoteCurrency}
                          </TableCell>
                          <TableCell sx={{ borderBottom: "1px solid rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.8)" }}>
                            {row.maxLeverage}x
                          </TableCell>
                          <TableCell align="right" sx={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => handleEnableToken(row.symbol)}
                              disabled={saving}
                              startIcon={<Plus size={14} />}
                              sx={{
                                borderRadius: "10px",
                                textTransform: "none",
                                bgcolor: "#D4AF37",
                                color: "#121214",
                                fontWeight: "bold",
                                "&:hover": { bgcolor: "#F3E5AB" }
                              }}
                            >
                              Enable
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {!loadingContracts && discoverableContracts.length > 50 && (
              <Typography variant="caption" sx={{ display: "block", mt: 2, textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
                Showing first 50 matched results. Use search filters to refine results.
              </Typography>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Manual Override */}
      {activeTab === "manual" && (
        <Card sx={{
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.05)",
          bgcolor: "#121214",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
        }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 700, color: "#fff", mb: 1 }}>
              Add Contract Manually
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Manually append custom contracts. Note that custom/unofficial contract symbols must match the KuCoin ticker standard for candlestick charting and ticker sockets to work.
            </Typography>

            <Box component="form" onSubmit={handleManualAddSubmit} sx={{ maxWidth: "500px" }}>
              <Stack spacing={3}>
                <TextField
                  label="Contract Symbol"
                  placeholder="e.g. DOGEUSDTM"
                  value={manualSymbol}
                  onChange={(e) => setManualSymbol(e.target.value)}
                  error={!!manualError}
                  helperText={manualError || "Enter the exact contract ticker on KuCoin Futures (usually ends with M)"}
                  fullWidth
                  InputProps={{
                    sx: { borderRadius: "16px" }
                  }}
                />

                <Button
                  type="submit"
                  variant="contained"
                  disabled={saving}
                  startIcon={<Plus size={16} />}
                  sx={{
                    borderRadius: "16px",
                    py: 1.5,
                    textTransform: "none",
                    fontWeight: "bold",
                    bgcolor: "#D4AF37",
                    color: "#121214",
                    "&:hover": { bgcolor: "#F3E5AB" }
                  }}
                >
                  {saving ? "Saving..." : "Force Enable Ticker"}
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Custom Confirmation Dialog */}
      <Dialog
        open={openConfirmDialog}
        onClose={() => setOpenConfirmDialog(false)}
        PaperProps={{
          sx: {
            borderRadius: "24px",
            border: "1px solid rgba(212, 175, 55, 0.2)",
            bgcolor: "#121214",
            color: "#fff",
            p: 2
          }
        }}
      >
        <DialogTitle sx={{ fontFamily: '"Montserrat", sans-serif', fontWeight: 700 }}>
          Confirm Custom Symbol
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            The symbol <strong>{pendingSymbol}</strong> was not verified as an active contract on KuCoin Futures.
          </Typography>
          <Typography color="text.secondary">
            Are you sure you want to force enable this ticker? Charting and socket ticker updates may fail if the ticker is invalid.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setOpenConfirmDialog(false)}
            sx={{ color: "rgba(255,255,255,0.6)", textTransform: "none", borderRadius: "10px" }}
          >
            Cancel
          </Button>
          <Button 
            onClick={async () => {
              setOpenConfirmDialog(false);
              const updated = [...tokensList, pendingSymbol];
              await saveTokensToFirebase(updated);
              setManualSymbol("");
              setActiveTab("active");
            }}
            variant="contained"
            sx={{
              bgcolor: "#D4AF37",
              color: "#121214",
              fontWeight: "bold",
              borderRadius: "10px",
              textTransform: "none",
              "&:hover": { bgcolor: "#F3E5AB" }
            }}
          >
            Force Enable Ticker
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

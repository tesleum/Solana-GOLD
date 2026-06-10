import React, { useState, useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { database } from "./firebase";
import { ref, onValue, set } from "firebase/database";
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
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
} from "lucide-react";

const drawerWidth = 240;

export default function AdminPanel() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { text: "Dashboard", icon: <LayoutDashboard />, path: "/admin" },
    { text: "Users", icon: <Users />, path: "/admin/users" },
    { text: "Unilevel MLM", icon: <Network />, path: "/admin/mlm" },
    {
      text: "Transactions",
      icon: <ArrowRightLeft />,
      path: "/admin/transactions",
    },
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
            sx={{ fontFamily: '"Cinzel", serif', fontWeight: "bold" }}
          >
            Solana Gold Admin Panel
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        sx={{
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
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Container maxWidth="lg">
          <Routes>
            <Route path="/" element={<AdminDashboard />} />
            <Route path="users" element={<UsersManagement />} />
            <Route path="mlm" element={<UnilevelMLM />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="settings" element={<AdminSettings />} />
          </Routes>
        </Container>
      </Box>
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

  return (
    <React.Fragment>
      <TableRow sx={{ "& > *": { borderBottom: "unset" } }}>
        <TableCell>
          <IconButton
            aria-label="expand row"
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </IconButton>
        </TableCell>
        <TableCell>{row.address}</TableCell>
        <TableCell>Level {row.refLvl}</TableCell>
        <TableCell>{row.joinedDate}</TableCell>
        <TableCell>
          <Chip
            label={row.status}
            color={row.status === "active" ? "success" : "default"}
            size="small"
          />
        </TableCell>
        <TableCell align="right">
          <Button
            size="small"
            variant="outlined"
            onClick={() => setOpenTree(true)}
          >
            View Tree
          </Button>
        </TableCell>
      </TableRow>
      <Dialog
        open={openTree}
        onClose={() => setOpenTree(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Network Tree for {row.id}</DialogTitle>
        <DialogContent dividers>
          <NetworkTree address={row.id} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTree(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 2 }}>
              <Typography variant="h6" gutterBottom component="div">
                Additional Details
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={4}>
                  <Card
                    sx={{
                      bgcolor: "background.default",
                      backgroundImage: "none",
                    }}
                  >
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom>
                        Total Investment
                      </Typography>
                      <Typography variant="h5" color="primary.main">
                        {row.totalInvestment}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card
                    sx={{
                      bgcolor: "background.default",
                      backgroundImage: "none",
                    }}
                  >
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom>
                        Commission Earned
                      </Typography>
                      <Typography variant="h5" color="primary.main">
                        {row.commissionEarned}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Card
                    sx={{
                      bgcolor: "background.default",
                      backgroundImage: "none",
                    }}
                  >
                    <CardContent>
                      <Typography color="text.secondary" gutterBottom>
                        Direct Referrals
                      </Typography>
                      <Typography variant="h5" color="text.primary">
                        {row.directs}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Typography
                variant="h6"
                gutterBottom
                component="div"
                sx={{ mt: 4, mb: 2 }}
              >
                Transaction History
              </Typography>
              {row.history && row.history.length > 0 ? (
                <TableContainer
                  component={Paper}
                  sx={{
                    bgcolor: "background.default",
                    backgroundImage: "none",
                    boxShadow: "none",
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Amount</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {row.history.map((tx: any) => (
                        <TableRow key={tx.id}>
                          <TableCell>{tx.date}</TableCell>
                          <TableCell>{tx.type}</TableCell>
                          <TableCell>{tx.amount}</TableCell>
                          <TableCell>
                            <Chip
                              label={tx.status}
                              color={
                                tx.status === "Completed"
                                  ? "success"
                                  : tx.status === "Pending"
                                    ? "warning"
                                    : "error"
                              }
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No transactions found for this user.
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
      <Typography variant="h4" sx={{ mb: 4 }}>
        Users Management
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={50} />
              <TableCell>Wallet Address</TableCell>
              <TableCell>MLM Level</TableCell>
              <TableCell>Joined Date</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
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
      <Typography variant="h4" sx={{ mb: 4 }}>
        Transactions
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
        <FormControl sx={{ minWidth: 200 }} size="small">
          <InputLabel>Filter by Type</InputLabel>
          <Select
            value={filterType}
            label="Filter by Type"
            onChange={(e) => setFilterType(e.target.value)}
          >
            <MenuItem value="all">All Types</MenuItem>
            <MenuItem value="buy">Buy</MenuItem>
            <MenuItem value="referral">Referral</MenuItem>
            <MenuItem value="pool_bonus">Pool Bonus</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 200 }} size="small">
          <InputLabel>Sort by Date</InputLabel>
          <Select
            value={sortOrder}
            label="Sort by Date"
            onChange={(e) => setSortOrder(e.target.value)}
          >
            <MenuItem value="desc">Newest First</MenuItem>
            <MenuItem value="asc">Oldest First</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Amount</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>TX Hash</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAndSortedTxs.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.type}</TableCell>
                <TableCell>{row.user}</TableCell>
                <TableCell>{row.amount}</TableCell>
                <TableCell>{row.date}</TableCell>
                <TableCell>
                  {row.txId ? (
                    <a
                      href={`https://solscan.io/tx/${row.txId}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "#D4AF37" }}
                    >
                      {row.txId.substring(0, 8)}...
                    </a>
                  ) : (
                    "N/A"
                  )}
                </TableCell>
                <TableCell>
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
          onChange={(e) => setter(e.target.value)}
          placeholder="Enter Solana Address"
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

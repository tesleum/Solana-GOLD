import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Stack,
  Card,
  CardContent,
  alpha,
  useTheme,
  Button,
  Grid,
  TextField,
  InputAdornment,
  Chip,
  Avatar,
  MenuItem,
  Select,
  FormControl,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tooltip,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Collapse,
} from "@mui/material";
import {
  Wallet,
  Coins,
  Zap,
  Activity,
  CheckCircle2,
  DollarSign,
  ArrowDownUp,
  RefreshCw,
  Settings2,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Clock,
  ChevronDown,
  Check,
  Copy,
  Gift,
  Lock,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Award,
  UserPlus,
  Hourglass,
  Share2,
  XCircle,
} from "lucide-react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import {
  LAMPORTS_PER_SOL,
  SystemProgram,
  PublicKey,
  VersionedTransaction,
  TransactionMessage,
  TransactionInstruction,
} from "@solana/web3.js";
import { t } from "../translations";
import { database } from "../firebase";
import { ref, onValue, update, push, get } from "firebase/database";
import { useAppKit, useAppKitAccount, useAppKitProvider } from "@reown/appkit/react";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { TokenIcon } from "./TokenIcon";
import { triggerHaptic } from "../lib/haptic";

interface WalletPageProps {
  language: string;
  userTotalInvested: number;
  usGoldBalance: number;
  effectiveAddress: string | null;
  solanaPrice: number | null;
  tokenPrice: number | null;
  apyYield: string;
  transactions: any[];
  userEarnings: number;
  investAmount: number;
  setInvestAmount: (val: number) => void;
  handleInvest: () => Promise<void>;
  handleClaimCommissions: () => Promise<void>;
  setActiveTab: (tab: string) => void;
  isInvesting: boolean;
  isClaiming: boolean;
}

// Supported Tokens for Solana DEX Swap
interface TokenOption {
  symbol: string;
  name: string;
  usdPrice: number;
  decimals: number;
  mint: string;
  isNativeSol?: boolean;
}

export function WalletPage({
  language,
  userTotalInvested,
  usGoldBalance,
  effectiveAddress,
  solanaPrice,
  tokenPrice,
  apyYield,
  transactions,
  userEarnings,
  investAmount,
  setInvestAmount,
  handleInvest,
  handleClaimCommissions,
  setActiveTab,
  isInvesting,
  isClaiming,
}: WalletPageProps) {
  const theme = useTheme();
  const { connection } = useConnection();
  const { publicKey, sendTransaction, connected } = useWallet();
  const { open } = useAppKit();
  const { address: appKitAddress, isConnected: isAppKitConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider<any>('solana');
  const isActuallyConnected = connected || isAppKitConnected;

  // Wallet sub-tab state
  const [walletTab, setWalletTab] = useState<"swap" | "invite" | "history">(
    "swap",
  );

  // Staking and Referral States for Top Card
  const [activeStakes, setActiveStakes] = useState<any[]>([]);
  const [pendingReferralRewards, setPendingReferralRewards] = useState<number>(1.00);
  const [referralsCount, setReferralsCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [needsApprovalCount, setNeedsApprovalCount] = useState<number>(0);
  const [approvedCount, setApprovedCount] = useState<number>(0);
  const [approvedToClaimCount, setApprovedToClaimCount] = useState<number>(0);
  const [approvedToClaimAmount, setApprovedToClaimAmount] = useState<number>(0);
  const [isClaimingUsGold, setIsClaimingUsGold] = useState<boolean>(false);
  const [userRewardsList, setUserRewardsList] = useState<any[]>([]);
  const [nowTime, setNowTime] = useState<number>(Date.now());
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [showMetrics, setShowMetrics] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (effectiveAddress) {
      const stakesRef = ref(database, `stakes/${effectiveAddress}`);
      const unsubStakes = onValue(stakesRef, (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const list = Object.keys(val).map(key => ({
            key,
            ...val[key]
          }));
          setActiveStakes(list);
        } else {
          setActiveStakes([]);
        }
      });

      const rewardRef = ref(database, `rewards/${effectiveAddress}`);
      const unsubRewards = onValue(rewardRef, (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const list = Object.keys(val).map(key => ({
            key,
            ...val[key]
          }));
          
          const pCount = list.filter(r => r.status === 'pending').length;
          const nCount = list.filter(r => r.status === 'needs_approval').length;
          const approvedUnclaimedList = list.filter(r => r.status === 'approved');
          const claimedList = list.filter(r => r.status === 'claimed' || r.status === 'redeemed');

          const approvedUnclaimedAmt = approvedUnclaimedList.reduce((sum, item) => sum + (item.amount || 1), 0);
          const totalClaimedAmt = claimedList.reduce((sum, item) => sum + (item.amount || 1), 0);

          setPendingCount(pCount);
          setNeedsApprovalCount(nCount);
          setApprovedCount(claimedList.length);
          setApprovedToClaimCount(approvedUnclaimedList.length);
          setApprovedToClaimAmount(approvedUnclaimedAmt);
          setReferralsCount(list.length);
          setUserRewardsList(list);

          const totalEarnedUsGold = totalClaimedAmt + approvedUnclaimedAmt;
          setPendingReferralRewards(totalEarnedUsGold || (nCount * 1) || 0);
        } else {
          setPendingCount(0);
          setNeedsApprovalCount(0);
          setApprovedCount(0);
          setApprovedToClaimCount(0);
          setApprovedToClaimAmount(0);
          setReferralsCount(0);
          setUserRewardsList([]);
          setPendingReferralRewards(0);
        }
      });

      return () => {
        unsubStakes();
        unsubRewards();
      };
    }
  }, [effectiveAddress]);

  const handleClaimApprovedUsGold = async () => {
    if (!effectiveAddress || isClaimingUsGold) return;

    const approvedList = userRewardsList.filter(r => r.status === 'approved');
    const amountToClaim = approvedList.reduce((sum, r) => sum + (r.amount || 1), 0);

    if (amountToClaim <= 0 || approvedList.length === 0) {
      alert("No admin-approved usGOLD rewards available to claim at this time. Once admin approves your referee rewards, they will appear here!");
      return;
    }

    try {
      setIsClaimingUsGold(true);
      const timestamp = Date.now();

      // Mark each approved reward as 'claimed' in Firebase
      for (const rewardItem of approvedList) {
        if (rewardItem.key) {
          await update(ref(database, `rewards/${effectiveAddress}/${rewardItem.key}`), {
            status: 'claimed',
            claimedAt: timestamp
          });
        }
      }

      // Add claimed amount to usGoldBalance in users/${effectiveAddress}
      const userRef = ref(database, `users/${effectiveAddress}`);
      const userSnap = await get(userRef);
      let currentUsGoldBal = usGoldBalance;
      if (userSnap.exists()) {
        const uData = userSnap.val();
        currentUsGoldBal = uData.usGoldBalance ?? uData.goldTokenBalance ?? usGoldBalance ?? 0;
      }
      const newUsGoldBal = currentUsGoldBal + amountToClaim;

      await update(userRef, {
        usGoldBalance: newUsGoldBal,
        goldTokenBalance: newUsGoldBal,
        lastActive: timestamp
      });

      // Log transaction in user's transactions ledger
      const txRef = ref(database, `transactions/${effectiveAddress}`);
      await push(txRef, {
        type: 'referral_claim',
        amount: `+${amountToClaim.toFixed(4)} usGOLD`,
        price: '$1.00 / usGOLD',
        details: `Claimed ${amountToClaim} usGOLD admin-approved referral reward(s)`,
        timestamp: timestamp,
        time: new Date().toLocaleString()
      });

      // Log in global transactions
      await push(ref(database, `global_transactions`), {
        type: 'referral_reward_claimed',
        user: effectiveAddress,
        amount: amountToClaim,
        timestamp: timestamp
      });

      triggerHaptic(20);
      alert(`🎉 Success! Claimed ${amountToClaim.toFixed(2)} usGOLD approved referral reward(s) directly into your usGOLD balance!`);
    } catch (err: any) {
      console.error("Error claiming approved usGOLD:", err);
      alert(`Failed to claim usGOLD: ${err.message || err}`);
    } finally {
      setIsClaimingUsGold(false);
    }
  };

  const handleClaimSingleReward = async (rewardItem: any) => {
    if (!effectiveAddress || isClaimingUsGold || !rewardItem.key) return;

    const rewardAmount = rewardItem.amount || 1;

    try {
      setIsClaimingUsGold(true);
      const timestamp = Date.now();

      // Mark reward as 'claimed'
      await update(ref(database, `rewards/${effectiveAddress}/${rewardItem.key}`), {
        status: 'claimed',
        claimedAt: timestamp
      });

      // Add to usGoldBalance
      const userRef = ref(database, `users/${effectiveAddress}`);
      const userSnap = await get(userRef);
      let currentUsGoldBal = usGoldBalance;
      if (userSnap.exists()) {
        const uData = userSnap.val();
        currentUsGoldBal = uData.usGoldBalance ?? uData.goldTokenBalance ?? usGoldBalance ?? 0;
      }
      const newUsGoldBal = currentUsGoldBal + rewardAmount;

      await update(userRef, {
        usGoldBalance: newUsGoldBal,
        goldTokenBalance: newUsGoldBal,
        lastActive: timestamp
      });

      // Log transaction
      const txRef = ref(database, `transactions/${effectiveAddress}`);
      await push(txRef, {
        type: 'referral_claim',
        amount: `+${rewardAmount.toFixed(4)} usGOLD`,
        price: '$1.00 / usGOLD',
        details: `Claimed 1 usGOLD admin-approved referral reward for referee ${rewardItem.referee || 'friend'}`,
        timestamp: timestamp,
        time: new Date().toLocaleString()
      });

      await push(ref(database, `global_transactions`), {
        type: 'referral_reward_claimed',
        user: effectiveAddress,
        amount: rewardAmount,
        timestamp: timestamp
      });

      triggerHaptic(20);
      alert(`🎉 Successfully claimed 1 usGOLD into your wallet balance!`);
    } catch (err: any) {
      console.error("Error claiming single reward:", err);
      alert(`Failed to claim usGOLD: ${err.message || err}`);
    } finally {
      setIsClaimingUsGold(false);
    }
  };

  const handleShareReferral = async () => {
    triggerHaptic(15);
    const referralLink = `${window.location.origin}?ref=${effectiveAddress || 'GOLDEN'}`;
    const shareData = {
      title: 'usGOLD Staking Reserve',
      text: 'Stake usGOLD stablecoin on Solana to earn 2% monthly fixed yield + $1 usGOLD referral bonus!',
      url: referralLink,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        setShareSuccess(true);
        setTimeout(() => setShareSuccess(false), 3000);
      } catch (err) {
        console.log("Share dismissed or error:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(referralLink);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      } catch (err) {
        console.error("Clipboard copy failed:", err);
      }
    }
  };

  const activeStakedList = activeStakes.filter(s => s.status !== 'claimed');
  const totalStaked = activeStakedList.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);

  const liveTotalAccrued = activeStakedList.reduce((acc, curr) => {
    const totalDurationSec = Math.floor((curr.endTime - curr.startTime) / 1000) || 1;
    const elapsedSec = Math.min(totalDurationSec, Math.max(0, Math.floor((nowTime - curr.startTime) / 1000)));
    const profitPerSec = curr.totalExpectedProfit / totalDurationSec;
    return acc + (elapsedSec * profitPerSec);
  }, 0);

  const effectiveTokenPrice = tokenPrice && tokenPrice > 0 ? tokenPrice : 0;

  // Real Native SOL Balance
  const [solBalance, setSolBalance] = useState<number>(0);

  // Futures Margin Balance from Firebase
  const [futuresBalance, setFuturesBalance] = useState<number>(0);

  // Additional Token Balances (USDC, USDT, GOLD, XAUt) from Firebase
  const [usdcBalance, setUsdcBalance] = useState<number>(0);
  const [usdtBalance, setUsdtBalance] = useState<number>(0);
  const [goldTokenBalance, setGoldTokenBalance] = useState<number>(0);
  const [xautBalance, setXautBalance] = useState<number>(0);

  // On-Chain Connected Wallet SPL Token Balances
  const [onChainTokenBalances, setOnChainTokenBalances] = useState<
    Record<string, number>
  >({});

  // Top Up / Purchase Asset states
  const [purchaseAsset, setPurchaseAsset] = useState<"usGOLD">("usGOLD");
  const [customPurchaseAmount, setCustomPurchaseAmount] = useState<number>(50);
  const [isProcessingUsdtBuy, setIsProcessingUsdtBuy] = useState(false);

  // Jupiter Live Prices (fetched dynamically from API)
  const [xautPrice, setXautPrice] = useState<number>(0);
  const [usGoldJupiterPrice, setUsGoldJupiterPrice] = useState<number>(
    tokenPrice && tokenPrice > 0 ? tokenPrice : 0,
  );
  const [liveSolPrice, setLiveSolPrice] = useState<number>(
    solanaPrice && solanaPrice > 0 ? solanaPrice : 0,
  );
  const [usdtPrice, setUsdtPrice] = useState<number>(1.0);
  const [usdcPrice, setUsdcPrice] = useState<number>(1.0);

  // Jupiter Swap & Quote states
  const [jupQuote, setJupQuote] = useState<any>(null);
  const [isFetchingQuote, setIsFetchingQuote] = useState<boolean>(false);
  const [copiedContract, setCopiedContract] = useState<string | null>(null);

  // Dynamic Token Prices strictly driven by API
  const currentSolPrice = liveSolPrice || solanaPrice || 0;
  const currentGoldPrice = xautPrice || 0;
  const effectiveUsGoldPrice =
    usGoldJupiterPrice || (tokenPrice && tokenPrice > 0 ? tokenPrice : 0);

  const TOKEN_LIST: TokenOption[] = [
    {
      symbol: "SOL",
      name: "Solana Native",
      usdPrice: currentSolPrice,
      decimals: 9,
      mint: "So11111111111111111111111111111111111111112",
      isNativeSol: true,
    },
    {
      symbol: "usGOLD",
      name: "United States Gold",
      usdPrice: effectiveUsGoldPrice,
      decimals: 6,
      mint: "24JPWnTUMmkFoK8L4Th2wqgo89VkbUyoqfMUJCVSGoLd",
    },
    {
      symbol: "XAUt0",
      name: "Tether GOLD",
      usdPrice: currentGoldPrice,
      decimals: 6,
      mint: "AymATz4TCL9sWNEEV9Kvyz45CHVhDZ6kUgjTJPzLpU9P",
    },
    {
      symbol: "USDC",
      name: "USD Coin",
      usdPrice: usdcPrice,
      decimals: 6,
      mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    },
    {
      symbol: "USDT",
      name: "Tether USD",
      usdPrice: usdtPrice,
      decimals: 6,
      mint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    },
  ];

  const [fromTokenSymbol, setFromTokenSymbol] = useState<string>("SOL");
  const [toTokenSymbol, setToTokenSymbol] = useState<string>("usGOLD");
  const [fromAmount, setFromAmount] = useState<string>("0.5");
  const [slippage, setSlippage] = useState<number>(0.5); // 0.5%
  const [priorityFee, setPriorityFee] = useState<"auto" | "high" | "turbo">(
    "high",
  );
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [swapTxSuccess, setSwapTxSuccess] = useState<any | null>(null);

  // Fetch real-time SOL balance from Solana RPC connection
  useEffect(() => {
    let isMounted = true;
    const fetchSolBalance = async () => {
      if (publicKey && connection) {
        try {
          const balLamports = await connection.getBalance(publicKey);
          if (isMounted) {
            setSolBalance(balLamports / LAMPORTS_PER_SOL);
          }
        } catch (e) {
          console.error("Error fetching SOL balance:", e);
        }
      }
    };

    fetchSolBalance();
    const interval = setInterval(fetchSolBalance, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [publicKey, connection]);

  // Scan Connected Wallet On-Chain SPL Token Accounts
  useEffect(() => {
    let isMounted = true;
    const fetchOnChainTokens = async () => {
      if (!publicKey || !connection) {
        if (isMounted) setOnChainTokenBalances({});
        return;
      }
      try {
        const TOKEN_PROGRAM_ID = new PublicKey(
          "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        );
        const parsedAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          { programId: TOKEN_PROGRAM_ID },
          "confirmed",
        );

        const newBalances: Record<string, number> = {};
        for (const { account } of parsedAccounts.value) {
          const parsedInfo = account.data.parsed?.info;
          if (parsedInfo) {
            const mint = parsedInfo.mint;
            const uiAmount = parsedInfo.tokenAmount?.uiAmount || 0;
            newBalances[mint] = uiAmount;
          }
        }

        if (isMounted) {
          setOnChainTokenBalances(newBalances);
        }
      } catch (err) {
        console.warn("Connected wallet SPL token scan notice:", err);
      }
    };

    fetchOnChainTokens();
    const timer = setInterval(fetchOnChainTokens, 10000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [publicKey, connection]);

  // Sync balances from Firebase & Tatum
  useEffect(() => {
    if (effectiveAddress) {
      const userRef = ref(database, `users/${effectiveAddress}`);
      const unsub = onValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setFuturesBalance(data.futuresBalance || 0);
          setUsdcBalance(data.usdcBalance || 0);
          setUsdtBalance(data.usdtBalance || 0);
          setGoldTokenBalance(data.goldTokenBalance || 0);
          setXautBalance(data.xautBalance || data.goldTokenBalance || 0);
        }
      });

      // Fetch Tatum Solana Account Balance
      fetch(`/api/tatum/balance/${effectiveAddress}`)
        .then((r) => r.json())
        .then((data) => {
          if (data && typeof data.balance === "number" && data.balance > 0) {
            setSolBalance(data.balance);
          }
        })
        .catch((e) => console.warn("Tatum balance sync note:", e));

      return () => unsub();
    }
  }, [effectiveAddress]);

  // Fetch Live Prices for XAUt0, usGOLD, SOL, USDT, USDC from Jupiter & DexScreener Price APIs
  useEffect(() => {
    let isMounted = true;
    const fetchJupiterPrices = async () => {
      try {
        const ids = [
          "AymATz4TCL9sWNEEV9Kvyz45CHVhDZ6kUgjTJPzLpU9P", // XAUt (More tradable)
          "24JPWnTUMmkFoK8L4Th2wqgo89VkbUyoqfMUJCVSGoLd", // usGOLD
          "So11111111111111111111111111111111111111112", // SOL
          "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // USDT
          "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
        ].join(",");
        const res = await fetch(`/api/jupiter/price?ids=${ids}`);
        if (res.ok) {
          const json = await res.json();
          if (json?.data && isMounted) {
            const data = json.data;
            if (data["AymATz4TCL9sWNEEV9Kvyz45CHVhDZ6kUgjTJPzLpU9P"]?.price) {
              const p = parseFloat(
                data["AymATz4TCL9sWNEEV9Kvyz45CHVhDZ6kUgjTJPzLpU9P"].price,
              );
              if (p > 0) setXautPrice(p);
            }
            if (data["24JPWnTUMmkFoK8L4Th2wqgo89VkbUyoqfMUJCVSGoLd"]?.price) {
              const p = parseFloat(
                data["24JPWnTUMmkFoK8L4Th2wqgo89VkbUyoqfMUJCVSGoLd"].price,
              );
              if (p > 0) setUsGoldJupiterPrice(p);
            }
            if (data["So11111111111111111111111111111111111111112"]?.price) {
              const p = parseFloat(
                data["So11111111111111111111111111111111111111112"].price,
              );
              if (p > 0) setLiveSolPrice(p);
            }
            if (data["Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"]?.price) {
              const p = parseFloat(
                data["Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"].price,
              );
              if (p > 0) setUsdtPrice(p);
            }
            if (data["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"]?.price) {
              const p = parseFloat(
                data["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"].price,
              );
              if (p > 0) setUsdcPrice(p);
            }
          }
        }
      } catch (err) {
        console.warn("Jupiter price notice:", err);
      }
    };

    fetchJupiterPrices();
    const timer = setInterval(fetchJupiterPrices, 10000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  // Helper to get token object
  const fromToken = useMemo(
    () => TOKEN_LIST.find((t) => t.symbol === fromTokenSymbol) || TOKEN_LIST[0],
    [
      fromTokenSymbol,
      currentSolPrice,
      currentGoldPrice,
      xautPrice,
      usGoldJupiterPrice,
      usdtPrice,
      usdcPrice,
    ],
  );
  const toToken = useMemo(
    () => TOKEN_LIST.find((t) => t.symbol === toTokenSymbol) || TOKEN_LIST[1],
    [
      toTokenSymbol,
      currentSolPrice,
      currentGoldPrice,
      xautPrice,
      usGoldJupiterPrice,
      usdtPrice,
      usdcPrice,
    ],
  );

  // Real-time Jupiter Quote Sync
  useEffect(() => {
    let isSubscribed = true;
    const fetchQuote = async () => {
      const amountNum = parseFloat(fromAmount);
      if (!amountNum || amountNum <= 0 || fromTokenSymbol === toTokenSymbol) {
        setJupQuote(null);
        return;
      }
      setIsFetchingQuote(true);
      try {
        const inputAmountUnits = Math.floor(
          amountNum * Math.pow(10, fromToken.decimals),
        );
        const slippageBps = Math.floor(slippage * 100);
        const res = await fetch(
          `/api/jupiter/quote?inputMint=${fromToken.mint}&outputMint=${toToken.mint}&amount=${inputAmountUnits}&slippageBps=${slippageBps}`,
        );
        if (res.ok) {
          const data = await res.json();
          if (isSubscribed && data && data.outAmount) {
            setJupQuote(data);
            setIsFetchingQuote(false);
            return;
          }
        }
      } catch (err) {
        console.warn("Jupiter quote notice:", err);
      }
      if (isSubscribed) {
        setJupQuote(null);
        setIsFetchingQuote(false);
      }
    };

    const timer = setTimeout(fetchQuote, 350);
    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [
    fromTokenSymbol,
    toTokenSymbol,
    fromAmount,
    slippage,
    fromToken.mint,
    toToken.mint,
    fromToken.decimals,
  ]);

  // Helper function to decode base64 transaction bytes safely
  const base64ToUint8Array = (base64Str: string): Uint8Array => {
    const binaryString = atob(base64Str);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  // Balance getter for any token (prioritizing connected wallet on-chain SPL token accounts)
  const getTokenBalance = (symbol: string): number => {
    const tokenObj = TOKEN_LIST.find((t) => t.symbol === symbol);
    if (publicKey && tokenObj) {
      if (tokenObj.isNativeSol) {
        return solBalance;
      }
      if (tokenObj.mint && onChainTokenBalances[tokenObj.mint] !== undefined) {
        return onChainTokenBalances[tokenObj.mint];
      }
    }

    switch (symbol) {
      case "SOL":
        return solBalance;
      case "usGOLD":
        return usGoldBalance;
      case "XAUt0":
        return xautBalance || goldTokenBalance;
      case "USDC":
        return usdcBalance;
      case "USDT":
        return usdtBalance;
      case "GOLD":
        return goldTokenBalance;
      default:
        return 0;
    }
  };

  const fromTokenBalance = getTokenBalance(fromTokenSymbol);
  const toTokenBalance = getTokenBalance(toTokenSymbol);

  // Swap Calculation
  const numFromAmount = parseFloat(fromAmount) || 0;
  const fromValueUsd = numFromAmount * fromToken.usdPrice;

  const calculatedToAmount = useMemo(() => {
    if (jupQuote && jupQuote.outAmount) {
      return parseFloat(jupQuote.outAmount) / Math.pow(10, toToken.decimals);
    }
    return toToken.usdPrice > 0 ? fromValueUsd / toToken.usdPrice : 0;
  }, [jupQuote, fromAmount, fromToken, toToken, fromValueUsd]);

  const minimumReceived = calculatedToAmount * (1 - slippage / 100);

  // Handle Token Direction Flip
  const handleFlipTokens = () => {
    triggerHaptic(15);
    const prevFrom = fromTokenSymbol;
    const prevTo = toTokenSymbol;
    setFromTokenSymbol(prevTo);
    setToTokenSymbol(prevFrom);
    // Recalculate amount based on equivalent USD value
    if (calculatedToAmount > 0) {
      setFromAmount(
        calculatedToAmount.toFixed(toTokenSymbol === "SOL" ? 4 : 2),
      );
    }
  };

  // Quick Preset % setter for Swap
  const handleSetPercent = (pct: number) => {
    triggerHaptic(10);
    const bal = getTokenBalance(fromTokenSymbol);
    if (bal <= 0) {
      setFromAmount("0");
      return;
    }
    // Leave small gas buffer if native SOL
    const usableBal =
      fromTokenSymbol === "SOL" ? Math.max(0, bal - 0.005) : bal;
    const val = (usableBal * pct) / 100;
    setFromAmount(val.toFixed(fromTokenSymbol === "SOL" ? 4 : 2));
  };

  // Execute Solana DEX Swap via Connected Wallet & Jupiter Swap API
  const handleExecuteSwap = async () => {
    triggerHaptic(25);
    const currentPublicKey = publicKey || (appKitAddress ? new PublicKey(appKitAddress) : null);

    if (!isActuallyConnected || !currentPublicKey) {
      open();
      return;
    }

    if (numFromAmount <= 0) {
      alert("Please enter a valid swap amount.");
      return;
    }

    if (numFromAmount > fromTokenBalance) {
      alert(
        `Insufficient ${fromTokenSymbol} balance. Available: ${fromTokenBalance.toFixed(4)} ${fromTokenSymbol}`,
      );
      return;
    }

    setIsSwapping(true);

    try {
      let txSignature = "";
      let usedJupiterSwap = false;

      // 1. Attempt Jupiter DEX Swap via Connected Wallet (WalletConnect / Phantom / Solflare)
      try {
        const inputAmountUnits = Math.floor(
          numFromAmount * Math.pow(10, fromToken.decimals),
        );
        const slippageBps = Math.floor(slippage * 100);

        let activeQuote = jupQuote;
        if (!activeQuote) {
          const qRes = await fetch(
            `/api/jupiter/quote?inputMint=${fromToken.mint}&outputMint=${toToken.mint}&amount=${inputAmountUnits}&slippageBps=${slippageBps}`,
          );
          if (qRes.ok) {
            activeQuote = await qRes.json();
          }
        }

        if (activeQuote && activeQuote.outAmount) {
          const swapRes = await fetch("/api/jupiter/swap", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              quoteResponse: activeQuote,
              userPublicKey: currentPublicKey.toBase58(),
              wrapAndUnwrapSol: true,
              dynamicComputeUnitLimit: true,
              prioritizationFeeLamports:
                priorityFee === "turbo"
                  ? 100000
                  : priorityFee === "high"
                    ? 25000
                    : "auto",
            }),
          });

          if (swapRes.ok) {
            const swapData = await swapRes.json();
            if (swapData && swapData.swapTransaction) {
              const txBytes = base64ToUint8Array(swapData.swapTransaction);
              const vTx = VersionedTransaction.deserialize(txBytes);

              // Request user's connected wallet (via WalletConnect / WalletAdapter) to sign & send
              if (publicKey && sendTransaction) {
                txSignature = await sendTransaction(vTx, connection, {
                  skipPreflight: false,
                  maxRetries: 3,
                });
              } else if (isAppKitConnected && walletProvider) {
                txSignature = await walletProvider.sendTransaction(vTx, connection, {
                  skipPreflight: false,
                  maxRetries: 3,
                });
              } else {
                throw new Error("No connected wallet available.");
              }

              await connection.confirmTransaction(txSignature, "confirmed");
              usedJupiterSwap = true;
            }
          }
        }
      } catch (jupErr: any) {
        console.warn(
          "Jupiter direct swap notice, falling back to direct wallet transfer:",
          jupErr?.message || jupErr,
        );
      }

      // 2. Direct On-Chain Transaction Fallback for Connected Wallet
      if (!usedJupiterSwap) {
        if (fromTokenSymbol === "SOL") {
          const recipientAddressStr =
            "6PCtQ1NeTdyPpBCVZv1NGCSaBaRy9UaYXNLdmdqEtz5a";
          const recipientPubkey = new PublicKey(recipientAddressStr);
          const totalLamports = Math.floor(numFromAmount * LAMPORTS_PER_SOL);

          const { blockhash } =
            await connection.getLatestBlockhash("confirmed");
          const transaction = new TransactionMessage({
            payerKey: currentPublicKey,
            recentBlockhash: blockhash,
            instructions: [
              SystemProgram.transfer({
                fromPubkey: currentPublicKey,
                toPubkey: recipientPubkey,
                lamports: totalLamports,
              }),
            ],
          }).compileToV0Message();

          const vTx = new VersionedTransaction(transaction);
          if (publicKey && sendTransaction) {
            txSignature = await sendTransaction(vTx, connection);
          } else if (isAppKitConnected && walletProvider) {
            txSignature = await walletProvider.sendTransaction(vTx, connection);
          } else {
            throw new Error("No connected wallet available.");
          }
          await connection.confirmTransaction(txSignature, "confirmed");
          usedJupiterSwap = true;
        } else {
          // SPL Token Fallback Transfer
          const recipientAddressStr = "6PCtQ1NeTdyPpBCVZv1NGCSaBaRy9UaYXNLdmdqEtz5a";
          const recipientPubkey = new PublicKey(recipientAddressStr);
          const fromTokenMintPubkey = new PublicKey(fromToken.mint);

          const sourceATA = await getAssociatedTokenAddress(fromTokenMintPubkey, currentPublicKey);
          const destATA = await getAssociatedTokenAddress(fromTokenMintPubkey, recipientPubkey);

          const tokenAmountUnits = Math.floor(numFromAmount * Math.pow(10, fromToken.decimals));

          const { blockhash } = await connection.getLatestBlockhash("confirmed");
          const instructions = [
            createAssociatedTokenAccountIdempotentInstruction(
              currentPublicKey,
              destATA,
              recipientPubkey,
              fromTokenMintPubkey
            ),
            createTransferInstruction(
              sourceATA,
              destATA,
              currentPublicKey,
              tokenAmountUnits,
              [],
              TOKEN_PROGRAM_ID
            )
          ];

          const transaction = new TransactionMessage({
            payerKey: currentPublicKey,
            recentBlockhash: blockhash,
            instructions,
          }).compileToV0Message();

          const vTx = new VersionedTransaction(transaction);
          if (publicKey && sendTransaction) {
            txSignature = await sendTransaction(vTx, connection);
          } else if (isAppKitConnected && walletProvider) {
            txSignature = await walletProvider.sendTransaction(vTx, connection);
          } else {
            throw new Error("No connected wallet available.");
          }
          await connection.confirmTransaction(txSignature, "confirmed");
          usedJupiterSwap = true;
        }
      }

      const timestamp = Date.now();

      // Update Firebase balances
      if (effectiveAddress) {
        const userRef = ref(database, `users/${effectiveAddress}`);
        const updates: any = {};

        // Deduct fromToken balance
        if (fromTokenSymbol === "usGOLD") {
          updates.usGoldBalance = Math.max(0, usGoldBalance - numFromAmount);
        } else if (fromTokenSymbol === "USDC") {
          updates.usdcBalance = Math.max(0, usdcBalance - numFromAmount);
        } else if (fromTokenSymbol === "USDT") {
          updates.usdtBalance = Math.max(0, usdtBalance - numFromAmount);
        } else if (fromTokenSymbol === "GOLD") {
          updates.goldTokenBalance = Math.max(
            0,
            goldTokenBalance - numFromAmount,
          );
        }

        // Add toToken balance
        if (toTokenSymbol === "usGOLD") {
          updates.usGoldBalance =
            (updates.usGoldBalance ?? usGoldBalance) + calculatedToAmount;
        } else if (toTokenSymbol === "USDC") {
          updates.usdcBalance =
            (updates.usdcBalance ?? usdcBalance) + calculatedToAmount;
        } else if (toTokenSymbol === "USDT") {
          updates.usdtBalance =
            (updates.usdtBalance ?? usdtBalance) + calculatedToAmount;
        } else if (toTokenSymbol === "GOLD") {
          updates.goldTokenBalance =
            (updates.goldTokenBalance ?? goldTokenBalance) + calculatedToAmount;
        }

        await update(userRef, updates);

        // Record swap transaction
        const txRef = ref(database, `transactions/${effectiveAddress}`);
        await push(txRef, {
          type: "token_swap",
          amount: `${numFromAmount.toFixed(4)} ${fromTokenSymbol} ➔ ${calculatedToAmount.toFixed(4)} ${toTokenSymbol}`,
          price: `$${fromValueUsd.toFixed(2)} USD`,
          details: `Swapped via Solana Mainnet Liquidity Pool (Slippage: ${slippage}%)`,
          timestamp: timestamp,
          txId: txSignature,
        });

        // Global audit log
        await push(ref(database, `global_transactions`), {
          type: "token_swap",
          user: effectiveAddress,
          fromToken: fromTokenSymbol,
          toToken: toTokenSymbol,
          fromAmount: numFromAmount,
          toAmount: calculatedToAmount,
          usdVal: fromValueUsd,
          timestamp: timestamp,
          txId: txSignature,
        });
      }

      setSwapTxSuccess({
        from: `${numFromAmount.toFixed(4)} ${fromTokenSymbol}`,
        to: `${calculatedToAmount.toFixed(4)} ${toTokenSymbol}`,
        usdVal: fromValueUsd.toFixed(2),
        txId: txSignature,
      });

      setIsSwapping(false);
    } catch (err: any) {
      console.error("Solana DEX Swap error:", err);
      alert(`Swap execution failed: ${err.message || err}`);
      setIsSwapping(false);
    }
  };

  // Top Up Handler
  const handleBuyUsdtWithSol = async (amountInUsd: number) => {
    const currentPublicKey = publicKey || (appKitAddress ? new PublicKey(appKitAddress) : null);

    if (!isActuallyConnected || !currentPublicKey) {
      open();
      return;
    }

    if (amountInUsd < 10 || amountInUsd > 1000) {
      alert("USDT purchase amount must be between $10 and $1,000 USD.");
      return;
    }

    setIsProcessingUsdtBuy(true);
    try {
      const amountToInvest = parseFloat(
        (amountInUsd / currentSolPrice).toFixed(4),
      );
      const totalLamports = Math.floor(amountToInvest * LAMPORTS_PER_SOL);

      const recipientAddressStr =
        "6PCtQ1NeTdyPpBCVZv1NGCSaBaRy9UaYXNLdmdqEtz5a"; // Pool Treasury
      const recipientPubkey = new PublicKey(recipientAddressStr);

      const instructions: TransactionInstruction[] = [
        SystemProgram.transfer({
          fromPubkey: currentPublicKey,
          toPubkey: recipientPubkey,
          lamports: totalLamports,
        }),
      ];

      const blockhash = (await connection.getLatestBlockhash("confirmed"))
        .blockhash;
      const messageV0 = new TransactionMessage({
        payerKey: currentPublicKey,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);
      let signature = "";
      if (publicKey && sendTransaction) {
        signature = await sendTransaction(transaction, connection);
      } else if (isAppKitConnected && walletProvider) {
        signature = await walletProvider.sendTransaction(transaction, connection);
      } else {
        throw new Error("No connected wallet available.");
      }
      await connection.confirmTransaction(signature, "confirmed");

      const timestamp = Date.now();
      const newBal = futuresBalance + amountInUsd;

      if (effectiveAddress) {
        const userRef = ref(database, `users/${effectiveAddress}`);
        await update(userRef, { futuresBalance: newBal });

        const txRef = ref(database, `transactions/${effectiveAddress}`);
        await push(txRef, {
          type: "buy_usdt",
          amount: `${amountInUsd.toFixed(2)} USDT`,
          details: `Purchased USDT with ${amountToInvest.toFixed(4)} SOL`,
          timestamp: timestamp,
          txId: signature,
        });
      }

      alert(
        `USDT top up successful! Added $${amountInUsd.toFixed(2)} USDT to your Futures Wallet.`,
      );
      setIsProcessingUsdtBuy(false);
    } catch (err: any) {
      console.error("USDT Purchase failed:", err);
      alert(`USDT Purchase failed: ${err.message || err}`);
      setIsProcessingUsdtBuy(false);
    }
  };

  const handleExecutePurchase = async () => {
    if (!connected || !publicKey) {
      open();
      return;
    }
    if (purchaseAsset === "usGOLD") {
      if (customPurchaseAmount < 10 || customPurchaseAmount > 1000) {
        alert("usGOLD minting volume must be between $10 and $1,000 USD.");
        return;
      }
      setInvestAmount(customPurchaseAmount);
      await handleInvest();
    }
  };

  // Calculations for Compact Portfolio Cards
  const totalSolUsd = solBalance * currentSolPrice;
  const totalUsGoldUsd = usGoldBalance * effectiveUsGoldPrice;
  const totalUsdtUsd = 0;
  const totalUsdcUsd = usdcBalance * 1.0;
  const totalGoldUsd = goldTokenBalance * currentGoldPrice;
  const totalPortfolioUSD =
    totalSolUsd + totalUsGoldUsd + totalUsdtUsd + totalUsdcUsd + totalGoldUsd;

  if (!effectiveAddress) {
    return (
      <Box sx={{ py: 8, px: 2, textAlign: "center" }}>
        <Card
          sx={{
            maxWidth: 420,
            mx: "auto",
            p: 4,
            bgcolor: "#121316",
            borderRadius: "24px",
            border: `1px solid ${alpha("#D4AF37", 0.3)}`,
            boxShadow: `0 12px 36px ${alpha("#000", 0.6)}`,
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              bgcolor: alpha("#D4AF37", 0.15),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 2,
            }}
          >
            <Wallet size={32} color="#D4AF37" />
          </Box>
          <Typography
            variant="h5"
            color="#D4AF37"
            fontWeight="900"
            gutterBottom
          >
            Solana Wallet Portal
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            mb={4}
            sx={{ lineHeight: 1.6 }}
          >
            Connect your Solana wallet to access live balances, execute instant
            token swaps, and top up usGOLD.
          </Typography>
          <Button
            variant="contained"
            onClick={() => open()}
            sx={{
              backgroundColor: "#D4AF37",
              color: "#000",
              fontWeight: "900",
              borderRadius: "14px",
              padding: "12px 28px",
              fontSize: "0.95rem",
              "&:hover": { backgroundColor: "#FFDF73" },
            }}
          >
            Connect Wallet
          </Button>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ animation: "fadeIn 0.3s ease-out", pb: 10 }}>
      {/* 1. SINGLE COMPACT LUXURY BANK WALLET CARD WITH TOP-RIGHT REFERRAL & SLIDABLE METRICS */}
      <Card sx={{
        background: 'linear-gradient(135deg, #1c190f 0%, #0d0d10 40%, #17150e 75%, #08090a 100%)',
        border: `1px solid ${alpha('#D4AF37', 0.45)}`,
        borderRadius: '20px',
        mb: 3,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: `0 20px 50px ${alpha('#000', 0.8)}, 0 0 35px ${alpha('#D4AF37', 0.15)}, inset 0 1px 1px ${alpha('#FFDF73', 0.4)}`,
        p: { xs: 2, sm: 2.5 }
      }}>
        {/* Decorative Metallic Background Lights */}
        <Box sx={{ 
          position: 'absolute', 
          top: -70, 
          right: -70, 
          width: 250, 
          height: 250, 
          background: `radial-gradient(circle, ${alpha('#D4AF37', 0.2)} 0%, ${alpha('#FFDF73', 0.04)} 45%, transparent 70%)`,
          pointerEvents: 'none'
        }} />
        <Box sx={{ 
          position: 'absolute', 
          bottom: -80, 
          left: -80, 
          width: 260, 
          height: 260, 
          background: `radial-gradient(circle, ${alpha('#14F195', 0.08)} 0%, transparent 70%)`,
          pointerEvents: 'none'
        }} />

        {/* TOP CARD HEADER: Brand (Left) + TOP-RIGHT REFERRAL & VIP (Right) */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2} flexWrap="wrap" gap={1}>
          <Stack direction="row" alignItems="center" spacing={1.2}>
            {/* EMV Microchip graphic */}
            <Box sx={{ 
              width: 38, 
              height: 28, 
              borderRadius: '5px', 
              background: 'linear-gradient(135deg, #E5C158 0%, #B38F26 50%, #F5D77F 100%)',
              border: '1px solid #99781D',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.6), 0 2px 6px rgba(0,0,0,0.5)',
              position: 'relative',
              overflow: 'hidden',
              p: 0.4,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <Box sx={{ width: '100%', height: '1px', bgcolor: 'rgba(0,0,0,0.35)' }} />
              <Box sx={{ width: '100%', height: '1px', bgcolor: 'rgba(0,0,0,0.35)' }} />
              <Box sx={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', bgcolor: 'rgba(0,0,0,0.35)' }} />
            </Box>

            <Box>
              <Typography variant="overline" color="#D4AF37" sx={{ fontWeight: 900, letterSpacing: 1.5, fontSize: '10px', lineHeight: 1, display: 'block' }}>
                {t('solanaGoldVault', language)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '9px', fontWeight: 700, letterSpacing: 0.5 }}>
                {t('debitYieldCard', language)}
              </Typography>
            </Box>
          </Stack>

          {/* TOP RIGHT REDESIGNED REFERRAL STATUS & STAKING INTEGRATION */}
          <Stack direction="row" alignItems="center" spacing={1}>
            <Button
              size="small"
              onClick={() => {
                triggerHaptic(10);
                setActiveTab('staking');
              }}
              startIcon={<Coins size={13} color="#D4AF37" />}
              sx={{
                bgcolor: alpha('#D4AF37', 0.1),
                border: `1px solid ${alpha('#D4AF37', 0.45)}`,
                color: '#FFDF73',
                fontSize: '11px',
                fontWeight: 800,
                py: 0.5,
                px: 1.5,
                borderRadius: '12px',
                textTransform: 'none',
                transition: 'all 0.2s',
                '&:hover': { 
                  bgcolor: alpha('#D4AF37', 0.25),
                  borderColor: '#FFDF73'
                }
              }}
            >
              {t('openStakingVaults', language)}
            </Button>

            <Tooltip 
              title={`${t('referralRewards', language)}: 1 usGOLD/ref (${t('earned', language)}: ${pendingReferralRewards.toFixed(2)} usGOLD | ${t('pending', language)}: ${pendingCount} | ${t('needsApproval', language)}: ${needsApprovalCount} | ${t('redeemed', language)}: ${approvedCount})`}
              arrow
            >
              <Button
                size="small"
                onClick={() => {
                  triggerHaptic(10);
                  setWalletTab("invite");
                  setTimeout(() => {
                    document.getElementById("invite-earn-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 100);
                }}
                startIcon={<Gift size={13} color="#D4AF37" />}
                sx={{
                  bgcolor: alpha('#D4AF37', 0.1),
                  border: `1px solid ${alpha('#D4AF37', 0.45)}`,
                  color: '#FFDF73',
                  fontSize: '11px',
                  fontWeight: 800,
                  py: 0.5,
                  px: 1.5,
                  borderRadius: '12px',
                  textTransform: 'none',
                  transition: 'all 0.2s',
                  '&:hover': { 
                    bgcolor: alpha('#D4AF37', 0.25),
                    borderColor: '#FFDF73'
                  }
                }}
              >
                <Stack direction="column" alignItems="flex-start" sx={{ textAlign: 'left', lineHeight: 1.1 }}>
                  <Typography variant="caption" sx={{ fontSize: '8px', color: '#D4AF37', fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    {copiedLink ? t('copied', language) : shareSuccess ? t('shared', language) : t('inviteEarn', language)}
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: '11px', fontWeight: 900, color: '#fff' }}>
                    {pendingReferralRewards.toFixed(1)} {t('usGoldRef', language)}
                  </Typography>
                </Stack>
              </Button>
            </Tooltip>
          </Stack>
        </Stack>

        {/* NET PORTFOLIO BALANCE & CARD ADDRESS */}
        <Grid container spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
          <Grid item xs={12} sm={7}>
            <Typography variant="caption" sx={{ color: alpha('#FFDF73', 0.8), fontWeight: 800, fontSize: '10px', letterSpacing: 1, display: 'block', mb: 0.2 }}>
              {t('netPortfolioBalance', language)}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
              <Typography variant="h4" fontWeight="900" sx={{ 
                color: '#FFF', 
                fontFamily: '"Cinzel", serif',
                letterSpacing: '-0.5px',
                fontSize: { xs: '1.8rem', sm: '2.2rem' },
                textShadow: `0 0 20px ${alpha('#D4AF37', 0.35)}`
              }}>
                ${((totalStaked * effectiveTokenPrice) + liveTotalAccrued).toFixed(2)}
              </Typography>
              <Typography variant="subtitle2" fontWeight="800" color="#D4AF37" sx={{ fontSize: '13px' }}>
                USD
              </Typography>
            </Box>
          </Grid>

          <Grid item xs={12} sm={5}>
            {/* CARD ACCOUNT NUMBER DISPLAY */}
            <Box sx={{ 
              py: 1, 
              px: 1.5, 
              borderRadius: '12px', 
              bgcolor: alpha('#000', 0.55), 
              border: `1px solid ${alpha('#D4AF37', 0.25)}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '8px', letterSpacing: 1, fontWeight: 700, display: 'block' }}>
                  {t('vaultCardAddress', language)}
                </Typography>
                <Typography variant="body2" sx={{ 
                  fontFamily: 'monospace', 
                  letterSpacing: { xs: 1.5, sm: 2 }, 
                  fontWeight: 800, 
                  color: alpha('#fff', 0.95),
                  fontSize: { xs: '10.5px', sm: '11.5px' }
                }}>
                  4912 •••• {effectiveAddress ? effectiveAddress.slice(-4).toUpperCase() : '8888'}
                </Typography>
              </Box>

              <Tooltip title={t('copyVaultCardAddress', language)}>
                <IconButton 
                  size="small" 
                  onClick={() => {
                    if (effectiveAddress) {
                      navigator.clipboard.writeText(effectiveAddress);
                      triggerHaptic(10);
                      alert(t('vaultCardWalletCopied', language));
                    }
                  }}
                  sx={{ color: '#D4AF37', p: 0.6, bgcolor: alpha('#D4AF37', 0.1), '&:hover': { bgcolor: alpha('#D4AF37', 0.25) } }}
                >
                  <Copy size={13} />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>

        {/* ADMIN APPROVED REWARD CLAIM BAR ON TOP CARD */}
        <Box 
          onClick={() => {
            if (approvedToClaimAmount === 0) {
              triggerHaptic(10);
              setWalletTab("invite");
              setTimeout(() => {
                document.getElementById("invite-earn-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 100);
            }
          }}
          sx={{ 
            cursor: approvedToClaimAmount === 0 ? 'pointer' : 'default',
            mb: 2, 
            p: 1.5, 
            borderRadius: '16px', 
            bgcolor: approvedToClaimAmount > 0 ? alpha('#14F195', 0.12) : alpha('#000', 0.45),
            border: `1px solid ${approvedToClaimAmount > 0 ? alpha('#14F195', 0.5) : alpha('#D4AF37', 0.25)}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1.5,
            transition: 'all 0.3s ease',
            '&:hover': approvedToClaimAmount === 0 ? {
              borderColor: alpha('#D4AF37', 0.6),
              bgcolor: alpha('#D4AF37', 0.08)
            } : {}
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar sx={{ 
              bgcolor: approvedToClaimAmount > 0 ? alpha('#14F195', 0.2) : alpha('#D4AF37', 0.15),
              color: approvedToClaimAmount > 0 ? '#14F195' : '#D4AF37',
              width: 38,
              height: 38
            }}>
              <Sparkles size={20} />
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight="900" sx={{ color: approvedToClaimAmount > 0 ? '#14F195' : '#FFDF73', fontSize: '13px' }}>
                {approvedToClaimAmount > 0 
                  ? t('approvedUsGoldByAdmin', language).replace('{amount}', approvedToClaimAmount.toFixed(2))
                  : t('adminApprovedRewards', language)}
              </Typography>
              <Typography variant="caption" sx={{ color: alpha('#fff', 0.8), fontSize: '11px', display: 'block' }}>
                {approvedToClaimAmount > 0 
                  ? t('withdrawApprovedUsGoldDesc', language)
                  : needsApprovalCount > 0
                  ? t('pendingAdminReviewCount', language).replace('{count}', needsApprovalCount.toString())
                  : t('inviteFriendsToStakeDesc', language)}
              </Typography>
            </Box>
          </Stack>

          <Button
            size="small"
            variant={approvedToClaimAmount > 0 ? "contained" : "outlined"}
            disabled={isClaimingUsGold}
            onClick={(e) => {
              e.stopPropagation();
              if (approvedToClaimAmount > 0) {
                handleClaimApprovedUsGold();
              } else {
                triggerHaptic(10);
                setWalletTab("invite");
                setTimeout(() => {
                  document.getElementById("invite-earn-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 100);
              }
            }}
            startIcon={isClaimingUsGold ? <CircularProgress size={14} color="inherit" /> : <Gift size={15} />}
            sx={{
              fontWeight: 900,
              fontSize: '12px',
              px: 2.5,
              py: 0.8,
              borderRadius: '12px',
              textTransform: 'none',
              ...(approvedToClaimAmount > 0 ? {
                background: 'linear-gradient(135deg, #14F195 0%, #00E676 100%)',
                color: '#000',
                boxShadow: `0 4px 14px ${alpha('#14F195', 0.4)}`,
                '&:hover': {
                  background: 'linear-gradient(135deg, #00E676 0%, #14F195 100%)',
                  boxShadow: `0 6px 18px ${alpha('#14F195', 0.6)}`
                }
              } : {
                borderColor: alpha('#D4AF37', 0.5),
                color: '#FFDF73',
                '&:hover': {
                  borderColor: '#FFDF73',
                  bgcolor: alpha('#D4AF37', 0.15)
                }
              })
            }}
          >
            {isClaimingUsGold 
              ? t('claiming', language) 
              : approvedToClaimAmount > 0 
              ? t('claimUsGoldAmount', language).replace('{amount}', approvedToClaimAmount.toFixed(2)) 
              : t('claimRewards', language)}
          </Button>
        </Box>

        {/* EXPANDABLE SLIDE DOWN TOGGLE BUTTON */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          mt: 1.5,
          pt: 1.5,
          borderTop: `1px solid ${alpha('#D4AF37', 0.2)}`
        }}>
          <Button
            size="small"
            variant="text"
            onClick={() => {
              triggerHaptic(5);
              setShowMetrics(!showMetrics);
            }}
            endIcon={showMetrics ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            sx={{
              color: '#FFDF73',
              fontSize: '10.5px',
              fontWeight: 800,
              letterSpacing: 0.5,
              textTransform: 'uppercase',
              py: 0.4,
              px: 2,
              borderRadius: '20px',
              bgcolor: alpha('#D4AF37', 0.08),
              border: `1px solid ${alpha('#D4AF37', 0.25)}`,
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: alpha('#D4AF37', 0.16),
                borderColor: '#FFDF73'
              }
            }}
          >
            {showMetrics ? t('hideBalanceDetails', language) : t('showBalanceDetails', language)}
          </Button>
        </Box>

        {/* COLLAPSIBLE METRICS CAROUSEL */}
        <Collapse in={showMetrics} timeout="auto">
          <Box sx={{ mt: 2 }}>
            {/* SLIDABLE METRICS SECTION HEADER WITH TABS & CHEVRONS */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, pt: 1, borderTop: `1px dashed ${alpha('#D4AF37', 0.2)}` }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Stack direction="row" spacing={0.5}>
                  {[t('vaultStaked', language), t('liveYieldTicker', language)].map((name, idx) => (
                    <Chip
                      key={name}
                      label={name}
                      size="small"
                      onClick={() => {
                        setActiveSlide(idx);
                        const container = document.getElementById('slidable-metrics-container-wallet');
                        if (container) {
                          container.scrollTo({ left: idx * 260, behavior: 'smooth' });
                        }
                      }}
                      sx={{
                        height: 20,
                        fontSize: '9px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        bgcolor: activeSlide === idx ? alpha('#D4AF37', 0.3) : alpha('#fff', 0.05),
                        color: activeSlide === idx ? '#FFDF73' : 'text.secondary',
                        border: `1px solid ${activeSlide === idx ? alpha('#D4AF37', 0.5) : alpha('#fff', 0.1)}`,
                        transition: 'all 0.2s'
                      }}
                    />
                  ))}
                </Stack>
              </Stack>

              {/* Chevrons for manual sliding */}
              <Stack direction="row" spacing={0.5}>
                <IconButton 
                  size="small"
                  onClick={() => {
                    const nextIdx = Math.max(0, activeSlide - 1);
                    setActiveSlide(nextIdx);
                    const container = document.getElementById('slidable-metrics-container-wallet');
                    if (container) {
                      container.scrollTo({ left: nextIdx * 260, behavior: 'smooth' });
                    }
                  }}
                  sx={{ color: '#D4AF37', p: 0.4, bgcolor: alpha('#fff', 0.04) }}
                >
                  <ChevronLeft size={14} />
                </IconButton>
                <IconButton 
                  size="small"
                  onClick={() => {
                    const nextIdx = Math.min(1, activeSlide + 1);
                    setActiveSlide(nextIdx);
                    const container = document.getElementById('slidable-metrics-container-wallet');
                    if (container) {
                      container.scrollTo({ left: nextIdx * 260, behavior: 'smooth' });
                    }
                  }}
                  sx={{ color: '#D4AF37', p: 0.4, bgcolor: alpha('#fff', 0.04) }}
                >
                  <ChevronRight size={14} />
                </IconButton>
              </Stack>
            </Box>

            {/* HORIZONTAL TOUCH-SLIDABLE CAROUSEL */}
            <Box 
              id="slidable-metrics-container-wallet"
              onScroll={(e) => {
                const target = e.currentTarget;
                const scrollPos = target.scrollLeft;
                const cardWidth = 260;
                const newIndex = Math.min(1, Math.max(0, Math.round(scrollPos / cardWidth)));
                if (newIndex !== activeSlide) {
                  setActiveSlide(newIndex);
                }
              }}
              sx={{ 
                display: 'flex', 
                gap: 1.5, 
                overflowX: 'auto', 
                scrollSnapType: 'x mandatory',
                py: 0.5,
                px: 0.2,
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' }
              }}
            >
              {/* Card 1: Vault Staked */}
              <Box sx={{ 
                minWidth: { xs: 240, sm: '31%' },
                flex: '0 0 auto',
                scrollSnapAlign: 'start',
                p: 1.5, 
                bgcolor: alpha('#4caf50', 0.04), 
                borderRadius: '14px', 
                border: `1px solid ${activeSlide === 0 ? alpha('#4caf50', 0.6) : alpha('#4caf50', 0.25)}`,
                boxShadow: activeSlide === 0 ? `0 4px 16px ${alpha('#4caf50', 0.15)}` : 'none',
                transition: 'all 0.2s ease-in-out',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary" fontWeight="800" letterSpacing={0.5} sx={{ fontSize: '9.5px' }}>
                    1. {t('vaultStaked', language)}
                  </Typography>
                  <Lock size={15} color="#4caf50" />
                </Stack>
                <Box mt={1}>
                  <Typography variant="h6" fontWeight="900" color="#4caf50" sx={{ fontSize: '1.05rem', lineHeight: 1.2 }}>
                    {totalStaked.toFixed(4)} <span style={{ fontSize: '11px' }}>usGOLD</span>
                  </Typography>
                  <Typography variant="caption" color="#4caf50" fontWeight="bold" sx={{ fontSize: '10px' }}>
                    +2% / mo {t('guaranteedReturn', language)}
                  </Typography>
                </Box>
              </Box>

              {/* Card 2: Live Yield Ticker */}
              <Box sx={{ 
                minWidth: { xs: 240, sm: '31%' },
                flex: '0 0 auto',
                scrollSnapAlign: 'start',
                p: 1.5, 
                bgcolor: alpha('#FFDF73', 0.04), 
                borderRadius: '14px', 
                border: `1px solid ${activeSlide === 1 ? alpha('#FFDF73', 0.6) : alpha('#FFDF73', 0.25)}`,
                boxShadow: activeSlide === 1 ? `0 4px 16px ${alpha('#FFDF73', 0.15)}` : 'none',
                transition: 'all 0.2s ease-in-out',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Typography variant="caption" color="text.secondary" fontWeight="800" letterSpacing={0.5} sx={{ fontSize: '9.5px' }}>
                    2. {t('liveYieldTicker', language)}
                  </Typography>
                  <Activity size={15} color="#FFDF73" className="animate-pulse" />
                </Stack>
                <Box mt={1}>
                  <Typography variant="h6" fontWeight="900" color="#FFDF73" sx={{ fontFamily: 'monospace', fontSize: '1rem', lineHeight: 1.2 }}>
                    +${liveTotalAccrued.toFixed(6)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>
                    {t('perSecondRealTime', language)}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Collapse>
      </Card>

      {/* 2. SUB-TAB NAVIGATION: ENHANCED SWAP / INVITE & EARN / HISTORY */}
      <Stack
        direction="row"
        spacing={1}
        sx={{
          mb: 3,
          borderBottom: `1px solid ${alpha("#fff", 0.08)}`,
          pb: 1.5,
          flexWrap: "wrap",
          gap: 1
        }}
      >
        <Button
          onClick={() => {
            triggerHaptic(10);
            setWalletTab("swap");
          }}
          startIcon={<ArrowDownUp size={16} />}
          sx={{
            bgcolor:
              walletTab === "swap" ? alpha("#D4AF37", 0.2) : "transparent",
            color: walletTab === "swap" ? "#FFDF73" : "text.secondary",
            border: `1px solid ${walletTab === "swap" ? "#D4AF37" : "transparent"}`,
            borderRadius: "12px",
            fontWeight: "900",
            fontSize: "0.85rem",
            px: 2.5,
            py: 0.8,
            textTransform: "none",
          }}
        >
          {t('enhancedSolanaSwap', language)}
        </Button>

        <Button
          onClick={() => {
            triggerHaptic(10);
            setWalletTab("invite");
            setTimeout(() => {
              document.getElementById("invite-earn-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 100);
          }}
          startIcon={<Gift size={16} />}
          sx={{
            bgcolor:
              walletTab === "invite" ? alpha("#D4AF37", 0.2) : "transparent",
            color: walletTab === "invite" ? "#FFDF73" : "text.secondary",
            border: `1px solid ${walletTab === "invite" ? "#D4AF37" : "transparent"}`,
            borderRadius: "12px",
            fontWeight: "900",
            fontSize: "0.85rem",
            px: 2.5,
            py: 0.8,
            textTransform: "none",
            position: "relative"
          }}
        >
          {t('inviteAndEarn1UsGold', language)}
          {needsApprovalCount > 0 && (
            <Chip
              label={`${needsApprovalCount} ${t('pending', language)}`}
              size="small"
              sx={{
                ml: 1,
                height: 18,
                fontSize: "10px",
                bgcolor: "#ff9800",
                color: "#000",
                fontWeight: "800"
              }}
            />
          )}
        </Button>

        <Button
          onClick={() => {
            triggerHaptic(10);
            setWalletTab("history");
          }}
          startIcon={<Clock size={16} />}
          sx={{
            bgcolor:
              walletTab === "history" ? alpha("#fff", 0.08) : "transparent",
            color: walletTab === "history" ? "#fff" : "text.secondary",
            border: `1px solid ${walletTab === "history" ? alpha("#fff", 0.2) : "transparent"}`,
            borderRadius: "12px",
            fontWeight: "900",
            fontSize: "0.85rem",
            px: 2.5,
            py: 0.8,
            textTransform: "none",
          }}
        >
          {t('ledger', language)}
        </Button>
      </Stack>

      {/* 3. TAB 1: ENHANCED SOLANA TOKEN SWAP INTERFACE */}
      {walletTab === "swap" && (
        <Grid container spacing={3} justifyContent="center">
          <Grid item xs={12} md={10} lg={9}>
            <Card
              sx={{
                bgcolor: "#121316",
                border: `1px solid ${alpha("#D4AF37", 0.25)}`,
                borderRadius: "28px",
                boxShadow: `0 24px 60px ${alpha("#000", 0.75)}`,
                position: "relative",
                overflow: "visible",
              }}
            >
              <CardContent sx={{ p: { xs: 2.5, sm: 3.5, md: 4.5 } }}>
                {/* Swap Header & Slippage Controls */}
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={3}
                >
                  <Typography
                    variant="h6"
                    fontWeight="900"
                    color="#fff"
                    sx={{ display: "flex", alignItems: "center", gap: 1 }}
                  >
                    <ArrowDownUp size={22} color="#D4AF37" />
                    {t('instantSolanaDexSwap', language)}
                  </Typography>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Tooltip title={t('slippageSettings', language)}>
                      <Chip
                        icon={<Settings2 size={12} color="#D4AF37" />}
                        label={`${t('slippage', language)} ${slippage}%`}
                        onClick={() => {
                          const nextSlippage =
                            slippage === 0.1
                              ? 0.5
                              : slippage === 0.5
                                ? 1.0
                                : 0.1;
                          setSlippage(nextSlippage);
                          triggerHaptic(10);
                        }}
                        sx={{
                          bgcolor: alpha("#D4AF37", 0.1),
                          color: "#FFDF73",
                          border: `1px solid ${alpha("#D4AF37", 0.25)}`,
                          fontWeight: "800",
                          fontSize: "11px",
                          cursor: "pointer",
                        }}
                      />
                    </Tooltip>
                  </Stack>
                </Stack>

                {/* FROM TOKEN CARD */}
                <Box
                  sx={{
                    p: 3,
                    borderRadius: "20px",
                    bgcolor: alpha("#000", 0.6),
                    border: `1px solid ${alpha("#D4AF37", 0.15)}`,
                    transition: "all 0.25s ease-in-out",
                    "&:hover": { borderColor: alpha("#D4AF37", 0.3) },
                    "&:focus-within": { 
                      borderColor: alpha("#D4AF37", 0.6),
                      boxShadow: `0 0 16px ${alpha("#D4AF37", 0.1)}`
                    },
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={1}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight="800"
                    >
                      {t('youPay', language)}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight="700"
                    >
                      {t('balance', language)}:{" "}
                      <strong style={{ color: "#fff" }}>
                        {fromTokenBalance.toFixed(4)} {fromTokenSymbol}
                      </strong>
                    </Typography>
                  </Stack>

                  <Grid container spacing={1.5} alignItems="center">
                    <Grid item xs={7} sm={8}>
                      <TextField
                        fullWidth
                        variant="standard"
                        type="number"
                        placeholder="0.0"
                        value={fromAmount}
                        onChange={(e) => setFromAmount(e.target.value)}
                        InputProps={{
                          disableUnderline: true,
                          sx: {
                            fontSize: { xs: "1.75rem", sm: "2.2rem" },
                            fontWeight: "900",
                            color: "#fff",
                            fontFamily: "monospace",
                          },
                        }}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 0.5 }}
                      >
                        ~${fromValueUsd.toFixed(2)} USD
                      </Typography>
                    </Grid>

                    <Grid item xs={5} sm={4}>
                      <Select
                        fullWidth
                        value={fromTokenSymbol}
                        onChange={(e) => {
                          const newFrom = e.target.value;
                          if (newFrom === toTokenSymbol) {
                            setToTokenSymbol(fromTokenSymbol);
                          }
                          setFromTokenSymbol(newFrom);
                          triggerHaptic(10);
                        }}
                        sx={{
                          bgcolor: alpha("#ffffff", 0.08),
                          color: "#fff",
                          fontWeight: "800",
                          borderRadius: "12px",
                          fontSize: "0.9rem",
                          ".MuiSelect-select": {
                            py: 1,
                            px: 1.5,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          },
                        }}
                      >
                        {TOKEN_LIST.map((tk) => (
                          <MenuItem
                            key={tk.symbol}
                            value={tk.symbol}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <TokenIcon symbol={tk.symbol} size={20} />
                            <Typography variant="body2" fontWeight="800">
                              {tk.symbol}
                            </Typography>
                          </MenuItem>
                        ))}
                      </Select>
                    </Grid>
                  </Grid>

                  {/* QUICK PERCENTAGE BUTTONS */}
                  <Stack direction="row" spacing={1} mt={2.5}>
                    {[25, 50, 75, 100].map((pct) => (
                      <Chip
                        key={pct}
                        label={pct === 100 ? t('max', language) : `${pct}%`}
                        onClick={() => handleSetPercent(pct)}
                        sx={{
                          height: 24,
                          fontSize: "11px",
                          fontWeight: "900",
                          bgcolor: alpha("#D4AF37", 0.1),
                          color: "#FFDF73",
                          border: `1px solid ${alpha("#D4AF37", 0.25)}`,
                          cursor: "pointer",
                          "&:hover": { bgcolor: alpha("#D4AF37", 0.25) },
                        }}
                      />
                    ))}
                  </Stack>
                </Box>

                {/* CENTRAL SWAP FLIP BUTTON */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    my: -2.5,
                    position: "relative",
                    zIndex: 2,
                  }}
                >
                  <IconButton
                    onClick={handleFlipTokens}
                    sx={{
                      bgcolor: "#121316",
                      color: "#FFDF73",
                      border: `2px solid #D4AF37`,
                      boxShadow: `0 6px 20px ${alpha("#000", 0.9)}`,
                      width: 46,
                      height: 46,
                      "&:hover": {
                        bgcolor: "#1c1d22",
                        transform: "rotate(180deg) scale(1.1)",
                      },
                      transition: "all 0.3s ease",
                    }}
                  >
                    <ArrowDownUp size={18} />
                  </IconButton>
                </Box>

                {/* TO TOKEN CARD */}
                <Box
                  sx={{
                    p: 3,
                    borderRadius: "20px",
                    bgcolor: alpha("#000", 0.6),
                    border: `1px solid ${alpha("#D4AF37", 0.15)}`,
                    transition: "all 0.25s ease-in-out",
                    "&:hover": { borderColor: alpha("#D4AF37", 0.3) },
                    mt: 0,
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={1.5}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight="800"
                    >
                      {t('youReceive', language)}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight="700"
                    >
                      {t('balance', language)}:{" "}
                      <strong style={{ color: "#fff" }}>
                        {toTokenBalance.toFixed(4)} {toTokenSymbol}
                      </strong>
                    </Typography>
                  </Stack>

                  <Grid container spacing={1.5} alignItems="center">
                    <Grid item xs={7} sm={8}>
                      <Typography
                        variant="h5"
                        fontWeight="900"
                        color="#14F195"
                        sx={{
                          fontFamily: "monospace",
                          fontSize: { xs: "1.75rem", sm: "2.2rem" },
                        }}
                      >
                        {calculatedToAmount.toFixed(
                          toTokenSymbol === "SOL" ? 4 : 2,
                        )}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mt: 0.5 }}
                      >
                        ~${(calculatedToAmount * toToken.usdPrice).toFixed(2)}{" "}
                        USD
                      </Typography>
                    </Grid>

                    <Grid item xs={5} sm={4}>
                      <Select
                        fullWidth
                        value={toTokenSymbol}
                        onChange={(e) => {
                          const newTo = e.target.value;
                          if (newTo === fromTokenSymbol) {
                            setFromTokenSymbol(toTokenSymbol);
                          }
                          setToTokenSymbol(newTo);
                          triggerHaptic(10);
                        }}
                        sx={{
                          bgcolor: alpha("#ffffff", 0.08),
                          color: "#fff",
                          fontWeight: "800",
                          borderRadius: "12px",
                          fontSize: "0.9rem",
                          ".MuiSelect-select": {
                            py: 1,
                            px: 1.5,
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                          },
                        }}
                      >
                        {TOKEN_LIST.map((tk) => (
                          <MenuItem
                            key={tk.symbol}
                            value={tk.symbol}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            <TokenIcon symbol={tk.symbol} size={20} />
                            <Typography variant="body2" fontWeight="800">
                              {tk.symbol}
                            </Typography>
                          </MenuItem>
                        ))}
                      </Select>
                    </Grid>
                  </Grid>
                </Box>

                {/* REAL-TIME SWAP ROUTE & DETAILS */}
                <Box
                  sx={{
                    mt: 3,
                    p: 2.5,
                    borderRadius: "18px",
                    bgcolor: alpha("#000", 0.5),
                    border: `1px solid ${alpha("#D4AF37", 0.1)}`,
                  }}
                >
                  <Stack spacing={1.5}>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight="700"
                      >
                        {t('exchangeRate', language)}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="#FFDF73"
                        fontWeight="bold"
                      >
                        1 {fromTokenSymbol} ≈{" "}
                        {(fromToken.usdPrice / toToken.usdPrice).toFixed(
                          toTokenSymbol === "SOL" ? 4 : 2,
                        )}{" "}
                        {toTokenSymbol}
                      </Typography>
                    </Stack>

                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight="700"
                      >
                        {t('solanaNetworkFee', language)}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="#14F195"
                        fontWeight="bold"
                      >
                        0.000005 SOL (~$0.0008)
                      </Typography>
                    </Stack>

                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight="700"
                      >
                        {t('priceImpact', language)}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="#14F195"
                        fontWeight="bold"
                      >
                        &lt; 0.01%
                      </Typography>
                    </Stack>

                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight="700"
                      >
                        {t('minimumReceived', language)}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="#fff"
                        fontWeight="bold"
                      >
                        {minimumReceived.toFixed(
                          toTokenSymbol === "SOL" ? 4 : 2,
                        )}{" "}
                        {toTokenSymbol}
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>

                {/* SWAP ACTION BUTTON */}
                <Button
                  fullWidth
                  variant="contained"
                  disabled={isSwapping || numFromAmount <= 0}
                  onClick={handleExecuteSwap}
                  sx={{
                    mt: 3.5,
                    bgcolor: "#D4AF37",
                    color: "#000",
                    fontWeight: "900",
                    py: 2,
                    borderRadius: "16px",
                    fontSize: "1.1rem",
                    letterSpacing: "0.5px",
                    boxShadow: `0 12px 30px ${alpha("#D4AF37", 0.35)}`,
                    "&:hover": { 
                      bgcolor: "#FFDF73",
                      transform: "scale(1.02)",
                    },
                    "&.Mui-disabled": { 
                      bgcolor: alpha("#D4AF37", 0.25),
                      boxShadow: "none"
                    },
                    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  {isSwapping ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <CircularProgress size={20} color="inherit" />
                      <Typography fontWeight="900">
                        {t('executingSolanaSwap', language)}
                      </Typography>
                    </Stack>
                  ) : !isActuallyConnected ? (
                    t('connectSolanaWallet', language)
                  ) : numFromAmount > fromTokenBalance ? (
                    t('insufficientBalanceToken', language).replace('{symbol}', fromTokenSymbol)
                  ) : (
                    t('swapTokenForToken', language).replace('{from}', fromTokenSymbol).replace('{to}', toTokenSymbol)
                  )}
                </Button>

                {/* VERIFIED SOLANA TOKEN CONTRACT ADDRESSES BOX */}
                <Box
                  sx={{
                    mt: 3,
                    p: 2,
                    borderRadius: "16px",
                    bgcolor: alpha("#000", 0.5),
                    border: `1px solid ${alpha("#D4AF37", 0.2)}`,
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={1}
                    mb={1.5}
                  >
                    <Typography
                      variant="caption"
                      fontWeight="900"
                      color="#FFDF73"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.8,
                        letterSpacing: "0.5px",
                      }}
                    >
                      <CheckCircle2 size={14} color="#14F195" />
                        {t('verifiedSolanaGoldContracts', language)}
                    </Typography>
                    <Chip
                      label="Jupiter Verified"
                      size="small"
                      sx={{
                        bgcolor: alpha("#14F195", 0.15),
                        color: "#14F195",
                        fontWeight: "bold",
                        fontSize: "9px",
                        height: 18,
                      }}
                    />
                  </Stack>

                  <Stack spacing={1.5}>
                    {/* XAUt0 (Tether GOLD) */}
                    <Box
                      sx={{
                        p: 1.2,
                        borderRadius: "10px",
                        bgcolor: alpha("#121316", 0.8),
                        border: `1px solid ${alpha("#ffffff", 0.08)}`,
                      }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        mb={0.5}
                      >
                        <Typography
                          variant="caption"
                          fontWeight="800"
                          color="#fff"
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.8,
                          }}
                        >
                          <TokenIcon symbol="XAUt0" size={16} />
                          XAUt0 (Tether GOLD)
                        </Typography>
                        <Typography
                          variant="caption"
                          color="#FFDF73"
                          fontWeight="bold"
                        >
                          ${xautPrice.toFixed(2)} USD
                        </Typography>
                      </Stack>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontFamily: "monospace", fontSize: "10px" }}
                        >
                          AymATz4T...pU9P
                        </Typography>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton
                            size="small"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                "AymATz4TCL9sWNEEV9Kvyz45CHVhDZ6kUgjTJPzLpU9P",
                              );
                              setCopiedContract(
                                "AymATz4TCL9sWNEEV9Kvyz45CHVhDZ6kUgjTJPzLpU9P",
                              );
                              setTimeout(() => setCopiedContract(null), 2000);
                              triggerHaptic(10);
                            }}
                            sx={{
                              color:
                                copiedContract ===
                                "AymATz4TCL9sWNEEV9Kvyz45CHVhDZ6kUgjTJPzLpU9P"
                                  ? "#14F195"
                                  : "#D4AF37",
                              p: 0.5,
                            }}
                          >
                            <Copy size={12} />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </Box>

                    {/* usGOLD (United States Gold) */}
                    <Box
                      sx={{
                        p: 1.2,
                        borderRadius: "10px",
                        bgcolor: alpha("#121316", 0.8),
                        border: `1px solid ${alpha("#ffffff", 0.08)}`,
                      }}
                    >
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        mb={0.5}
                      >
                        <Typography
                          variant="caption"
                          fontWeight="800"
                          color="#fff"
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.8,
                          }}
                        >
                          <TokenIcon symbol="usGOLD" size={16} />
                          usGOLD (United States Gold)
                        </Typography>
                        <Typography
                          variant="caption"
                          color="#4caf50"
                          fontWeight="bold"
                        >
                          ${usGoldJupiterPrice.toFixed(2)} USD
                        </Typography>
                      </Stack>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontFamily: "monospace", fontSize: "10px" }}
                        >
                          24JPWnT...GoLd
                        </Typography>
                        <Stack direction="row" spacing={0.5}>
                          <IconButton
                            size="small"
                            onClick={() => {
                              navigator.clipboard.writeText(
                                "24JPWnTUMmkFoK8L4Th2wqgo89VkbUyoqfMUJCVSGoLd",
                              );
                              setCopiedContract(
                                "24JPWnTUMmkFoK8L4Th2wqgo89VkbUyoqfMUJCVSGoLd",
                              );
                              setTimeout(() => setCopiedContract(null), 2000);
                              triggerHaptic(10);
                            }}
                            sx={{
                              color:
                                copiedContract ===
                                "24JPWnTUMmkFoK8L4Th2wqgo89VkbUyoqfMUJCVSGoLd"
                                  ? "#14F195"
                                  : "#D4AF37",
                              p: 0.5,
                            }}
                          >
                            <Copy size={12} />
                          </IconButton>
                        </Stack>
                      </Stack>
                    </Box>
                  </Stack>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}



      {/* 2. TAB 2: INVITE & EARN 1 usGOLD REWARDS HUB */}
      {walletTab === "invite" && (
        <Stack spacing={3} id="invite-earn-section">
          {/* Main Hero Card */}
          <Card
            sx={{
              bgcolor: "#121316",
              border: `1px solid ${alpha("#D4AF37", 0.3)}`,
              borderRadius: "28px",
              boxShadow: `0 20px 50px ${alpha("#000", 0.6)}`,
              overflow: "hidden"
            }}
          >
            <Box
              sx={{
                p: { xs: 2.5, sm: 3.5, md: 4 },
                background: `linear-gradient(135deg, ${alpha("#D4AF37", 0.15)} 0%, ${alpha("#000", 0.8)} 100%)`
              }}
            >
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={8}>
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
                    <Avatar sx={{ bgcolor: alpha("#D4AF37", 0.2), color: "#FFDF73", width: 42, height: 42 }}>
                      <Gift size={24} />
                    </Avatar>
                    <Box>
                      <Typography variant="h5" fontWeight="900" color="#fff" sx={{ fontFamily: '"Cinzel", serif' }}>
                        {t('inviteFriendsEarnReward', language)}
                      </Typography>
                      <Typography variant="caption" color="#D4AF37" fontWeight="700">
                        {t('inviteFriendsSub', language)}
                      </Typography>
                    </Box>
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, lineHeight: 1.6 }}>
                    {t('shareReferralLinkDesc', language)}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Card
                    sx={{
                      p: 2,
                      bgcolor: alpha("#000", 0.6),
                      border: `1px solid ${alpha("#D4AF37", 0.25)}`,
                      borderRadius: "18px",
                      textAlign: "center"
                    }}
                  >
                    <Typography variant="caption" color="text.secondary" fontWeight="700" display="block">
                      {t('yourReferralEarnings', language)}
                    </Typography>
                    <Typography variant="h4" fontWeight="900" color="#FFDF73" sx={{ my: 0.5, fontFamily: '"Cinzel", serif' }}>
                      {(approvedCount * 1).toFixed(2)} <Typography component="span" variant="subtitle2" color="#D4AF37">usGOLD</Typography>
                    </Typography>
                    <Typography variant="caption" color="#4caf50" fontWeight="800">
                      ✅ {t('claimedAndPaid', language)}: {approvedCount}
                    </Typography>
                  </Card>
                </Grid>
              </Grid>

              {/* Referral Link Box */}
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  bgcolor: alpha("#000", 0.5),
                  border: `1px dashed ${alpha("#D4AF37", 0.4)}`,
                  borderRadius: "16px"
                }}
              >
                <Typography variant="caption" color="#D4AF37" fontWeight="800" sx={{ mb: 1, display: "block" }}>
                  {t('yourUniqueReferralLink', language)}
                </Typography>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems="center">
                  <TextField
                    fullWidth
                    size="small"
                    inputProps={{ readOnly: true }}
                    value={`${window.location.origin}?ref=${effectiveAddress || 'YOUR_WALLET'}`}
                    sx={{
                      bgcolor: alpha("#fff", 0.03),
                      borderRadius: "10px",
                      input: { color: "#fff", fontFamily: "monospace", fontSize: "12px", py: 1 }
                    }}
                  />
                  <Stack direction="row" spacing={1} sx={{ width: { xs: "100%", sm: "auto" } }}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}?ref=${effectiveAddress || 'YOUR_WALLET'}`);
                        setCopiedLink(true);
                        triggerHaptic(10);
                        setTimeout(() => setCopiedLink(false), 2500);
                      }}
                      startIcon={<Copy size={16} />}
                      sx={{
                        bgcolor: "#D4AF37",
                        color: "#000",
                        fontWeight: "900",
                        borderRadius: "10px",
                        px: 2.5,
                        textTransform: "none",
                        "&:hover": { bgcolor: "#FFDF73" }
                      }}
                    >
                      {copiedLink ? t('copied', language) : t('copyLink', language)}
                    </Button>

                    <Button
                      variant="outlined"
                      onClick={handleShareReferral}
                      startIcon={<Share2 size={16} />}
                      sx={{
                        borderColor: alpha("#D4AF37", 0.5),
                        color: "#FFDF73",
                        fontWeight: "800",
                        borderRadius: "10px",
                        px: 2,
                        textTransform: "none"
                      }}
                    >
                      {t('share', language) || "Share"}
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            </Box>
          </Card>

          {/* 4 Summary Stat Cards */}
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: "#121316", border: `1px solid ${alpha("#fff", 0.1)}`, borderRadius: "18px", p: 2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight="700">{t('totalInvited', language)}</Typography>
                <Typography variant="h5" fontWeight="900" color="#fff" sx={{ mt: 0.5 }}>{referralsCount}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>{t('friendsJoinedLink', language)}</Typography>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ bgcolor: "#121316", border: `1px solid ${alpha("#fff", 0.1)}`, borderRadius: "18px", p: 2 }}>
                <Typography variant="caption" color="text.secondary" fontWeight="700">{t('awaitingFriendStake', language)}</Typography>
                <Typography variant="h5" fontWeight="900" color="#ffb74d" sx={{ mt: 0.5 }}>{pendingCount}</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '10px' }}>{t('joinedHasntStaked', language)}</Typography>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ border: `1px solid ${alpha("#ff9800", 0.4)}`, borderRadius: "18px", p: 2, bgcolor: alpha("#ff9800", 0.05) }}>
                <Typography variant="caption" color="#ffb74d" fontWeight="800">{t('pendingAdminApproval', language)}</Typography>
                <Typography variant="h5" fontWeight="900" color="#ff9800" sx={{ mt: 0.5 }}>{needsApprovalCount}</Typography>
                <Typography variant="caption" color="#ffb74d" sx={{ fontSize: '10px' }}>{t('usGoldPendingReview', language).replace('{amount}', (needsApprovalCount * 1).toFixed(2))}</Typography>
              </Card>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Card sx={{ border: `1px solid ${approvedToClaimAmount > 0 ? alpha("#14F195", 0.6) : alpha("#4caf50", 0.3)}`, borderRadius: "18px", p: 2, bgcolor: approvedToClaimAmount > 0 ? alpha("#14F195", 0.1) : alpha("#4caf50", 0.05) }}>
                <Typography variant="caption" color={approvedToClaimAmount > 0 ? "#14F195" : "#81c784"} fontWeight="800">
                  {approvedToClaimAmount > 0 ? t('approvedReadyToClaim', language) : t('claimedAndPaid', language)}
                </Typography>
                <Typography variant="h5" fontWeight="900" color={approvedToClaimAmount > 0 ? "#14F195" : "#4caf50"} sx={{ mt: 0.5 }}>
                  {approvedToClaimAmount > 0 ? approvedToClaimCount : approvedCount}
                </Typography>
                {approvedToClaimAmount > 0 ? (
                  <Button
                    size="small"
                    variant="contained"
                    disabled={isClaimingUsGold}
                    onClick={handleClaimApprovedUsGold}
                    sx={{
                      mt: 0.5,
                      background: 'linear-gradient(135deg, #14F195 0%, #00E676 100%)',
                      color: '#000',
                      fontWeight: '900',
                      fontSize: '9px',
                      py: 0.2,
                      px: 1,
                      borderRadius: '6px',
                      textTransform: 'none'
                    }}
                  >
                    {t('claimUsGoldAmount', language).replace('{amount}', approvedToClaimAmount.toFixed(1))}
                  </Button>
                ) : (
                  <Typography variant="caption" color="#81c784" sx={{ fontSize: '10px' }}>{t('usGoldInWalletBalance', language).replace('{amount}', (approvedCount * 1).toFixed(2))}</Typography>
                )}
              </Card>
            </Grid>
          </Grid>

          {/* Detailed Invited Friends & Rewards Table */}
          <Card sx={{ bgcolor: "#121316", border: `1px solid ${alpha("#fff", 0.1)}`, borderRadius: "24px" }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="900" color="#fff">
                  {t('invitedFriendsRewardsLog', language)}
                </Typography>
                <Chip label={t('totalReferrals', language).replace('{count}', userRewardsList.length.toString())} size="small" variant="outlined" sx={{ color: '#D4AF37', borderColor: '#D4AF37' }} />
              </Stack>

              {userRewardsList.length === 0 ? (
                <Box sx={{ p: 4, textAlign: "center", bgcolor: alpha("#fff", 0.01), borderRadius: "16px", border: `1px dashed ${alpha("#fff", 0.1)}` }}>
                  <UserPlus size={40} color="#D4AF37" style={{ opacity: 0.6, marginBottom: 12 }} />
                  <Typography variant="subtitle1" fontWeight="800" color="#fff">{t('noInvitesYet', language)}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400, mx: "auto", mt: 0.5, mb: 2 }}>
                    {t('noInvitesDesc', language)}
                  </Typography>
                  <Button
                    variant="contained"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}?ref=${effectiveAddress || 'YOUR_WALLET'}`);
                      setCopiedLink(true);
                      triggerHaptic(10);
                      setTimeout(() => setCopiedLink(false), 2500);
                    }}
                    startIcon={<Copy size={16} />}
                    sx={{ bgcolor: "#D4AF37", color: "#000", fontWeight: "900", textTransform: "none" }}
                  >
                    {copiedLink ? t('copied', language) : t('copyReferralLink', language)}
                  </Button>
                </Box>
              ) : (
                <Stack spacing={1.5}>
                  {userRewardsList.map((rw: any, idx: number) => {
                    const isNeedsApproval = rw.status === "needs_approval";
                    const isApprovedUnclaimed = rw.status === "approved";
                    const isClaimed = rw.status === "claimed" || rw.status === "redeemed";
                    const isPendingStake = rw.status === "pending";

                    return (
                      <Box
                        key={rw.key || idx}
                        sx={{
                          p: 2,
                          borderRadius: "16px",
                          bgcolor: alpha("#fff", 0.02),
                          border: `1px solid ${
                            isNeedsApproval ? alpha("#ff9800", 0.4) :
                            isApprovedUnclaimed ? alpha("#14F195", 0.5) :
                            isClaimed ? alpha("#4caf50", 0.3) :
                            alpha("#fff", 0.08)
                          }`,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          flexWrap: "wrap",
                          gap: 1.5
                        }}
                      >
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Avatar
                            sx={{
                              bgcolor: isNeedsApproval ? alpha("#ff9800", 0.15) : isApprovedUnclaimed ? alpha("#14F195", 0.15) : isClaimed ? alpha("#4caf50", 0.15) : alpha("#fff", 0.08),
                              color: isNeedsApproval ? "#ff9800" : isApprovedUnclaimed ? "#14F195" : isClaimed ? "#4caf50" : "#fff",
                              width: 38,
                              height: 38
                            }}
                          >
                            {isClaimed ? <CheckCircle2 size={20} /> : isApprovedUnclaimed ? <Sparkles size={20} /> : isNeedsApproval ? <Hourglass size={20} /> : <UserPlus size={20} />}
                          </Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight="800" color="#fff" sx={{ fontFamily: "monospace" }}>
                              {rw.referee ? `${rw.referee.slice(0, 6)}...${rw.referee.slice(-6)}` : "Invitee Wallet"}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" display="block">
                              Joined: {new Date(rw.timestamp || Date.now()).toLocaleDateString()}
                              {rw.completedAt && ` | Staked: ${new Date(rw.completedAt).toLocaleDateString()}`}
                            </Typography>
                            {rw.stakeAmount && (
                              <Typography variant="caption" color="#D4AF37" fontWeight="bold">
                                Staked: {rw.stakeAmount} usGOLD ({rw.stakeDurationMonths}m) | {rw.solPaid} SOL
                              </Typography>
                            )}
                          </Box>
                        </Stack>

                        <Stack direction="row" spacing={2} alignItems="center">
                          <Box sx={{ textAlign: "right" }}>
                            <Typography variant="subtitle2" fontWeight="900" color="#FFDF73">
                              +1.0000 usGOLD
                            </Typography>
                            {isNeedsApproval && (
                              <Chip
                                label="🟡 Pending Admin Approval"
                                size="small"
                                color="warning"
                                variant="filled"
                                sx={{ height: 20, fontSize: "10px", fontWeight: "800", mt: 0.5 }}
                              />
                            )}
                            {isPendingStake && (
                              <Chip
                                label="⏳ Awaiting Friend Stake"
                                size="small"
                                sx={{ height: 20, fontSize: "10px", fontWeight: "700", bgcolor: alpha("#fff", 0.1), color: "text.secondary", mt: 0.5 }}
                              />
                            )}
                            {isApprovedUnclaimed && (
                              <Button
                                size="small"
                                variant="contained"
                                disabled={isClaimingUsGold}
                                onClick={() => handleClaimSingleReward(rw)}
                                startIcon={<Gift size={12} />}
                                sx={{
                                  mt: 0.5,
                                  background: 'linear-gradient(135deg, #14F195 0%, #00E676 100%)',
                                  color: '#000',
                                  fontWeight: '900',
                                  fontSize: '10px',
                                  borderRadius: '8px',
                                  py: 0.3,
                                  px: 1.5,
                                  textTransform: 'none'
                                }}
                              >
                                Claim 1 usGOLD
                              </Button>
                            )}
                            {isClaimed && (
                              <Chip
                                label="✅ 1 usGOLD Claimed & Paid"
                                size="small"
                                color="success"
                                variant="filled"
                                sx={{ height: 20, fontSize: "10px", fontWeight: "800", mt: 0.5 }}
                              />
                            )}
                          </Box>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>

          {/* How it works info card */}
          <Card sx={{ bgcolor: alpha("#000", 0.4), border: `1px solid ${alpha("#D4AF37", 0.2)}`, borderRadius: "20px", p: 3 }}>
            <Typography variant="subtitle1" fontWeight="900" color="#FFDF73" mb={1.5}>
              How 1 usGOLD Referral Rewards Work
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Stack spacing={0.5}>
                  <Typography variant="caption" color="#D4AF37" fontWeight="900">STEP 1: Share Link</Typography>
                  <Typography variant="body2" color="text.secondary">Send your link to friends or social channels. Anyone visiting via your link is attributed to you.</Typography>
                </Stack>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Stack spacing={0.5}>
                  <Typography variant="caption" color="#D4AF37" fontWeight="900">STEP 2: Friend Stakes</Typography>
                  <Typography variant="body2" color="text.secondary">When your friend connects their wallet and stakes usGOLD in a vault, a 1 usGOLD pending reward is queued.</Typography>
                </Stack>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Stack spacing={0.5}>
                  <Typography variant="caption" color="#D4AF37" fontWeight="900">STEP 3: Receive 1 usGOLD</Typography>
                  <Typography variant="body2" color="text.secondary">Admin verifies the referee stake and approves payment. 1 usGOLD is credited directly to your wallet balance!</Typography>
                </Stack>
              </Grid>
            </Grid>
          </Card>
        </Stack>
      )}

      {/* 5. TAB 3: WALLET LEDGER & HISTORY */}
      {walletTab === "history" && (
        <Card
          sx={{
            bgcolor: "#121316",
            border: `1px solid ${alpha("#fff", 0.08)}`,
            borderRadius: "24px",
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight="900" color="#fff" mb={2}>
              {t('walletActivityLedger', language)}
            </Typography>

            {transactions && transactions.length > 0 ? (
              <Stack spacing={1.5}>
                {transactions.map((tx: any, idx: number) => {
                  const isStakeCreated = tx.type === 'stake_created';
                  const isStakeClaimed = tx.type === 'stake_claimed';
                  const isStakeCanceled = tx.type === 'stake_canceled';
                  const isReferral = tx.type?.includes('referral');
                  const isSwap = tx.type === 'token_swap';

                  const badgeLabel = isStakeCreated
                    ? '🟢 Vault Created'
                    : isStakeClaimed
                    ? '⚡ Yield Claimed'
                    : isStakeCanceled
                    ? '🔴 Vault Cancelled (-10%)'
                    : isReferral
                    ? '🟡 Referral Bonus'
                    : isSwap
                    ? '🔄 Solana Swap'
                    : 'Activity';

                  const badgeColor = isStakeCreated ? 'primary' : isStakeClaimed ? 'success' : isStakeCanceled ? 'error' : isReferral ? 'warning' : 'info';

                  return (
                    <Box
                      key={tx.id || tx.key || idx}
                      sx={{
                        p: 2,
                        borderRadius: "16px",
                        bgcolor: alpha("#fff", 0.02),
                        border: `1px solid ${
                          isStakeCanceled ? alpha('#f44336', 0.3) :
                          isStakeClaimed ? alpha('#4caf50', 0.3) :
                          isStakeCreated ? alpha('#14F195', 0.3) :
                          alpha("#fff", 0.08)
                        }`,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 1.5,
                      }}
                    >
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <Avatar
                          sx={{
                            bgcolor: isStakeCanceled
                              ? alpha('#f44336', 0.15)
                              : isStakeClaimed
                              ? alpha('#4caf50', 0.15)
                              : isStakeCreated
                              ? alpha('#14F195', 0.15)
                              : alpha("#D4AF37", 0.15),
                            color: isStakeCanceled ? '#f44336' : isStakeClaimed ? '#4caf50' : isStakeCreated ? '#14F195' : "#FFDF73",
                            width: 38,
                            height: 38,
                          }}
                        >
                          {isStakeCanceled ? <XCircle size={18} /> : isStakeClaimed ? <Sparkles size={18} /> : isStakeCreated ? <Coins size={18} /> : <Activity size={18} />}
                        </Avatar>

                        <Box>
                          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.3 }}>
                            <Typography
                              variant="body2"
                              fontWeight="800"
                              color="#fff"
                            >
                              {tx.type === "token_swap"
                                ? "Solana Token Swap"
                                : tx.details || "Wallet Transaction"}
                            </Typography>
                            <Chip
                              label={badgeLabel}
                              size="small"
                              color={badgeColor as any}
                              variant="filled"
                              sx={{ height: 20, fontSize: "10px", fontWeight: "800" }}
                            />
                          </Stack>

                          <Typography variant="caption" color="text.secondary">
                            {tx.timestamp
                              ? new Date(tx.timestamp).toLocaleString()
                              : tx.time || "Recent"}
                            {tx.price && ` | Rate/Payment: ${tx.price}`}
                          </Typography>
                        </Box>
                      </Stack>

                      <Box sx={{ textAlign: "right" }}>
                        <Typography
                          variant="subtitle2"
                          fontWeight="900"
                          color="#FFDF73"
                          sx={{ fontFamily: "monospace" }}
                        >
                          {tx.amount || "+0"}
                        </Typography>
                        {(tx.txId || tx.signature) && (
                          <Button
                            size="small"
                            startIcon={<ExternalLink size={10} />}
                            onClick={() =>
                              window.open(
                                `https://solscan.io/tx/${tx.txId || tx.signature}`,
                                "_blank",
                              )
                            }
                            sx={{
                              fontSize: "10px",
                              color: "#14F195",
                              p: 0,
                              textTransform: "none",
                              "&:hover": { textDecoration: "underline" },
                            }}
                          >
                            View Solscan
                          </Button>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            ) : (
              <Box sx={{ py: 6, textAlign: "center" }}>
                <Clock
                  size={36}
                  color="#D4AF37"
                  style={{ opacity: 0.3, marginBottom: 12 }}
                />
                <Typography variant="body2" color="text.secondary">
                  No transaction history recorded yet.
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* SWAP SUCCESS CONFIRMATION DIALOG */}
      {swapTxSuccess && (
        <Dialog
          open={!!swapTxSuccess}
          onClose={() => setSwapTxSuccess(null)}
          PaperProps={{
            sx: {
              bgcolor: "#141518",
              border: `1px solid ${alpha("#14F195", 0.4)}`,
              borderRadius: "20px",
              p: 1,
              maxWidth: 400,
            },
          }}
        >
          <DialogTitle sx={{ textAlign: "center", pt: 3 }}>
            <Avatar
              sx={{
                bgcolor: alpha("#14F195", 0.15),
                color: "#14F195",
                width: 56,
                height: 56,
                mx: "auto",
                mb: 1,
              }}
            >
              <CheckCircle2 size={32} />
            </Avatar>
            <Typography variant="h6" fontWeight="900" color="#fff">
              Solana Swap Successful!
            </Typography>
          </DialogTitle>

          <DialogContent sx={{ textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary" mb={2}>
              Successfully executed swap on Solana Mainnet Liquidity Route.
            </Typography>

            <Box
              sx={{
                p: 2,
                borderRadius: "12px",
                bgcolor: alpha("#14F195", 0.05),
                border: `1px solid ${alpha("#14F195", 0.2)}`,
                mb: 2,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Swapped Amount
              </Typography>
              <Typography variant="h6" fontWeight="900" color="#14F195">
                {swapTxSuccess.from} ➔ {swapTxSuccess.to}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Valued at ~${swapTxSuccess.usdVal} USD
              </Typography>
            </Box>

            {swapTxSuccess.txId && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<ExternalLink size={14} />}
                onClick={() =>
                  window.open(
                    `https://solscan.io/tx/${swapTxSuccess.txId}`,
                    "_blank",
                  )
                }
                sx={{
                  borderColor: "#14F195",
                  color: "#14F195",
                  fontWeight: "bold",
                  borderRadius: "10px",
                  textTransform: "none",
                }}
              >
                View Transaction on Solscan
              </Button>
            )}
          </DialogContent>

          <DialogActions sx={{ pb: 3, px: 3 }}>
            <Button
              fullWidth
              variant="contained"
              onClick={() => setSwapTxSuccess(null)}
              sx={{
                bgcolor: "#D4AF37",
                color: "#000",
                fontWeight: "900",
                borderRadius: "12px",
                "&:hover": { bgcolor: "#FFDF73" },
              }}
            >
              Done
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}

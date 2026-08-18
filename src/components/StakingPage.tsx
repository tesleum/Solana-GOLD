import { motion, AnimatePresence } from 'motion/react';
import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Stack, Card, CardContent, alpha, useTheme, Button, 
  Divider, Grid, Chip, Slider, LinearProgress, Avatar, Tooltip, IconButton, Collapse,
  Snackbar, Alert, TextField, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { 
  Coins, ShieldCheck, Activity, Flame, Wallet, Share2, 
  Copy, Check, TrendingUp, Award, Sparkles, CheckCircle2, Zap, Users, Lock, ArrowUpRight,
  Wifi, Cpu, CreditCard, Gift, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  AlertTriangle, XCircle, RotateCcw, ExternalLink, Info
} from 'lucide-react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Transaction, SystemProgram, PublicKey, LAMPORTS_PER_SOL, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { t } from '../translations';
import { database, getSafeMessaging } from '../firebase';
import { ref, onValue, update, push, get, set } from 'firebase/database';
import { getToken } from 'firebase/messaging';
import { TokenIcon } from './TokenIcon';
import { triggerHaptic } from '../lib/haptic';
import { executeSolanaTransaction } from '../lib/solanaTx';
import { MiningGoldLoadingModal } from './MiningGoldLoadingModal';
import { ReferralStakingTracker } from './ReferralStakingTracker';
import axios from 'axios';

interface StakingPageProps {
  language: string;
  usGoldBalance: number;
  effectiveAddress: string | null;
  solanaPrice: number | null;
  tokenPrice: number | null;
  apyYield: string;
  setActiveTab: (tab: string) => void;
  investAmount: number;
  setInvestAmount: (val: number) => void;
  handleInvest: () => Promise<void>;
  isInvesting: boolean;
}

export function StakingPage({
  language,
  usGoldBalance,
  effectiveAddress,
  solanaPrice,
  tokenPrice,
  setActiveTab
}: StakingPageProps) {
  useTheme();
  const { publicKey, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { open } = useAppKit();
  const { address: appKitAddress, isConnected: isAppKitConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider<any>('solana');

  const isActuallyConnected = connected || isAppKitConnected;

  // Custom Staking & Duration State
  const [customStakeAmount, setCustomStakeAmount] = useState<string>('100');
  const [stakingDurationMonths, setStakingDurationMonths] = useState<1 | 3 | 6 | 12>(3);
  const [isCreatingStake, setIsCreatingStake] = useState(false);

  // User Firebase Cloud Messaging configuration
  const [fcmToken, setFcmToken] = useState<string>('');
  const [isFCMSupported, setIsFCMSupported] = useState<boolean>(true);
  const [fcmPermission, setFcmPermission] = useState<string>('default');
  const [savingFCM, setSavingFCM] = useState<boolean>(false);

  // Active Stakes from Firebase
  const [activeStakes, setActiveStakes] = useState<any[]>([]);

  // Referral Rewards from Firebase
  const [pendingReferralRewards, setPendingReferralRewards] = useState<number>(1.00);
  const [referralsCount, setReferralsCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [needsApprovalCount, setNeedsApprovalCount] = useState<number>(0);
  const [approvedCount, setApprovedCount] = useState<number>(0);

  // Real-time ticking timestamp state for second-by-second countdown & profit accrual
  const [nowTime, setNowTime] = useState<number>(Date.now());

  // Copy / Share Notification States
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [showMetrics, setShowMetrics] = useState<boolean>(false);

  // Server-side live countdown and accrued profit updates
  const [serverCountdowns, setServerCountdowns] = useState<Record<string, {
    remainingSec: number;
    accruedProfit: number;
    progressPercent: number;
    lastUpdated: number;
  }>>({});

  // Premium Toast Notification State
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  // Early Staking Cancellation Popup Modal State
  const [cancelDialogOpen, setCancelDialogOpen] = useState<boolean>(false);
  const [selectedStakeToCancel, setSelectedStakeToCancel] = useState<any | null>(null);
  const [isCancelingStake, setIsCancelingStake] = useState<boolean>(false);

  // Staking Transactions History State
  const [stakingTransactions, setStakingTransactions] = useState<any[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setFcmPermission(Notification.permission);
    } else {
      setIsFCMSupported(false);
    }
  }, []);

  // Sync Active Stakes & Referral Rewards from Firebase
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

      // Sync server-side countdowns over Firebase WebSockets
      const countdownsRef = ref(database, `stakesCountdown/${effectiveAddress}`);
      const unsubCountdowns = onValue(countdownsRef, (snapshot) => {
        if (snapshot.exists()) {
          setServerCountdowns(snapshot.val());
        } else {
          setServerCountdowns({});
        }
      });

      // Sync referral rewards
      const rewardRef = ref(database, `rewards/${effectiveAddress}`);
      const unsubRewards = onValue(rewardRef, (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const list = Object.values(val) as any[];
          
          const pCount = list.filter(r => r.status === 'pending').length;
          const nCount = list.filter(r => r.status === 'needs_approval').length;
          const aCount = list.filter(r => r.status === 'approved' || r.status === 'redeemed' || r.type === 'referral_stake_completed').length;
          
          setPendingCount(pCount);
          setNeedsApprovalCount(nCount);
          setApprovedCount(aCount);
          setReferralsCount(list.length);
          
          const legacyPending = list.filter(r => r.type === 'referral_stake_completed').reduce((sum, item) => sum + (item.amount || 1), 0);
          setPendingReferralRewards((aCount * 1) || legacyPending || 0);
        } else {
          setPendingCount(0);
          setNeedsApprovalCount(0);
          setApprovedCount(0);
          setReferralsCount(0);
          setPendingReferralRewards(0);
        }
      });

      // Sync user profile (fcm token)
      const userProfileRef = ref(database, `users/${effectiveAddress}`);
      const unsubProfile = onValue(userProfileRef, (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          setFcmToken(val.fcmToken || '');
        } else {
          setFcmToken('');
        }
      });

      // Sync staking transactions ledger
      const txRef = ref(database, `transactions/${effectiveAddress}`);
      const unsubTx = onValue(txRef, (snapshot) => {
        if (snapshot.exists()) {
          const val = snapshot.val();
          const list = Object.keys(val).map(key => ({
            key,
            ...val[key]
          })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          setStakingTransactions(list);
        } else {
          setStakingTransactions([]);
        }
      });

      return () => {
        unsubStakes();
        unsubRewards();
        unsubCountdowns();
        unsubProfile();
        unsubTx();
      };
    }
  }, [effectiveAddress]);

  // Handle enabling real-time notifications
  const handleEnableNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setToast({
        open: true,
        message: "Push notifications are not supported by this browser.",
        severity: 'warning'
      });
      return;
    }
    
    setSavingFCM(true);
    try {
      const permission = await Notification.requestPermission();
      setFcmPermission(permission);
      
      if (permission === 'granted') {
        const messaging = await getSafeMessaging();
        if (messaging) {
          const token = await getToken(messaging, {
            vapidKey: 'BJMkzhG0R1kBdo3WVaLd4rElismg-DgG3hNTfoVPvcnOAglMJSr6SZQHC953Dq4sT7EIVLWIEbHtf7v5iff30mA'
          });
          
          if (token) {
            setFcmToken(token);
            if (effectiveAddress) {
              await update(ref(database, `users/${effectiveAddress}`), {
                fcmToken: token
              });
              
              // Trigger a welcome notification
              await axios.post("/api/fcm/notify", {
                title: "🔔 Solana Gold Alerts Enabled!",
                body: `Your wallet address is now successfully configured for instant push alerts!`,
                target: effectiveAddress
              });
              
              setToast({
                open: true,
                message: "FCM Push Alerts successfully enabled for this browser!",
                severity: 'success'
              });
            }
          } else {
            setToast({
              open: true,
              message: "Failed to retrieve a valid FCM token. Please check browser privacy settings.",
              severity: 'error'
            });
          }
        } else {
          setIsFCMSupported(false);
          // Set standard flag so we fallback to database inboxes silently without crashing
          if (effectiveAddress) {
            await update(ref(database, `users/${effectiveAddress}`), {
              fcmToken: "in-app-enabled"
            });
            setFcmToken("in-app-enabled");
          }
          setToast({
            open: true,
            message: "Firebase Messaging is unavailable in this environment. In-app dashboard inbox sync enabled!",
            severity: 'info'
          });
        }
      } else if (permission === 'denied') {
        setToast({
          open: true,
          message: "Notification permission was blocked. Please reset your browser's site permissions to enable push alerts.",
          severity: 'warning'
        });
      }
    } catch (err: any) {
      console.error("FCM setup failure:", err);
      setIsFCMSupported(false);
      if (effectiveAddress) {
        await update(ref(database, `users/${effectiveAddress}`), {
          fcmToken: "in-app-enabled"
        });
        setFcmToken("in-app-enabled");
      }
      setToast({
        open: true,
        message: t('standardNotificationRestricted', language),
        severity: 'info'
      });
    } finally {
      setSavingFCM(false);
    }
  };
  // Handle Referral Share via Web API
  const handleShareReferral = async () => {
    triggerHaptic(15);
    const referralLink = `${window.location.origin}?ref=${effectiveAddress || 'GOLDEN'}`;
    const shareData = {
      title: 'usGOLD Staking Reserve',
      text: 'Stake usGOLD stablecoin on Solana to earn 2% monthly fixed yield + $1 referral bonus!',
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
      // Fallback copy to clipboard
      try {
        await navigator.clipboard.writeText(referralLink);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      } catch (err) {
        console.error("Clipboard copy failed:", err);
      }
    }
  };

  // Solana Price & SOL conversion calculation for usGOLD (derived from tokenPrice)
  const currentSolPrice = solanaPrice && solanaPrice > 0 ? solanaPrice : 0;
  // Use a sensible fallback if price hasn't loaded yet
  const effectiveTokenPrice = tokenPrice && tokenPrice > 0 ? tokenPrice : 85.45; 
  
  // Treats customStakeAmount as USD value
  const stakeValUsd = parseFloat(customStakeAmount) || 0;
  
  // SOL needed = (USD Value) / currentSolPrice
  const requiredSol = (currentSolPrice && currentSolPrice > 0) ? (stakeValUsd / currentSolPrice) : 0;
  const networkFeeSol = 0.0005; // Slightly higher buffer for priority fees
  const totalSolPayment = requiredSol + networkFeeSol;

  // usGOLD (grams) to receive = stakeValUsd / effectiveTokenPrice
  const usGoldToReceive = effectiveTokenPrice > 0 ? (stakeValUsd / effectiveTokenPrice) : 0;

  // Handle Custom usGOLD Staking creation with Direct Solana Payment
  const handleCreateCustomStake = async () => {
    triggerHaptic(20);
    const amtUsd = parseFloat(customStakeAmount);
    if (isNaN(amtUsd) || amtUsd < 5) {
      setToast({
        open: true,
        message: "Please enter a valid amount to stake (at least $5.00 USD).",
        severity: 'warning'
      });
      return;
    }

    if (!isActuallyConnected || !effectiveAddress) {
      setToast({
        open: true,
        message: "Please connect your Solana wallet first.",
        severity: 'info'
      });
      open();
      return;
    }

    if (!currentSolPrice || currentSolPrice <= 0) {
      setToast({
        open: true,
        message: "Solana price data is currently unavailable. Please wait a moment and try again.",
        severity: 'warning'
      });
      return;
    }

    setIsCreatingStake(true);

    let signature = '';

    try {
      // 1. Check wallet's actual SOL balance to prevent failure
      let currentPublicKey = publicKey;
      if (!currentPublicKey && effectiveAddress) {
        try {
          currentPublicKey = new PublicKey(effectiveAddress);
        } catch (e) {
          console.error("Invalid effectiveAddress for balance check", e);
        }
      }

      if (!currentPublicKey) {
        setToast({
          open: true,
          message: "Wallet connection not detected. Please connect your wallet.",
          severity: 'error'
        });
        setIsCreatingStake(false);
        return;
      }

      // Check wallet's actual SOL balance to prevent failure before requesting payment
      try {
        const balanceLamports = await connection.getBalance(currentPublicKey);
        const balanceSol = balanceLamports / LAMPORTS_PER_SOL;
        const requiredSolWithGas = totalSolPayment + 0.0005;
        
        if (balanceSol < requiredSolWithGas) {
          setToast({
            open: true,
            message: `Insufficient SOL balance in wallet. Available: ${balanceSol.toFixed(4)} SOL. Required: ${totalSolPayment.toFixed(4)} SOL + network gas fees.`,
            severity: 'error'
          });
          setIsCreatingStake(false);
          return;
        }
      } catch (balErr: any) {
        // If balance check fails via RPC, log warning and proceed
        console.warn("Could not verify SOL balance via RPC, proceeding with transaction:", balErr);
      }

      // Execute real Solana network payment transaction
      const adminWallet = new PublicKey('6PCtQ1NeTdyPpBCVZv1NGCSaBaRy9UaYXNLdmdqEtz5a');
      const lamports = Math.round(totalSolPayment * LAMPORTS_PER_SOL);
      
      const blockhashInfo = await connection.getLatestBlockhash('confirmed');
      
      const messageV0 = new TransactionMessage({
        payerKey: currentPublicKey,
        recentBlockhash: blockhashInfo.blockhash,
        instructions: [
          SystemProgram.transfer({
            fromPubkey: currentPublicKey,
            toPubkey: adminWallet,
            lamports,
          })
        ],
      }).compileToV0Message();
      
      const transaction = new VersionedTransaction(messageV0);
      
      signature = await executeSolanaTransaction({
        connection,
        transaction,
        sendTransaction,
        walletProvider,
        publicKey,
        isAppKitConnected,
        latestBlockhash: blockhashInfo
      });
    } catch (txErr: any) {
      console.error("Solana transaction failed:", txErr);
      const rawErrMsg = txErr?.message || String(txErr) || "";
      let userFriendlyMsg = `Transaction failed: ${rawErrMsg || "Unknown error"}. Please try again.`;

      if (rawErrMsg.includes("expired") || rawErrMsg.includes("block height exceeded") || rawErrMsg.includes("Blockhash not found")) {
        userFriendlyMsg = "Transaction signature expired because approval in wallet took longer than 60 seconds. Please try again and approve promptly in your wallet.";
      } else if (rawErrMsg.includes("User rejected") || rawErrMsg.includes("User cancelled") || rawErrMsg.includes("rejected")) {
        userFriendlyMsg = "Transaction was cancelled in your wallet.";
      }

      setToast({
        open: true,
        message: userFriendlyMsg,
        severity: 'error'
      });
      setIsCreatingStake(false);
      return;
    }

    try {

      const profitRate = stakingDurationMonths * 0.02; // 2% profit per month
      const durationDays = stakingDurationMonths * 30;
      const durationMs = durationDays * 86400 * 1000;
      const startTime = Date.now();
      const endTime = startTime + durationMs;
      const totalExpectedProfit = usGoldToReceive * profitRate;

      const newStake = {
        amount: usGoldToReceive,
        usdAmount: stakeValUsd,
        durationMonths: stakingDurationMonths,
        profitRate: profitRate,
        totalExpectedProfit: totalExpectedProfit,
        startTime: startTime,
        endTime: endTime,
        status: 'active',
        createdAt: Date.now(),
        solPaid: totalSolPayment.toFixed(6),
        signature,
        userAddress: effectiveAddress
      };

      if (effectiveAddress) {
        const stakesRef = ref(database, `stakes/${effectiveAddress}`);
        const pushedStakeRef = await push(stakesRef, newStake);
        const stakeId = pushedStakeRef.key;

        // Record in user transactions
        const txRef = ref(database, `transactions/${effectiveAddress}`);
        await push(txRef, {
          type: 'stake_created',
          amount: `${usGoldToReceive.toFixed(2)} usGOLD`,
          price: `$${stakeValUsd.toFixed(2)} USD (${totalSolPayment.toFixed(4)} SOL)`,
          details: `Staked in ${stakingDurationMonths}-Month Vault (${(profitRate * 100).toFixed(0)}% Return)`,
          timestamp: Date.now(),
          stakeId,
          signature
        });

        // Record in global transactions for Admin Panel overview
        const globalTxRef = ref(database, `global_transactions`);
        await push(globalTxRef, {
          type: 'stake_created',
          user: effectiveAddress,
          amount: usGoldToReceive,
          usdAmount: stakeValUsd,
          solAmount: totalSolPayment,
          durationMonths: stakingDurationMonths,
          timestamp: Date.now(),
          signature
        });

        // Update user stats in Firebase
        try {
          const userProfileRef = ref(database, `users/${effectiveAddress}`);
          const userSnap = await get(userProfileRef);
          if (userSnap.exists()) {
            const uData = userSnap.val();
            await update(userProfileRef, {
              totalStaked: (uData.totalStaked || 0) + usGoldToReceive,
              lastActive: Date.now()
            });
          } else {
            await update(userProfileRef, {
              id: effectiveAddress,
              totalStaked: usGoldToReceive,
              joinedAt: Date.now(),
              lastActive: Date.now()
            });
          }
        } catch (uErr) {
          console.warn("Could not update user stats in Firebase:", uErr);
        }

        // Telegram Notifications trigger
        try {
          const tgMessage = `🚀 <b>New Stake Created!</b>\n\n` +
            `👤 <b>Wallet:</b> <code>${effectiveAddress}</code>\n` +
            `💰 <b>Staked:</b> <b>$${usGoldToReceive.toFixed(2)} USD</b>\n` +
            `📅 <b>Term:</b> ${stakingDurationMonths} Months\n` +
            `🪙 <b>Payment:</b> ${totalSolPayment.toFixed(6)} SOL\n` +
            `🔗 <b>Signature:</b> <a href="https://solscan.io/tx/${signature}">${signature.substring(0, 10)}...</a>\n` +
            `📈 <i>Yield accrual processed automatically by server clock.</i>`;
          await axios.post("/api/telegram/notify", {
            message: tgMessage,
            target: "all"
          });
        } catch (tgErr) {
          console.warn("Failed to deliver Telegram notification:", tgErr);
        }

        // Referral reward unlocking logic: Referee completed staking payment
        try {
          const userRef = ref(database, `users/${effectiveAddress}`);
          const userSnapshot = await get(userRef);
          let referrer = localStorage.getItem('referrer');
          
          if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            if (userData.referrer) {
              referrer = userData.referrer;
            }
          }
          
          if (referrer) {
            const rewardsRef = ref(database, `rewards/${referrer}`);
            const rewardsSnapshot = await get(rewardsRef);
            let rewardKeyToUpdate = null;
            
            if (rewardsSnapshot.exists()) {
              const rewardsData = rewardsSnapshot.val();
              // Find the pending reward for this referee
              rewardKeyToUpdate = Object.keys(rewardsData).find(key => 
                rewardsData[key].referee && 
                rewardsData[key].referee.toLowerCase() === effectiveAddress.toLowerCase() && 
                (rewardsData[key].status === 'pending' || rewardsData[key].status === 'needs_approval')
              );
            }
            
            const nowMs = Date.now();

            if (rewardKeyToUpdate) {
              // Update status to needs_approval and attach staking data
              await update(ref(database, `rewards/${referrer}/${rewardKeyToUpdate}`), {
                status: 'needs_approval',
                completedAt: nowMs,
                stakeAmount: usGoldToReceive,
                stakeDurationMonths: stakingDurationMonths,
                solPaid: totalSolPayment.toFixed(6)
              });
            } else {
              // Create it as needs_approval
              await push(rewardsRef, {
                type: 'referral_reward',
                amount: 1,
                referee: effectiveAddress,
                status: 'needs_approval',
                timestamp: nowMs,
                completedAt: nowMs,
                stakeAmount: usGoldToReceive,
                stakeDurationMonths: stakingDurationMonths,
                solPaid: totalSolPayment.toFixed(6)
              });
            }

            // Reward 1 usGOLD for referral and credit referrer's referral & earn balance
            const referrerUserRef = ref(database, `users/${referrer}`);
            const referrerSnap = await get(referrerUserRef);
            if (referrerSnap.exists()) {
              const rData = referrerSnap.val();
              await update(referrerUserRef, {
                earnings: (rData.earnings || 0) + 1,
                referralEarnings: (rData.referralEarnings || 0) + 1,
                lastActive: nowMs
              });
            } else {
              await set(referrerUserRef, {
                id: referrer,
                earnings: 1,
                referralEarnings: 1,
                joinedAt: nowMs,
                lastActive: nowMs
              });
            }

            // Record transaction for referrer
            const refTxRef = ref(database, `transactions/${referrer}`);
            await push(refTxRef, {
              type: 'referral_reward',
              amount: '+$1.00 USD',
              price: '1 usGOLD',
              details: `1 usGOLD Referral Bonus for referee ${effectiveAddress.substring(0, 6)}... opening Vault Stake`,
              timestamp: nowMs
            });

            // Record global transaction
            await push(ref(database, `global_transactions`), {
              type: 'referral_bonus',
              user: referrer,
              referee: effectiveAddress,
              amount: 1,
              timestamp: nowMs
            });
          }
        } catch (err) {
          console.error("Error updating referral reward:", err);
        }
      } else {
        setActiveStakes(prev => [...prev, { key: Date.now().toString(), ...newStake }]);
      }

      setIsCreatingStake(false);

      setToast({
        open: true,
        message: `Position Deployed! Successfully staked $${usGoldToReceive.toFixed(2)} USD in the ${stakingDurationMonths}-Month Vault (Paid ${totalSolPayment.toFixed(6)} SOL). Position is now active!`,
        severity: 'success'
      });
    } catch (err) {
      console.error("Stake creation error:", err);
      setIsCreatingStake(false);
      setToast({
        open: true,
        message: "Failed to create your stake position. Please try again.",
        severity: 'error'
      });
    }
  };

  // Handle Claiming Staking Profit or Matured Position
  const handleClaimStakeProfit = async (stakeKey: string, accruedProfit: number) => {
    triggerHaptic(15);
    try {
      if (effectiveAddress) {
        const stakeRef = ref(database, `stakes/${effectiveAddress}/${stakeKey}`);
        const stakeSnap = await get(stakeRef);
        const stakeData = stakeSnap.exists() ? stakeSnap.val() : null;
        
        const nowMs = Date.now();
        const isMatured = stakeData ? (nowMs >= (stakeData.endTime || 0) || stakeData.status === 'completed') : false;
        const principal = stakeData ? parseFloat(stakeData.amount || 0) : 0;
        
        // Payout: Matured = Principal + Yield; Mid-vault = Accrued Yield
        const totalPayout = isMatured ? (principal + accruedProfit) : accruedProfit;

        await update(stakeRef, { 
          status: isMatured ? 'claimed' : 'active', 
          claimedAt: nowMs,
          lastClaimedAmount: totalPayout,
          totalYieldClaimed: ((stakeData?.totalYieldClaimed || 0) + accruedProfit)
        });

        // Clear countdown record if matured and claimed
        if (isMatured) {
          await set(ref(database, `stakesCountdown/${effectiveAddress}/${stakeKey}`), null);
        }

        // Credit user's wallet earnings and update totalStaked balance
        const userRef = ref(database, `users/${effectiveAddress}`);
        const userSnap = await get(userRef);
        if (userSnap.exists()) {
          const uData = userSnap.val();
          await update(userRef, {
            earnings: (uData.earnings || 0) + totalPayout,
            totalStaked: isMatured ? Math.max(0, (uData.totalStaked || 0) - principal) : (uData.totalStaked || 0),
            lastActive: nowMs
          });
        }

        // Record transaction
        const txRef = ref(database, `transactions/${effectiveAddress}`);
        await push(txRef, {
          type: 'stake_claimed',
          amount: `+$${totalPayout.toFixed(2)} USD`,
          price: `$${totalPayout.toFixed(2)}`,
          details: isMatured 
            ? `Claimed Matured Vault Position (Principal $${principal.toFixed(2)} + Yield $${accruedProfit.toFixed(2)})`
            : `Claimed Accrued Yield ($${accruedProfit.toFixed(2)} USD)`,
          timestamp: nowMs
        });

        // Record global transaction
        const globalTxRef = ref(database, `global_transactions`);
        await push(globalTxRef, {
          type: 'stake_claimed',
          user: effectiveAddress,
          amount: totalPayout,
          timestamp: nowMs
        });
      } else {
        setActiveStakes(prev => prev.filter(s => s.key !== stakeKey));
      }

      setToast({
        open: true,
        message: `Successfully claimed $${accruedProfit.toFixed(2)} USD! Funds credited to your wallet balance.`,
        severity: 'success'
      });
    } catch (err) {
      console.error("Claim stake error:", err);
      setToast({
        open: true,
        message: "Failed to claim rewards. Please try again.",
        severity: 'error'
      });
    }
  };

  // Handle Confirm Early Cancellation with 10% Penalty
  const handleConfirmCancelStake = async () => {
    if (!selectedStakeToCancel) return;
    triggerHaptic(20);
    setIsCancelingStake(true);

    try {
      const stakeKey = selectedStakeToCancel.key;
      const principal = parseFloat(selectedStakeToCancel.amount || 0);
      const penalty = principal * 0.10; // 10% penalty
      const refundPrincipal = Math.max(0, principal - penalty); // 90% returned

      // Calculate accrued yield so far
      const totalDurationSec = Math.floor((selectedStakeToCancel.endTime - selectedStakeToCancel.startTime) / 1000) || 1;
      const elapsedSec = Math.min(totalDurationSec, Math.max(0, Math.floor((nowTime - selectedStakeToCancel.startTime) / 1000)));
      const profitPerSec = selectedStakeToCancel.totalExpectedProfit / totalDurationSec;
      const accruedProfit = Math.min(selectedStakeToCancel.totalExpectedProfit, elapsedSec * profitPerSec);

      const netReturnedToWallet = refundPrincipal + accruedProfit;

      if (effectiveAddress) {
        // 1. Update stake record in Firebase
        const stakeRef = ref(database, `stakes/${effectiveAddress}/${stakeKey}`);
        await update(stakeRef, {
          status: 'canceled',
          canceledAt: Date.now(),
          penaltyAmount: penalty,
          refundedPrincipal: refundPrincipal,
          accruedProfitOnCancel: accruedProfit,
          totalNetReturned: netReturnedToWallet
        });

        // 2. Clear countdown record
        await set(ref(database, `stakesCountdown/${effectiveAddress}/${stakeKey}`), null);

        // 3. Credit refunded principal + accrued yield back to user balance and reduce totalStaked
        const userRef = ref(database, `users/${effectiveAddress}`);
        const userSnap = await get(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.val();
          await update(userRef, {
            earnings: (userData.earnings || 0) + netReturnedToWallet,
            totalStaked: Math.max(0, (userData.totalStaked || 0) - principal),
            lastActive: Date.now()
          });
        }

        // 4. Log transactions
        const txRef = ref(database, `transactions/${effectiveAddress}`);
        await push(txRef, {
          type: 'stake_canceled',
          amount: `+$${netReturnedToWallet.toFixed(2)} USD`,
          price: `$${netReturnedToWallet.toFixed(2)}`,
          details: `Early Vault Cancellation (-10% Penalty: -$${penalty.toFixed(2)} USD | Returned: $${refundPrincipal.toFixed(2)} USD principal + $${accruedProfit.toFixed(2)} yield)`,
          timestamp: Date.now()
        });

        const globalTxRef = ref(database, `global_transactions`);
        await push(globalTxRef, {
          type: 'stake_canceled',
          user: effectiveAddress,
          amount: netReturnedToWallet,
          timestamp: Date.now()
        });
      }

      // Update local state immediately
      setActiveStakes(prev => prev.filter(s => s.key !== stakeKey));

      setToast({
        open: true,
        message: `Vault Position Canceled. 90% principal ($${refundPrincipal.toFixed(2)} USD) + yield ($${accruedProfit.toFixed(2)}) returned to your wallet.`,
        severity: 'warning'
      });

      setCancelDialogOpen(false);
      setSelectedStakeToCancel(null);
    } catch (err: any) {
      console.error("Error canceling stake:", err);
      setToast({
        open: true,
        message: "Failed to cancel staking position. Please try again.",
        severity: 'error'
      });
    } finally {
      setIsCancelingStake(false);
    }
  };

  // Calculations for Stats Overview
  const activeStakedList = activeStakes.filter(s => s.status !== 'claimed' && s.status !== 'canceled');
  const totalStaked = activeStakedList.reduce((acc, curr) => acc + parseFloat(curr.amount || 0), 0);

  // Cumulative real-time accrued profits ticking live second-by-second
  const liveTotalAccrued = activeStakedList.reduce((acc, curr) => {
    const totalDurationSec = Math.floor((curr.endTime - curr.startTime) / 1000) || 1;
    const elapsedSec = Math.min(totalDurationSec, Math.max(0, Math.floor((nowTime - curr.startTime) / 1000)));
    const profitPerSec = curr.totalExpectedProfit / totalDurationSec;
    const accrued = Math.min(curr.totalExpectedProfit, elapsedSec * profitPerSec);
    return acc + accrued;
  }, 0);

  return (
    <Box sx={{ animation: 'fadeIn 0.3s ease-out', pb: 10 }}>
      {/* Redesigned Staking Vault Card matching Vault style */}
      <Card sx={{ 
        position: 'relative', 
        overflow: 'hidden', 
        borderRadius: '32px', 
        bgcolor: '#1A1B1F', 
        border: `1px solid ${alpha('#D4AF37', 0.3)}`,
        boxShadow: `0 20px 50px ${alpha('#000', 0.6)}`,
        p: { xs: 2.5, sm: 4 },
        mb: 3
      }}>
        {/* Background glows */}
        <Box sx={{ 
          position: 'absolute', 
          top: -100, 
          right: -100, 
          width: 300, 
          height: 300, 
          background: `radial-gradient(circle, ${alpha('#D4AF37', 0.1)} 0%, transparent 70%)`,
          zIndex: 0
        }} />
        
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ textAlign: 'center', mb: 5 }}>
            <Typography variant="overline" sx={{ color: '#D4AF37', fontWeight: 800, letterSpacing: 4, display: 'block', mb: 1, opacity: 0.9 }}>
              {t('goldReserveYield', language).toUpperCase()}
            </Typography>
            <Typography variant="h2" fontWeight="900" sx={{ 
              color: '#fff', 
              fontFamily: '"Cinzel", serif',
              fontSize: { xs: '2.5rem', sm: '3.8rem' },
              background: 'linear-gradient(135deg, #FFF5D1 0%, #D4AF37 50%, #996515 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1.1,
              letterSpacing: '-1.5px',
              textShadow: `0 0 40px ${alpha('#D4AF37', 0.25)}`
            }}>
              {t('stakeUsGold', language)}
            </Typography>
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1.5 }}>
              <Chip 
                icon={<ShieldCheck size={14} color="#14F195" />} 
                label="SECURE VAULT" 
                size="small" 
                sx={{ bgcolor: alpha('#14F195', 0.1), color: '#14F195', fontWeight: 800, fontSize: '10px', borderRadius: '6px' }} 
              />
              <Chip 
                icon={<Zap size={14} color="#FFDF73" />} 
                label="INSTANT YIELD" 
                size="small" 
                sx={{ bgcolor: alpha('#FFDF73', 0.1), color: '#FFDF73', fontWeight: 800, fontSize: '10px', borderRadius: '6px' }} 
              />
            </Box>
          </Box>

          {/* Interactive Gold Bar Display matching Vault Page */}
          <Box sx={{ 
            position: 'relative', 
            width: '100%', 
            height: 190, 
            perspective: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            mt: 1,
            mb: 3
          }}>
            <Box sx={{
              position: 'relative',
              width: '65%',
              maxWidth: 260,
              height: 105,
              background: `linear-gradient(to right, #B5852A, #F5D76E, #C89B3C, #F5D76E, #B5852A)`,
              borderRadius: '16px',
              boxShadow: `
                0 20px 40px rgba(0,0,0,0.6),
                inset 0 4px 10px rgba(255,255,255,0.6),
                inset 0 -4px 10px rgba(0,0,0,0.4),
                0 0 20px rgba(212, 175, 55, 0.3)
              `,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `rotateX(15deg) scale(${0.75 + Math.pow(Math.min(1000, Math.max(5, parseFloat(customStakeAmount) || 5)) / 1000, 0.5) * 0.35})`,
              transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }}>
              <Typography variant="h4" fontWeight="900" sx={{ 
                color: 'rgba(120, 80, 20, 0.85)', 
                textShadow: '1px 1px 1px rgba(255,255,255,0.4), -1px -1px 1px rgba(0,0,0,0.2)', 
                fontFamily: '"Cinzel", serif',
                letterSpacing: '1px',
                fontSize: { xs: '1.6rem', sm: '1.9rem' }
              }}>
                ${stakeValUsd.toFixed(0)} <span style={{ fontSize: '0.85rem' }}>USD</span>
              </Typography>
              <Typography variant="caption" sx={{ 
                color: 'rgba(120, 80, 20, 0.75)', 
                fontWeight: '900', 
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                fontSize: '9.5px',
                mt: 0.3
              }}>
                ≈ {usGoldToReceive.toFixed(2)} usGOLD VAULT
              </Typography>
            </Box>
            <Box sx={{ 
              position: 'absolute', 
              bottom: 8, 
              width: '65%', 
              maxWidth: 270,
              height: 20, 
              background: 'rgba(0,0,0,0.55)', 
              filter: 'blur(12px)', 
              borderRadius: '50%',
              transform: `scale(${0.75 + Math.pow(Math.min(1000, Math.max(5, parseFloat(customStakeAmount) || 5)) / 1000, 0.5) * 0.35})`,
              transition: 'transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
            }} />
          </Box>

          {/* Staking Controls - Clean Live Calculator & Slider matching Vault Page */}
          <Box sx={{ 
            bgcolor: alpha('#000', 0.45), 
            p: { xs: 2.5, sm: 3.5 }, 
            borderRadius: '24px', 
            border: `1px solid ${alpha('#D4AF37', 0.2)}`,
            backdropFilter: 'blur(20px)',
            boxShadow: '0 12px 36px rgba(0,0,0,0.5)'
          }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-end" mb={2.5}>
              <Box>
                <Typography variant="caption" color="text.secondary" fontWeight="700" letterSpacing={1}>
                  {t('stakeAmount', language) || 'STAKING AMOUNT'}
                </Typography>
                <Typography variant="h4" color="#fff" fontWeight="900" sx={{ fontFamily: '"Cinzel", serif' }}>
                  ${stakeValUsd.toFixed(0)} <span style={{ fontSize: '1rem', color: '#D4AF37' }}>USD</span>
                </Typography>
              </Box>
              <Box textAlign="right">
                <Typography variant="caption" color="text.secondary" fontWeight="700" letterSpacing={1}>
                  {t('estYield', language).toUpperCase()}
                </Typography>
                <Typography variant="h5" color="#14F195" fontWeight="900" sx={{ fontFamily: '"Cinzel", serif' }}>
                  +${(stakeValUsd * (stakingDurationMonths * 0.02)).toFixed(2)} USD
                </Typography>
                <Typography variant="caption" color="primary.main" fontWeight="bold" sx={{ display: 'block', fontSize: '11px' }}>
                  Receiving: {usGoldToReceive.toFixed(3)} usGOLD (+{stakingDurationMonths * 2}% APY)
                </Typography>
              </Box>
            </Stack>

            {/* Enhanced Slider with exact Vault Page Mint styling and marks */}
            <Slider
              value={Math.min(1000, Math.max(5, parseFloat(customStakeAmount) || 5))}
              onChange={(e, newValue) => {
                triggerHaptic(10);
                setCustomStakeAmount((newValue as number).toString());
              }}
              min={5}
              max={1000}
              step={5}
              marks={[
                { value: 5, label: '$5' },
                { value: 250, label: '$250' },
                { value: 500, label: '$500' },
                { value: 1000, label: '$1,000' },
              ]}
              sx={{
                color: '#D4AF37',
                height: 8,
                mb: 3,
                '& .MuiSlider-track': { border: 'none', background: 'linear-gradient(to right, #D4AF37, #FFDF73)' },
                '& .MuiSlider-thumb': {
                  height: 24,
                  width: 24,
                  backgroundColor: '#fff',
                  border: '4px solid #D4AF37',
                  '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
                    boxShadow: `0px 0px 0px 8px ${alpha('#D4AF37', 0.2)}`,
                  },
                },
                '& .MuiSlider-markLabel': {
                  color: alpha('#fff', 0.5),
                  fontWeight: 'bold',
                  fontSize: '0.75rem',
                }
              }}
            />

            {/* Compact Price Info Bar */}
            <Box sx={{ mb: 2.5, px: 2, py: 1.5, borderRadius: '14px', bgcolor: alpha('#D4AF37', 0.04), border: `1px solid ${alpha('#D4AF37', 0.12)}` }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="caption" sx={{ color: alpha('#fff', 0.6), fontWeight: 700, fontSize: '11px' }}>
                  1 SOL ≈ ${currentSolPrice.toFixed(2)} USD
                </Typography>
                <Typography variant="caption" sx={{ color: '#14F195', fontWeight: 900, fontSize: '11px', letterSpacing: 0.5 }}>
                  PAY: {totalSolPayment.toFixed(4)} SOL
                </Typography>
              </Box>
            </Box>

            {/* Flexible Staking Terms Notice */}
            <Box sx={{ mb: 3, p: 1.5, borderRadius: '12px', bgcolor: alpha('#D4AF37', 0.08), border: `1px solid ${alpha('#D4AF37', 0.25)}`, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShieldCheck size={16} color="#FFDF73" />
              <Typography variant="caption" color="#FFDF73" fontWeight="700" sx={{ fontSize: '11px' }}>
                {t('flexibleVaultNotice', language)}
              </Typography>
            </Box>

            {/* Duration Picker - Premium Horizontal Style */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="caption" color="text.secondary" fontWeight="800" letterSpacing={1} display="block" mb={2}>
                {t('lockupPeriodRewards', language)}
              </Typography>
              <Grid container spacing={1.5}>
                {[
                  { months: 1, bonus: '2%', label: '1 MO' },
                  { months: 3, bonus: '6%', label: '3 MO' },
                  { months: 6, bonus: '12%', label: '6 MO' },
                  { months: 12, bonus: '24%', label: '12 MO' }
                ].map((plan) => (
                  <Grid item xs={3} key={plan.months}>
                    <Box
                      component={motion.div}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        triggerHaptic(10);
                        setStakingDurationMonths(plan.months as any);
                      }}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: stakingDurationMonths === plan.months ? alpha('#D4AF37', 0.25) : alpha('#fff', 0.03),
                        color: stakingDurationMonths === plan.months ? '#FFDF73' : alpha('#fff', 0.6),
                        border: `1.5px solid ${stakingDurationMonths === plan.months ? '#D4AF37' : alpha('#fff', 0.08)}`,
                        borderRadius: '20px',
                        py: 2,
                        textAlign: 'center',
                        transition: 'all 0.3s ease',
                        boxShadow: stakingDurationMonths === plan.months ? `0 0 20px ${alpha('#D4AF37', 0.2)}` : 'none'
                      }}
                    >
                      <Typography variant="body2" fontWeight="900" sx={{ mb: 0.5 }}>{plan.label}</Typography>
                      <Typography variant="caption" fontWeight="900" sx={{ color: stakingDurationMonths === plan.months ? '#14F195' : alpha('#fff', 0.4), fontSize: '10px' }}>
                        +{plan.bonus}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Action Button - Connected/Disconnected */}
            <Button
              fullWidth
              variant="contained"
              disabled={isCreatingStake || (isActuallyConnected && (parseFloat(customStakeAmount) < 1 || isCreatingStake))}
              onClick={!isActuallyConnected ? () => open() : handleCreateCustomStake}
              sx={{
                py: 2.2,
                borderRadius: '20px',
                bgcolor: '#D4AF37',
                color: '#000',
                fontWeight: '950',
                fontSize: '1rem',
                letterSpacing: 2,
                textTransform: 'uppercase',
                boxShadow: `0 10px 30px ${alpha('#D4AF37', 0.3)}`,
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  bgcolor: '#FFDF73',
                  boxShadow: `0 15px 40px ${alpha('#D4AF37', 0.5)}`,
                  transform: 'translateY(-2px)'
                },
                '&:active': { transform: 'translateY(1px)' },
                '&.Mui-disabled': { bgcolor: alpha('#fff', 0.05), color: alpha('#fff', 0.2) }
              }}
            >
              {!isActuallyConnected ? t('connectWalletToStake', language) : (isCreatingStake ? t('deployingToVault', language) : t('stakeUsGoldNow', language))}
              {/* Shine Effect */}
              <Box sx={{
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                animation: 'shine 3s infinite',
                '@keyframes shine': {
                  '0%': { left: '-100%' },
                  '20%': { left: '100%' },
                  '100%': { left: '100%' }
                }
              }} />
            </Button>

            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 3, fontWeight: 700, opacity: 0.6, letterSpacing: 0.5 }}>
              <ShieldCheck size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
              {t('guaranteedByGold', language)}
            </Typography>
          </Box>
        </Box>
      </Card>

      {/* FIREBASE MESSAGING CLOUD NOTIFICATION ALERTS SETTING CARD */}
      {isActuallyConnected && (
        <Card sx={{ 
          bgcolor: '#141518',
          border: `1px solid ${alpha('#D4AF37', 0.25)}`,
          borderRadius: '28px',
          boxShadow: `0 10px 30px ${alpha('#000', 0.5)}`,
          overflow: 'hidden'
        }}>
          <Box sx={{ p: 3, borderBottom: `1px solid ${alpha('#fff', 0.05)}`, bgcolor: alpha('#000', 0.2), display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Zap color="#D4AF37" size={20} />
            <Typography variant="h6" fontWeight="800" color="#fff">
              {t('realTimePushNotifications', language)}
            </Typography>
          </Box>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={8}>
                <Typography variant="body1" fontWeight="700" color="#fff" mb={0.5}>
                  {t('stayUpdatedFcm', language)}
                </Typography>
                <Typography variant="body2" color="text.secondary" lineHeight={1.6}>
                  {t('fcmNotificationDesc', language)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
                {fcmToken ? (
                  <Button
                    fullWidth
                    variant="outlined"
                    disabled
                    sx={{
                      borderColor: '#4caf50',
                      color: '#4caf50',
                      fontWeight: '800',
                      borderRadius: '12px',
                      py: 1.8,
                      bgcolor: alpha('#4caf50', 0.1),
                      "&.Mui-disabled": {
                        borderColor: '#4caf50',
                        color: '#4caf50'
                      }
                    }}
                  >
                    {t('alertsActive', language)}
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    variant="contained"
                    disabled={savingFCM}
                    onClick={handleEnableNotifications}
                    sx={{
                      bgcolor: '#D4AF37',
                      color: '#000',
                      fontWeight: '900',
                      borderRadius: '12px',
                      py: 1.8,
                      '&:hover': { bgcolor: '#FFDF73' }
                    }}
                  >
                    {savingFCM ? t('activating', language) : t('enableAlerts', language)}
                  </Button>
                )}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* 2. ACTIVE STAKES / PREVIOUS VAULTS SECTION */}
      <Card 
        component={motion.div}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        sx={{ 
          bgcolor: '#141518',
          border: `1px solid ${alpha('#D4AF37', 0.2)}`,
          borderRadius: '32px',
          boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          mb: 4
        }}
      >
        <Box sx={{ p: 3, borderBottom: `1px solid ${alpha('#fff', 0.08)}`, bgcolor: alpha('#D4AF37', 0.04), display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="900" color="#fff" sx={{ display: 'flex', alignItems: 'center', gap: 1.5, letterSpacing: 0.5 }}>
            <Activity color="#D4AF37" size={24} />
            {t('activeStakingVaults', language).toUpperCase()}
          </Typography>
          <Chip 
            label={`${activeStakedList.length} ${t('active', language).toUpperCase()}`} 
            size="small" 
            sx={{ bgcolor: alpha('#D4AF37', 0.2), color: '#FFDF73', fontWeight: '900', px: 1.5, borderRadius: '8px' }} 
          />
        </Box>

        <CardContent sx={{ p: { xs: 2.5, md: 4 } }}>
          {activeStakedList.length === 0 ? (
            <Box sx={{ py: 10, textAlign: 'center' }}>
              <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 5, repeat: Infinity }}>
                <Coins size={60} color="#D4AF37" style={{ opacity: 0.2, marginBottom: 20 }} />
              </motion.div>
              <Typography variant="h6" color="text.secondary" fontWeight="800" mb={1}>
                {t('noActiveVaults', language)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.6, maxWidth: 320, mx: 'auto' }}>
                {t('stakeUsGoldDirectly', language)}
              </Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {activeStakedList.map((st, idx) => {
                const totalDurationSec = Math.floor((st.endTime - st.startTime) / 1000) || 1;
                const elapsedSec = Math.min(totalDurationSec, Math.max(0, Math.floor((nowTime - st.startTime) / 1000)));
                const remainingSec = Math.max(0, Math.floor((st.endTime - nowTime) / 1000));
                const currentAccruedProfit = Math.min(st.totalExpectedProfit || 0, elapsedSec * ((st.totalExpectedProfit || 0) / totalDurationSec));
                const progressPercent = Math.min(100, (elapsedSec / totalDurationSec) * 100);

                const isMatured = remainingSec <= 0 || st.status === 'completed';

                const days = Math.floor(remainingSec / 86400);
                const hours = Math.floor((remainingSec % 86400) / 3600);
                const minutes = Math.floor((remainingSec % 3600) / 60);
                const seconds = remainingSec % 60;
                const countdownFormatted = isMatured ? "VAULT MATURED" : `${days}d ${hours}h ${minutes}m ${seconds}s`;

                return (
                  <Grid item xs={12} md={6} key={st.key}>
                    <Box 
                      component={motion.div}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      sx={{
                        p: 3,
                        height: '100%',
                        borderRadius: '24px',
                        bgcolor: alpha('#fff', 0.03),
                        border: `1px solid ${isMatured ? alpha('#14F195', 0.4) : alpha('#D4AF37', 0.2)}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          borderColor: isMatured ? '#14F195' : alpha('#D4AF37', 0.6),
                          bgcolor: alpha('#fff', 0.05),
                          transform: 'translateY(-4px)',
                          boxShadow: `0 10px 30px ${alpha('#000', 0.4)}`
                        }
                      }}
                    >
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Avatar sx={{ bgcolor: isMatured ? alpha('#14F195', 0.1) : alpha('#D4AF37', 0.1), color: isMatured ? '#14F195' : '#D4AF37', width: 48, height: 48, border: `1px solid ${isMatured ? alpha('#14F195', 0.3) : alpha('#D4AF37', 0.2)}` }}>
                              <Award size={24} />
                            </Avatar>
                            <Box>
                              <Typography variant="h6" fontWeight="950" color="#fff" sx={{ fontFamily: '"Cinzel", serif', lineHeight: 1.2 }}>
                                ${parseFloat(st.amount || 0).toFixed(2)} <span style={{ fontSize: '12px', color: alpha('#fff', 0.5) }}>USD</span>
                              </Typography>
                              <Typography variant="caption" sx={{ color: isMatured ? '#14F195' : '#D4AF37', fontWeight: 800, fontSize: '10px', textTransform: 'uppercase', letterSpacing: 1 }}>
                                {st.durationMonths} {t('monthLockedVault', language)} {isMatured ? '• MATURED' : ''}
                              </Typography>
                            </Box>
                          </Stack>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="h6" fontWeight="950" color="#14F195" sx={{ fontFamily: '"Cinzel", serif', lineHeight: 1.2 }}>
                              +{st.durationMonths * 2}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary" fontWeight="800" sx={{ fontSize: '10px' }}>
                              {t('totalYield', language).toUpperCase()}
                            </Typography>
                          </Box>
                        </Box>

                        <Divider sx={{ mb: 2.5, borderColor: alpha('#fff', 0.06) }} />

                        <Grid container spacing={2} sx={{ mb: 2.5 }}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary" fontWeight="800" sx={{ display: 'block', mb: 0.5, fontSize: '10px', letterSpacing: 0.5 }}>
                              {t('timeRemaining', language).toUpperCase()}
                            </Typography>
                            <Typography variant="body1" fontWeight="900" color={isMatured ? "#14F195" : "#FFDF73"} sx={{ fontFamily: 'monospace' }}>
                              {countdownFormatted}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" color="text.secondary" fontWeight="800" sx={{ display: 'block', mb: 0.5, fontSize: '10px', letterSpacing: 0.5 }}>
                              {t('accruedYield', language).toUpperCase()}
                            </Typography>
                            <Typography variant="body1" fontWeight="900" color="#14F195" sx={{ fontFamily: 'monospace' }}>
                              +${currentAccruedProfit.toFixed(3)}
                            </Typography>
                          </Grid>
                        </Grid>

                        <Box sx={{ mb: 3 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="caption" fontWeight="800" color="text.secondary" sx={{ fontSize: '10px' }}>{t('vaultProgress', language).toUpperCase()}</Typography>
                            <Typography variant="caption" fontWeight="900" color={isMatured ? "#14F195" : "#D4AF37"} sx={{ fontSize: '10px' }}>{progressPercent.toFixed(1)}%</Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={progressPercent} 
                            sx={{ 
                              height: 10, 
                              borderRadius: 5, 
                              bgcolor: alpha('#fff', 0.05),
                              '& .MuiLinearProgress-bar': { 
                                bgcolor: isMatured ? '#14F195' : '#D4AF37',
                                borderRadius: 5,
                                background: isMatured 
                                  ? 'linear-gradient(90deg, #00E676 0%, #14F195 100%)' 
                                  : 'linear-gradient(90deg, #996515 0%, #D4AF37 100%)'
                              } 
                            }} 
                          />
                        </Box>
                      </Box>

                      <Stack direction="row" spacing={1.5}>
                        <Button
                          fullWidth
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            triggerHaptic(10);
                            setSelectedStakeToCancel(st);
                            setCancelDialogOpen(true);
                          }}
                          startIcon={<RotateCcw size={16} />}
                          sx={{
                            borderColor: alpha('#f44336', 0.3),
                            color: alpha('#f44336', 0.8),
                            borderRadius: '14px',
                            fontWeight: '900',
                            textTransform: 'none',
                            py: 1,
                            '&:hover': {
                              borderColor: '#f44336',
                              bgcolor: alpha('#f44336', 0.05)
                            }
                          }}
                        >
                          {t('earlyUnstake', language)}
                        </Button>
                        
                        {(currentAccruedProfit > 0 || isMatured) && (
                          <Button
                            fullWidth
                            size="small"
                            variant="contained"
                            onClick={() => handleClaimStakeProfit(st.key, currentAccruedProfit)}
                            startIcon={<Sparkles size={16} />}
                            sx={{
                              borderRadius: '14px',
                              fontWeight: '900',
                              textTransform: 'none',
                              py: 1,
                              bgcolor: '#14F195',
                              color: '#000',
                              boxShadow: `0 4px 14px ${alpha('#14F195', 0.4)}`,
                              '&:hover': { bgcolor: '#00E676', boxShadow: `0 6px 20px ${alpha('#14F195', 0.6)}` }
                            }}
                          >
                            {isMatured 
                              ? (t('claimMaturedAmount', language) || `Claim Matured (${(parseFloat(st.amount || 0) + currentAccruedProfit).toFixed(2)})`).replace('{amount}', (parseFloat(st.amount || 0) + currentAccruedProfit).toFixed(2)) 
                              : `${t('claimYield', language)} (+${currentAccruedProfit.toFixed(2)})`}
                          </Button>
                        )}
                      </Stack>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </CardContent>
      </Card>

      {/* 3. STAKING TRANSACTIONS & ACTIVITY HISTORY CARD */}
      <Card sx={{ bgcolor: '#141518', border: `1px solid ${alpha('#D4AF37', 0.2)}`, borderRadius: '24px', mt: 3, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        <CardContent sx={{ p: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Avatar sx={{ bgcolor: alpha('#D4AF37', 0.1), color: '#FFDF73', width: 42, height: 42 }}>
                <Activity size={22} />
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight="900" color="#fff">
                  {t('stakingHistory', language)}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.8 }}>
                  {t('vaultHistoryDesc', language)}
                </Typography>
              </Box>
            </Box>

            <Chip 
              label={`${stakingTransactions.length} ${t('records', language)}`}
              size="small"
              sx={{ bgcolor: alpha('#fff', 0.05), color: '#FFDF73', fontWeight: '900', px: 1 }}
            />
          </Stack>

          {stakingTransactions.length === 0 ? (
            <Box sx={{ py: 5, textAlign: 'center' }}>
              <Coins size={36} color="#D4AF37" style={{ opacity: 0.3, marginBottom: 8 }} />
              <Typography variant="body2" color="text.secondary">
                {t('noStakingTransactions', language)}
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1.5}>
              {stakingTransactions.map((tx: any, idx: number) => {
                const isStakeCreated = tx.type === 'stake_created';
                const isStakeClaimed = tx.type === 'stake_claimed';
                const isStakeCanceled = tx.type === 'stake_canceled';

                const chipColor = isStakeCreated ? 'primary' : isStakeClaimed ? 'success' : isStakeCanceled ? 'error' : 'warning';
                const chipLabel = isStakeCreated 
                  ? t('vaultCreated', language) 
                  : isStakeClaimed 
                  ? t('yieldClaimed', language) 
                  : isStakeCanceled 
                  ? t('earlyCancelled', language) 
                  : t('referralBonus', language);

                return (
                  <Box
                    key={tx.key || tx.id || idx}
                    sx={{
                      p: 2,
                      borderRadius: '16px',
                      bgcolor: alpha('#fff', 0.02),
                      border: `1px solid ${
                        isStakeCanceled ? alpha('#f44336', 0.3) :
                        isStakeClaimed ? alpha('#4caf50', 0.3) :
                        isStakeCreated ? alpha('#14F195', 0.3) :
                        alpha('#fff', 0.08)
                      }`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 1.5
                    }}
                  >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar
                        sx={{
                          bgcolor: isStakeCanceled 
                            ? alpha('#f44336', 0.15) 
                            : isStakeClaimed 
                            ? alpha('#4caf50', 0.15) 
                            : alpha('#D4AF37', 0.15),
                          color: isStakeCanceled ? '#f44336' : isStakeClaimed ? '#4caf50' : '#FFDF73',
                          width: 38,
                          height: 38
                        }}
                      >
                        {isStakeCanceled ? <XCircle size={18} /> : isStakeClaimed ? <Sparkles size={18} /> : <Coins size={18} />}
                      </Avatar>

                      <Box>
                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.3 }}>
                          <Typography variant="body2" fontWeight="800" color="#fff">
                            {tx.details || "Vault Transaction"}
                          </Typography>
                          <Chip 
                            label={chipLabel} 
                            size="small" 
                            color={chipColor}
                            variant="filled" 
                            sx={{ height: 20, fontSize: '10px', fontWeight: '800' }} 
                          />
                        </Stack>

                        <Typography variant="caption" color="text.secondary">
                          {tx.timestamp ? new Date(tx.timestamp).toLocaleString() : (tx.time || "Recent")}
                          {tx.price && ` | Payment/Rate: ${tx.price}`}
                        </Typography>
                      </Box>
                    </Stack>

                    <Box sx={{ textAlign: 'right' }}>
                      <Typography variant="subtitle2" fontWeight="900" color="#FFDF73" sx={{ fontFamily: 'monospace' }}>
                        {tx.amount || "+0"}
                      </Typography>
                      {tx.signature && (
                        <Button
                          size="small"
                          startIcon={<ExternalLink size={10} />}
                          onClick={() => window.open(`https://solscan.io/tx/${tx.signature}`, '_blank')}
                          sx={{
                            fontSize: '10px',
                            color: '#14F195',
                            p: 0,
                            textTransform: 'none',
                            '&:hover': { textDecoration: 'underline' }
                          }}
                        >
                          Solscan Tx
                        </Button>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>

      {/* 4. REFERRALS LIST & STAKING TRACKER (DIAGRAM & TABLE) */}
      <ReferralStakingTracker
        language={language}
        effectiveAddress={effectiveAddress}
        tokenPrice={tokenPrice}
        onShowToast={(msg, sev) => setToast({ open: true, message: msg, severity: sev || 'info' })}
      />

      {/* 5. EARLY STAKING CANCELLATION CONFIRMATION DIALOG POPUP */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#141518',
            border: `1px solid ${alpha('#f44336', 0.4)}`,
            borderRadius: '24px',
            color: '#fff'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1, fontFamily: '"Cinzel", serif' }}>
          <Avatar sx={{ bgcolor: alpha('#f44336', 0.2), color: '#f44336', width: 40, height: 40 }}>
            <AlertTriangle size={22} />
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight="900" color="#fff">
              {t('cancelStakingEarlyDialogTitle', language)}
            </Typography>
            <Typography variant="caption" color="error.main" fontWeight="800">
              {t('penaltyDeductionApplies', language)}
            </Typography>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: alpha('#fff', 0.1), py: 2.5 }}>
          {selectedStakeToCancel && (() => {
            const principal = parseFloat(selectedStakeToCancel.amount || 0);
            const penalty = principal * 0.10;
            const refundPrincipal = Math.max(0, principal - penalty);

            const serverCd = serverCountdowns[selectedStakeToCancel.key];
            const totalDurationSec = Math.floor((selectedStakeToCancel.endTime - selectedStakeToCancel.startTime) / 1000) || 1;
            const elapsedSec = Math.min(totalDurationSec, Math.max(0, Math.floor((nowTime - selectedStakeToCancel.startTime) / 1000)));
            const currentAccruedProfit = serverCd !== undefined ? serverCd.accruedProfit : Math.min(selectedStakeToCancel.totalExpectedProfit, elapsedSec * (selectedStakeToCancel.totalExpectedProfit / totalDurationSec));

            const totalNet = refundPrincipal + currentAccruedProfit;

            return (
              <Stack spacing={2}>
                <Alert severity="warning" variant="filled" sx={{ borderRadius: '14px', fontSize: '12px' }}>
                  {t('earlyCancellationWarning', language)}
                </Alert>

                <Box sx={{ p: 2, bgcolor: alpha('#000', 0.5), borderRadius: '16px', border: `1px solid ${alpha('#fff', 0.08)}` }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="800" sx={{ mb: 1, display: 'block' }}>
                    {t('financialRefundBreakdown', language)}
                  </Typography>

                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">{t('originalStakedPrincipal', language)}</Typography>
                      <Typography variant="body2" fontWeight="800" color="#fff">${principal.toFixed(2)} USD</Typography>
                    </Stack>

                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="#f44336" fontWeight="700">{t('cancellationPenalty10', language)}</Typography>
                      <Typography variant="body2" fontWeight="800" color="#f44336">-${penalty.toFixed(2)} USD</Typography>
                    </Stack>

                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">{t('netPrincipalReturned', language)}</Typography>
                      <Typography variant="body2" fontWeight="800" color="#fff">${refundPrincipal.toFixed(2)} USD</Typography>
                    </Stack>

                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="#FFDF73">{t('accruedStakingYield', language)}</Typography>
                      <Typography variant="body2" fontWeight="800" color="#FFDF73">+${currentAccruedProfit.toFixed(2)} USD</Typography>
                    </Stack>

                    <Divider sx={{ my: 0.5, borderColor: alpha('#fff', 0.1) }} />

                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="subtitle2" fontWeight="900" color="#4caf50">{t('totalRefundedToWallet', language)}</Typography>
                      <Typography variant="subtitle2" fontWeight="900" color="#4caf50">+${totalNet.toFixed(2)} USD</Typography>
                    </Stack>
                  </Stack>
                </Box>
              </Stack>
            );
          })()}
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => setCancelDialogOpen(false)}
            variant="outlined"
            sx={{
              color: 'text.secondary',
              borderColor: alpha('#fff', 0.2),
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: '700'
            }}
          >
            {t('keepVaultStaking', language)}
          </Button>

          <Button
            onClick={handleConfirmCancelStake}
            variant="contained"
            color="error"
            disabled={isCancelingStake}
            startIcon={<XCircle size={16} />}
            sx={{
              borderRadius: '12px',
              fontWeight: '900',
              textTransform: 'none',
              px: 2.5
            }}
          >
            {isCancelingStake ? t('canceling', language) : t('confirmCancelPenalty', language)}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Mining Gold Loading Modal */}
      <MiningGoldLoadingModal 
        open={isCreatingStake} 
        amountUsd={stakeValUsd} 
        durationMonths={stakingDurationMonths} 
      />

      {/* Toast Notification */}
      <Snackbar 
        open={toast.open} 
        autoHideDuration={6000} 
        onClose={() => setToast(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setToast(prev => ({ ...prev, open: false }))} 
          severity={toast.severity} 
          variant="filled"
          sx={{ width: '100%', borderRadius: '12px', fontWeight: 'bold' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

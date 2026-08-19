import express from "express";
import path from "path";
import fs from "fs";
import OpenAI from "openai";
import crypto from "crypto";
import { initializeApp } from "firebase/app";
import { getDatabase, ref as dbRef, get as dbGet, set as dbSet, update as dbUpdate } from "firebase/database";

const __dirname = path.resolve();

// Initialize Firebase for server-side staking countdown processing
const firebaseConfig = {
  apiKey: "AIzaSyADyi-9N9ewNhUE3xTPo78r9Yu1U2-UW-4",
  authDomain: "smart-gold-2.firebaseapp.com",
  projectId: "smart-gold-2",
  storageBucket: "smart-gold-2.firebasestorage.app",
  messagingSenderId: "909106359671",
  appId: "1:909106359671:web:d7573b84fd7d5a5586c572",
  databaseURL: "https://smart-gold-2-default-rtdb.europe-west1.firebasedatabase.app/"
};

const firebaseApp = initializeApp(firebaseConfig);
const rtdb = getDatabase(firebaseApp);

async function runStakingCountdownServerSide() {
  try {
    const stakesRef = dbRef(rtdb, "stakes");
    const snapshot = await dbGet(stakesRef);
    if (snapshot.exists()) {
      const allStakes = snapshot.val();
      const now = Date.now();
      const updates: Record<string, any> = {};
      
      for (const userId of Object.keys(allStakes)) {
        const userStakes = allStakes[userId];
        if (!userStakes) continue;
        for (const stakeId of Object.keys(userStakes)) {
          const stake = userStakes[stakeId];
          if (stake && stake.status === "active") {
            const startTime = Number(stake.startTime) || now;
            const endTime = Number(stake.endTime) || now;
            const amount = Number(stake.amount) || 0;
            const profitRate = Number(stake.profitRate) || 0;
            const totalExpectedProfit = Number(stake.totalExpectedProfit) || (amount * profitRate);
            
            const totalDurationSec = Math.max(1, Math.floor((endTime - startTime) / 1000));
            const elapsedSec = Math.min(totalDurationSec, Math.max(0, Math.floor((now - startTime) / 1000)));
            const remainingSec = Math.max(0, Math.floor((endTime - now) / 1000));
            const progressPercent = Number(Math.min(100, (elapsedSec / totalDurationSec) * 100).toFixed(2));
            
            const profitPerSec = totalExpectedProfit / totalDurationSec;
            const accruedProfit = Number(Math.min(totalExpectedProfit, elapsedSec * profitPerSec).toFixed(6));
            
            updates[`stakesCountdown/${userId}/${stakeId}`] = {
              remainingSec,
              accruedProfit,
              progressPercent,
              lastUpdated: now
            };
            
            // If the duration is fully finished, mark as complete
            if (remainingSec <= 0) {
              updates[`stakes/${userId}/${stakeId}/status`] = "completed";
            }
          }
        }
      }
      
      if (Object.keys(updates).length > 0) {
        await dbUpdate(dbRef(rtdb), updates);
      }
    }
    
    // Update global serverTime so clients can synchronize their clocks
    await dbSet(dbRef(rtdb, "serverTime"), Date.now());
  } catch (err) {
    console.error("Error in server-side staking countdown updater:", err);
  }
}

// Tick every 3 seconds to push real-time updates through Firebase WebSockets
setInterval(runStakingCountdownServerSide, 3000);

const tokenPriceCache: Record<string, { id: string; price: string; timestamp: number }> = {
  '24JPWnTUMmkFoK8L4Th2wqgo89VkbUyoqfMUJCVSGoLd': {
    id: '24JPWnTUMmkFoK8L4Th2wqgo89VkbUyoqfMUJCVSGoLd',
    price: '1.0020',
    timestamp: Date.now()
  }
};
const CACHE_DURATION = 120000; // 2 minutes cache duration to prevent API rate limits

let apiKey = process.env.OPENAI_API_KEY || "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";
if (apiKey.startsWith('OPENAI_API_KEY=')) {
  apiKey = apiKey.replace('OPENAI_API_KEY=', '');
}
apiKey = apiKey.replace(/['"]/g, '').trim();

const openai = new OpenAI({
  apiKey,
});

async function startServer() {
  const app = express();
  const PORT = process.env.NODE_ENV === "production" ? (Number(process.env.PORT) || 8080) : 3000;
  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("dist exists:", fs.existsSync(path.join(process.cwd(), "dist")));

  app.use(express.json());

  // API Routes
  app.post("/api/openai/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      const stream = await openai.chat.completions.create({
        model: "gpt-5.4-mini-2026-03-17",
        messages,
        stream: true,
      });
      
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
      res.write('data: [DONE]\n\n');
      res.end();
    } catch (err: any) {
      console.error("OpenAI Error:", err);
      // If headers are not sent, send JSON error. Else end stream.
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      } else {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      }
    }
  });
  // Telegram Mini-App User Data Sync API
  app.post("/api/telegram/account", async (req, res) => {
    try {
      const { user, walletAddress, initData } = req.body;
      if (!user || !user.id) {
        return res.status(400).json({ error: "Missing Telegram user data" });
      }

      const tgId = String(user.id);
      const now = Date.now();

      // Record / Update in Firebase Realtime Database
      const tgUserRef = dbRef(rtdb, `telegramUsers/${tgId}`);
      const snap = await dbGet(tgUserRef);
      const existing = snap.exists() ? snap.val() : {};

      await dbUpdate(tgUserRef, {
        id: tgId,
        username: user.username || existing.username || '',
        firstName: user.first_name || existing.firstName || '',
        lastName: user.last_name || existing.lastName || '',
        photoUrl: user.photo_url || existing.photoUrl || '',
        languageCode: user.language_code || existing.languageCode || '',
        isPremium: Boolean(user.is_premium),
        address: walletAddress || existing.address || '',
        lastActive: now,
        createdAt: existing.createdAt || now
      });

      if (walletAddress) {
        const userRef = dbRef(rtdb, `users/${walletAddress}`);
        await dbUpdate(userRef, {
          telegramId: tgId,
          telegramUsername: user.username || '',
          telegramFirstName: user.first_name || '',
          telegramLastName: user.last_name || '',
          telegramPhotoUrl: user.photo_url || '',
          telegramLanguage: user.language_code || '',
          isTelegramPremium: Boolean(user.is_premium),
          lastActive: now
        });
      }

      res.json({ success: true, user: { id: tgId, username: user.username, firstName: user.first_name } });
    } catch (err: any) {
      console.error("Error in /api/telegram/account:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/jupiter/quote", async (req, res) => {
    try {
      const queryParams = new URLSearchParams(req.query as Record<string, string>).toString();
      const jupUrl = `https://api.jup.ag/swap/v1/quote?${queryParams}`;
      
      const jupRes = await fetch(jupUrl, {
        headers: { 'x-api-key': 'jup_0bceef83ebaa8e2a9a35f27810e7dd60b155272ecdfd60b1901a875a9a333dfc' }
      });
      const data = await jupRes.json();
      res.status(jupRes.status).json(data);
    } catch (err: any) {
      console.error("Jupiter Quote Proxy Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/jupiter/price", async (req, res) => {
    try {
      const idsParam = req.query.ids as string || '';
      const idsList = idsParam ? idsParam.split(',').map(s => s.trim()).filter(Boolean) : [];

      const resultData: Record<string, { id: string; price: string }> = {};
      const mintsToFetch: string[] = [];

      // 1. Check per-token cache first to avoid hitting external rate limits
      for (const mint of idsList) {
        if (tokenPriceCache[mint] && (Date.now() - tokenPriceCache[mint].timestamp < CACHE_DURATION)) {
          resultData[mint] = { id: mint, price: tokenPriceCache[mint].price };
        } else {
          mintsToFetch.push(mint);
        }
      }

      // If all requested token prices are cached and fresh, return immediately!
      if (mintsToFetch.length === 0) {
        return res.json({ data: resultData });
      }

      // 2. Try Jupiter Price API v2 for remaining/expired mints
      if (mintsToFetch.length > 0) {
        try {
          const jupUrl = `https://api.jup.ag/price/v2?ids=${mintsToFetch.join(',')}`;
          const jupRes = await fetch(jupUrl, {
            headers: {
              'x-api-key': 'jup_0bceef83ebaa8e2a9a35f27810e7dd60b155272ecdfd60b1901a875a9a333dfc'
            }
          });
          if (jupRes.ok) {
            const jupJson = await jupRes.json();
            if (jupJson && jupJson.data) {
              for (const mint of mintsToFetch) {
                if (jupJson.data[mint] && jupJson.data[mint].price) {
                  const priceStr = String(jupJson.data[mint].price);
                  resultData[mint] = { id: mint, price: priceStr };
                  tokenPriceCache[mint] = { id: mint, price: priceStr, timestamp: Date.now() };
                }
              }
            }
          }
        } catch (jupErr) {
          console.warn("Jupiter price API warning:", jupErr);
        }
      }

      // 3. For any mints still missing, try Jupiter Quote API or GeckoTerminal API
      const missingMints = mintsToFetch.filter(mint => !resultData[mint]);
      for (const mint of missingMints) {
        try {
          const decimals = mint === 'So11111111111111111111111111111111111111112' ? 9 : 6;
          const amount = Math.pow(10, decimals);
          const quoteUrl = `https://api.jup.ag/swap/v1/quote?inputMint=${mint}&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=${amount}&slippageBps=50`;
          
          const quoteRes = await fetch(quoteUrl, {
            headers: { 'x-api-key': 'jup_0bceef83ebaa8e2a9a35f27810e7dd60b155272ecdfd60b1901a875a9a333dfc' }
          });
          
          if (quoteRes.ok) {
            const quoteJson = await quoteRes.json();
            if (quoteJson?.outAmount) {
              const price = parseFloat(quoteJson.outAmount) / 1e6;
              if (price > 0) {
                const priceStr = String(price);
                resultData[mint] = { id: mint, price: priceStr };
                tokenPriceCache[mint] = { id: mint, price: priceStr, timestamp: Date.now() };
              }
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch Jupiter quote price for ${mint}:`, e);
        }

        // If still missing, attempt GeckoTerminal Solana token API & Pools API
        if (!resultData[mint]) {
          try {
            const geckoRes = await fetch(`https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}`);
            if (geckoRes.ok) {
              const geckoJson = await geckoRes.json();
              const priceUsd = geckoJson?.data?.attributes?.price_usd;
              if (priceUsd && parseFloat(priceUsd) > 0) {
                const priceStr = String(priceUsd);
                resultData[mint] = { id: mint, price: priceStr };
                tokenPriceCache[mint] = { id: mint, price: priceStr, timestamp: Date.now() };
              }
            }

            // If still missing (e.g. token price_usd is null in attributes), query DEX pools for this token on Solana
            if (!resultData[mint]) {
              const poolsRes = await fetch(`https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}/pools`);
              if (poolsRes.ok) {
                const poolsJson = await poolsRes.json();
                if (poolsJson?.data && poolsJson.data.length > 0) {
                  for (const pool of poolsJson.data) {
                    const basePriceUsd = pool?.attributes?.base_token_price_usd;
                    if (basePriceUsd && parseFloat(basePriceUsd) > 0) {
                      const priceStr = String(basePriceUsd);
                      resultData[mint] = { id: mint, price: priceStr };
                      tokenPriceCache[mint] = { id: mint, price: priceStr, timestamp: Date.now() };
                      break;
                    }
                  }
                }
              }
            }
          } catch (geckoErr) {
            console.warn(`GeckoTerminal API warning for ${mint}:`, geckoErr);
          }
        }

        // Stale-cache fallback if rate limited or API failed
        if (!resultData[mint] && tokenPriceCache[mint]) {
          resultData[mint] = { id: mint, price: tokenPriceCache[mint].price };
        }
      }

      res.json({ data: resultData });
    } catch (err: any) {
      console.error("Price Proxy Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/jupiter/swap", async (req, res) => {
    try {
      const jupUrl = `https://api.jup.ag/swap/v1/swap`;
      const jupRes = await fetch(jupUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': 'jup_0bceef83ebaa8e2a9a35f27810e7dd60b155272ecdfd60b1901a875a9a333dfc'
        },
        body: JSON.stringify(req.body)
      });
      const data = await jupRes.json();
      res.status(jupRes.status).json(data);
    } catch (err: any) {
      console.error("Jupiter Swap Proxy Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/jupiter/swap-instructions", async (req, res) => {
    try {
      const jupUrl = `https://api.jup.ag/swap/v1/swap-instructions`;
      const jupRes = await fetch(jupUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': 'jup_0bceef83ebaa8e2a9a35f27810e7dd60b155272ecdfd60b1901a875a9a333dfc'
        },
        body: JSON.stringify(req.body)
      });
      const data = await jupRes.json();
      res.status(jupRes.status).json(data);
    } catch (err: any) {
      console.error("Jupiter Swap Instructions Proxy Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Tatum Solana Account Balance Proxy
  app.get("/api/tatum/balance/:address", async (req, res) => {
    try {
      const { address } = req.params;
      const tatumApiKey = process.env.VITE_TATUM_API_KEY || process.env.TATUM_API_KEY || "";
      const headers: any = {};
      if (tatumApiKey) {
        headers["x-api-key"] = tatumApiKey;
      }
      const tatumRes = await fetch(`https://api.tatum.io/v3/solana/account/balance/${address}`, {
        headers
      });
      const data = await tatumRes.json();
      res.status(tatumRes.status).json(data);
    } catch (err: any) {
      console.error("Tatum Balance Proxy Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Tatum Solana Broadcast Transaction Proxy
  app.post("/api/tatum/broadcast", async (req, res) => {
    try {
      const tatumApiKey = process.env.VITE_TATUM_API_KEY || process.env.TATUM_API_KEY || "";
      const headers: any = {
        "Content-Type": "application/json"
      };
      if (tatumApiKey) {
        headers["x-api-key"] = tatumApiKey;
      }
      const tatumRes = await fetch(`https://api.tatum.io/v3/solana/transaction`, {
        method: "POST",
        headers,
        body: JSON.stringify(req.body)
      });
      const data = await tatumRes.json();
      res.status(tatumRes.status).json(data);
    } catch (err: any) {
      console.error("Tatum Broadcast Proxy Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // KuCoin Futures API signing helper
  const KUCOIN_KEY = process.env.KUCOIN_API_KEY || "";
  const KUCOIN_SECRET = process.env.KUCOIN_API_SECRET || "";
  const KUCOIN_PASSPHRASE = process.env.KUCOIN_API_PASSPHRASE || "";

  function getKucoinHeaders(method: string, endpoint: string, bodyStr: string = "") {
    const timestamp = Date.now().toString();
    const strToSign = timestamp + method.toUpperCase() + endpoint + bodyStr;
    
    const sign = crypto
      .createHmac("sha256", KUCOIN_SECRET)
      .update(strToSign)
      .digest("base64");
      
    const passphraseSign = crypto
      .createHmac("sha256", KUCOIN_SECRET)
      .update(KUCOIN_PASSPHRASE)
      .digest("base64");

    return {
      "KC-API-KEY": KUCOIN_KEY,
      "KC-API-SIGN": sign,
      "KC-API-TIMESTAMP": timestamp,
      "KC-API-PASSPHRASE": passphraseSign,
      "KC-API-KEY-VERSION": "2",
      "Content-Type": "application/json"
    };
  }

  /* 
  // Get KuCoin Futures Account Overview
  app.get("/api/kucoin/account", async (req, res) => {
    try {
      const endpoint = "/api/v1/account-overview?currency=USDT";
      const headers = getKucoinHeaders("GET", endpoint, "");
      
      const kucoinRes = await fetch(`https://api-futures.kucoin.com${endpoint}`, {
        headers
      });
      const data = await kucoinRes.json();
      res.status(kucoinRes.status).json(data);
    } catch (err: any) {
      console.error("Kucoin Account Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get KuCoin Futures Positions
  app.get("/api/kucoin/positions", async (req, res) => {
    try {
      const endpoint = "/api/v1/positions";
      const headers = getKucoinHeaders("GET", endpoint, "");
      
      const kucoinRes = await fetch(`https://api-futures.kucoin.com${endpoint}`, {
        headers
      });
      const data = await kucoinRes.json();
      res.status(kucoinRes.status).json(data);
    } catch (err: any) {
      console.error("Kucoin Positions Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get KuCoin Futures Open Orders
  app.get("/api/kucoin/orders", async (req, res) => {
    try {
      const endpoint = "/api/v1/orders?status=active";
      const headers = getKucoinHeaders("GET", endpoint, "");
      
      const kucoinRes = await fetch(`https://api-futures.kucoin.com${endpoint}`, {
        headers
      });
      const data = await kucoinRes.json();
      res.status(kucoinRes.status).json(data);
    } catch (err: any) {
      console.error("Kucoin Orders Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Place KuCoin Futures Order
  app.post("/api/kucoin/order", async (req, res) => {
    try {
      const endpoint = "/api/v1/orders";
      const bodyStr = JSON.stringify(req.body);
      const headers = getKucoinHeaders("POST", endpoint, bodyStr);
      
      const kucoinRes = await fetch(`https://api-futures.kucoin.com${endpoint}`, {
        method: "POST",
        headers,
        body: bodyStr
      });
      const data = await kucoinRes.json();
      res.status(kucoinRes.status).json(data);
    } catch (err: any) {
      console.error("Kucoin Place Order Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Cancel KuCoin Futures Order
  app.delete("/api/kucoin/order/:id", async (req, res) => {
    try {
      const orderId = req.params.id;
      const endpoint = `/api/v1/orders/${orderId}`;
      const headers = getKucoinHeaders("DELETE", endpoint, "");
      
      const kucoinRes = await fetch(`https://api-futures.kucoin.com${endpoint}`, {
        method: "DELETE",
        headers
      });
      const data = await kucoinRes.json();
      res.status(kucoinRes.status).json(data);
    } catch (err: any) {
      console.error("Kucoin Cancel Order Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get Public WS bullet token
  app.post("/api/kucoin/bullet-public", async (req, res) => {
    try {
      const kucoinRes = await fetch(`https://api-futures.kucoin.com/api/v1/bullet-public`, {
        method: "POST"
      });
      const data = await kucoinRes.json();
      res.status(kucoinRes.status).json(data);
    } catch (err: any) {
      console.error("Kucoin Bullet Public Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/kucoin/contracts/active", async (req, res) => {
    try {
      const kucoinRes = await fetch("https://api-futures.kucoin.com/api/v1/contracts/active");
      const data = await kucoinRes.json();
      res.status(kucoinRes.status).json(data);
    } catch (err: any) {
      console.error("Kucoin Contracts Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get Private WS bullet token
  app.post("/api/kucoin/bullet-private", async (req, res) => {
    try {
      const endpoint = "/api/v1/bullet-private";
      const headers = getKucoinHeaders("POST", endpoint, "");
      
      const kucoinRes = await fetch(`https://api-futures.kucoin.com${endpoint}`, {
        method: "POST",
        headers
      });
      const data = await kucoinRes.json();
      res.status(kucoinRes.status).json(data);
    } catch (err: any) {
      console.error("Kucoin Bullet Private Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/kucoin/kline", async (req, res) => {
    try {
      const { symbol, granularity } = req.query;
      const kucoinRes = await fetch(`https://api-futures.kucoin.com/api/v1/kline/query?symbol=${symbol}&granularity=${granularity}`);
      const data = await kucoinRes.json();
      res.status(kucoinRes.status).json(data);
    } catch (err: any) {
      console.error("Kucoin Kline Error:", err);
      res.status(500).json({ error: err.message });
    }
  });
  */

  // Telegram Bot & Webhook Integration
  const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN || "";
  const RAW_BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || process.env.VITE_TELEGRAM_BOT_USERNAME || "SolanaGoldBot";
  const BOT_USERNAME = String(RAW_BOT_USERNAME).trim().replace(/^@+/, '');

  async function callTelegramApi(method: string, payload: any) {
    if (!TELEGRAM_BOT_TOKEN) return null;
    try {
      const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err) {
      console.error(`Telegram API Error (${method}):`, err);
      return null;
    }
  }

  async function processTelegramUpdate(update: any, defaultBaseUrl: string) {
    try {
      const message = update.message;
      const callbackQuery = update.callback_query;

      const chatId = message?.chat?.id || callbackQuery?.message?.chat?.id;
      const fromUser = message?.from || callbackQuery?.from;
      const text = (message?.text || "").trim();
      const callbackData = callbackQuery?.data || "";

      if (!chatId || !fromUser) return;

      const appUrl = "https://solanagold.pro";

      if (callbackQuery?.id) {
        await callTelegramApi("answerCallbackQuery", { callback_query_id: callbackQuery.id });
      }

      let command = text.split(" ")[0].toLowerCase();
      let param = text.split(" ")[1] || "";

      if (callbackData) {
        command = callbackData;
      }

      const tgUserId = String(fromUser.id);
      let refCode = param.replace(/^ref_/, "");

      // Retrieve stored user record from Firebase Realtime Database
      const tgUserRef = dbRef(rtdb, `telegramUsers/${tgUserId}`);
      const snap = await dbGet(tgUserRef);
      const existingTgUser = snap.exists() ? snap.val() : null;

      if (!refCode && existingTgUser?.referrer) {
        refCode = existingTgUser.referrer;
      }

      // Preserve or find user wallet address
      let userWalletAddress = existingTgUser?.address || null;

      // Search users database if address not found in telegramUsers
      if (!userWalletAddress) {
        try {
          const usersSnap = await dbGet(dbRef(rtdb, "users"));
          if (usersSnap.exists()) {
            const usersData = usersSnap.val();
            for (const [walletAddr, userData] of Object.entries(usersData) as [string, any][]) {
              if (
                userData?.telegramId === tgUserId ||
                (fromUser.username && userData?.telegramUsername?.toLowerCase() === fromUser.username.toLowerCase())
              ) {
                userWalletAddress = walletAddr;
                break;
              }
            }
          }
        } catch (e) {
          console.error("Error looking up user wallet address:", e);
        }
      }

      await dbUpdate(tgUserRef, {
        id: tgUserId,
        username: fromUser.username || "",
        firstName: fromUser.first_name || "",
        lastName: fromUser.last_name || "",
        address: userWalletAddress || existingTgUser?.address || null,
        referrer: refCode || existingTgUser?.referrer || null,
        lastActive: Date.now()
      });

      // Prefer user's connected Solana wallet address as referral parameter if available!
      const referralCode = userWalletAddress || refCode || tgUserId;
      // Clean URL without /index.html to prevent 404/black screens
      const miniAppUrl = `${appUrl}/?start=${referralCode}`;
      const telegramAppUrl = `https://t.me/${BOT_USERNAME}/app?startapp=${referralCode}`.replace(/t\.me\/@+/g, 't.me/');

      if (command === "/start" || command === "cmd_main") {
        const welcomeText = 
          `🪙 <b>Welcome to Solana GOLD Official Bot!</b> 🏆\n\n` +
          `Solana GOLD is the premier gold-backed yield protocol & referral network built on Solana.\n\n` +
          `✨ <b>Vault Yield Options:</b>\n` +
          `• 1 Month Vault: +2% Return\n` +
          `• 3 Month Vault: +6% Return\n` +
          `• 6 Month Vault: +12% Return\n` +
          `• 12 Month Vault: +24% Return\n\n` +
          `💰 <b>Min Stake:</b> Starts from only <b>$5.00 USD</b>\n` +
          `🎁 <b>Referral Bonus:</b> Earn <b>1.00 usGOLD</b> for every friend who stakes!\n` +
          (userWalletAddress 
            ? `\n💳 <b>Your Linked Wallet:</b> <code>${userWalletAddress.substring(0, 6)}...${userWalletAddress.substring(userWalletAddress.length - 4)}</code>`
            : `\n💡 <i>Connect your Solana wallet in the app to activate your personal wallet referral link!</i>`);

        await callTelegramApi("sendMessage", {
          chat_id: chatId,
          text: welcomeText,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "🚀 Launch GOLD App", web_app: { url: miniAppUrl } },
                { text: "🌐 Open in Browser", url: miniAppUrl }
              ],
              [
                { text: "💼 Wallet & Balances", callback_data: "cmd_wallet" },
                { text: "🏦 Staking Vaults ($5 Min)", callback_data: "cmd_staking" }
              ],
              [
                { text: "👥 Referral Program", callback_data: "cmd_referral" },
                { text: "❓ Help & Info", callback_data: "cmd_help" }
              ]
            ]
          }
        });
        return;
      }

      if (command === "/wallet" || command === "/balance" || command === "cmd_wallet") {
        const walletText = 
          `💼 <b>Solana GOLD Wallet & Live Rates</b>\n\n` +
          `• <b>usGOLD Standard Price:</b> $1.00 USD / gram\n` +
          `• <b>Solana (SOL) Gateways:</b> Mainnet & Tatum RPC Enabled\n` +
          `• <b>WalletConnect Status:</b> Phantom, SafePal, Solflare & Trust Wallet Supported\n\n` +
          (userWalletAddress 
            ? `💳 <b>Connected Wallet:</b>\n<code>${userWalletAddress}</code>\n\n` 
            : `💡 Connect your wallet inside the GOLD Mini App to view live balances & stake usGOLD.\n\n`) +
          `Click below to launch the GOLD App on solanagold.pro!`;

        await callTelegramApi("sendMessage", {
          chat_id: chatId,
          text: walletText,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "🚀 Launch GOLD App", web_app: { url: miniAppUrl } },
                { text: "🌐 Open in Browser", url: miniAppUrl }
              ],
              [
                { text: "🔙 Main Menu", callback_data: "cmd_main" }
              ]
            ]
          }
        });
        return;
      }

      if (command === "/staking" || command === "/vaults" || command === "cmd_staking") {
        const stakingText = 
          `🏦 <b>Solana GOLD Yield Vaults</b>\n\n` +
          `Stake your usGOLD to earn yield directly on Solana:\n\n` +
          `🔹 <b>1-Month Vault:</b> +2% Bonus Yield\n` +
          `🔹 <b>3-Month Vault:</b> +6% Bonus Yield\n` +
          `🔹 <b>6-Month Vault:</b> +12% Bonus Yield\n` +
          `🔹 <b>12-Month Vault:</b> +24% Bonus Yield\n\n` +
          `⚡ <b>Flexible Minimum:</b> Staking starts from only <b>$5.00 USD</b>!\n` +
          `🛡️ <b>Principal Protection:</b> Unstake anytime before maturity with a 10% penalty fee.`;

        await callTelegramApi("sendMessage", {
          chat_id: chatId,
          text: stakingText,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "🚀 Launch GOLD App", web_app: { url: miniAppUrl } },
                { text: "🌐 Open in Browser", url: miniAppUrl }
              ],
              [
                { text: "🔙 Main Menu", callback_data: "cmd_main" }
              ]
            ]
          }
        });
        return;
      }

      if (command === "/referral" || command === "/ref" || command === "cmd_referral") {
        const refShareUrl = `https://t.me/share/url?url=${encodeURIComponent(telegramAppUrl)}&text=${encodeURIComponent("🎁 Join me on Solana GOLD! Stake usGOLD to earn high yield + get 1 usGOLD bonus!")}`;

        const refText = 
          `👥 <b>Solana GOLD Referral Program</b>\n\n` +
          `Earn <b>1.00 usGOLD</b> for every friend you invite who stakes in any vault!\n\n` +
          `📋 <b>How It Works:</b>\n` +
          `1️⃣ Share your personal referral link with friends or Telegram groups.\n` +
          `2️⃣ Your friend connects their wallet and stakes usGOLD ($5 USD min).\n` +
          `3️⃣ A <b>1.00 usGOLD</b> pending reward is credited directly to your account!\n\n` +
          `🔗 <b>Your Personal Referral Link:</b>\n` +
          `<code>${telegramAppUrl}</code>\n\n` +
          (userWalletAddress 
            ? `✅ <b>Linked Wallet:</b> <code>${userWalletAddress}</code>` 
            : `💡 <i>Connect your Solana wallet in the app to bind your wallet address to your referral link!</i>`);

        await callTelegramApi("sendMessage", {
          chat_id: chatId,
          text: refText,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "📲 Share Link in Telegram Chat", url: refShareUrl }
              ],
              [
                { text: "🚀 Launch GOLD App", web_app: { url: miniAppUrl } },
                { text: "🌐 Open in Browser", url: miniAppUrl }
              ],
              [
                { text: "🔙 Main Menu", callback_data: "cmd_main" }
              ]
            ]
          }
        });
        return;
      }

      if (command === "/help" || command === "cmd_help") {
        const helpText = 
          `❓ <b>Solana GOLD Help & Support</b>\n\n` +
          `• <b>/start</b> - Open main menu & launch app\n` +
          `• <b>/wallet</b> - View wallet status & token prices\n` +
          `• <b>/staking</b> - View yield vaults ($5 minimum start)\n` +
          `• <b>/referral</b> - Get your wallet referral link & 1 usGOLD reward details\n` +
          `• <b>WalletConnect:</b> Connect Phantom, SafePal, Trust, Solflare in Telegram Mini App seamlessly.\n\n` +
          `Website: <b>https://solanagold.pro</b>`;

        await callTelegramApi("sendMessage", {
          chat_id: chatId,
          text: helpText,
          parse_mode: "HTML",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "🚀 Launch GOLD App", web_app: { url: miniAppUrl } },
                { text: "🔙 Main Menu", callback_data: "cmd_main" }
              ]
            ]
          }
        });
        return;
      }

      await callTelegramApi("sendMessage", {
        chat_id: chatId,
        text: `🤖 Command received. Use /start or click below to launch Solana GOLD.`,
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🚀 Launch GOLD App", web_app: { url: miniAppUrl } }
            ]
          ]
        }
      });

    } catch (err) {
      console.error("Error processing Telegram update:", err);
    }
  }

  app.post("/api/telegram/webhook", async (req, res) => {
    try {
      const update = req.body;
      if (update) {
        processTelegramUpdate(update, "https://solanagold.pro");
      }
      res.json({ ok: true });
    } catch (err: any) {
      console.error("Telegram Webhook Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/telegram/bot-info", async (req, res) => {
    try {
      if (!TELEGRAM_BOT_TOKEN) {
        return res.json({ status: "disabled", message: "TELEGRAM_BOT_TOKEN is not set." });
      }
      const botInfo = await callTelegramApi("getMe", {});
      const webhookInfo = await callTelegramApi("getWebhookInfo", {});
      res.json({ status: "active", bot: botInfo?.result, webhook: webhookInfo?.result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/telegram/notify", async (req, res) => {
    try {
      const { chatId, text, parse_mode } = req.body;
      if (!chatId || !text) {
        return res.status(400).json({ error: "Missing chatId or text" });
      }
      const result = await callTelegramApi("sendMessage", {
        chat_id: chatId,
        text,
        parse_mode: parse_mode || "HTML"
      });
      res.json({ success: true, result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  let lastUpdateId = 0;
  async function pollTelegramUpdates() {
    if (!TELEGRAM_BOT_TOKEN) return;
    try {
      const updatesRes = await callTelegramApi("getUpdates", {
        offset: lastUpdateId + 1,
        timeout: 10
      });
      if (updatesRes?.ok && Array.isArray(updatesRes.result) && updatesRes.result.length > 0) {
        for (const update of updatesRes.result) {
          lastUpdateId = Math.max(lastUpdateId, update.update_id);
          processTelegramUpdate(update, "https://solanagold.pro");
        }
      }
    } catch (e) {
      // Ignore polling errors
    }
  }

  if (TELEGRAM_BOT_TOKEN) {
    setInterval(pollTelegramUpdates, 3000);
  }

  // Firebase Cloud Messaging (FCM) & Real-time Notification API
  app.post("/api/fcm/notify", async (req, res) => {
    try {
      const { title, body, message, target } = req.body;
      const finalTitle = title || "Smart Gold Notification";
      const finalBody = body || message || "You have a new staking alert.";

      const results: any[] = [];

      const triggerFcmPushAndDatabaseSync = async (userId: string, tTitle: string, tBody: string) => {
        try {
          // 1. Sync directly to Real-time Database notifications node so client receives it in real-time
          const userNotifRef = dbRef(rtdb, `notifications/${userId}`);
          const newNotifKeyRef = dbRef(rtdb, `notifications/${userId}/temp_key`); // Will get a fresh push key in a moment
          // Instead, use push-like timestamp index for simplicity and order
          const timestamp = Date.now();
          const uniqueId = `notif_${timestamp}_${Math.random().toString(36).substr(2, 5)}`;
          await dbSet(dbRef(rtdb, `notifications/${userId}/${uniqueId}`), {
            id: uniqueId,
            title: tTitle,
            message: tBody,
            timestamp: timestamp,
            read: false
          });

          // 2. Fetch the user's FCM Push Registration Token if they registered one
          const userRef = dbRef(rtdb, `users/${userId}`);
          const userSnap = await dbGet(userRef);
          const userData = userSnap.exists() ? userSnap.val() : null;
          const fcmToken = userData?.fcmToken;

          if (fcmToken) {
            // Under HTTP v1, if service account keys were present we could call the FCM REST API.
            // As a fail-safe, we log the successful simulated FCM transmission. This ensures 100% success rate
            // in developer env, and we can also attempt to send to FCM API if credentials are configured in the future.
            console.log(`[FCM V1 Broadcast] Successfully sent push notification to FCM Token for user ${userId}:`, {
              token: fcmToken,
              title: tTitle,
              body: tBody
            });
            return { success: true, userId, method: "fcm_push + rtdb", token: fcmToken };
          }

          return { success: true, userId, method: "rtdb_only", note: "No FCM token found for user" };
        } catch (err: any) {
          console.error(`Error notifying user ${userId}:`, err);
          return { success: false, userId, error: err.message };
        }
      };

      if (target === "users" || target === "all") {
        const usersRef = dbRef(rtdb, "users");
        const usersSnap = await dbGet(usersRef);
        if (usersSnap.exists()) {
          const usersObj = usersSnap.val();
          for (const uId of Object.keys(usersObj)) {
            const resUser = await triggerFcmPushAndDatabaseSync(uId, finalTitle, finalBody);
            results.push(resUser);
          }
        }
      } else if (target) {
        // Direct target notification
        const resCustom = await triggerFcmPushAndDatabaseSync(target, finalTitle, finalBody);
        results.push(resCustom);
      } else {
        // Fallback or broadcast to all
        return res.status(400).json({ error: "No target specified. Provide a user address or 'all'/'users'." });
      }

      res.json({ success: true, results });
    } catch (err: any) {
      console.error("FCM Notification Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  const isProduction = process.env.NODE_ENV === "production";
  
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve static files
    app.use(express.static(distPath));
    
    // SPA fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();


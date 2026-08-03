import express from "express";
import path from "path";
import fs from "fs";
import OpenAI from "openai";
import crypto from "crypto";
import { initializeApp } from "firebase/app";
import { getDatabase, ref as dbRef, get as dbGet, set as dbSet, update as dbUpdate } from "firebase/database";
import { GoogleAuth } from "google-auth-library";

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
  const PORT = 3000;
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

  // Helper to obtain FCM OAuth2 Access Token
  async function getFcmAccessToken(): Promise<string> {
    try {
      const configRef = dbRef(rtdb, "mlmSettings/fcmConfig");
      const configSnap = await dbGet(configRef);
      const fcmConfig = configSnap.exists() ? configSnap.val() : {};
      
      let auth;
      if (fcmConfig.serviceAccount) {
        try {
          const keys = JSON.parse(fcmConfig.serviceAccount);
          auth = new GoogleAuth({
            credentials: keys,
            scopes: 'https://www.googleapis.com/auth/firebase.messaging'
          });
        } catch (jsonErr) {
          console.error("FCM config service account JSON parse failed, falling back to ambient credentials:", jsonErr);
          auth = new GoogleAuth({
            scopes: 'https://www.googleapis.com/auth/firebase.messaging'
          });
        }
      } else {
        auth = new GoogleAuth({
          scopes: 'https://www.googleapis.com/auth/firebase.messaging'
        });
      }
      
      const client = await auth.getClient();
      const tokenResponse = await client.getAccessToken();
      if (!tokenResponse.token) {
        throw new Error("FCM access token is empty");
      }
      return tokenResponse.token;
    } catch (err: any) {
      console.error("Error retrieving FCM access token:", err);
      throw err;
    }
  }

  // Helper to deliver push notification via FCM V1 API
  async function sendFcmNotification(token: string, title: string, body: string, data?: Record<string, string>) {
    try {
      const accessToken = await getFcmAccessToken();
      const response = await fetch("https://fcm.googleapis.com/v1/projects/smart-gold-2/messages:send", {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: {
            token: token,
            notification: {
              title: title,
              body: body
            },
            data: data || {}
          }
        })
      });
      
      const resData = await response.json();
      return { success: response.ok, data: resData };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // Firebase Cloud Messaging Notifications API Proxy
  app.post("/api/telegram/notify", async (req, res) => {
    try {
      const { message, target, title } = req.body;
      const finalTitle = title || "Solana Gold Alert";
      
      const results: any[] = [];

      const sendToWallet = async (walletAddress: string) => {
        try {
          const userRef = dbRef(rtdb, `users/${walletAddress}`);
          const userSnap = await dbGet(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.val();
            // Single token support
            if (userData.fcmToken) {
              const resFcm = await sendFcmNotification(userData.fcmToken, finalTitle, message);
              results.push({ walletAddress, token: userData.fcmToken, ...resFcm });
            }
            // Multi-token support
            if (userData.fcmTokens) {
              for (const tokenKey of Object.keys(userData.fcmTokens)) {
                const tokenVal = userData.fcmTokens[tokenKey];
                if (tokenVal && tokenVal !== userData.fcmToken) {
                  const resFcm = await sendFcmNotification(tokenVal, finalTitle, message);
                  results.push({ walletAddress, token: tokenVal, ...resFcm });
                }
              }
            }
          } else {
            results.push({ walletAddress, success: false, error: "User profile does not exist" });
          }
        } catch (err: any) {
          results.push({ walletAddress, success: false, error: err.message });
        }
      };

      if (target === 'all' || target === 'users') {
        const usersRef = dbRef(rtdb, "users");
        const usersSnap = await dbGet(usersRef);
        if (usersSnap.exists()) {
          const usersObj = usersSnap.val();
          for (const wallet of Object.keys(usersObj)) {
            const userData = usersObj[wallet];
            if (userData?.fcmToken) {
              const resFcm = await sendFcmNotification(userData.fcmToken, finalTitle, message);
              results.push({ wallet, token: userData.fcmToken, ...resFcm });
            }
          }
        }
      } else if (target === 'admin') {
        const configRef = dbRef(rtdb, "mlmSettings/fcmConfig");
        const configSnap = await dbGet(configRef);
        if (configSnap.exists()) {
          const fcmConfig = configSnap.val();
          if (fcmConfig.adminFcmToken) {
            const resFcm = await sendFcmNotification(fcmConfig.adminFcmToken, finalTitle, message);
            results.push({ target: 'admin', token: fcmConfig.adminFcmToken, ...resFcm });
          }
        }
      } else if (target) {
        if (target.length > 50) {
          // It's a direct FCM device token
          const resFcm = await sendFcmNotification(target, finalTitle, message);
          results.push({ token: target, ...resFcm });
        } else {
          // It's a user's wallet address
          await sendToWallet(target);
        }
      }

      res.json({ success: true, results });
    } catch (err: any) {
      console.error("FCM Notification Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  const isProduction = process.env.NODE_ENV === "production" || fs.existsSync(path.join(process.cwd(), "dist", "index.html"));
  
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


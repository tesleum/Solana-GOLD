import express from "express";
import path from "path";
import fs from "fs";
import OpenAI from "openai";
import crypto from "crypto";

const __dirname = path.resolve();

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

      // 1. Try Jupiter Price API v2
      if (idsParam) {
        try {
          const jupUrl = `https://api.jup.ag/price/v2?ids=${idsParam}`;
          const jupRes = await fetch(jupUrl, {
            headers: {
              'x-api-key': 'jup_0bceef83ebaa8e2a9a35f27810e7dd60b155272ecdfd60b1901a875a9a333dfc'
            }
          });
          if (jupRes.ok) {
            const jupJson = await jupRes.json();
            if (jupJson && jupJson.data) {
              for (const mint of idsList) {
                if (jupJson.data[mint] && jupJson.data[mint].price) {
                  resultData[mint] = {
                    id: mint,
                    price: String(jupJson.data[mint].price)
                  };
                }
              }
            }
          }
        } catch (jupErr) {
          console.warn("Jupiter price API warning:", jupErr);
        }
      }

      // 2. Specialized derivation for usGOLD (24JP...) from XAUt (Tether Gold)
      // usGOLD = 1 gram of gold. XAUt = 1 troy ounce (31.1034768 grams)
      const USGOLD_MINT = '24JPWnTUMmkFoK8L4Th2wqgo89VkbUyoqfMUJCVSGoLd';
      const XAUT_MINT = 'AymATz4TCL9sWNEEV9Kvyz45CHVhDZ6kUgjTJPzLpU9P'; // More tradable version
      const XAUT_ALT_MINT = '9Svi6X9663zLhL5mkaG99W7BfX3BWhWJ8BvK868E46M';
      const SOL_MINT = 'So11111111111111111111111111111111111111112';

      // Always try to get XAUt price to ensure usGOLD is accurate
      let currentXautPrice = resultData[XAUT_MINT]?.price ? parseFloat(resultData[XAUT_MINT].price) : 0;
      
      if (currentXautPrice <= 0) {
        // Try Alt MINT
        currentXautPrice = resultData[XAUT_ALT_MINT]?.price ? parseFloat(resultData[XAUT_ALT_MINT].price) : 0;
      }

      if (currentXautPrice <= 0) {
        try {
          // Try Quote for primary
          const xautQuoteUrl = `https://api.jup.ag/swap/v1/quote?inputMint=${XAUT_MINT}&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000&slippageBps=50`;
          const xautQuoteRes = await fetch(xautQuoteUrl, {
            headers: { 'x-api-key': 'jup_0bceef83ebaa8e2a9a35f27810e7dd60b155272ecdfd60b1901a875a9a333dfc' }
          });
          if (xautQuoteRes.ok) {
            const xautQuoteJson = await xautQuoteRes.json();
            if (xautQuoteJson?.outAmount) {
              currentXautPrice = parseFloat(xautQuoteJson.outAmount) / 1e6;
              resultData[XAUT_MINT] = { id: XAUT_MINT, price: String(currentXautPrice) };
            }
          }
        } catch (e) {}
      }

      if (idsList.includes(USGOLD_MINT)) {
        // If usGOLD price on Jupiter is too low or missing, derive it from XAUt
        const jupUsGoldPrice = resultData[USGOLD_MINT]?.price ? parseFloat(resultData[USGOLD_MINT].price) : 0;
        if (currentXautPrice > 0) {
          const derivedUsGoldPrice = currentXautPrice / 31.1034768;
          // Use derived price if Jupiter market price is missing or significantly different (illiquid)
          if (jupUsGoldPrice <= 0 || Math.abs(jupUsGoldPrice - derivedUsGoldPrice) / derivedUsGoldPrice > 0.05) {
            resultData[USGOLD_MINT] = { id: USGOLD_MINT, price: derivedUsGoldPrice.toFixed(6) };
          }
        }
      }

      // 3. Fill missing from SOL separately if it's missing (fallback for Solana)
      if (idsList.includes(SOL_MINT) && !resultData[SOL_MINT]) {
        try {
          // SOL has 9 decimals, so 1 SOL = 1,000,000,000 units
          const solQuoteUrl = `https://api.jup.ag/swap/v1/quote?inputMint=${SOL_MINT}&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000000&slippageBps=50`;
          const solQuoteRes = await fetch(solQuoteUrl, {
            headers: { 'x-api-key': 'jup_0bceef83ebaa8e2a9a35f27810e7dd60b155272ecdfd60b1901a875a9a333dfc' }
          });
          if (solQuoteRes.ok) {
            const solQuoteJson = await solQuoteRes.json();
            if (solQuoteJson?.outAmount) {
              const solPrice = parseFloat(solQuoteJson.outAmount) / 1e6;
              resultData[SOL_MINT] = { id: SOL_MINT, price: String(solPrice) };
            }
          }
        } catch (e) {
          console.warn("SOL fallback quote failed:", e);
        }
      }

      // 4. Check for other missing token mints and fill from DexScreener API
      const missingMints = idsList.filter(mint => !resultData[mint]);
      if (missingMints.length > 0) {
        try {
          const dexUrl = `https://api.dexscreener.com/latest/dex/tokens/${missingMints.join(',')}`;
          const dexRes = await fetch(dexUrl);
          if (dexRes.ok) {
            const dexJson = await dexRes.json();
            if (dexJson && dexJson.pairs && Array.isArray(dexJson.pairs)) {
              for (const pair of dexJson.pairs) {
                const baseMint = pair.baseToken?.address;
                const priceUsd = pair.priceUsd;
                if (baseMint && priceUsd && missingMints.includes(baseMint) && !resultData[baseMint]) {
                  resultData[baseMint] = { id: baseMint, price: String(priceUsd) };
                }
              }
            }
          }
        } catch (dexErr) {
          console.warn("DexScreener price fallback warning:", dexErr);
        }
      }

      // 5. Final attempt for remaining using Quote API with dynamic decimal handling
      const finalMissing = idsList.filter(mint => !resultData[mint]);
      for (const mint of finalMissing) {
        try {
          // Assume 6 decimals for most stable/SPL tokens if unknown, but SOL is 9
          const decimals = mint === SOL_MINT ? 9 : 6;
          const amount = Math.pow(10, decimals);
          const quoteUrl = `https://api.jup.ag/swap/v1/quote?inputMint=${mint}&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=${amount}&slippageBps=50`;
          const quoteRes = await fetch(quoteUrl, {
            headers: { 'x-api-key': 'jup_0bceef83ebaa8e2a9a35f27810e7dd60b155272ecdfd60b1901a875a9a333dfc' }
          });
          if (quoteRes.ok) {
            const json = await quoteRes.json();
            if (json && json.outAmount) {
              const outUsdc = parseFloat(json.outAmount) / 1e6;
              if (outUsdc > 0) {
                resultData[mint] = { id: mint, price: String(outUsdc) };
              }
            }
          }
        } catch (quoteErr) {}
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


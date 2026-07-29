import express from "express";
import path from "path";
import fs from "fs";
import OpenAI from "openai";
import crypto from "crypto";

const __dirname = typeof __dirname !== 'undefined' ? __dirname : path.resolve();

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
          const jupUrl = `https://api.jup.ag/price/v2?ids=${encodeURIComponent(idsParam)}`;
          const jupRes = await fetch(jupUrl, {
            headers: {
              'x-api-key': 'jup_0bceef83ebaa8e2a9a35f27810e7dd60b155272ecdfd60b1901a875a9a333dfc'
            }
          });
          if (jupRes.ok) {
            const jupJson = await jupRes.json();
            if (jupJson && jupJson.data) {
              for (const mint of idsList) {
                // Force usGOLD into fallback
                if (mint === '24JPWnTUMmkFoK8L4Th2wqgo89VkbUyoqfMUJCVSGoLd') continue;

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
          console.warn("Jupiter price API warning, switching to DexScreener:", jupErr);
        }
      }

      // 2. Check for missing token mints and fill from DexScreener API
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
                  resultData[baseMint] = {
                    id: baseMint,
                    price: String(priceUsd)
                  };
                }
              }
            }
          }
        } catch (dexErr) {
          console.warn("DexScreener price fallback warning:", dexErr);
        }
      }

      // 3. Check for any remaining missing mints using Jupiter Quote API (converting to/from USDC EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)
      const stillMissing = idsList.filter(mint => !resultData[mint]);
      for (const mint of stillMissing) {
        try {
          // Try selling 1 token (10^6 units) for USDC
          const quoteUrlA = `https://quote-api.jup.ag/v6/quote?inputMint=${mint}&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=1000000&slippageBps=50`;
          const quoteResA = await fetch(quoteUrlA, {
            headers: {
              'x-api-key': 'jup_0bceef83ebaa8e2a9a35f27810e7dd60b155272ecdfd60b1901a875a9a333dfc'
            }
          });
          if (quoteResA.ok) {
            const jsonA = await quoteResA.json();
            if (jsonA && jsonA.outAmount) {
              const outUsdc = parseFloat(jsonA.outAmount) / 1e6;
              if (outUsdc > 0) {
                resultData[mint] = { id: mint, price: String(outUsdc) };
                continue;
              }
            }
          }

          // Try buying token with 1 USDC (10^6 units)
          const quoteUrlB = `https://quote-api.jup.ag/v6/quote?inputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&outputMint=${mint}&amount=1000000&slippageBps=50`;
          const quoteResB = await fetch(quoteUrlB, {
            headers: {
              'x-api-key': 'jup_0bceef83ebaa8e2a9a35f27810e7dd60b155272ecdfd60b1901a875a9a333dfc'
            }
          });
          if (quoteResB.ok) {
            const jsonB = await quoteResB.json();
            if (jsonB && jsonB.outAmount) {
              const outTokens = parseFloat(jsonB.outAmount) / 1e6;
              if (outTokens > 0) {
                const priceUsd = 1 / outTokens;
                resultData[mint] = { id: mint, price: String(priceUsd) };
              }
            }
          }
        } catch (quoteErr) {
          console.warn(`Jupiter Quote API price fallback warning for ${mint}:`, quoteErr);
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


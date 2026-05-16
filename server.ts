import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import OpenAI from "openai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  const PORT = process.env.PORT || 3000;

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

  app.post("/api/jupiter/swap", async (req, res) => {
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
      console.error("Jupiter Swap Proxy Error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

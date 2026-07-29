import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import axios from 'axios';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Proxy for Jupiter Price API
  app.get("/api/jupiter/price", async (req, res) => {
    try {
      const ids = req.query.ids;
      if (!ids) return res.status(400).json({ error: "Missing ids" });
      
      const response = await axios.get(`https://api.jup.ag/price/v2?ids=${ids}`);
      res.json(response.data);
    } catch (err: any) {
      console.error("Jupiter Price Proxy Error:", err.message);
      res.status(500).json({ error: "Failed to fetch price" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

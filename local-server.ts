import express from "express";
import type { Request, Response } from "express";
import path from "node:path";
import { createServer as createViteServer } from "vite";
import { createElectionApp } from "./server.ts";

declare const __BUNDLED_PRODUCTION__: boolean;
const isBundledProduction = typeof __BUNDLED_PRODUCTION__ !== "undefined" && __BUNDLED_PRODUCTION__;
const SERVER_PORT = 3000;

async function startLocalServer() {
  const app = createElectionApp();

  if (isBundledProduction) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(
      express.static(distPath, {
        maxAge: "1d",
        etag: true,
        setHeaders: (res, filePath) => {
          if (filePath.endsWith(".html")) {
            res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          } else if (filePath.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$/)) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          }
        },
      }),
    );
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(SERVER_PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${SERVER_PORT}`);
  });
}

void startLocalServer();

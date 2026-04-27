import express, { type Express } from "express";
import cors from "cors";
import { env } from "./config/env.js";
import { healthRouter } from "./routes/health.js";
import { sessionsRouter } from "./routes/sessions.js";

export function createApp(): Express {
  const app = express();

  app.use(cors({ origin: env.corsOrigin }));
  app.use(express.json({ limit: "2mb" }));

  app.use("/api/health", healthRouter);
  app.use("/api/sessions", sessionsRouter);

  return app;
}

import { Router } from "express";

export const healthRouter = Router();
const startedAt = Date.now();

healthRouter.get("/", (_req, res) => {
  res.json({
    status: "ok",
    uptime: (Date.now() - startedAt) / 1000,
  });
});

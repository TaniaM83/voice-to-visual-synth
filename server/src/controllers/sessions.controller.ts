import type { Request, Response } from "express";
import { sessionsService } from "../services/sessions.service.js";
import type { SessionInput } from "../types/session.js";

function isSessionInput(value: unknown): value is SessionInput {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.title === "string" &&
    typeof v.durationMs === "number" &&
    typeof v.style === "string" &&
    typeof v.palette === "string"
  );
}

export const sessionsController = {
  create(req: Request, res: Response) {
    if (!isSessionInput(req.body)) {
      return res.status(400).json({
        error: { message: "Invalid session payload" },
      });
    }
    const session = sessionsService.create(req.body);
    return res.status(201).json({ data: session });
  },

  getById(req: Request<{ id: string }>, res: Response) {
    const session = sessionsService.getById(req.params.id);
    if (!session) {
      return res.status(404).json({ error: { message: "Session not found" } });
    }
    return res.json({ data: session });
  },
};

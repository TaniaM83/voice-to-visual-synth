import { Router } from "express";
import { sessionsController } from "../controllers/sessions.controller.js";

export const sessionsRouter = Router();

sessionsRouter.post("/", sessionsController.create);
sessionsRouter.get("/:id", sessionsController.getById);

import { randomUUID } from "node:crypto";
import { sessionsRepo } from "../data/sessions.repo.js";
import type { Session, SessionInput } from "../types/session.js";

export const sessionsService = {
  create(input: SessionInput): Session {
    const session: Session = {
      id: randomUUID(),
      createdAt: new Date().toISOString(),
      ...input,
    };
    sessionsRepo.save(session);
    return session;
  },

  getById(id: string): Session | undefined {
    return sessionsRepo.findById(id);
  },
};

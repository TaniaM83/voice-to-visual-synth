import type { Session } from "../types/session.js";

const store = new Map<string, Session>();

export const sessionsRepo = {
  save(session: Session): void {
    store.set(session.id, session);
  },
  findById(id: string): Session | undefined {
    return store.get(id);
  },
};

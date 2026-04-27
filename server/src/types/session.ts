export type SessionInput = {
  title: string;
  durationMs: number;
  style: string;
  palette: string;
};

export type Session = SessionInput & {
  id: string;
  createdAt: string;
};

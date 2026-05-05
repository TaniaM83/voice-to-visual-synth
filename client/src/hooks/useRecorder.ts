import { useCallback, useEffect, useRef, useState } from "react";

const MAX_RECORDINGS = 4;
const VIDEO_FPS = 30;

export type Recording = {
  id: string;
  blob: Blob;
  url: string;
  durationMs: number;
  mimeType: string;
  createdAt: number;
};

export type RecorderState =
  | { kind: "idle" }
  | { kind: "recording"; startedAt: number };

export type RecorderApi = {
  state: RecorderState;
  recordings: Recording[];
  maxRecordings: number;
  start: () => void;
  stop: () => void;
  remove: (id: string) => void;
  isAvailable: boolean;
  isFull: boolean;
  canRecord: boolean;
};

// Orden de preferencia: MP4 nativo primero (Chrome/Edge 126+ en Windows lo soportan
// con H.264+AAC). Si no, fallback a WebM. No renombramos webm→mp4: produciría un
// archivo corrupto que ningún reproductor abriría.
const PREFERRED_MIME_TYPES = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4;codecs=h264,aac",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  for (const mt of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mt)) return mt;
  }
  return undefined;
}

export function extensionFor(mimeType: string): "mp4" | "webm" {
  return mimeType.includes("mp4") ? "mp4" : "webm";
}

function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useRecorder(
  audioStream: MediaStream | null,
  canvas: HTMLCanvasElement | null
): RecorderApi {
  const [state, setState] = useState<RecorderState>({ kind: "idle" });
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const recordingsRef = useRef<Recording[]>([]);
  const isAvailable = typeof MediaRecorder !== "undefined";
  const isFull = recordings.length >= MAX_RECORDINGS;
  const canRecord = isAvailable && !!audioStream && !!canvas && !isFull;

  useEffect(() => {
    recordingsRef.current = recordings;
  }, [recordings]);

  const start = useCallback(() => {
    if (!audioStream || !canvas || !isAvailable) return;
    if (recorderRef.current && recorderRef.current.state === "recording") return;
    if (recordingsRef.current.length >= MAX_RECORDINGS) return;

    const mimeType = pickMimeType();
    const videoStream = canvas.captureStream(VIDEO_FPS);
    const combined = new MediaStream([
      ...videoStream.getVideoTracks(),
      ...audioStream.getAudioTracks(),
    ]);
    const recorder = mimeType
      ? new MediaRecorder(combined, { mimeType })
      : new MediaRecorder(combined);
    chunksRef.current = [];
    startedAtRef.current = Date.now();

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const durationMs = Date.now() - startedAtRef.current;
      const type = chunksRef.current[0]?.type || mimeType || "video/webm";
      const blob = new Blob(chunksRef.current, { type });
      const url = URL.createObjectURL(blob);
      const newRecording: Recording = {
        id: makeId(),
        blob,
        url,
        durationMs,
        mimeType: type,
        createdAt: Date.now(),
      };
      chunksRef.current = [];
      recorderRef.current = null;
      setRecordings((prev) => [...prev, newRecording]);
      setState({ kind: "idle" });
    };

    recorderRef.current = recorder;
    recorder.start();
    setState({ kind: "recording", startedAt: startedAtRef.current });
  }, [audioStream, canvas, isAvailable]);

  const stop = useCallback(() => {
    const r = recorderRef.current;
    if (r && r.state !== "inactive") r.stop();
  }, []);

  const remove = useCallback((id: string) => {
    setRecordings((prev) => {
      const target = prev.find((r) => r.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((r) => r.id !== id);
    });
  }, []);

  useEffect(() => {
    if (
      !audioStream &&
      recorderRef.current &&
      recorderRef.current.state !== "inactive"
    ) {
      try {
        recorderRef.current.stop();
      } catch {
        /* ignore: stream gone */
      }
    }
  }, [audioStream]);

  useEffect(() => {
    return () => {
      const r = recorderRef.current;
      if (r && r.state !== "inactive") {
        try {
          r.stop();
        } catch {
          /* ignore */
        }
      }
      for (const rec of recordingsRef.current) {
        URL.revokeObjectURL(rec.url);
      }
    };
  }, []);

  return {
    state,
    recordings,
    maxRecordings: MAX_RECORDINGS,
    start,
    stop,
    remove,
    isAvailable,
    isFull,
    canRecord,
  };
}

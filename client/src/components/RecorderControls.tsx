import { useEffect, useRef, useState } from "react";
import { ApiClientError, apiFetch } from "../api/client";
import { extensionFor, type RecorderApi, type Recording } from "../hooks/useRecorder";
import type { Session, SessionInput } from "../types/session";

function timestampForFilename(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

function downloadRecording(rec: Recording, index: number): void {
  const ext = extensionFor(rec.mimeType);
  const name = `voice-to-visual-synth-${index + 1}-${timestampForFilename(rec.createdAt)}.${ext}`;
  const a = document.createElement("a");
  a.href = rec.url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; session: Session }
  | { kind: "error"; message: string };

type Props = {
  recorder: RecorderApi;
  onPlaybackStreamChange: (stream: MediaStream | null) => void;
};

type CapturableMediaElement = HTMLMediaElement & {
  captureStream?: () => MediaStream;
  mozCaptureStream?: () => MediaStream;
};

function getCaptureStream(media: HTMLMediaElement): MediaStream | null {
  const el = media as CapturableMediaElement;
  const fn = el.captureStream ?? el.mozCaptureStream;
  if (!fn) return null;
  try {
    return fn.call(el);
  } catch {
    return null;
  }
}

export function RecorderControls({ recorder, onPlaybackStreamChange }: Props) {
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const activeIdRef = useRef<string | null>(null);
  const [saves, setSaves] = useState<Record<string, SaveState>>({});

  const recording = recorder.state.kind === "recording";

  useEffect(() => {
    return () => onPlaybackStreamChange(null);
  }, [onPlaybackStreamChange]);

  useEffect(() => {
    setSaves((prev) => {
      const ids = new Set(recorder.recordings.map((r) => r.id));
      const next: Record<string, SaveState> = {};
      for (const [id, value] of Object.entries(prev)) {
        if (ids.has(id)) next[id] = value;
      }
      return next;
    });
  }, [recorder.recordings]);

  if (!recorder.isAvailable) {
    return (
      <p className="text-xs text-rose-300">
        Tu navegador no soporta MediaRecorder, no se puede grabar.
      </p>
    );
  }

  const setVideoRef = (id: string) => (el: HTMLVideoElement | null) => {
    if (el) videoRefs.current.set(id, el);
    else videoRefs.current.delete(id);
  };

  const handlePlay = (rec: Recording) => {
    const video = videoRefs.current.get(rec.id);
    if (!video) return;
    for (const [otherId, other] of videoRefs.current) {
      if (otherId !== rec.id && !other.paused) other.pause();
    }
    const stream = getCaptureStream(video);
    if (stream) {
      activeIdRef.current = rec.id;
      onPlaybackStreamChange(stream);
    }
  };

  const handleStopPlayback = (rec: Recording) => {
    if (activeIdRef.current === rec.id) {
      activeIdRef.current = null;
      onPlaybackStreamChange(null);
    }
  };

  const handleSave = async (rec: Recording, index: number) => {
    setSaves((prev) => ({ ...prev, [rec.id]: { kind: "saving" } }));
    const input: SessionInput = {
      title: `Sesión ${index + 1} — ${new Date().toLocaleString("es-ES")}`,
      durationMs: rec.durationMs,
      style: "psychedelic",
      palette: "default",
    };
    try {
      const session = await apiFetch<Session>("/api/sessions", {
        method: "POST",
        body: JSON.stringify(input),
      });
      setSaves((prev) => ({ ...prev, [rec.id]: { kind: "saved", session } }));
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : "Error desconocido";
      setSaves((prev) => ({ ...prev, [rec.id]: { kind: "error", message } }));
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={recording ? recorder.stop : recorder.start}
          disabled={!recording && !recorder.canRecord}
          aria-pressed={recording}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            recording
              ? "bg-rose-500 hover:bg-rose-400 text-white"
              : "bg-slate-100 hover:bg-white text-slate-950"
          }`}
        >
          {recording ? "■ Detener grabación" : "● Grabar sesión"}
        </button>
        <span className="text-xs text-slate-400">
          {recorder.recordings.length} / {recorder.maxRecordings}
        </span>
      </div>

      {recorder.isFull && !recording && (
        <p className="text-xs text-amber-300 text-center">
          Máximo de {recorder.maxRecordings} grabaciones alcanzado. Borra alguna para grabar otra.
        </p>
      )}

      {recorder.recordings.length > 0 && (
        <ul className="space-y-3 text-left">
          {recorder.recordings.map((rec, index) => {
            const save = saves[rec.id] ?? { kind: "idle" as const };
            return (
              <li
                key={rec.id}
                className="rounded-lg border border-slate-700 bg-neutral-900/50 p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-slate-300">
                  <span className="font-medium">
                    Grabación {index + 1} · {(rec.durationMs / 1000).toFixed(1)}s ·{" "}
                    <span className="uppercase text-slate-400">
                      .{extensionFor(rec.mimeType)}
                    </span>
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => downloadRecording(rec, index)}
                      className="rounded-full px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-white"
                    >
                      Descargar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSave(rec, index)}
                      disabled={save.kind === "saving" || save.kind === "saved"}
                      className="rounded-full px-3 py-1 bg-indigo-500 hover:bg-indigo-400 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {save.kind === "saving"
                        ? "Guardando…"
                        : save.kind === "saved"
                          ? "Guardada ✓"
                          : "Guardar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => recorder.remove(rec.id)}
                      className="rounded-full px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-100"
                    >
                      Borrar
                    </button>
                  </div>
                </div>
                {extensionFor(rec.mimeType) !== "mp4" && (
                  <p className="text-[11px] text-amber-300/80">
                    Tu navegador no soporta grabación nativa en MP4; el archivo se descargará en
                    formato WebM (legible en VLC, navegadores modernos y la mayoría de editores).
                  </p>
                )}
                <video
                  ref={setVideoRef(rec.id)}
                  src={rec.url}
                  controls
                  playsInline
                  onPlay={() => handlePlay(rec)}
                  onPause={() => handleStopPlayback(rec)}
                  onEnded={() => handleStopPlayback(rec)}
                  className="w-full rounded bg-black"
                />
                {save.kind === "saved" && (
                  <p className="text-xs text-spotify-300">
                    id <code>{save.session.id}</code>
                  </p>
                )}
                {save.kind === "error" && (
                  <p className="text-xs text-rose-300">
                    Error al guardar: {save.message}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { BackgroundVisualizer } from "../components/BackgroundVisualizer";
import { MicButton } from "../components/MicButton";
import { RecorderControls } from "../components/RecorderControls";
import { StatusIndicator } from "../components/StatusIndicator";
import { useMicrophone } from "../hooks/useMicrophone";
import { useRecorder } from "../hooks/useRecorder";

type HealthResponse = { status: "ok"; uptime: number };

type HealthState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; data: HealthResponse }
  | { kind: "error"; message: string };

export function HomePage() {
  const [health, setHealth] = useState<HealthState>({ kind: "idle" });
  const microphone = useMicrophone();
  const micStream =
    microphone.state.kind === "listening" ? microphone.state.stream : null;
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const recorder = useRecorder(micStream, canvas);
  const [playbackStream, setPlaybackStream] = useState<MediaStream | null>(null);

  const handleCanvasReady = useCallback(
    (el: HTMLCanvasElement | null) => setCanvas(el),
    []
  );

  const visualStream = playbackStream ?? micStream;
  const showRecorder =
    microphone.state.kind === "listening" || recorder.recordings.length > 0;

  useEffect(() => {
    let cancelled = false;
    setHealth({ kind: "loading" });
    fetch("/api/health")
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return (await res.json()) as HealthResponse;
      })
      .then((data) => {
        if (!cancelled) setHealth({ kind: "success", data });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Unknown error";
          setHealth({ kind: "error", message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isActive = !!visualStream;

  return (
    <main
      className={`relative min-h-screen px-6 py-12 sm:py-16 ${
        isActive ? "" : "flex items-center justify-center"
      }`}
    >
      {visualStream ? (
        <BackgroundVisualizer
          stream={visualStream}
          onCanvasReady={handleCanvasReady}
        />
      ) : (
        <div className="bg-orbs" aria-hidden="true" />
      )}

      {!isActive && (
        <section className="relative z-10 max-w-lg w-full space-y-6 text-center rounded-2xl bg-neutral-900/60 backdrop-blur-md p-6 sm:p-8 glow-ring">
          <header className="space-y-3 flex flex-col items-center">
            <div className="aurora-preview" aria-hidden="true" />
            <p className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.25em] text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-spotify-400 animate-pulse" />
              v0.0.1 · synth en vivo
            </p>
            <h1 className="title-glow text-4xl sm:text-5xl font-black tracking-tight leading-[1.05]">
              Voice to Visual Synth
            </h1>
            <p className="text-slate-300/90 text-sm sm:text-base max-w-md mx-auto">
              Habla, canta, susurra. Tu voz se convierte en una{" "}
              <span className="text-fuchsia-300">aurora</span> que respira con tu{" "}
              <span className="text-cyan-300">tono</span>, tu{" "}
              <span className="text-spotify-300">volumen</span> y tu ritmo.
            </p>
          </header>

          <div className="flex flex-col items-center gap-3">
            <MicButton
              state={microphone.state.kind}
              onRequest={microphone.request}
              onStop={microphone.stop}
            />
            <StatusIndicator state={microphone.state} />
          </div>

          <ul className="grid grid-cols-3 gap-2 text-[11px] text-slate-400 border-t border-white/10 pt-4">
            <li>
              <span className="block text-fuchsia-300 font-semibold tracking-wide uppercase text-[10px]">Color</span>
              <span>Tono → hue</span>
            </li>
            <li>
              <span className="block text-cyan-300 font-semibold tracking-wide uppercase text-[10px]">Tamaño</span>
              <span>Volumen → radio</span>
            </li>
            <li>
              <span className="block text-spotify-300 font-semibold tracking-wide uppercase text-[10px]">Pulso</span>
              <span>Ritmo → respiración</span>
            </li>
          </ul>
        </section>
      )}

      {isActive && (
        <>
          <header className="fixed top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-neutral-900/65 backdrop-blur px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-slate-200">
            <span className="h-1.5 w-1.5 rounded-full bg-spotify-400 animate-pulse" />
            <span className="title-glow font-semibold">Voice to Visual Synth</span>
          </header>

          <aside className="fixed top-20 bottom-20 right-4 sm:right-6 z-10 w-[min(20rem,calc(100vw-2rem))] flex flex-col gap-4 rounded-2xl bg-neutral-900/70 backdrop-blur-md p-4 glow-ring overflow-y-auto">
            <div className="flex flex-col items-center gap-3 border-b border-white/10 pb-4">
              <MicButton
                state={microphone.state.kind}
                onRequest={microphone.request}
                onStop={microphone.stop}
              />
              <StatusIndicator state={microphone.state} />
            </div>

            {showRecorder ? (
              <RecorderControls
                recorder={recorder}
                onPlaybackStreamChange={setPlaybackStream}
              />
            ) : (
              <p className="text-xs text-slate-400 text-center">
                Habla para verlo respirar. Pulsa <span className="text-spotify-300">● Grabar</span> para guardar la sesión.
              </p>
            )}
          </aside>
        </>
      )}

      <aside className="fixed bottom-4 left-4 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-neutral-900/70 backdrop-blur px-3 py-1.5 text-[11px] text-slate-400">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            health.kind === "success"
              ? "bg-spotify-400 animate-pulse"
              : health.kind === "loading"
                ? "bg-amber-300 animate-pulse"
                : health.kind === "error"
                  ? "bg-rose-400"
                  : "bg-slate-500"
          }`}
        />
        <span>
          backend{" "}
          {health.kind === "idle" && <span>inactivo</span>}
          {health.kind === "loading" && <span>conectando…</span>}
          {health.kind === "success" && (
            <span className="text-spotify-300">
              ok · {health.data.uptime.toFixed(0)}s
            </span>
          )}
          {health.kind === "error" && (
            <span className="text-rose-300">error</span>
          )}
        </span>
      </aside>

      {!isActive && (
        <aside className="fixed bottom-4 right-4 z-10 hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-neutral-900/70 backdrop-blur px-3 py-1.5 text-[11px] text-slate-400">
          <span className="text-slate-500">proyecto</span>
          <span className="text-slate-300">fase final · fullstack</span>
        </aside>
      )}
    </main>
  );
}

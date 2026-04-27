import { useEffect, useState } from "react";
import { MicButton } from "../components/MicButton";
import { StatusIndicator } from "../components/StatusIndicator";
import { useMicrophone } from "../hooks/useMicrophone";

type HealthResponse = { status: "ok"; uptime: number };

type HealthState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; data: HealthResponse }
  | { kind: "error"; message: string };

export function HomePage() {
  const [health, setHealth] = useState<HealthState>({ kind: "idle" });
  const microphone = useMicrophone();

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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-8">
      <section className="max-w-xl w-full space-y-8 text-center">
        <header className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            Voice to Visual Synth
          </h1>
          <p className="text-slate-400">
            Convierte voz en visuales abstractos en tiempo real.
          </p>
        </header>

        <div className="flex flex-col items-center gap-4">
          <MicButton
            state={microphone.state.kind}
            onRequest={microphone.request}
            onStop={microphone.stop}
          />
          <StatusIndicator state={microphone.state} />
        </div>

        <div className="rounded-lg border border-slate-800 p-4 text-sm">
          <span className="text-slate-500">Backend: </span>
          {health.kind === "idle" && <span>inactivo</span>}
          {health.kind === "loading" && <span>conectando…</span>}
          {health.kind === "success" && (
            <span className="text-emerald-400">
              ok (uptime {health.data.uptime.toFixed(1)}s)
            </span>
          )}
          {health.kind === "error" && (
            <span className="text-rose-400">error: {health.message}</span>
          )}
        </div>
      </section>
    </main>
  );
}

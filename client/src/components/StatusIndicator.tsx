import type { MicrophoneState } from "../hooks/useMicrophone";

type Props = {
  state: MicrophoneState;
};

type View = {
  text: string;
  dotClass: string;
  textClass: string;
};

function viewFor(state: MicrophoneState): View {
  switch (state.kind) {
    case "listening":
      return {
        text: "Escuchando…",
        dotClass: "bg-emerald-400 animate-pulse",
        textClass: "text-emerald-300",
      };
    case "requesting":
      return {
        text: "Solicitando permiso del navegador…",
        dotClass: "bg-amber-300 animate-pulse",
        textClass: "text-amber-200",
      };
    case "denied":
      return {
        text: "Permiso denegado. Habilita el micrófono en los ajustes del navegador y reintenta.",
        dotClass: "bg-rose-400",
        textClass: "text-rose-300",
      };
    case "error":
      return {
        text: `Error: ${state.message}`,
        dotClass: "bg-rose-400",
        textClass: "text-rose-300",
      };
    case "idle":
    default:
      return {
        text: "Micrófono inactivo. Pulsa el botón para empezar.",
        dotClass: "bg-slate-500",
        textClass: "text-slate-400",
      };
  }
}

export function StatusIndicator({ state }: Props) {
  const view = viewFor(state);
  return (
    <div
      role="status"
      aria-live="polite"
      className="inline-flex items-center gap-2 text-sm"
    >
      <span className={`h-2.5 w-2.5 rounded-full ${view.dotClass}`} />
      <span className={view.textClass}>{view.text}</span>
    </div>
  );
}

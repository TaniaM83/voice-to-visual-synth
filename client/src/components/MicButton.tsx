import type { MicrophoneState } from "../hooks/useMicrophone";

type Props = {
  state: MicrophoneState["kind"];
  onRequest: () => void;
  onStop: () => void;
};

export function MicButton({ state, onRequest, onStop }: Props) {
  const isListening = state === "listening";
  const isBusy = state === "requesting";

  const handleClick = () => {
    if (isListening) onStop();
    else onRequest();
  };

  const label = (() => {
    switch (state) {
      case "listening":
        return "Detener micrófono";
      case "requesting":
        return "Solicitando permiso…";
      case "denied":
      case "error":
        return "Reintentar";
      case "idle":
      default:
        return "Activar micrófono";
    }
  })();

  const baseClass =
    "inline-flex items-center gap-3 rounded-full px-6 py-3 font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1e1e1e]";

  const stateClass = (() => {
    if (isListening) {
      return "bg-spotify-500 hover:bg-spotify-400 text-black focus-visible:ring-spotify-400";
    }
    if (state === "denied" || state === "error") {
      return "bg-rose-500 hover:bg-rose-400 text-white focus-visible:ring-rose-400";
    }
    return "bg-slate-100 hover:bg-white text-slate-950 focus-visible:ring-slate-300";
  })();

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isBusy}
      aria-pressed={isListening}
      className={`${baseClass} ${stateClass}`}
    >
      <MicIcon listening={isListening} />
      <span>{label}</span>
    </button>
  );
}

function MicIcon({ listening }: { listening: boolean }) {
  return (
    <span className="relative inline-flex h-5 w-5 items-center justify-center">
      {listening && (
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-spotify-300 opacity-60" />
      )}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative h-5 w-5"
        aria-hidden="true"
      >
        <rect x="9" y="3" width="6" height="12" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0" />
        <line x1="12" y1="18" x2="12" y2="22" />
        <line x1="8" y1="22" x2="16" y2="22" />
      </svg>
    </span>
  );
}

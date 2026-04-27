import { useCallback, useEffect, useRef, useState } from "react";

export type MicrophoneState =
  | { kind: "idle" }
  | { kind: "requesting" }
  | { kind: "listening"; stream: MediaStream }
  | { kind: "denied" }
  | { kind: "error"; message: string };

export type MicrophoneApi = {
  state: MicrophoneState;
  request: () => Promise<void>;
  stop: () => void;
};

export function useMicrophone(): MicrophoneApi {
  const [state, setState] = useState<MicrophoneState>({ kind: "idle" });
  const streamRef = useRef<MediaStream | null>(null);

  const releaseStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const request = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState({
        kind: "error",
        message: "Tu navegador no soporta acceso al micrófono.",
      });
      return;
    }

    setState({ kind: "requesting" });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setState({ kind: "listening", stream });
    } catch (err: unknown) {
      if (
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")
      ) {
        setState({ kind: "denied" });
        return;
      }
      const message = err instanceof Error ? err.message : "Error desconocido";
      setState({ kind: "error", message });
    }
  }, []);

  const stop = useCallback(() => {
    releaseStream();
    setState({ kind: "idle" });
  }, [releaseStream]);

  useEffect(() => {
    return () => {
      releaseStream();
    };
  }, [releaseStream]);

  return { state, request, stop };
}

import { useEffect, useRef } from "react";

type Props = {
  stream: MediaStream;
  bars?: number;
  color?: string;
};

const DISPLAY_WIDTH = 480;
const DISPLAY_HEIGHT = 96;
const SMOOTHING = 0.75;

export function AudioBars({ stream, bars = 48, color = "#34d399" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = DISPLAY_WIDTH * dpr;
    canvas.height = DISPLAY_HEIGHT * dpr;
    canvas.style.width = `${DISPLAY_WIDTH}px`;
    canvas.style.height = `${DISPLAY_HEIGHT}px`;
    ctx.scale(dpr, dpr);

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = nextPowerOfTwo(bars * 2);
    analyser.smoothingTimeConstant = SMOOTHING;
    source.connect(analyser);

    const data = new Uint8Array(analyser.frequencyBinCount);
    let raf = 0;

    const draw = () => {
      analyser.getByteFrequencyData(data);

      ctx.clearRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT);

      const gap = 2;
      const barWidth = (DISPLAY_WIDTH - gap * (bars + 1)) / bars;
      const centerY = DISPLAY_HEIGHT / 2;
      const maxHalfHeight = DISPLAY_HEIGHT / 2 - 4;

      ctx.fillStyle = color;
      for (let i = 0; i < bars; i++) {
        const v = data[i] / 255;
        const halfHeight = Math.max(1.5, v * maxHalfHeight);
        const x = gap + i * (barWidth + gap);
        const y = centerY - halfHeight;
        const h = halfHeight * 2;
        const r = Math.min(barWidth / 2, 3);
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, h, r);
        ctx.fill();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      audioContext.close();
    };
  }, [stream, bars, color]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="Visualización de frecuencias de la voz"
      className="rounded-lg bg-slate-900"
    />
  );
}

function nextPowerOfTwo(n: number): number {
  let p = 32;
  while (p < n) p *= 2;
  return Math.min(p, 32768);
}

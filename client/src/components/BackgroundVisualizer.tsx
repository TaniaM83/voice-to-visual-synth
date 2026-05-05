import { useEffect, useRef } from "react";

type Props = {
  stream: MediaStream;
  onCanvasReady?: (canvas: HTMLCanvasElement | null) => void;
};

const FFT_SIZE = 1024;
const SMOOTHING = 0.78;
const CONTOUR_POINTS = 180;
const EMA = 0.72;

export function BackgroundVisualizer({ stream, onCanvasReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    onCanvasReady?.(canvasRef.current);
    return () => onCanvasReady?.(null);
  }, [onCanvasReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const audioContext = new AudioContext();
    if (audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = SMOOTHING;
    source.connect(analyser);

    const bins = analyser.frequencyBinCount;
    const data = new Uint8Array(bins);

    const binHz = audioContext.sampleRate / 2 / bins;
    const bassEnd = Math.max(2, Math.floor(250 / binHz));
    const midEnd = Math.max(bassEnd + 2, Math.floor(2000 / binHz));
    const trebleEnd = Math.min(bins, Math.floor(8000 / binHz));
    // El espectro del habla útil está bajo ~6 kHz; recortamos para que el contorno
    // no quede dominado por bins agudos casi vacíos.
    const usableBins = Math.min(bins, Math.floor(6000 / binHz));

    let volS = 0;
    let bassS = 0;
    let trebleS = 0;
    let centroidS = 0.5;
    let pulse = 0;
    let lastBass = 0;
    let hueBase = Math.random() * 360;
    let rotation = 0;
    let t = 0;

    const draw = () => {
      analyser.getByteFrequencyData(data);

      // --- Análisis: peak por banda + curva expansiva con noise gate ---
      // La media plana sobre todos los bins amortigua la voz (que es selectiva en
      // frecuencia) y deja la aurora casi quieta. Usamos el pico de cada banda y
      // expandimos con `1 - exp(-(x-gate)*k)` para que un susurro ya mueva algo y
      // la voz normal sature suavemente sin recortarse.
      let bassPeak = 0;
      let midPeak = 0;
      let treblePeak = 0;
      let volPeak = 0;
      let energySum = 0;
      let weightedSum = 0;
      for (let i = 0; i < bassEnd; i++) {
        if (data[i] > bassPeak) bassPeak = data[i];
      }
      for (let i = bassEnd; i < midEnd; i++) {
        if (data[i] > midPeak) midPeak = data[i];
      }
      for (let i = midEnd; i < trebleEnd; i++) {
        if (data[i] > treblePeak) treblePeak = data[i];
      }
      for (let i = 0; i < usableBins; i++) {
        if (data[i] > volPeak) volPeak = data[i];
        energySum += data[i];
        weightedSum += data[i] * i;
      }
      const expand = (raw: number, gate: number, k: number) => {
        const g = Math.max(0, raw - gate);
        return 1 - Math.exp(-g * k);
      };
      const bass = expand(bassPeak / 255, 0.06, 5);
      const mid = expand(midPeak / 255, 0.06, 5);
      const treble = expand(treblePeak / 255, 0.06, 5);
      const vol = expand(volPeak / 255, 0.08, 4.5);
      const centroid = energySum > 0 ? weightedSum / energySum / usableBins : 0;

      // Suavizado EMA: la voz manda, pero la imagen no parpadea.
      volS = volS * EMA + vol * (1 - EMA);
      bassS = bassS * EMA + bass * (1 - EMA);
      trebleS = trebleS * EMA + treble * (1 - EMA);
      centroidS = centroidS * EMA + centroid * (1 - EMA);

      // Onset de graves → empuje breve, sin emitir un anillo nuevo.
      if (bass > 0.28 && bass > lastBass + 0.05) {
        pulse += 0.55;
      }
      lastBass = bass;
      pulse *= 0.94;

      t += 0.025 + mid * 0.05 + trebleS * 0.04;
      rotation += 0.006 + bassS * 0.025 + volS * 0.015;
      hueBase = (hueBase + 0.5 + centroidS * 2 + volS * 1.5) % 360;

      // --- Velo de estela: deja algo de rastro sin acumular maraña ---
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(15, 15, 18, 0.16)";
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const baseRadius = Math.min(width, height) * 0.18;
      const breath = baseRadius * (1 + volS * 0.95 + pulse * 0.55);

      // --- Halo radial (1 sola capa, source-over) ---
      const haloR = breath * 2.4;
      const halo = ctx.createRadialGradient(cx, cy, breath * 0.2, cx, cy, haloR);
      halo.addColorStop(0, `hsla(${hueBase}, 85%, 60%, ${0.25 + volS * 0.35})`);
      halo.addColorStop(0.6, `hsla(${(hueBase + 25) % 360}, 80%, 45%, ${0.08 + volS * 0.12})`);
      halo.addColorStop(1, `hsla(${hueBase}, 80%, 40%, 0)`);
      ctx.fillStyle = halo;
      ctx.fillRect(cx - haloR, cy - haloR, haloR * 2, haloR * 2);

      // --- Aurora: contorno cerrado deformado por el espectro ---
      // r(θ) = breath * (1 + spectrumAt(θ)*k + ondulación armónica)
      const wobbleAmp = 0.07 + volS * 0.18;
      const buildContour = (rot: number, scale: number, phase: number) => {
        ctx.beginPath();
        let firstX = 0;
        let firstY = 0;
        let prevX = 0;
        let prevY = 0;
        for (let i = 0; i <= CONTOUR_POINTS; i++) {
          const idx = i % CONTOUR_POINTS;
          const theta = (idx / CONTOUR_POINTS) * Math.PI * 2 + rot;
          // Mapeo simétrico para que el espectro no tuerza el contorno.
          const u = (idx % (CONTOUR_POINTS / 2)) / (CONTOUR_POINTS / 2);
          const binIdx = Math.min(usableBins - 1, Math.floor(u * usableBins));
          // Mismo gate que el resto: silencio → 0; voz → empuja fuerte.
          const specRaw = Math.max(0, data[binIdx] / 255 - 0.06);
          const spec = 1 - Math.exp(-specRaw * 4.5);
          // Tres armónicos a velocidades distintas → la silueta nunca se queda quieta.
          const wobble =
            Math.sin(theta * 3 + t + phase) * wobbleAmp +
            Math.sin(theta * 5 - t * 1.7 + phase) * wobbleAmp * 0.6 +
            Math.sin(theta * 8 + t * 2.3) * (0.02 + trebleS * 0.08);
          const r = breath * scale * (1 + spec * 1.4 + wobble);
          const x = cx + Math.cos(theta) * r;
          const y = cy + Math.sin(theta) * r;
          if (i === 0) {
            ctx.moveTo(x, y);
            firstX = x;
            firstY = y;
          } else {
            // quadraticCurveTo con punto medio = curva suave entre vértices
            ctx.quadraticCurveTo(prevX, prevY, (prevX + x) / 2, (prevY + y) / 2);
          }
          prevX = x;
          prevY = y;
        }
        ctx.quadraticCurveTo(prevX, prevY, firstX, firstY);
        ctx.closePath();
      };

      // Eco trasero: contra-rota para dar movimiento aunque la voz esté quieta.
      buildContour(-rotation * 0.7, 1.18, Math.PI / 2);
      const echoFill = ctx.createRadialGradient(cx, cy, breath * 0.5, cx, cy, breath * 1.6);
      echoFill.addColorStop(0, `hsla(${(hueBase + 30) % 360}, 80%, 55%, 0.18)`);
      echoFill.addColorStop(1, `hsla(${(hueBase + 30) % 360}, 80%, 55%, 0)`);
      ctx.fillStyle = echoFill;
      ctx.fill();
      ctx.strokeStyle = `hsla(${(hueBase + 30) % 360}, 80%, 65%, ${0.18 + trebleS * 0.25})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Aurora principal
      buildContour(rotation, 1, 0);
      const fill = ctx.createRadialGradient(cx, cy, 0, cx, cy, breath * 1.2);
      fill.addColorStop(0, `hsla(${hueBase}, 90%, 65%, ${0.45 + volS * 0.3})`);
      fill.addColorStop(0.7, `hsla(${(hueBase + 20) % 360}, 85%, 50%, ${0.25 + volS * 0.2})`);
      fill.addColorStop(1, `hsla(${hueBase}, 85%, 45%, 0)`);
      ctx.fillStyle = fill;
      ctx.fill();
      const edgeHue = (hueBase + 180) % 360;
      ctx.strokeStyle = `hsla(${edgeHue}, 95%, ${65 + trebleS * 20}%, ${0.55 + trebleS * 0.4})`;
      ctx.lineWidth = 1.5 + volS * 2 + pulse * 1.5;
      ctx.stroke();

      raf = requestAnimationFrame(draw);
    };

    let raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      source.disconnect();
      audioContext.close();
    };
  }, [stream]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none"
    />
  );
}

import { useEffect, useRef } from "react";

type Props = {
  stream: MediaStream;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hue: number;
  life: number;
  size: number;
};

const FFT_SIZE = 1024;
const SMOOTHING = 0.82;
const MAX_PARTICLES = 400;

export function BackgroundVisualizer({ stream }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    let particles: Particle[] = [];
    let lastBass = 0;
    let hueBase = 280;

    const draw = () => {
      analyser.getByteFrequencyData(data);

      let bassSum = 0;
      let midSum = 0;
      let trebleSum = 0;
      for (let i = 0; i < bassEnd; i++) bassSum += data[i];
      for (let i = bassEnd; i < midEnd; i++) midSum += data[i];
      for (let i = midEnd; i < trebleEnd; i++) trebleSum += data[i];
      const bass = bassSum / (bassEnd * 255);
      const mid = midSum / ((midEnd - bassEnd) * 255);
      const treble = trebleSum / Math.max(1, (trebleEnd - midEnd) * 255);

      // Trail: in vez de borrar, pintamos un velo oscuro semitransparente
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(2, 6, 23, 0.18)";
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const baseRadius = Math.min(width, height) * 0.13;

      // El hue de fondo se desplaza lentamente con el contenido medio
      hueBase = (hueBase + 0.1 + mid * 0.5) % 360;

      ctx.globalCompositeOperation = "lighter";

      // Anillo central pulsando con los GRAVES
      const ringRadius = baseRadius + bass * 140;
      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hueBase}, 80%, 60%, ${0.25 + bass * 0.7})`;
      ctx.lineWidth = 2 + bass * 10;
      ctx.stroke();

      // Espectro circular alrededor del centro: cada bin = una línea radial
      const spectrumInner = baseRadius * 1.25;
      const spectrumScale = baseRadius * 1.6;
      ctx.beginPath();
      const barsCount = midEnd;
      for (let i = 0; i < barsCount; i++) {
        const angle = (i / barsCount) * Math.PI * 2 - Math.PI / 2;
        const amp = (data[i] / 255) * spectrumScale;
        const r1 = spectrumInner;
        const r2 = spectrumInner + amp;
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        ctx.moveTo(cx + c * r1, cy + s * r1);
        ctx.lineTo(cx + c * r2, cy + s * r2);
      }
      ctx.strokeStyle = `hsla(${(hueBase + 180) % 360}, 85%, 65%, 0.55)`;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Partículas que salen del centro cuando hay un golpe de GRAVES
      if (bass > 0.35 && bass > lastBass + 0.04) {
        const count = Math.min(20, Math.floor(bass * 18));
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1.5 + bass * 7 + Math.random() * 2.5;
          particles.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            hue: hueBase + (Math.random() - 0.5) * 40,
            life: 1,
            size: 2 + bass * 5,
          });
        }
      }
      lastBass = bass;

      // Chispas dispersas con los AGUDOS
      if (treble > 0.22) {
        const count = Math.min(8, Math.floor(treble * 10));
        for (let i = 0; i < count; i++) {
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
            hue: 50 + Math.random() * 80,
            life: 0.6,
            size: 1 + Math.random() * 2.5,
          });
        }
      }

      // Limitar el número de partículas vivas
      if (particles.length > MAX_PARTICLES) {
        particles = particles.slice(-MAX_PARTICLES);
      }

      // Actualizar y dibujar partículas (additivo → efecto neón al solaparse)
      const next: Particle[] = [];
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.life -= 0.012;
        if (p.life > 0 && p.x > -20 && p.x < width + 20 && p.y > -20 && p.y < height + 20) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 90%, 65%, ${p.life})`;
          ctx.fill();
          next.push(p);
        }
      }
      particles = next;

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

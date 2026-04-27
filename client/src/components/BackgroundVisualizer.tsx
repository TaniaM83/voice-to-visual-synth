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

type Ring = {
  radius: number;
  opacity: number;
  hue: number;
  width: number;
};

const FFT_SIZE = 1024;
const SMOOTHING = 0.82;
const MAX_PARTICLES = 500;
const SPIRAL_ARMS = 3;
const SPIRAL_POINTS = 90;

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
    let rings: Ring[] = [];
    let lastBass = 0;
    let hueBase = Math.random() * 360;
    let globalRotation = 0;

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

      // Velo de estela (más bajo = trazos más persistentes y psicodélicos)
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = "rgba(2, 6, 23, 0.12)";
      ctx.fillRect(0, 0, width, height);

      // Avance temporal de hue y rotación global
      hueBase = (hueBase + 0.4 + bass * 1.5) % 360;
      globalRotation += 0.0035 + mid * 0.018;

      const cx = width / 2;
      const cy = height / 2;
      const baseRadius = Math.min(width, height) * 0.13;

      ctx.globalCompositeOperation = "lighter";

      // 1) Núcleo: gradiente radial que palpita con los GRAVES
      const coreRadius = 40 + bass * 130;
      const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius);
      coreGrad.addColorStop(0, `hsla(${hueBase}, 95%, 70%, ${0.5 + bass * 0.5})`);
      coreGrad.addColorStop(0.5, `hsla(${(hueBase + 30) % 360}, 90%, 60%, ${0.25 + bass * 0.3})`);
      coreGrad.addColorStop(1, `hsla(${hueBase}, 90%, 60%, 0)`);
      ctx.fillStyle = coreGrad;
      ctx.fillRect(cx - coreRadius, cy - coreRadius, coreRadius * 2, coreRadius * 2);

      // 2) Brazos en espiral (3 brazos rotando) — la pieza psicodélica principal
      const maxSpiralRadius = Math.min(width, height) * 0.55;
      const spiralTwist = 3.5 + mid * 5;
      for (let arm = 0; arm < SPIRAL_ARMS; arm++) {
        const armOffset = (arm / SPIRAL_ARMS) * Math.PI * 2;
        const hue = (hueBase + arm * (360 / SPIRAL_ARMS)) % 360;
        ctx.beginPath();
        for (let i = 0; i <= SPIRAL_POINTS; i++) {
          const t = i / SPIRAL_POINTS;
          const r = t * maxSpiralRadius * (1 + bass * 0.35);
          const theta =
            armOffset + globalRotation + t * spiralTwist * Math.PI * 2;
          const x = cx + Math.cos(theta) * r;
          const y = cy + Math.sin(theta) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(${hue}, 90%, 65%, ${0.45 + mid * 0.45})`;
        ctx.lineWidth = 2 + mid * 5 + bass * 3;
        ctx.stroke();
      }

      // 3) Brazos de espiral contrarotando (más finos) para reforzar la sensación de bucle
      for (let arm = 0; arm < SPIRAL_ARMS; arm++) {
        const armOffset = (arm / SPIRAL_ARMS) * Math.PI * 2;
        const hue = (hueBase + 180 + arm * (360 / SPIRAL_ARMS)) % 360;
        ctx.beginPath();
        for (let i = 0; i <= SPIRAL_POINTS; i++) {
          const t = i / SPIRAL_POINTS;
          const r = t * maxSpiralRadius * 0.85;
          const theta =
            armOffset - globalRotation * 0.6 - t * (spiralTwist * 0.8) * Math.PI * 2;
          const x = cx + Math.cos(theta) * r;
          const y = cy + Math.sin(theta) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(${hue}, 90%, 70%, ${0.25 + treble * 0.5})`;
        ctx.lineWidth = 1.2 + treble * 3;
        ctx.stroke();
      }

      // 4) Anillos concéntricos que nacen en cada golpe de GRAVES y se expanden (bucles)
      if (bass > 0.3 && bass > lastBass + 0.04) {
        rings.push({
          radius: baseRadius * 0.6,
          opacity: 0.8,
          hue: (hueBase + Math.random() * 60) % 360,
          width: 2 + bass * 6,
        });

        // En el mismo golpe, partículas radiales
        const count = Math.min(24, Math.floor(bass * 22));
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 1.5 + bass * 8 + Math.random() * 2.5;
          particles.push({
            x: cx,
            y: cy,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            hue: (hueBase + (Math.random() - 0.5) * 60) % 360,
            life: 1,
            size: 2 + bass * 5,
          });
        }
      }
      lastBass = bass;

      // Actualizar y dibujar anillos
      const maxDim = Math.max(width, height);
      const nextRings: Ring[] = [];
      for (const ring of rings) {
        ring.radius += 3.5 + mid * 5;
        ring.opacity -= 0.01;
        if (ring.opacity > 0 && ring.radius < maxDim) {
          ctx.beginPath();
          ctx.arc(cx, cy, ring.radius, 0, Math.PI * 2);
          ctx.strokeStyle = `hsla(${ring.hue}, 90%, 65%, ${ring.opacity})`;
          ctx.lineWidth = ring.width * ring.opacity;
          ctx.stroke();
          nextRings.push(ring);
        }
      }
      rings = nextRings;

      // 5) Chispas dispersas con AGUDOS
      if (treble > 0.22) {
        const count = Math.min(10, Math.floor(treble * 12));
        for (let i = 0; i < count; i++) {
          particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 0.6,
            vy: (Math.random() - 0.5) * 0.6,
            hue: (hueBase + 60 + Math.random() * 120) % 360,
            life: 0.6,
            size: 1 + Math.random() * 2.5,
          });
        }
      }

      // 6) Actualizar y dibujar partículas
      if (particles.length > MAX_PARTICLES) {
        particles = particles.slice(-MAX_PARTICLES);
      }
      const nextParticles: Particle[] = [];
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.985;
        p.vy *= 0.985;
        p.life -= 0.011;
        if (
          p.life > 0 &&
          p.x > -20 &&
          p.x < width + 20 &&
          p.y > -20 &&
          p.y < height + 20
        ) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${p.hue}, 90%, 65%, ${p.life})`;
          ctx.fill();
          nextParticles.push(p);
        }
      }
      particles = nextParticles;

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

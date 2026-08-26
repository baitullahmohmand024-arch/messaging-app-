import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playBalloonPopSound } from '../lib/audio';

interface OpeningAnimationProps {
  onComplete: () => void;
  soundEnabled?: boolean;
  isReplay?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vRot: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  shape: 'shard' | 'sparkle' | 'dot';
}

export const OpeningAnimation: React.FC<OpeningAnimationProps> = ({
  onComplete,
  soundEnabled = true,
  isReplay = false
}) => {
  // Check if returning user in localStorage
  const hasSeenIntroBefore = !isReplay && typeof window !== 'undefined' && localStorage.getItem('mylove_intro_seen') === 'true';

  // Phases: 'silence' | 'floating' | 'popping' | 'welcome' | 'brand' | 'done'
  const [phase, setPhase] = useState<'silence' | 'floating' | 'popping' | 'welcome' | 'brand' | 'done'>(
    hasSeenIntroBefore ? 'brand' : 'silence'
  );

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const isCompletedRef = useRef(false);

  const handleFinish = useCallback(() => {
    if (isCompletedRef.current) return;
    isCompletedRef.current = true;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    try {
      localStorage.setItem('mylove_intro_seen', 'true');
    } catch {
      // ignore
    }
    setPhase('done');
    onComplete();
  }, [onComplete]);

  // Burst particle simulation on Canvas
  const triggerBurstParticles = useCallback((cx: number, cy: number) => {
    const particles: Particle[] = [];
    const colors = [
      '#D42B4E', // Ruby crimson
      '#E63946', // Vibrant rose
      '#9B112E', // Deep garnet
      '#FF758F', // Soft blush
      '#D4AF37', // Luxe Champagne gold
      '#FFE5A3'  // Pale gold sparkle
    ];

    // 1. Realistic latex balloon tear shards
    for (let i = 0; i < 30; i++) {
      const angle = (Math.PI * 2 * i) / 30 + (Math.random() - 0.5) * 0.4;
      const speed = 3.5 + Math.random() * 8;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.2,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
        size: 6 + Math.random() * 10,
        color: colors[Math.floor(Math.random() * 4)],
        alpha: 1,
        decay: 0.022 + Math.random() * 0.02,
        shape: 'shard'
      });
    }

    // 2. Atmospheric luminous golden & ruby sparkles
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 5.5;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.6,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.1,
        size: 1.8 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 0.95,
        decay: 0.014 + Math.random() * 0.018,
        shape: Math.random() > 0.4 ? 'sparkle' : 'dot'
      });
    }

    particlesRef.current = particles;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let activeCount = 0;

      for (let i = 0; i < particlesRef.current.length; i++) {
        const p = particlesRef.current[i];
        if (p.alpha <= 0.01) continue;

        activeCount++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1; // gentle gravity
        p.vx *= 0.965; // air resistance
        p.vy *= 0.965;
        p.rotation += p.vRot;
        p.alpha -= p.decay;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha = Math.max(0, p.alpha);

        if (p.shape === 'shard') {
          // Curved organic rubber shard
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.moveTo(-p.size * 0.5, -p.size * 0.2);
          ctx.quadraticCurveTo(0, -p.size * 0.6, p.size * 0.6, 0);
          ctx.quadraticCurveTo(0, p.size * 0.4, -p.size * 0.5, p.size * 0.2);
          ctx.closePath();
          ctx.fill();
        } else if (p.shape === 'sparkle') {
          // 4-point star sparkle
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.6, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = p.color;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(-p.size * 1.5, 0);
          ctx.lineTo(p.size * 1.5, 0);
          ctx.moveTo(0, -p.size * 1.5);
          ctx.lineTo(0, p.size * 1.5);
          ctx.stroke();
        } else {
          // Soft circular stardust dot
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      if (activeCount > 0) {
        animFrameRef.current = requestAnimationFrame(render);
      }
    };

    render();
  }, []);

  // Handle canvas sizing
  useEffect(() => {
    const updateCanvasSize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);
    return () => window.removeEventListener('resize', updateCanvasSize);
  }, []);

  // Master Timeline Controller
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    if (hasSeenIntroBefore) {
      // Returning user short sequence: brand shimmer -> enter (approx 1.4s)
      timers.push(
        setTimeout(() => {
          handleFinish();
        }, 1400)
      );
      return () => timers.forEach(clearTimeout);
    }

    // Phase 1 -> Phase 2: Silence to Floating Balloon (after 280ms)
    timers.push(
      setTimeout(() => {
        setPhase('floating');
      }, 280)
    );

    // Phase 2 -> Phase 4: Floating reaches center -> Burst (at 1450ms)
    timers.push(
      setTimeout(() => {
        setPhase('popping');
        playBalloonPopSound(soundEnabled);

        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2 - 15;
        triggerBurstParticles(cx, cy);
      }, 1450)
    );

    // Phase 4 -> Phase 5: Balloon burst -> "Welcome" (at 1580ms)
    timers.push(
      setTimeout(() => {
        setPhase('welcome');
      }, 1580)
    );

    // Phase 5 -> Phase 6: "Welcome" -> Brand Reveal "MY LOVE IS HERE" (at 2350ms)
    timers.push(
      setTimeout(() => {
        setPhase('brand');
      }, 2350)
    );

    // Phase 6 -> Finish: Brand settled -> Smooth transition into application (at 3700ms)
    timers.push(
      setTimeout(() => {
        handleFinish();
      }, 3700)
    );

    return () => {
      timers.forEach(clearTimeout);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [handleFinish, hasSeenIntroBefore, soundEnabled, triggerBurstParticles]);

  if (phase === 'done') return null;

  return (
    <div
      id="app-opening-animation-container"
      onClick={handleFinish}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#090A0C] select-none cursor-pointer overflow-hidden transition-opacity duration-500"
    >
      {/* Deep luxury radial atmosphere */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40 transition-opacity duration-1000"
        style={{
          background: 'radial-gradient(circle at 50% 48%, rgba(212, 43, 78, 0.12) 0%, rgba(9, 10, 12, 0.98) 75%)'
        }}
      />

      {/* Burst Particles Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-20"
      />

      {/* PHASE 2 & 3: Floating 3D Heart Balloon */}
      {phase === 'floating' && (
        <motion.div
          id="opening-heart-balloon"
          initial={{ y: '68vh', opacity: 0, scale: 0.88, rotate: -2 }}
          animate={{
            y: [ '68vh', '16vh', '-1.5vh', '0vh' ],
            x: [ 0, 12, -8, 0 ],
            rotate: [ -2, 2.5, -1, 0 ],
            opacity: [ 0, 1, 1, 1 ],
            scale: [ 0.88, 0.98, 1.02, 1.0 ]
          }}
          transition={{
            duration: 1.18,
            ease: [0.22, 1, 0.36, 1],
            times: [0, 0.45, 0.85, 1]
          }}
          className="relative z-10 flex flex-col items-center justify-center pointer-events-none"
        >
          {/* 3D Realistic Heart Balloon Artwork */}
          <div className="relative w-36 h-36 md:w-44 md:h-44 drop-shadow-[0_22px_36px_rgba(212,43,78,0.38)]">
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full filter drop-shadow-[0_4px_16px_rgba(0,0,0,0.65)]"
            >
              <defs>
                {/* Main 3D Volume Gradient */}
                <radialGradient id="balloonBody" cx="38%" cy="32%" r="65%">
                  <stop offset="0%" stopColor="#FF4D6D" />
                  <stop offset="35%" stopColor="#D42B4E" />
                  <stop offset="70%" stopColor="#960E2A" />
                  <stop offset="100%" stopColor="#540414" />
                </radialGradient>

                {/* Primary Specular Light Reflection (Lobe Arc) */}
                <linearGradient id="specularHighlight" x1="0%" y1="0%" x2="60%" y2="80%">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.88" />
                  <stop offset="40%" stopColor="#FFE0E6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#FF4D6D" stopOpacity="0" />
                </linearGradient>

                {/* Secondary Rim Reflection */}
                <linearGradient id="rimLight" x1="100%" y1="20%" x2="40%" y2="70%">
                  <stop offset="0%" stopColor="#FFCCD5" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#7A0820" stopOpacity="0" />
                </linearGradient>

                {/* Balloon Tie Knot Gradient */}
                <linearGradient id="knotGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#960E2A" />
                  <stop offset="100%" stopColor="#3D000C" />
                </linearGradient>
              </defs>

              {/* Heart Balloon Body */}
              <path
                d="M 100 170 
                   C 75 145, 20 110, 20 62 
                   A 42 42 0 0 1 100 48 
                   A 42 42 0 0 1 180 62 
                   C 180 110, 125 145, 100 170 Z"
                fill="url(#balloonBody)"
              />

              {/* Rim Sheen for 3D depth */}
              <path
                d="M 100 170 
                   C 75 145, 20 110, 20 62 
                   A 42 42 0 0 1 100 48 
                   A 42 42 0 0 1 180 62 
                   C 180 110, 125 145, 100 170 Z"
                fill="url(#rimLight)"
                opacity="0.6"
              />

              {/* Specular Glare Arc on Left Lobe */}
              <ellipse
                cx="58"
                cy="64"
                rx="24"
                ry="13"
                transform="rotate(-32 58 64)"
                fill="url(#specularHighlight)"
              />

              {/* Secondary Micro Specular Dot on Right Lobe */}
              <ellipse
                cx="140"
                cy="68"
                rx="12"
                ry="7"
                transform="rotate(25 140 68)"
                fill="#FFFFFF"
                opacity="0.45"
              />

              {/* Balloon Neck / Knot */}
              <polygon
                points="95,168 105,168 107,177 93,177"
                fill="url(#knotGrad)"
              />
              <circle
                cx="100"
                cy="176"
                r="3.5"
                fill="#540414"
              />
            </svg>

            {/* Hanging Gold Ribbon String */}
            <div className="absolute top-[96%] left-1/2 -translate-x-1/2 w-6 h-28 pointer-events-none overflow-visible">
              <svg viewBox="0 0 24 110" className="w-full h-full overflow-visible">
                <path
                  d="M 12 0 Q 6 25, 16 50 T 10 90 T 14 110"
                  fill="none"
                  stroke="#D4AF37"
                  strokeWidth="1.2"
                  strokeOpacity="0.65"
                />
              </svg>
            </div>
          </div>
        </motion.div>
      )}

      {/* PHASE 4: Pop Flash Shockwave */}
      {phase === 'popping' && (
        <motion.div
          initial={{ scale: 0.5, opacity: 0.85 }}
          animate={{ scale: 2.3, opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="absolute z-10 w-48 h-48 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle, rgba(255,230,200,0.65) 0%, rgba(212,43,78,0.3) 40%, rgba(9,10,12,0) 70%)'
          }}
        />
      )}

      {/* PHASE 5: Elegant "Welcome" reveal */}
      <AnimatePresence>
        {phase === 'welcome' && (
          <motion.div
            key="opening-phase-welcome"
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-30 text-center px-6 pointer-events-none"
          >
            <h1 className="text-3xl md:text-4xl font-serif font-light tracking-wide text-white drop-shadow-[0_2px_12px_rgba(255,255,255,0.15)]">
              Welcome
            </h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PHASE 6: Official Brand Reveal "MY LOVE IS HERE" */}
      <AnimatePresence>
        {phase === 'brand' && (
          <motion.div
            key="opening-phase-brand"
            initial={{ opacity: 0, y: 14, letterSpacing: '0.3em' }}
            animate={{ opacity: 1, y: 0, letterSpacing: '0.22em' }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-30 text-center px-6 pointer-events-none flex flex-col items-center justify-center"
          >
            {/* Subtle floating ambient light aura */}
            <div className="absolute w-64 h-24 bg-[#D4AF37]/15 rounded-full blur-2xl pointer-events-none -z-10" />

            {/* Luxury Wordmark with subtle light sweep effect */}
            <div className="relative inline-block overflow-hidden py-1">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-medium uppercase tracking-[0.22em] text-white">
                MY LOVE IS HERE
              </h1>

              {/* Ultra-subtle luxury light shimmer travelling across typography */}
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: '200%' }}
                transition={{ duration: 1.05, ease: 'easeInOut', delay: 0.15 }}
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/35 to-transparent pointer-events-none skew-x-[-20deg]"
              />
            </div>

            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 0.5, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-[11px] sm:text-xs text-white/50 tracking-[0.28em] uppercase font-light mt-2"
            >
              A Private Sanctuary for Two
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skip Button (Top Right) */}
      <button
        type="button"
        id="btn-skip-opening-animation"
        onClick={(e) => {
          e.stopPropagation();
          handleFinish();
        }}
        className="absolute top-6 right-6 z-40 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-white/40 hover:text-white/80 transition-colors backdrop-blur-sm"
      >
        Skip
      </button>
    </div>
  );
};

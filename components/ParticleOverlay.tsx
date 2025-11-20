import React, { useEffect, useRef } from 'react';

interface Burst {
  x: number;
  y: number;
  color: string;
}

interface Props {
  bursts: Burst[];
  onComplete: () => void;
}

const ParticleOverlay: React.FC<Props> = ({ bursts, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<any[]>([]);
  const frameId = useRef<number>(0);

  useEffect(() => {
    if (bursts.length === 0) return;

    // Initialize particles
    bursts.forEach(burst => {
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        particles.current.push({
          x: burst.x,
          y: burst.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1.0,
          decay: 0.02 + Math.random() * 0.03,
          color: burst.color,
          size: 4 + Math.random() * 4
        });
      }
    });

    const animate = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw
      for (let i = particles.current.length - 1; i >= 0; i--) {
        const p = particles.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        p.size *= 0.95; // Shrink

        if (p.life <= 0) {
          particles.current.splice(i, 1);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life;
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1.0;

      if (particles.current.length > 0) {
        frameId.current = requestAnimationFrame(animate);
      } else {
        onComplete();
      }
    };

    // Resize canvas
    if (canvasRef.current) {
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
    }

    animate();

    return () => {
      cancelAnimationFrame(frameId.current);
      particles.current = [];
    };
  }, [bursts]); // Re-run when bursts change

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 pointer-events-none z-[1000]"
    />
  );
};

export default ParticleOverlay;
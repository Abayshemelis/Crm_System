import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAlpha: number;
  pulseSpeed: number;
  pulseOffset: number;
  color: string;
}

export const NetworkBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Color palette based on theme (Amber, Emerald, Indigo, Violet)
    const colors = [
      'rgba(245, 158, 11, ', // Amber (CRM primary)
      'rgba(16, 185, 129, ', // Emerald (Security / Success)
      'rgba(99, 102, 241, ', // Indigo (Tech / Network)
      'rgba(168, 85, 247, ', // Purple (Glow)
    ];

    // Determine particle count based on screen width for 60fps performance
    const isMobile = width < 768;
    const particleCount = isMobile ? 32 : 64;
    const connectionDistance = isMobile ? 110 : 160;

    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * (isMobile ? 0.35 : 0.6),
        vy: (Math.random() - 0.5) * (isMobile ? 0.35 : 0.6),
        radius: Math.random() * 2 + 1.2,
        baseAlpha: Math.random() * 0.4 + 0.3,
        pulseSpeed: Math.random() * 0.02 + 0.01,
        pulseOffset: Math.random() * Math.PI * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    // Mouse tracking for interactive network drift
    let mouse = { x: -1000, y: -1000, active: false };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('mouseleave', handleMouseLeave);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize, { passive: true });

    let time = 0;

    const render = () => {
      time += 0.015;
      ctx.clearRect(0, 0, width, height);

      // Update & Draw Nodes
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Bounce boundaries softly
        if (p.x < 0) { p.x = 0; p.vx *= -1; }
        else if (p.x > width) { p.x = width; p.vx *= -1; }
        if (p.y < 0) { p.y = 0; p.vy *= -1; }
        else if (p.y > height) { p.y = height; p.vy *= -1; }

        // Subtle mouse repulsion/attraction effect
        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140 && dist > 0) {
            const force = (140 - dist) / 140;
            p.x -= (dx / dist) * force * 0.8;
            p.y -= (dy / dist) * force * 0.8;
          }
        }

        // Pulsing alpha
        const alpha = p.baseAlpha + Math.sin(time * 2 + p.pulseOffset) * 0.15;

        // Draw particle node
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${Math.max(0.1, alpha)})`;
        ctx.fill();

        // Node subtle halo
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2.4, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${Math.max(0.02, alpha * 0.25)})`;
        ctx.fill();

        // Draw Connecting Network Lines
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDistance) {
            const lineAlpha = (1 - dist / connectionDistance) * 0.22;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(245, 158, 11, ${lineAlpha})`;
            ctx.lineWidth = 0.85;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 2,
        opacity: 0.85,
      }}
      aria-hidden="true"
    />
  );
};

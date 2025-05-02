'use client';
import { useCallback, useState, useEffect } from 'react';
import Particles from 'react-tsparticles';
import { loadSlim } from 'tsparticles-slim';

export default function ParticlesBackground() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const particlesInit = useCallback(async (engine) => {
    await loadSlim(engine);
  }, []);

  if (!isClient) return null;

  return (
    <Particles
      id="tsparticles"
      init={particlesInit}
      className="fixed inset-0 pointer-events-none z-0"
      options={{
        fullScreen: { enable: false },
        background: { opacity: 0 },
        fpsLimit: 30,
        interactivity: {
          events: {
            onHover: { enable: true, mode: 'grab', parallax: { enable: false } },
            resize: true,
          },
          modes: { grab: { distance: 100, links: { opacity: 0.3 } } },
        },
        particles: {
          color: { value: '#ffffff' },
          links: { color: '#a855f7', distance: 150, enable: true, opacity: 0.1, width: 1 },
          move: { enable: true, speed: 0.8, outModes: { default: 'bounce' } },
          number: { density: { enable: true, area: 1000 }, value: 40 },
          opacity: { value: 0.2 },
          shape: { type: 'circle' },
          size: { value: { min: 1, max: 2 } },
        },
        detectRetina: true,
      }}
    />
  );
}
"use client";

import React, { useEffect, useRef } from "react";

export const DynamicTechBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width: number, height: number;
    let animationFrameId: number;

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    resize();

    // =========================================================
    // OBJETO 1: PAINÉIS DE CÓDIGO (FRONT-END / INTERFACES)
    // =========================================================
    const buildPanel = () => {
      const v: { x: number; y: number }[] = [];
      const edges: number[][] = [];

      v.push({ x: -160, y: -100 });
      v.push({ x: 160, y: -100 });
      v.push({ x: 160, y: 100 });
      v.push({ x: -160, y: 100 });
      edges.push([0, 1], [1, 2], [2, 3], [3, 0]);

      v.push({ x: -130, y: -60 });
      v.push({ x: -20, y: -60 });
      edges.push([4, 5]);
      v.push({ x: -130, y: -30 });
      v.push({ x: 80, y: -30 });
      edges.push([6, 7]);
      v.push({ x: -130, y: 0 });
      v.push({ x: -60, y: 0 });
      edges.push([8, 9]);
      v.push({ x: -130, y: 30 });
      v.push({ x: 110, y: 30 });
      edges.push([10, 11]);
      v.push({ x: -130, y: 60 });
      v.push({ x: 20, y: 60 });
      edges.push([12, 13]);

      return { v, edges };
    };

    const panelDef = buildPanel();
    const panels = [
      { zOffset: -200, color: "0, 243, 255" },
      { zOffset: 0, color: "123, 44, 191" },
      { zOffset: 200, color: "59, 130, 246" },
    ];

    // =========================================================
    // OBJETO 2: SÍMBOLO DE CÓDIGO 3D E SERVIDORES (DEV / PROGRAMAÇÃO)
    // =========================================================
    const buildCodeSymbol = () => {
      const v: { x: number; y: number; z: number; color: string }[] = [];
      const edges: [number, number, string][] = [];
      let idx = 0;

      const addPrism = (face2D: { x: number; y: number }[], color: string) => {
        const startIdx = idx;
        face2D.forEach((pt) => v.push({ x: pt.x, y: pt.y, z: 30, color }));
        face2D.forEach((pt) => v.push({ x: pt.x, y: pt.y, z: -30, color }));

        const n = face2D.length;
        for (let i = 0; i < n; i++) {
          edges.push([startIdx + i, startIdx + ((i + 1) % n), color]);
          edges.push([startIdx + n + i, startIdx + n + ((i + 1) % n), color]);
          edges.push([startIdx + i, startIdx + n + i, color]);
        }
        idx += n * 2;
      };

      const addCube = (
        cx: number,
        cy: number,
        cz: number,
        size: number,
        color: string,
      ) => {
        const startIdx = idx;
        const s = size / 2;
        v.push(
          { x: cx - s, y: cy - s, z: cz + s, color },
          { x: cx + s, y: cy - s, z: cz + s, color },
          { x: cx + s, y: cy + s, z: cz + s, color },
          { x: cx - s, y: cy + s, z: cz + s, color },
        );
        v.push(
          { x: cx - s, y: cy - s, z: cz - s, color },
          { x: cx + s, y: cy - s, z: cz - s, color },
          { x: cx + s, y: cy + s, z: cz - s, color },
          { x: cx - s, y: cy + s, z: cz - s, color },
        );
        for (let i = 0; i < 4; i++) {
          edges.push([startIdx + i, startIdx + ((i + 1) % 4), color]);
          edges.push([startIdx + 4 + i, startIdx + 4 + ((i + 1) % 4), color]);
          edges.push([startIdx + i, startIdx + 4 + i, color]);
        }
        idx += 8;
      };

      // Brackets < > (Ciano)
      addPrism(
        [
          { x: -60, y: -100 },
          { x: -90, y: -100 },
          { x: -150, y: 0 },
          { x: -90, y: 100 },
          { x: -60, y: 100 },
          { x: -120, y: 0 },
        ],
        "0, 243, 255",
      );
      // Slash / (Roxo)
      addPrism(
        [
          { x: 30, y: -110 },
          { x: 0, y: -110 },
          { x: -30, y: 110 },
          { x: 0, y: 110 },
        ],
        "123, 44, 191",
      );
      // Bracket > (Ciano)
      addPrism(
        [
          { x: 60, y: -100 },
          { x: 90, y: -100 },
          { x: 150, y: 0 },
          { x: 90, y: 100 },
          { x: 60, y: 100 },
          { x: 120, y: 0 },
        ],
        "0, 243, 255",
      );

      // Floating Cubes / Microservices / Containers (Azul)
      addCube(-180, -120, 50, 30, "59, 130, 246");
      addCube(160, 100, -60, 40, "59, 130, 246");
      addCube(-40, -150, -40, 20, "59, 130, 246");
      addCube(180, -80, 80, 25, "123, 44, 191");

      return { v, edges };
    };

    const codeSymbolDef = buildCodeSymbol();

    // =========================================================
    // OBJETO 3: ENGRENAGEM 3D (FASE 1 — ENGINE / MECANISMO)
    // =========================================================
    const buildGear = () => {
      const v: { x: number; y: number; z: number }[] = [];
      const edges: number[][] = [];
      const teeth = 10;
      const innerR = 50;
      const outerR = 75;
      const depth = 25;

      // Front + back faces
      for (let face = 0; face < 2; face++) {
        const z = face === 0 ? depth : -depth;
        for (let i = 0; i < teeth; i++) {
          const a1 = (i / teeth) * Math.PI * 2;
          const a2 = ((i + 0.35) / teeth) * Math.PI * 2;
          const a3 = ((i + 0.65) / teeth) * Math.PI * 2;
          const a4 = ((i + 1) / teeth) * Math.PI * 2;
          v.push({ x: Math.cos(a1) * innerR, y: Math.sin(a1) * innerR, z });
          v.push({ x: Math.cos(a2) * outerR, y: Math.sin(a2) * outerR, z });
          v.push({ x: Math.cos(a3) * outerR, y: Math.sin(a3) * outerR, z });
          v.push({ x: Math.cos(a4) * innerR, y: Math.sin(a4) * innerR, z });
        }
      }

      const ptsPerFace = teeth * 4;
      // Edges within each face
      for (let face = 0; face < 2; face++) {
        const off = face * ptsPerFace;
        for (let i = 0; i < ptsPerFace; i++) {
          edges.push([off + i, off + ((i + 1) % ptsPerFace)]);
        }
      }
      // Connecting front-back
      for (let i = 0; i < ptsPerFace; i += 4) {
        edges.push([i, i + ptsPerFace]);
        edges.push([i + 1, i + 1 + ptsPerFace]);
        edges.push([i + 2, i + 2 + ptsPerFace]);
        edges.push([i + 3, i + 3 + ptsPerFace]);
      }

      // Center hub (hexagonal)
      const hubR = 18;
      const hubStart = v.length;
      for (let face = 0; face < 2; face++) {
        const z = face === 0 ? depth : -depth;
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          v.push({ x: Math.cos(a) * hubR, y: Math.sin(a) * hubR, z });
        }
      }
      for (let face = 0; face < 2; face++) {
        const off = hubStart + face * 6;
        for (let i = 0; i < 6; i++) edges.push([off + i, off + ((i + 1) % 6)]);
      }
      for (let i = 0; i < 6; i++) edges.push([hubStart + i, hubStart + 6 + i]);

      return { v, edges };
    };

    const gearDef = buildGear();

    // =========================================================
    // OBJETO 4: TERMINAL / CONSOLE 3D (FASE 2 — BACKEND / CLI)
    // =========================================================
    const buildTerminal = () => {
      const v: { x: number; y: number; z: number }[] = [];
      const edges: [number, number, string][] = [];
      let idx = 0;

      const addLine3D = (
        x1: number,
        y1: number,
        z1: number,
        x2: number,
        y2: number,
        z2: number,
        color: string,
      ) => {
        v.push({ x: x1, y: y1, z: z1 });
        v.push({ x: x2, y: y2, z: z2 });
        edges.push([idx, idx + 1, color]);
        idx += 2;
      };

      const d = 20; // depth
      const cyan = "0, 243, 255";
      const blue = "59, 130, 246";
      const purple = "123, 44, 191";

      // Outer frame — front
      addLine3D(-120, -80, d, 120, -80, d, cyan);
      addLine3D(120, -80, d, 120, 80, d, cyan);
      addLine3D(120, 80, d, -120, 80, d, cyan);
      addLine3D(-120, 80, d, -120, -80, d, cyan);
      // Outer frame — back
      addLine3D(-120, -80, -d, 120, -80, -d, cyan);
      addLine3D(120, -80, -d, 120, 80, -d, cyan);
      addLine3D(120, 80, -d, -120, 80, -d, cyan);
      addLine3D(-120, 80, -d, -120, -80, -d, cyan);
      // Connecting front-back corners
      addLine3D(-120, -80, d, -120, -80, -d, cyan);
      addLine3D(120, -80, d, 120, -80, -d, cyan);
      addLine3D(120, 80, d, 120, 80, -d, cyan);
      addLine3D(-120, 80, d, -120, 80, -d, cyan);

      // Title bar
      addLine3D(-120, -55, d, 120, -55, d, blue);
      addLine3D(-120, -55, -d, 120, -55, -d, blue);

      // Title bar dots (three circles approximated by short lines)
      addLine3D(-105, -68, d, -100, -68, d, purple);
      addLine3D(-92, -68, d, -87, -68, d, cyan);
      addLine3D(-79, -68, d, -74, -68, d, blue);

      // Text lines inside terminal (prompt lines)
      addLine3D(-100, -35, d, -80, -35, d, purple); // $ prompt
      addLine3D(-75, -35, d, 30, -35, d, cyan); // command
      addLine3D(-100, -10, d, 60, -10, d, blue); // output line 1
      addLine3D(-100, 15, d, 20, 15, d, blue); // output line 2
      addLine3D(-100, 40, d, -80, 40, d, purple); // $ prompt 2
      addLine3D(-75, 40, d, 50, 40, d, cyan); // command 2
      addLine3D(-100, 65, d, 80, 65, d, blue); // output line 3

      return { v, edges };
    };

    const terminalDef = buildTerminal();

    // =========================================================
    // PARTÍCULAS (AMBAS AS FASES)
    // =========================================================
    interface Particle {
      baseX: number;
      baseY: number;
      baseZ: number;
      orbitRadius: number;
      orbitSpeed: number;
      pulseSpeed: number;
      baseSize: number;
      color: string;
      phaseOffset: number;
      movePattern: number; // 0=circular, 1=figure-8, 2=wave, 3=spiral
    }

    const createParticles = (
      count: number,
      spread: number,
      colors: string[],
    ): Particle[] => {
      const particles: Particle[] = [];
      for (let i = 0; i < count; i++) {
        particles.push({
          baseX: (Math.random() - 0.5) * spread,
          baseY: (Math.random() - 0.5) * spread,
          baseZ: (Math.random() - 0.5) * 200,
          orbitRadius: 15 + Math.random() * 40,
          orbitSpeed: 0.001 + Math.random() * 0.003,
          pulseSpeed: 0.002 + Math.random() * 0.004,
          baseSize: 1.5 + Math.random() * 2.5,
          color: colors[Math.floor(Math.random() * colors.length)],
          phaseOffset: Math.random() * Math.PI * 2,
          movePattern: Math.floor(Math.random() * 4),
        });
      }
      return particles;
    };

    const phase1Particles = createParticles(10, 500, [
      "0, 243, 255",
      "123, 44, 191",
      "59, 130, 246",
    ]);
    const phase2Particles = createParticles(10, 450, [
      "0, 243, 255",
      "123, 44, 191",
      "59, 130, 246",
    ]);

    const projectParticle = (
      p: Particle,
      scroll: number,
      centerX: number,
      centerY: number,
      fl: number,
    ) => {
      const t = scroll * p.orbitSpeed + p.phaseOffset;
      let dx = 0,
        dy = 0,
        dz = 0;

      switch (p.movePattern) {
        case 0: // circular orbit
          dx = Math.cos(t) * p.orbitRadius;
          dy = Math.sin(t) * p.orbitRadius;
          dz = Math.sin(t * 0.7) * 30;
          break;
        case 1: // figure-8
          dx = Math.sin(t) * p.orbitRadius;
          dy = Math.sin(t * 2) * p.orbitRadius * 0.5;
          dz = Math.cos(t * 0.5) * 40;
          break;
        case 2: // wave drift
          dx = ((t * 0.3) % (p.orbitRadius * 4)) - p.orbitRadius * 2;
          dy = Math.sin(t * 1.5) * p.orbitRadius * 0.8;
          dz = Math.cos(t * 0.8) * 25;
          break;
        case 3: // spiral
          const spiralR = p.orbitRadius * (0.5 + 0.5 * Math.sin(t * 0.3));
          dx = Math.cos(t) * spiralR;
          dy = Math.sin(t) * spiralR;
          dz = Math.sin(t * 1.2) * 50;
          break;
      }

      const x = p.baseX + dx;
      const y = p.baseY + dy;
      const z = p.baseZ + dz + fl + 300;
      const clampedZ = Math.max(z, 1);
      const scale = fl / clampedZ;
      const size =
        p.baseSize *
        (0.6 + 0.4 * Math.sin(scroll * p.pulseSpeed + p.phaseOffset));

      return {
        sx: centerX + x * scale,
        sy: centerY + y * scale,
        size: size * scale,
        z: clampedZ,
      };
    };

    const renderParticles = (
      particles: Particle[],
      scroll: number,
      centerX: number,
      centerY: number,
      fl: number,
      alpha: number,
    ) => {
      for (const p of particles) {
        const proj = projectParticle(p, scroll, centerX, centerY, fl);
        const pAlpha =
          Math.max(0.1, Math.min(0.7, 1 - (proj.z - fl) / 1200)) * alpha;

        // Glow
        ctx.fillStyle = `rgba(${p.color}, ${pAlpha * 0.3})`;
        ctx.beginPath();
        ctx.arc(proj.sx, proj.sy, proj.size * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = `rgba(${p.color}, ${pAlpha})`;
        ctx.beginPath();
        ctx.arc(proj.sx, proj.sy, proj.size, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    let currentScroll = window.scrollY;

    const render = () => {
      currentScroll += (window.scrollY - currentScroll) * 0.08;
      ctx.clearRect(0, 0, width, height);

      const maxScroll = Math.max(
        1,
        document.body.scrollHeight - window.innerHeight,
      );
      const progress = currentScroll / maxScroll;

      const baseFocalLength = 800;
      const focalLength =
        baseFocalLength + Math.sin(currentScroll * 0.0015) * 400;

      // FASE 1: PAINÉIS DE CÓDIGO (0% a 45% do scroll)
      let alpha1 =
        progress < 0.35 ? 1 : Math.max(0, 1 - (progress - 0.35) * 10);

      if (alpha1 > 0) {
        let panX1 = progress < 0.3 ? 0 : -(progress - 0.3) * width * 4;

        const centerX1 =
          width / 2 + Math.sin(currentScroll * 0.001) * (width * 0.35) + panX1;
        const centerY1 =
          height / 2 + Math.cos(currentScroll * 0.0012) * (height * 0.25);

        const rotX1 =
          Math.sin(currentScroll * 0.0008) * 0.5 + currentScroll * 0.001;
        const rotY1 = currentScroll * 0.0015;
        const rotZ1 = Math.cos(currentScroll * 0.0005) * 0.3;

        panels.forEach((panel) => {
          const projected = [];
          for (let i = 0; i < panelDef.v.length; i++) {
            let { x, y } = panelDef.v[i];
            let z = panel.zOffset + Math.sin(currentScroll * 0.002) * 100;

            let x1 = x * Math.cos(rotZ1) - y * Math.sin(rotZ1);
            let y1 = x * Math.sin(rotZ1) + y * Math.cos(rotZ1);
            let y2 = y1 * Math.cos(rotX1) - z * Math.sin(rotX1);
            let z1 = y1 * Math.sin(rotX1) + z * Math.cos(rotX1);
            let x2 = x1 * Math.cos(rotY1) + z1 * Math.sin(rotY1);
            let z2 = -x1 * Math.sin(rotY1) + z1 * Math.cos(rotY1);

            z2 += focalLength + 200;
            if (z2 < 1) z2 = 1;

            const scale = focalLength / z2;
            projected.push({
              x: centerX1 + x2 * scale,
              y: centerY1 + y2 * scale,
              z: z2,
              scale: scale,
            });
          }

          ctx.lineWidth = 2;
          ctx.lineCap = "round";
          for (let i = 0; i < panelDef.edges.length; i++) {
            const p1 = projected[panelDef.edges[i][0]];
            const p2 = projected[panelDef.edges[i][1]];
            const avgZ = (p1.z + p2.z) / 2;
            const lineAlpha =
              Math.max(0.05, Math.min(0.6, 1 - (avgZ - focalLength) / 1000)) *
              alpha1;
            ctx.strokeStyle = `rgba(${panel.color}, ${lineAlpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }

          for (let i = 0; i < 4; i++) {
            const p = projected[i];
            const pointAlpha =
              Math.max(0.1, Math.min(0.8, 1 - (p.z - focalLength) / 1000)) *
              alpha1;
            ctx.fillStyle = `rgba(255, 255, 255, ${pointAlpha})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.scale * 3, 0, Math.PI * 2);
            ctx.fill();
          }
        });

        // --- ENGRENAGEM 3D (Fase 1) ---
        const gearScale = 0.9 + 0.3 * Math.sin(currentScroll * 0.003); // zoom pulsante
        const gearCenterX =
          width * 0.78 +
          Math.cos(currentScroll * 0.0015) * (width * 0.12) +
          panX1 * -0.5;
        const gearCenterY =
          height * 0.35 + Math.sin(currentScroll * 0.002) * (height * 0.15);
        const gearRotX = Math.sin(currentScroll * 0.001) * 0.6;
        const gearRotY = currentScroll * 0.001;
        const gearRotZ = currentScroll * 0.004; // fast spin

        const gearProjected = [];
        for (let i = 0; i < gearDef.v.length; i++) {
          let { x, y, z } = gearDef.v[i];
          x *= gearScale;
          y *= gearScale;
          z *= gearScale;

          let x1 = x * Math.cos(gearRotZ) - y * Math.sin(gearRotZ);
          let y1 = x * Math.sin(gearRotZ) + y * Math.cos(gearRotZ);
          let y2 = y1 * Math.cos(gearRotX) - z * Math.sin(gearRotX);
          let z1 = y1 * Math.sin(gearRotX) + z * Math.cos(gearRotX);
          let x2 = x1 * Math.cos(gearRotY) + z1 * Math.sin(gearRotY);
          let z2 = -x1 * Math.sin(gearRotY) + z1 * Math.cos(gearRotY);

          z2 += focalLength + 250;
          if (z2 < 1) z2 = 1;
          const scale = focalLength / z2;
          gearProjected.push({
            x: gearCenterX + x2 * scale,
            y: gearCenterY + y2 * scale,
            z: z2,
            scale,
          });
        }

        ctx.lineWidth = 1.5;
        for (const [a, b] of gearDef.edges) {
          const p1 = gearProjected[a];
          const p2 = gearProjected[b];
          const avgZ = (p1.z + p2.z) / 2;
          const lineAlpha =
            Math.max(0.05, Math.min(0.6, 1 - (avgZ - focalLength) / 1000)) *
            alpha1;
          ctx.strokeStyle = `rgba(123, 44, 191, ${lineAlpha})`;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }

        // Partículas Fase 1
        renderParticles(
          phase1Particles,
          currentScroll,
          centerX1,
          centerY1,
          focalLength,
          alpha1,
        );
      }

      // FASE 2: SÍMBOLO DE CÓDIGO E INFRAESTRUTURA (35% a 100% do scroll)
      let alpha2 = progress < 0.35 ? 0 : Math.min(1, (progress - 0.35) * 8);

      if (alpha2 > 0) {
        let panX2 = progress < 0.45 ? (0.45 - progress) * width * 4 : 0;

        const centerX2 =
          width / 2 + Math.cos(currentScroll * 0.001) * (width * 0.2) + panX2;
        const centerY2 =
          height / 2 + Math.sin(currentScroll * 0.0012) * (height * 0.2);

        const rotX2 = currentScroll * 0.001;
        const rotY2 = -currentScroll * 0.002;
        const rotZ2 = currentScroll * 0.0005;

        const projected = [];
        for (let i = 0; i < codeSymbolDef.v.length; i++) {
          let { x, y, z, color } = codeSymbolDef.v[i];

          if (i >= 32) {
            y += Math.sin(currentScroll * 0.005 + i) * 20;
          }

          let x1 = x * Math.cos(rotZ2) - y * Math.sin(rotZ2);
          let y1 = x * Math.sin(rotZ2) + y * Math.cos(rotZ2);
          let y2 = y1 * Math.cos(rotX2) - z * Math.sin(rotX2);
          let z1 = y1 * Math.sin(rotX2) + z * Math.cos(rotX2);
          let x2 = x1 * Math.cos(rotY2) + z1 * Math.sin(rotY2);
          let z2 = -x1 * Math.sin(rotY2) + z1 * Math.cos(rotY2);

          z2 += focalLength + 300;
          if (z2 < 1) z2 = 1;

          const scale = focalLength / z2;
          projected.push({
            x: centerX2 + x2 * scale,
            y: centerY2 + y2 * scale,
            z: z2,
            scale: scale,
            color,
          });
        }

        ctx.lineWidth = 1.5;
        for (let i = 0; i < codeSymbolDef.edges.length; i++) {
          const p1 = projected[codeSymbolDef.edges[i][0]];
          const p2 = projected[codeSymbolDef.edges[i][1]];
          const edgeColor = codeSymbolDef.edges[i][2];

          const avgZ = (p1.z + p2.z) / 2;
          const lineAlpha =
            Math.max(0.05, Math.min(0.8, 1 - (avgZ - focalLength) / 1200)) *
            alpha2;

          ctx.strokeStyle = `rgba(${edgeColor}, ${lineAlpha})`;
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        }

        for (let i = 0; i < projected.length; i++) {
          const p = projected[i];
          const pointAlpha =
            Math.max(0.1, Math.min(0.9, 1 - (p.z - focalLength) / 1200)) *
            alpha2;

          ctx.fillStyle = `rgba(255, 255, 255, ${pointAlpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.scale * (i >= 32 ? 2 : 3), 0, Math.PI * 2);
          ctx.fill();
        }

        // --- TERMINAL 3D (Fase 2) ---
        const termProgress = Math.min(1, Math.max(0, (progress - 0.4) * 5));
        const termAlpha = alpha2 * termProgress;
        if (termAlpha > 0) {
          const termScale =
            0.7 + termProgress * 0.4 + Math.sin(currentScroll * 0.002) * 0.1; // zoom in gradual
          const termCenterX =
            width * 0.25 + Math.sin(currentScroll * 0.0008) * (width * 0.08);
          const termCenterY =
            height * 0.6 + Math.cos(currentScroll * 0.0015) * (height * 0.1); // vertical float
          const termRotX = Math.sin(currentScroll * 0.0006) * 0.3;
          const termRotY = currentScroll * 0.0008;
          const termRotZ = Math.cos(currentScroll * 0.0003) * 0.15;

          const termProjected: {
            x: number;
            y: number;
            z: number;
            scale: number;
            color: string;
          }[] = [];
          for (let i = 0; i < terminalDef.v.length; i++) {
            let { x, y, z } = terminalDef.v[i];
            x *= termScale;
            y *= termScale;
            z *= termScale;

            let x1 = x * Math.cos(termRotZ) - y * Math.sin(termRotZ);
            let y1 = x * Math.sin(termRotZ) + y * Math.cos(termRotZ);
            let y2 = y1 * Math.cos(termRotX) - z * Math.sin(termRotX);
            let z1 = y1 * Math.sin(termRotX) + z * Math.cos(termRotX);
            let x2 = x1 * Math.cos(termRotY) + z1 * Math.sin(termRotY);
            let z2 = -x1 * Math.sin(termRotY) + z1 * Math.cos(termRotY);

            z2 += focalLength + 350;
            if (z2 < 1) z2 = 1;
            const scale = focalLength / z2;
            termProjected.push({
              x: termCenterX + x2 * scale,
              y: termCenterY + y2 * scale,
              z: z2,
              scale,
              color: "",
            });
          }

          ctx.lineWidth = 1.5;
          for (let i = 0; i < terminalDef.edges.length; i++) {
            const [a, b, color] = terminalDef.edges[i];
            const p1 = termProjected[a];
            const p2 = termProjected[b];
            const avgZ = (p1.z + p2.z) / 2;
            const lineAlpha =
              Math.max(0.05, Math.min(0.7, 1 - (avgZ - focalLength) / 1200)) *
              termAlpha;
            ctx.strokeStyle = `rgba(${color}, ${lineAlpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        // Partículas Fase 2
        renderParticles(
          phase2Particles,
          currentScroll,
          centerX2,
          centerY2,
          focalLength,
          alpha2,
        );
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full mix-blend-screen pointer-events-none z-[0] opacity-70"
    />
  );
};

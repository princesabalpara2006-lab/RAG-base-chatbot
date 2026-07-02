import React, { useEffect, useRef } from 'react';

/**
 * NeuralBackground — Animated neural network visualization:
 * - Central glowing brain/sphere node
 * - Orbiting satellite nodes with pulsing connections
 * - Particle data streams flowing along edges
 * - Mouse-interactive (nodes react to cursor)
 * - Teal/cyan + purple color palette
 */
export default function MatrixBackground() {
  const canvasRef = useRef(null);
  const mouseRef  = useRef({ x: -9999, y: -9999 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let rafId;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const onMove = e => { mouseRef.current.x = e.clientX; mouseRef.current.y = e.clientY; };
    const onLeave = () => { mouseRef.current.x = -9999; mouseRef.current.y = -9999; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);

    // ── Helpers ───────────────────────────────────────────────
    const rnd    = (min, max) => min + Math.random() * (max - min);
    const dist   = (a, b)    => Math.hypot(a.x - b.x, a.y - b.y);
    const lerp   = (a, b, t) => a + (b - a) * t;

    // ── Color palette ─────────────────────────────────────────
    const TEAL   = { r:  0, g: 200, b: 200 };
    const CYAN   = { r:  6, g: 182, b: 212 };
    const PURPLE = { r:139, g:  92, b: 246 };
    const WHITE  = { r:200, g: 230, b: 255 };

    const rgba = ({ r, g, b }, a) => `rgba(${r},${g},${b},${a})`;
    const mixColor = (c1, c2, t) => ({
      r: lerp(c1.r, c2.r, t),
      g: lerp(c1.g, c2.g, t),
      b: lerp(c1.b, c2.b, t),
    });

    // ── Stars (deep-space backdrop) ───────────────────────────
    const STARS = Array.from({ length: 220 }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: rnd(0.2, 1.1),
      a: rnd(0.1, 0.55),
      speed: rnd(0.002, 0.009),
      phase: rnd(0, Math.PI * 2),
    }));

    // ── Neural nodes ──────────────────────────────────────────
    const W = () => canvas.width;
    const H = () => canvas.height;

    // Central "brain" node
    const CENTER = { x: 0, y: 0, r: 0 }; // updated each frame

    // Build ring nodes around center
    const buildNodes = () => {
      const w = canvas.width, h = canvas.height;
      const cx = w / 2, cy = h / 2;
      CENTER.x = cx; CENTER.y = cy; CENTER.r = Math.min(w, h) * 0.065;

      const rings = [
        { count: 8,  radius: Math.min(w, h) * 0.22, nodeR: rnd(5, 9) },
        { count: 13, radius: Math.min(w, h) * 0.38, nodeR: rnd(3, 6) },
        { count: 7,  radius: Math.min(w, h) * 0.50, nodeR: rnd(2, 4) },
      ];

      const nodes = [];
      rings.forEach((ring, ri) => {
        for (let i = 0; i < ring.count; i++) {
          const angle  = (i / ring.count) * Math.PI * 2 + ri * 0.4;
          const jitter = rnd(-ring.radius * 0.12, ring.radius * 0.12);
          nodes.push({
            bx: cx + Math.cos(angle) * (ring.radius + jitter),
            by: cy + Math.sin(angle) * (ring.radius + jitter),
            x:  cx + Math.cos(angle) * (ring.radius + jitter),
            y:  cy + Math.sin(angle) * (ring.radius + jitter),
            vx: 0, vy: 0,
            r:  rnd(3.5, ring.nodeR),
            ring: ri,
            angle,
            orbitR:  ring.radius + jitter,
            orbitSpeed: rnd(0.0003, 0.0008) * (Math.random() > 0.5 ? 1 : -1),
            orbitPhase: angle,
            pulsePhase: rnd(0, Math.PI * 2),
            pulseSpeed: rnd(0.03, 0.07),
            color: Math.random() > 0.3 ? TEAL : PURPLE,
            active: false,
          });
        }
      });
      return nodes;
    };

    let nodes = buildNodes();

    // Edges: each node connects to center + 2-3 nearest neighbors
    const buildEdges = () => {
      const edges = [];
      // Center to all
      nodes.forEach(n => edges.push({ a: null, b: n, centerToNode: true }));
      // Node to node (nearest in same or adjacent ring)
      nodes.forEach((n, i) => {
        const sorted = nodes
          .map((m, j) => ({ m, j, d: dist(n, m) }))
          .filter(x => x.j !== i)
          .sort((a, b) => a.d - b.d);
        sorted.slice(0, 2).forEach(({ m }) => {
          // avoid duplicate
          if (!edges.find(e => (e.a === n && e.b === m) || (e.a === m && e.b === n))) {
            edges.push({ a: n, b: m, centerToNode: false });
          }
        });
      });
      return edges;
    };
    let edges = buildEdges();

    // Particles traveling along edges
    const PARTICLES = [];
    const spawnParticle = (edge) => {
      const t = Math.random();
      PARTICLES.push({
        edge,
        t,
        speed: rnd(0.003, 0.008),
        alpha: rnd(0.6, 1.0),
        r: rnd(1.2, 2.5),
        color: Math.random() > 0.5 ? CYAN : PURPLE,
        dir: Math.random() > 0.5 ? 1 : -1,
      });
    };

    // Pre-seed particles
    edges.forEach(e => {
      const count = e.centerToNode ? 2 : 1;
      for (let i = 0; i < count; i++) spawnParticle(e);
    });

    // Randomly spawn new ones
    const maybeSpawn = () => {
      if (PARTICLES.length < 200 && Math.random() < 0.15) {
        spawnParticle(edges[Math.floor(Math.random() * edges.length)]);
      }
    };

    // ── Central sphere rings (orbit decorations) ──────────────
    const ORBIT_RINGS = [
      { rx: 0.9, ry: 0.35, rot: 0.4,  speed: 0.008,  alpha: 0.12, color: TEAL },
      { rx: 0.7, ry: 0.45, rot: -0.6, speed: -0.005, alpha: 0.09, color: PURPLE },
      { rx: 0.5, ry: 0.28, rot: 1.1,  speed: 0.012,  alpha: 0.08, color: CYAN },
    ];
    let orbitT = 0;

    // ── Resize rebuild ────────────────────────────────────────
    const handleResize = () => {
      resize();
      nodes = buildNodes();
      edges = buildEdges();
    };
    window.removeEventListener('resize', resize);
    window.addEventListener('resize', handleResize);

    // ── Draw loop ─────────────────────────────────────────────
    let t = 0;
    const draw = () => {
      const W = canvas.width, H = canvas.height;
      const mx = mouseRef.current.x, my = mouseRef.current.y;
      const cx = W / 2, cy = H / 2;
      CENTER.x = cx; CENTER.y = cy;
      CENTER.r = Math.min(W, H) * 0.065;

      // 1. Background
      ctx.fillStyle = '#030d12';
      ctx.fillRect(0, 0, W, H);

      // Teal radial glow behind center
      const bg1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(W,H) * 0.55);
      bg1.addColorStop(0, 'rgba(0,180,180,0.08)');
      bg1.addColorStop(0.5,'rgba(0,100,130,0.04)');
      bg1.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bg1;
      ctx.fillRect(0, 0, W, H);

      // Top-left purple glow
      const bg2 = ctx.createRadialGradient(W*0.1, H*0.1, 0, W*0.1, H*0.1, W*0.45);
      bg2.addColorStop(0, 'rgba(139,92,246,0.07)');
      bg2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bg2;
      ctx.fillRect(0, 0, W, H);

      // Bottom-right teal glow
      const bg3 = ctx.createRadialGradient(W*0.9, H*0.9, 0, W*0.9, H*0.9, W*0.4);
      bg3.addColorStop(0, 'rgba(6,182,212,0.06)');
      bg3.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bg3;
      ctx.fillRect(0, 0, W, H);

      // 2. Stars
      STARS.forEach(s => {
        const a = s.a * (0.7 + 0.3 * Math.sin(t * s.speed + s.phase));
        ctx.beginPath();
        ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180,220,255,${a})`;
        ctx.fill();
      });

      // 3. Update node orbit positions
      nodes.forEach(n => {
        n.orbitPhase += n.orbitSpeed;
        n.x = cx + Math.cos(n.orbitPhase) * n.orbitR;
        n.y = cy + Math.sin(n.orbitPhase) * n.orbitR;
        n.pulsePhase += n.pulseSpeed;

        // Mouse attraction
        const d = Math.hypot(mx - n.x, my - n.y);
        if (d < 120) {
          n.active = true;
          const force = (120 - d) / 120;
          n.x += (mx - n.x) * force * 0.08;
          n.y += (my - n.y) * force * 0.08;
        } else {
          n.active = false;
        }
      });

      // 4. Draw edges (connection lines)
      edges.forEach(edge => {
        const ax = edge.centerToNode ? cx : edge.a.x;
        const ay = edge.centerToNode ? cy : edge.a.y;
        const bx = edge.b.x, by = edge.b.y;
        const d = Math.hypot(bx - ax, by - ay);
        const maxDist = 350;
        if (d > maxDist) return;

        const alpha = (1 - d / maxDist) * 0.18;
        const col = edge.centerToNode ? TEAL : mixColor(TEAL, PURPLE, 0.4);

        const grad = ctx.createLinearGradient(ax, ay, bx, by);
        grad.addColorStop(0, rgba(col, alpha * 1.5));
        grad.addColorStop(0.5, rgba(col, alpha * 0.8));
        grad.addColorStop(1, rgba(col, alpha * 1.5));

        ctx.strokeStyle = grad;
        ctx.lineWidth = edge.centerToNode ? 0.7 : 0.5;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
      });

      // 5. Update & draw particles
      maybeSpawn();
      for (let i = PARTICLES.length - 1; i >= 0; i--) {
        const p = PARTICLES[i];
        p.t += p.speed * p.dir;

        const clamp = p.t < 0 || p.t > 1;
        if (clamp) {
          p.dir *= -1;
          p.t = Math.max(0, Math.min(1, p.t));
        }

        // Position along edge
        const ax = p.edge.centerToNode ? cx : p.edge.a.x;
        const ay = p.edge.centerToNode ? cy : p.edge.a.y;
        const bx = p.edge.b.x, by = p.edge.b.y;
        const px = lerp(ax, bx, p.t);
        const py = lerp(ay, by, p.t);

        const d = Math.hypot(bx - ax, by - ay);
        if (d > 360) continue;

        // Glow
        const grd = ctx.createRadialGradient(px, py, 0, px, py, p.r * 4);
        grd.addColorStop(0, rgba(p.color, p.alpha * 0.9));
        grd.addColorStop(1, rgba(p.color, 0));
        ctx.fillStyle = grd;
        ctx.fillRect(px - p.r*4, py - p.r*4, p.r*8, p.r*8);

        // Core dot
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fillStyle = rgba(WHITE, p.alpha * 0.85);
        ctx.fill();
      }

      // 6. Draw satellite nodes
      nodes.forEach(n => {
        const pulse = 0.7 + 0.3 * Math.sin(n.pulsePhase);
        const r = n.r * (n.active ? 1.6 : 1) * pulse;
        const col = n.active ? CYAN : n.color;

        // Outer glow
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 5);
        grd.addColorStop(0, rgba(col, 0.3));
        grd.addColorStop(0.4, rgba(col, 0.12));
        grd.addColorStop(1, rgba(col, 0));
        ctx.fillStyle = grd;
        ctx.fillRect(n.x - r*5, n.y - r*5, r*10, r*10);

        // Inner glow ring
        ctx.strokeStyle = rgba(col, 0.5 * pulse);
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 2.2, 0, Math.PI * 2);
        ctx.stroke();

        // Core
        const core = ctx.createRadialGradient(n.x - r*0.3, n.y - r*0.3, 0, n.x, n.y, r);
        core.addColorStop(0, rgba(WHITE, 0.95));
        core.addColorStop(0.4, rgba(col, 0.9));
        core.addColorStop(1, rgba(col, 0.5));
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fillStyle = core;
        ctx.fill();
      });

      // 7. Central sphere (the "brain" node)
      {
        const R  = CENTER.r;
        const cx2 = cx, cy2 = cy;
        const pulse = 0.95 + 0.05 * Math.sin(t * 0.04);
        const R2 = R * pulse;

        // Far outer halo
        const halo1 = ctx.createRadialGradient(cx2, cy2, 0, cx2, cy2, R2 * 5.5);
        halo1.addColorStop(0, 'rgba(0,220,220,0.12)');
        halo1.addColorStop(0.4, 'rgba(0,180,200,0.06)');
        halo1.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = halo1;
        ctx.fillRect(cx2 - R2*6, cy2 - R2*6, R2*12, R2*12);

        // Mid glow
        const halo2 = ctx.createRadialGradient(cx2, cy2, R2*0.2, cx2, cy2, R2*2.8);
        halo2.addColorStop(0, 'rgba(139,92,246,0.35)');
        halo2.addColorStop(0.5, 'rgba(0,200,200,0.18)');
        halo2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = halo2;
        ctx.beginPath();
        ctx.arc(cx2, cy2, R2*2.8, 0, Math.PI*2);
        ctx.fill();

        // Ring accents (orbiting decoration rings)
        orbitT += 0.01;
        ORBIT_RINGS.forEach(ring => {
          const angle = orbitT * ring.speed * 100;
          ctx.save();
          ctx.translate(cx2, cy2);
          ctx.rotate(ring.rot + angle);
          ctx.scale(1, ring.ry / ring.rx);
          ctx.strokeStyle = rgba(ring.color, ring.alpha);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(0, 0, R2 * ring.rx * 2.2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        });

        // Main sphere body
        const sphere = ctx.createRadialGradient(
          cx2 - R2*0.3, cy2 - R2*0.35, R2*0.05,
          cx2, cy2, R2
        );
        sphere.addColorStop(0, 'rgba(180,255,255,0.95)');
        sphere.addColorStop(0.2, 'rgba(0,220,220,0.85)');
        sphere.addColorStop(0.55, 'rgba(0,140,180,0.75)');
        sphere.addColorStop(0.85, 'rgba(20,0,80,0.8)');
        sphere.addColorStop(1, 'rgba(10,0,50,0.9)');
        ctx.beginPath();
        ctx.arc(cx2, cy2, R2, 0, Math.PI*2);
        ctx.fillStyle = sphere;
        ctx.fill();

        // Surface shimmer dots
        for (let i = 0; i < 28; i++) {
          const a  = (i / 28) * Math.PI * 2 + t * 0.008;
          const sr = R2 * (0.4 + 0.55 * Math.random());
          const sx = cx2 + Math.cos(a) * sr * (0.7 + 0.3 * Math.sin(t*0.02 + i));
          const sy = cy2 + Math.sin(a) * sr * 0.9;
          ctx.beginPath();
          ctx.arc(sx, sy, rnd(0.5, 1.5), 0, Math.PI*2);
          ctx.fillStyle = `rgba(150,255,255,${rnd(0.15,0.45)})`;
          ctx.fill();
        }

        // Purple inner nebula
        const inner = ctx.createRadialGradient(cx2 + R2*0.1, cy2 + R2*0.1, 0, cx2, cy2, R2*0.7);
        inner.addColorStop(0, 'rgba(139,92,246,0.5)');
        inner.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(cx2, cy2, R2, 0, Math.PI*2);
        ctx.fillStyle = inner;
        ctx.fill();

        // Specular highlight
        const spec = ctx.createRadialGradient(cx2 - R2*0.3, cy2 - R2*0.35, 0, cx2 - R2*0.2, cy2 - R2*0.25, R2*0.55);
        spec.addColorStop(0, 'rgba(255,255,255,0.55)');
        spec.addColorStop(0.5, 'rgba(200,255,255,0.12)');
        spec.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(cx2, cy2, R2, 0, Math.PI*2);
        ctx.fillStyle = spec;
        ctx.fill();

        // Crisp rim
        ctx.strokeStyle = 'rgba(0,240,240,0.35)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(cx2, cy2, R2, 0, Math.PI*2);
        ctx.stroke();

        // Shadow/ground reflection
        ctx.save();
        ctx.scale(1, 0.25);
        const shadow = ctx.createRadialGradient(cx2, (cy2 + R2*1.35)*4, 0, cx2, (cy2 + R2*1.35)*4, R2*1.8);
        shadow.addColorStop(0, 'rgba(0,200,200,0.18)');
        shadow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = shadow;
        ctx.beginPath();
        ctx.arc(cx2, (cy2 + R2*1.35)*4, R2*1.8, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      }

      // 8. Mouse cursor connection beam
      if (mx > 0) {
        const closest = nodes.reduce((best, n) =>
          dist({ x: mx, y: my }, n) < dist({ x: mx, y: my }, best) ? n : best, nodes[0]);
        const d = dist({ x: mx, y: my }, closest);
        if (d < 180) {
          const a = (1 - d/180) * 0.4;
          const beam = ctx.createLinearGradient(mx, my, closest.x, closest.y);
          beam.addColorStop(0, `rgba(255,255,255,${a})`);
          beam.addColorStop(1, rgba(TEAL, a*0.5));
          ctx.strokeStyle = beam;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(mx, my);
          ctx.lineTo(closest.x, closest.y);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(mx, my, 3, 0, Math.PI*2);
          ctx.fillStyle = `rgba(255,255,255,${a*2})`;
          ctx.fill();
        }
      }

      t++;
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: -20,
        pointerEvents: 'none',
      }}
    />
  );
}

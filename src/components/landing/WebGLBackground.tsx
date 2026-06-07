"use client";

import { useEffect, useRef } from "react";

export function WebGLBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let rafId: number;
    let disposed = false;
    const cleanup = { fn: () => {} };

    (async () => {
      const THREE = await import("three");
      if (disposed) return;

      const W = canvas.offsetWidth || window.innerWidth;
      const H = canvas.offsetHeight || window.innerHeight;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(55, W / H, 1, 2000);
      camera.position.z = 380;

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(W, H);
      renderer.setClearColor(0x000000, 0);

      // ── Particles ──────────────────────────────────────────────────────────
      const N = 150;
      const pos = new Float32Array(N * 3);
      const vel = Array.from({ length: N }, () => ({
        x: (Math.random() - 0.5) * 0.13,
        y: (Math.random() - 0.5) * 0.13,
      }));

      for (let i = 0; i < N; i++) {
        pos[i * 3]     = (Math.random() - 0.5) * 620;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 480;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 80;
      }

      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const pMat = new THREE.PointsMaterial({
        color: 0xC9A855, size: 2.3, transparent: true, opacity: 0.68,
        sizeAttenuation: true, depthWrite: false,
      });
      scene.add(new THREE.Points(pGeo, pMat));

      // ── Connection lines ───────────────────────────────────────────────────
      const lPos = new Float32Array(N * N * 6);
      const lGeo = new THREE.BufferGeometry();
      lGeo.setAttribute("position", new THREE.BufferAttribute(lPos, 3));
      const lMat = new THREE.LineBasicMaterial({
        color: 0xC9A855, transparent: true, opacity: 0.09, depthWrite: false,
      });
      scene.add(new THREE.LineSegments(lGeo, lMat));

      // ── Mouse parallax ─────────────────────────────────────────────────────
      let tX = 0, tY = 0, cX = 0, cY = 0;
      const onMouse = (e: MouseEvent) => {
        tX =  (e.clientX / window.innerWidth  - 0.5) * 36;
        tY = -(e.clientY / window.innerHeight - 0.5) * 26;
      };
      window.addEventListener("mousemove", onMouse, { passive: true });

      const onResize = () => {
        const nW = canvas.offsetWidth;
        const nH = canvas.offsetHeight;
        camera.aspect = nW / nH;
        camera.updateProjectionMatrix();
        renderer.setSize(nW, nH);
      };
      window.addEventListener("resize", onResize, { passive: true });

      const LINK_DIST_SQ = 88 * 88;

      const tick = () => {
        rafId = requestAnimationFrame(tick);

        // Update particle positions
        for (let i = 0; i < N; i++) {
          pos[i * 3]     += vel[i].x;
          pos[i * 3 + 1] += vel[i].y;
          if (Math.abs(pos[i * 3])     > 310) vel[i].x *= -1;
          if (Math.abs(pos[i * 3 + 1]) > 240) vel[i].y *= -1;
        }
        pGeo.attributes.position.needsUpdate = true;

        // Update connection lines
        let li = 0;
        for (let a = 0; a < N; a++) {
          for (let b = a + 1; b < N; b++) {
            const dx = pos[a * 3] - pos[b * 3];
            const dy = pos[a * 3 + 1] - pos[b * 3 + 1];
            if (dx * dx + dy * dy < LINK_DIST_SQ) {
              lPos[li++] = pos[a*3];   lPos[li++] = pos[a*3+1]; lPos[li++] = pos[a*3+2];
              lPos[li++] = pos[b*3];   lPos[li++] = pos[b*3+1]; lPos[li++] = pos[b*3+2];
            }
          }
        }
        lGeo.attributes.position.needsUpdate = true;
        lGeo.setDrawRange(0, li / 3);

        // Smooth parallax
        cX += (tX - cX) * 0.022;
        cY += (tY - cY) * 0.022;
        camera.position.x = cX;
        camera.position.y = cY;
        camera.lookAt(0, 0, 0);

        renderer.render(scene, camera);
      };

      tick();

      cleanup.fn = () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener("mousemove", onMouse);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
        pGeo.dispose();
        lGeo.dispose();
        pMat.dispose();
        lMat.dispose();
      };
    })();

    return () => {
      disposed = true;
      cleanup.fn();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      aria-hidden
    />
  );
}

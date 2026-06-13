"use client";

import { useEffect, useRef } from "react";

interface Props {
  side?: "left" | "right";
  opacity?: number;
}

export function MeshWave({ side = "right", opacity = 0.45 }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let rafId: number;
    let disposed = false;
    const cleanup = { fn: () => {} };

    (async () => {
      const THREE = await import("three");
      if (disposed) return;

      const W = mount.offsetWidth  || 480;
      const H = mount.offsetHeight || 640;

      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(W, H);
      renderer.setClearColor(0x000000, 0);
      mount.appendChild(renderer.domElement);

      const scene  = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
      camera.position.set(side === "right" ? -1.2 : 1.2, 0, 7);
      camera.lookAt(0, 0, 0);

      // ── Wireframe plane ───────────────────────────────────────────────────
      const geo = new THREE.PlaneGeometry(7, 9, 36, 28);
      geo.rotateX(-Math.PI / 10);

      const mat = new THREE.MeshBasicMaterial({
        color: 0xC9A855,
        wireframe: true,
        transparent: true,
        opacity,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.y = side === "right" ? -0.35 : 0.35;
      scene.add(mesh);

      // Store original Z positions for wave displacement
      const posAttr  = geo.attributes.position;
      const origZ    = new Float32Array(posAttr.count);
      for (let i = 0; i < posAttr.count; i++) origZ[i] = posAttr.getZ(i);

      const onResize = () => {
        const nW = mount.offsetWidth;
        const nH = mount.offsetHeight;
        if (!nW || !nH) return;
        camera.aspect = nW / nH;
        camera.updateProjectionMatrix();
        renderer.setSize(nW, nH);
      };
      window.addEventListener("resize", onResize, { passive: true });

      const t0 = performance.now();

      const tick = () => {
        rafId = requestAnimationFrame(tick);
        const t = (performance.now() - t0) / 1000;

        // Animate vertex Z positions — organic wave
        for (let i = 0; i < posAttr.count; i++) {
          const x = posAttr.getX(i);
          const y = posAttr.getY(i);
          const z = origZ[i]
            + Math.sin(x * 1.1 + t * 0.65) * 0.28
            + Math.sin(y * 0.85 + t * 0.50) * 0.22
            + Math.sin((x + y) * 0.7 + t * 1.0) * 0.15;
          posAttr.setZ(i, z);
        }
        posAttr.needsUpdate = true;

        // Gentle auto-rotation
        mesh.rotation.z = Math.sin(t * 0.18) * 0.06;

        renderer.render(scene, camera);
      };

      tick();

      cleanup.fn = () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
        geo.dispose();
        mat.dispose();
        if (mount.contains(renderer.domElement)) {
          mount.removeChild(renderer.domElement);
        }
      };
    })();

    return () => {
      disposed = true;
      cleanup.fn();
    };
  }, [side, opacity]);

  // Soft mask on the inner edge — the canvas is a rectangular strip, and its
  // raw boundary read as a hard vertical seam splitting the hero (worst on
  // mobile where the strip covers a third of the viewport).
  const fadeTo = side === "right" ? "to left" : "to right";
  return (
    <div
      ref={mountRef}
      className="absolute top-0 bottom-0 pointer-events-none"
      style={{
        width: "min(480px, 85vw)",
        [side]: -140,
        zIndex: 0,
        maskImage: `linear-gradient(${fadeTo}, black 45%, transparent 98%)`,
        WebkitMaskImage: `linear-gradient(${fadeTo}, black 45%, transparent 98%)`,
      }}
      aria-hidden
    />
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import Image from "next/image";

interface Props {
  onComplete: () => void;
}

export function CinematicLoader({ onComplete }: Props) {
  const overlayRef  = useRef<HTMLDivElement>(null);
  const logoRef     = useRef<HTMLDivElement>(null);
  const line1Ref    = useRef<HTMLDivElement>(null);
  const line2Ref    = useRef<HTMLDivElement>(null);
  const barRef      = useRef<HTMLDivElement>(null);
  const barFillRef  = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const tl = gsap.timeline({
      onComplete: () => {
        setVisible(false);
        onComplete();
      },
    });

    // Start everything invisible
    gsap.set([logoRef.current, line1Ref.current, line2Ref.current, barRef.current], {
      opacity: 0, y: 12,
    });
    gsap.set(barFillRef.current, { scaleX: 0, transformOrigin: "left center" });

    tl
      // Logo drops in
      .to(logoRef.current, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" }, 0.2)
      // "TRADEX TERMINAL" text
      .to(line1Ref.current, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, 0.55)
      .to(line2Ref.current, { opacity: 1, y: 0, duration: 0.45, ease: "power3.out" }, 0.72)
      // Progress bar appears
      .to(barRef.current, { opacity: 1, y: 0, duration: 0.3, ease: "power2.out" }, 1.0)
      // Bar fills
      .to(barFillRef.current, { scaleX: 1, duration: 0.9, ease: "power2.inOut" }, 1.1)
      // Overlay wipes up
      .to(overlayRef.current, {
        yPercent: -100,
        duration: 0.75,
        ease: "power4.inOut",
      }, 2.2);

    return () => { tl.kill(); };
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ background: "#050505" }}
    >
      {/* Film grain */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          opacity: 0.045,
          mixBlendMode: "overlay",
        }}
      />

      {/* Vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, rgba(5,5,5,0.85) 100%)",
        }}
      />

      <div className="relative flex flex-col items-center gap-5">
        {/* Logo */}
        <div ref={logoRef}>
          <Image
            src="/logo-transparent.png"
            alt="TradeX"
            width={52}
            height={52}
            style={{ filter: "drop-shadow(0 0 24px rgba(201,168,85,0.5))" }}
          />
        </div>

        {/* Wordmark */}
        <div className="text-center">
          <div
            ref={line1Ref}
            className="font-black tracking-[0.45em] uppercase text-white"
            style={{ fontSize: "clamp(1.4rem, 4vw, 2rem)", letterSpacing: "0.45em" }}
          >
            TradeX
          </div>
          <div
            ref={line2Ref}
            className="font-light tracking-[0.7em] uppercase text-xs mt-1"
            style={{ color: "#C9A855", letterSpacing: "0.7em" }}
          >
            Terminal
          </div>
        </div>

        {/* Progress bar */}
        <div
          ref={barRef}
          className="mt-3 w-32 h-px overflow-hidden"
          style={{ background: "rgba(201,168,85,0.12)" }}
        >
          <div
            ref={barFillRef}
            className="h-full w-full"
            style={{ background: "linear-gradient(90deg, rgba(201,168,85,0.4), #C9A855)" }}
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CinematicLoader } from "./CinematicLoader";
import { CustomCursor } from "./CustomCursor";

function revealHeroFallback() {
  document.querySelectorAll<HTMLElement>(
    "[data-hero-badge],[data-hero-1],[data-hero-2],[data-hero-stat],[data-hero-sub],[data-hero-cta]"
  ).forEach((el) => {
    el.style.opacity = "1";
    el.style.transform = "none";
    el.style.filter = "none";
  });
}

export function CinematicClientLayer() {
  const [loaderDone, setLoaderDone] = useState(false);
  const heroRevealedRef = useRef(false);

  const handleLoaderComplete = useCallback(() => {
    setLoaderDone(true);
  }, []);

  // Safety net: force-reveal hero after 5 s if GSAP never fires
  useEffect(() => {
    if (!loaderDone) return;
    const timer = setTimeout(() => {
      if (!heroRevealedRef.current) {
        revealHeroFallback();
        heroRevealedRef.current = true;
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [loaderDone]);

  useEffect(() => {
    (async () => {
      try {
        const { gsap } = await import("gsap");
        const { ScrollTrigger } = await import("gsap/ScrollTrigger");
        gsap.registerPlugin(ScrollTrigger);

        gsap.set("[data-hero-badge]",  { opacity: 0, y: -12 });
        gsap.set("[data-hero-1]",      { opacity: 0, y: 64, filter: "blur(12px)" });
        gsap.set("[data-hero-2]",      { opacity: 0, y: 64, filter: "blur(12px)" });
        gsap.set("[data-hero-stat]",   { opacity: 0 });
        gsap.set("[data-hero-sub]",    { opacity: 0, y: 22 });
        gsap.set("[data-hero-cta]",    { opacity: 0, y: 18 });

        const Lenis = (await import("lenis")).default;
        const lenis = new Lenis({
          duration: 1.2,
          easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          orientation: "vertical",
          gestureOrientation: "vertical",
          smoothWheel: true,
          wheelMultiplier: 1,
          touchMultiplier: 2,
        });
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add((time: number) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
      } catch {
        // GSAP load failed — hero elements were never hidden so page stays visible
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaderDone) return;

    (async () => {
      try {
        const { gsap } = await import("gsap");
        const { ScrollTrigger } = await import("gsap/ScrollTrigger");

        heroRevealedRef.current = true;

        gsap.timeline({ defaults: { ease: "power3.out" } })
          .to("[data-hero-badge]", { opacity: 1, y: 0, duration: 0.5 }, 0)
          .to("[data-hero-1]",     { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9 }, 0.12)
          .to("[data-hero-2]",     { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9 }, 0.28)
          .to("[data-hero-stat]",  { opacity: 1, duration: 0.5 }, 0.48)
          .to("[data-hero-sub]",   { opacity: 1, y: 0, duration: 0.65 }, 0.54)
          .to("[data-hero-cta]",   { opacity: 1, y: 0, duration: 0.6 }, 0.68);

        gsap.utils.toArray<HTMLElement>("[data-section-head]").forEach((el) => {
          gsap.fromTo(el,
            { opacity: 0, y: 28 },
            {
              opacity: 1, y: 0, duration: 0.75, ease: "power3.out",
              scrollTrigger: { trigger: el, start: "top 88%", once: true },
            }
          );
        });

        gsap.fromTo("[data-stats-bar]",
          { opacity: 0 },
          {
            opacity: 1, duration: 0.6, ease: "power2.out",
            scrollTrigger: { trigger: "[data-stats-bar]", start: "top 92%", once: true },
          }
        );

        gsap.fromTo("[data-preview]",
          { opacity: 0, y: 40 },
          {
            opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
            scrollTrigger: { trigger: "[data-preview]", start: "top 85%", once: true },
          }
        );

        gsap.utils.toArray<HTMLElement>("[data-card]").forEach((el, i) => {
          gsap.fromTo(el,
            { opacity: 0, y: 36 },
            {
              opacity: 1, y: 0, duration: 0.65, ease: "power3.out",
              delay: (i % 3) * 0.08,
              scrollTrigger: { trigger: el, start: "top 90%", once: true },
            }
          );
        });

        gsap.utils.toArray<HTMLElement>("[data-testimonial]").forEach((el, i) => {
          gsap.fromTo(el,
            { opacity: 0, y: 32 },
            {
              opacity: 1, y: 0, duration: 0.7, ease: "power3.out",
              delay: i * 0.1,
              scrollTrigger: { trigger: el, start: "top 88%", once: true },
            }
          );
        });

        gsap.fromTo("[data-cta-block]",
          { opacity: 0, y: 32 },
          {
            opacity: 1, y: 0, duration: 0.85, ease: "power3.out",
            scrollTrigger: { trigger: "[data-cta-block]", start: "top 85%", once: true },
          }
        );
      } catch {
        revealHeroFallback();
        heroRevealedRef.current = true;
      }
    })();
  }, [loaderDone]);

  return (
    <>
      <CinematicLoader onComplete={handleLoaderComplete} />
      <CustomCursor />
    </>
  );
}

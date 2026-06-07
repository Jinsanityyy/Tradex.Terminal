"use client";

import { useEffect, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { CinematicLoader } from "./CinematicLoader";
import { CustomCursor } from "./CustomCursor";

export function CinematicClientLayer() {
  const [loaderDone, setLoaderDone] = useState(false);

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    // Hide hero elements immediately — loader covers them while they wait
    gsap.set("[data-hero-badge]", { opacity: 0, y: -12 });
    gsap.set("[data-hero-1]",     { opacity: 0, y: 64, filter: "blur(12px)" });
    gsap.set("[data-hero-2]",     { opacity: 0, y: 64, filter: "blur(12px)" });
    gsap.set("[data-hero-stat]",  { opacity: 0 });
    gsap.set("[data-hero-sub]",   { opacity: 0, y: 22 });
    gsap.set("[data-hero-cta]",   { opacity: 0, y: 18 });

    // Lenis smooth scroll
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let lenis: any = null;
    (async () => {
      const Lenis = (await import("lenis")).default;
      lenis = new Lenis({
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
    })();

    return () => { lenis?.destroy(); };
  }, []);

  useEffect(() => {
    if (!loaderDone) return;

    // ── Hero entrance (cinematic reveal sequence)
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .to("[data-hero-badge]", { opacity: 1, y: 0, duration: 0.5 }, 0)
      .to("[data-hero-1]",     { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9 }, 0.12)
      .to("[data-hero-2]",     { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.9 }, 0.28)
      .to("[data-hero-stat]",  { opacity: 1, duration: 0.5 }, 0.48)
      .to("[data-hero-sub]",   { opacity: 1, y: 0, duration: 0.65 }, 0.54)
      .to("[data-hero-cta]",   { opacity: 1, y: 0, duration: 0.6 }, 0.68);

    // ── Section headings fade-up on scroll
    gsap.utils.toArray<HTMLElement>("[data-section-head]").forEach((el) => {
      gsap.fromTo(el,
        { opacity: 0, y: 28 },
        {
          opacity: 1, y: 0, duration: 0.75, ease: "power3.out",
          scrollTrigger: { trigger: el, start: "top 88%", once: true },
        }
      );
    });

    // ── Stats bar
    gsap.fromTo("[data-stats-bar]",
      { opacity: 0 },
      {
        opacity: 1, duration: 0.6, ease: "power2.out",
        scrollTrigger: { trigger: "[data-stats-bar]", start: "top 92%", once: true },
      }
    );

    // ── Terminal preview
    gsap.fromTo("[data-preview]",
      { opacity: 0, y: 40 },
      {
        opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: "[data-preview]", start: "top 85%", once: true },
      }
    );

    // ── Cards (features + pricing) — stagger by column position
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

    // ── Testimonials stagger
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

    // ── Bottom CTA
    gsap.fromTo("[data-cta-block]",
      { opacity: 0, y: 32 },
      {
        opacity: 1, y: 0, duration: 0.85, ease: "power3.out",
        scrollTrigger: { trigger: "[data-cta-block]", start: "top 85%", once: true },
      }
    );

  }, [loaderDone]);

  return (
    <>
      <CinematicLoader onComplete={() => setLoaderDone(true)} />
      <CustomCursor />
    </>
  );
}

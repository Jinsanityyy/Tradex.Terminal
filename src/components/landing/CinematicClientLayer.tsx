"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CinematicLoader } from "./CinematicLoader";
import { CustomCursor } from "./CustomCursor";

// ── Fallback: force-show hero content with plain CSS ──────────────────────────
function revealHeroFallback() {
  document.querySelectorAll<HTMLElement>(
    "[data-split-inner],[data-hero-badge],[data-hero-stat],[data-hero-sub],[data-hero-cta],[data-hero-scroll]"
  ).forEach((el) => {
    el.style.transform = "none";
    el.style.opacity   = "1";
    el.style.filter    = "none";
    el.style.clipPath  = "none";
  });
}

export function CinematicClientLayer() {
  const [loaderDone, setLoaderDone] = useState(false);
  const [barsGone, setBarsGone] = useState(false);
  const heroRevealedRef = useRef(false);
  const handleLoaderComplete = useCallback(() => setLoaderDone(true), []);

  // Watchdog: if the loader never completes (slow phone, chunk hiccup),
  // force the page through after 7s so the site is never unreachable.
  useEffect(() => {
    const t = setTimeout(() => setLoaderDone(true), 7000);
    return () => clearTimeout(t);
  }, []);

  // Watchdog: bars must never outlive the reveal by more than 4s
  useEffect(() => {
    if (!loaderDone) return;
    const t = setTimeout(() => setBarsGone(true), 4000);
    return () => clearTimeout(t);
  }, [loaderDone]);

  // Safety net: force-reveal after 5 s if GSAP never fires
  useEffect(() => {
    if (!loaderDone) return;
    const t = setTimeout(() => {
      if (!heroRevealedRef.current) {
        revealHeroFallback();
        heroRevealedRef.current = true;
      }
      setBarsGone(true);
    }, 5000);
    return () => clearTimeout(t);
  }, [loaderDone]);

  // ── Effect 1: GSAP initialisation + pre-hide hero ──────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const { gsap }         = await import("gsap");
        const { ScrollTrigger } = await import("gsap/ScrollTrigger");
        gsap.registerPlugin(ScrollTrigger);

        // Respect prefers-reduced-motion
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced) { revealHeroFallback(); heroRevealedRef.current = true; setBarsGone(true); return; }

        // ── Pre-hide hero elements ──────────────────────────────────────────
        gsap.set("[data-hero-1] [data-split-inner]", { yPercent: 115 });
        gsap.set("[data-hero-2] [data-split-inner]", { yPercent: 115 });
        gsap.set("[data-hero-badge]",  { opacity: 0, y: -14 });
        gsap.set("[data-hero-stat]",   { opacity: 0 });
        gsap.set("[data-hero-sub]",    { opacity: 0, y: 24 });
        gsap.set("[data-hero-cta]",    { opacity: 0, y: 20 });
        gsap.set("[data-hero-scroll]", { opacity: 0 });

        // ── Lenis smooth scroll ─────────────────────────────────────────────
        const Lenis = (await import("lenis")).default;
        const lenis = new Lenis({
          duration: 1.25,
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
        // GSAP failed — elements were never hidden, page stays visible
      }
    })();
  }, []);

  // ── Effect 2: Post-loader hero reveal + all scroll animations ─────────────
  useEffect(() => {
    if (!loaderDone) return;

    (async () => {
      try {
        const { gsap }         = await import("gsap");
        const { ScrollTrigger } = await import("gsap/ScrollTrigger");

        heroRevealedRef.current = true;

        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced) { revealHeroFallback(); setBarsGone(true); return; }

        // ── Hero reveal timeline ────────────────────────────────────────────
        const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

        // Badge drops in
        tl.to("[data-hero-badge]", { opacity: 1, y: 0, duration: 0.55 }, 0);

        // Line 1 — each char rises from below clip
        tl.to("[data-hero-1] [data-split-inner]", {
          yPercent: 0, duration: 0.75, stagger: 0.022, ease: "power3.out",
        }, 0.08);

        // Line 2 — gold chars, slightly delayed
        tl.to("[data-hero-2] [data-split-inner]", {
          yPercent: 0, duration: 0.75, stagger: 0.022, ease: "power3.out",
        }, 0.22);

        tl.to("[data-hero-stat]",   { opacity: 1, duration: 0.5 }, 0.5);
        tl.to("[data-hero-sub]",    { opacity: 1, y: 0, duration: 0.65 }, 0.56);
        tl.to("[data-hero-cta]",    { opacity: 1, y: 0, duration: 0.6 }, 0.7);
        tl.to("[data-hero-scroll]", { opacity: 1, duration: 0.5 }, 0.85);

        // ── Letterbox bars retract as the title lands ──────────────────────
        tl.to("[data-letterbox]", {
          scaleY: 0, duration: 1.05, ease: "power3.inOut",
          onComplete: () => setBarsGone(true),
        }, 0.25);

        // ── Light sweep across the headline — once on landing, then ambient ─
        gsap.fromTo("[data-hero-shine]",
          { xPercent: -130 },
          { xPercent: 130, duration: 1.5, ease: "power2.inOut", delay: 1.25, repeat: -1, repeatDelay: 6 }
        );

        // ── Mouse parallax on hero layers (desktop only) ───────────────────
        if (window.matchMedia("(hover: hover)").matches) {
          const layers = gsap.utils.toArray<HTMLElement>("[data-parallax]").map((el) => ({
            depth: Number(el.dataset.depth ?? 12),
            qx: gsap.quickTo(el, "x", { duration: 0.9, ease: "power3.out" }),
            qy: gsap.quickTo(el, "y", { duration: 0.9, ease: "power3.out" }),
          }));
          if (layers.length) {
            window.addEventListener("mousemove", (e) => {
              const nx = e.clientX / window.innerWidth  - 0.5;
              const ny = e.clientY / window.innerHeight - 0.5;
              layers.forEach(l => { l.qx(-nx * l.depth); l.qy(-ny * l.depth); });
            }, { passive: true });
          }
        }

        // ── Dolly-zoom exit ────────────────────────────────────────────────
        // Full version (blur + background canvas scale) is desktop-only: scrub-
        // animating filter/scale over two full-screen WebGL canvases can freeze
        // or crash mobile browser tabs. Touch devices get a cheap opacity fade.
        try {
          if (window.matchMedia("(hover: hover)").matches) {
            gsap.to("[data-hero-content]", {
              scale: 0.93, autoAlpha: 0.2, filter: "blur(6px)", ease: "none",
              scrollTrigger: { trigger: "[data-hero-root]", start: "top top", end: "bottom 30%", scrub: true },
            });
            gsap.to("[data-parallax]", {
              scale: 1.12, ease: "none",
              scrollTrigger: { trigger: "[data-hero-root]", start: "top top", end: "bottom 30%", scrub: true },
            });
          } else {
            gsap.to("[data-hero-content]", {
              autoAlpha: 0.25, ease: "none",
              scrollTrigger: { trigger: "[data-hero-root]", start: "top top", end: "bottom 30%", scrub: true },
            });
          }
        } catch { /* non-fatal — hero stays static */ }

        // ── MEET THE DESK — pinned film-credits sequence ───────────────────
        try {
        const slides = gsap.utils.toArray<HTMLElement>("[data-credit-slide]");
        if (slides.length) {
          gsap.set(slides, { autoAlpha: 0, yPercent: 14 });
          const ticks = gsap.utils.toArray<HTMLElement>("[data-credit-tick]");
          const credits = gsap.timeline({
            scrollTrigger: {
              trigger: "[data-credits]",
              start: "top top",
              end: `+=${slides.length * 85}%`,
              pin: true,
              scrub: 0.6,
              anticipatePin: 1,
            },
          });
          slides.forEach((slide, i) => {
            credits.to(slide, { autoAlpha: 1, yPercent: 0, duration: 0.7, ease: "power2.out" });
            if (ticks[i]) credits.to(ticks[i], { backgroundColor: "rgba(201,168,85,0.95)", boxShadow: "0 0 8px rgba(201,168,85,0.6)", duration: 0.18 }, "<");
            credits.to({}, { duration: 0.45 }); // hold the card on screen
            if (i < slides.length - 1) {
              credits.to(slide, { autoAlpha: 0, yPercent: -12, duration: 0.55, ease: "power2.in" });
            }
          });
        }
        } catch { /* non-fatal — credits section degrades to its static first card */ }

        // ── Marquee (infinite horizontal scroll) ───────────────────────────
        gsap.to("[data-marquee]", {
          xPercent: -50,
          duration: 28,
          ease: "none",
          repeat: -1,
        });

        // ── Magnetic buttons ────────────────────────────────────────────────
        const hasHover = window.matchMedia("(hover: hover)").matches;
        if (hasHover) {
          document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((btn) => {
            btn.addEventListener("mousemove", (e) => {
              const r = btn.getBoundingClientRect();
              const dx = e.clientX - r.left - r.width  / 2;
              const dy = e.clientY - r.top  - r.height / 2;
              gsap.to(btn, { x: dx * 0.26, y: dy * 0.26, duration: 0.35, ease: "power2.out", overwrite: "auto" });
            });
            btn.addEventListener("mouseleave", () => {
              gsap.to(btn, { x: 0, y: 0, duration: 0.65, ease: "elastic.out(1,0.4)", overwrite: "auto" });
            });
          });
        }

        // ── 3D card tilt ────────────────────────────────────────────────────
        if (hasHover) {
          document.querySelectorAll<HTMLElement>("[data-card]").forEach((card) => {
            card.style.transformStyle = "preserve-3d";
            card.style.willChange     = "transform";

            card.addEventListener("mousemove", (e) => {
              const r = card.getBoundingClientRect();
              const x = ((e.clientX - r.left)  / r.width  - 0.5) * 2;
              const y = ((e.clientY - r.top)   / r.height - 0.5) * 2;
              gsap.to(card, {
                rotateY: x * 9,
                rotateX: -y * 9,
                transformPerspective: 700,
                duration: 0.35,
                ease: "power2.out",
                overwrite: "auto",
              });
            });

            card.addEventListener("mouseleave", () => {
              gsap.to(card, {
                rotateX: 0, rotateY: 0,
                duration: 0.7, ease: "elastic.out(1,0.45)", overwrite: "auto",
              });
            });
          });
        }

        // ── Feature row hover — number glow + row highlight ────────────────
        if (hasHover) {
          document.querySelectorAll<HTMLElement>("[data-feature-row]").forEach((row) => {
            const num = row.querySelector<HTMLElement>("span[style*='WebkitTextStroke']");
            row.addEventListener("mouseenter", () => {
              gsap.to(row, { backgroundColor: "rgba(201,168,85,0.03)", duration: 0.3, overwrite: "auto" });
              if (num) gsap.to(num, { opacity: 1, duration: 0.3, overwrite: "auto" });
            });
            row.addEventListener("mouseleave", () => {
              gsap.to(row, { backgroundColor: "transparent", duration: 0.4, overwrite: "auto" });
              if (num) gsap.to(num, { opacity: 0.35, duration: 0.4, overwrite: "auto" });
            });
          });
        }

        // ── Feature rows — stagger slide in ────────────────────────────────
        gsap.utils.toArray<HTMLElement>("[data-feature-row]").forEach((row, i) => {
          gsap.fromTo(row,
            { opacity: 0, x: -30 },
            {
              opacity: 1, x: 0, duration: 0.55, ease: "power3.out",
              delay: i * 0.04,
              scrollTrigger: { trigger: row, start: "top 92%", once: true },
            }
          );
        });

        // ── Section headings — clip-path wipe up ───────────────────────────
        gsap.utils.toArray<HTMLElement>("[data-section-head]").forEach((el) => {
          gsap.fromTo(el,
            { clipPath: "inset(0 0 100% 0)", opacity: 0 },
            {
              clipPath: "inset(0 0 0% 0)", opacity: 1,
              duration: 0.85, ease: "power3.out",
              scrollTrigger: { trigger: el, start: "top 88%", once: true },
            }
          );
        });

        // ── Stats count-up ──────────────────────────────────────────────────
        document.querySelectorAll<HTMLElement>("[data-count-to]").forEach((el) => {
          const to     = parseInt(el.dataset.countTo || "0", 10);
          const suffix = el.dataset.countSuffix || "";
          if (!to) return; // skip "24/7" etc
          const obj = { val: 0 };
          gsap.to(obj, {
            val: to, duration: 2.2, ease: "power2.out",
            onUpdate() { el.textContent = Math.round(obj.val).toLocaleString() + suffix; },
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
          });
        });

        // ── Social proof fade-in ────────────────────────────────────────────
        gsap.fromTo("[data-social-proof]",
          { opacity: 0 },
          { opacity: 1, duration: 0.6, ease: "power2.out",
            scrollTrigger: { trigger: "[data-social-proof]", start: "top 92%", once: true } }
        );

        // ── Bottom CTA — split-char reveal ─────────────────────────────────
        gsap.set("[data-cta-1] [data-split-inner]", { yPercent: 115 });
        gsap.set("[data-cta-2] [data-split-inner]", { yPercent: 115 });

        ScrollTrigger.create({
          trigger: "[data-cta-block]",
          start: "top 80%",
          once: true,
          onEnter() {
            gsap.timeline({ defaults: { ease: "power3.out" } })
              .to("[data-cta-1] [data-split-inner]", { yPercent: 0, duration: 0.75, stagger: 0.022 }, 0)
              .to("[data-cta-2] [data-split-inner]", { yPercent: 0, duration: 0.75, stagger: 0.022 }, 0.18);
          },
        });

        // ── Stats bar ───────────────────────────────────────────────────────
        gsap.fromTo("[data-stats-bar]",
          { opacity: 0, y: 20 },
          {
            opacity: 1, y: 0, duration: 0.7, ease: "power3.out",
            scrollTrigger: { trigger: "[data-stats-bar]", start: "top 92%", once: true },
          }
        );

        // ── Terminal preview ────────────────────────────────────────────────
        gsap.fromTo("[data-preview]",
          { opacity: 0, y: 48, scale: 0.97 },
          {
            opacity: 1, y: 0, scale: 1, duration: 1, ease: "power3.out",
            scrollTrigger: { trigger: "[data-preview]", start: "top 85%", once: true },
          }
        );

        // ── Feature cards — staggered 3D flip-in ───────────────────────────
        gsap.utils.toArray<HTMLElement>("[data-card]").forEach((card, i) => {
          gsap.fromTo(card,
            { opacity: 0, y: 44, rotateX: -8, transformPerspective: 800 },
            {
              opacity: 1, y: 0, rotateX: 0, duration: 0.75, ease: "power3.out",
              delay: (i % 3) * 0.07,
              scrollTrigger: { trigger: card, start: "top 91%", once: true },
            }
          );
        });

        // ── Testimonials ────────────────────────────────────────────────────
        gsap.utils.toArray<HTMLElement>("[data-testimonial]").forEach((el, i) => {
          gsap.fromTo(el,
            { opacity: 0, y: 36 },
            {
              opacity: 1, y: 0, duration: 0.7, ease: "power3.out",
              delay: i * 0.1,
              scrollTrigger: { trigger: el, start: "top 88%", once: true },
            }
          );
        });

        // ── Bottom CTA block ────────────────────────────────────────────────
        gsap.fromTo("[data-cta-block]",
          { opacity: 0, y: 36 },
          {
            opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
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

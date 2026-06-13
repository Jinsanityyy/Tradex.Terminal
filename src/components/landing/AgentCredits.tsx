/**
 * MEET THE DESK — pinned film-credits sequence.
 *
 * Markup only (server-safe). The scroll choreography lives in
 * CinematicClientLayer: the section pins for ~6 screen-heights while the seven
 * agents take the stage one at a time, each with a ghost roman number behind
 * a hard-cut title card. The right-edge ticks fill as the cast advances.
 *
 * No-JS / reduced-motion fallback: only the first slide is visible (inline
 * opacity), the section is a single static viewport — still a poster, never
 * a broken stack.
 */

const G = "#C9A855";

const AGENTS = [
  { num: "01", name: "TREND",        role: "MACRO SCOUT",      line: "Reads market structure across four timeframes before you finish your coffee." },
  { num: "02", name: "PRICE ACTION", role: "TAPE READER",      line: "Hunts liquidity sweeps inside the kill zones. Nothing else interests it." },
  { num: "03", name: "NEWS",         role: "CATALYST WATCH",   line: "Weighs every headline for impact before it ever reaches your chart." },
  { num: "04", name: "RISK",         role: "GUARD RAIL",       line: "Its only job is blocking the trade you would regret." },
  { num: "05", name: "EXECUTION",    role: "ENTRY PILOT",      line: "Grades every setup against ten confluences. A+ or it doesn't fly." },
  { num: "06", name: "CONTRARIAN",   role: "DEVIL'S ADVOCATE", line: "Finds the trap before you step in it — then argues with everyone." },
  { num: "07", name: "MASTER",       role: "THE FINAL WORD",   line: "Hears the full debate. Weighs the committee. Makes the call." },
];

export function AgentCredits() {
  return (
    <section
      data-credits
      className="relative overflow-hidden"
      style={{ background: "#060606" }}
    >
      <div className="relative h-screen w-full">
        {/* Scene label */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[3] text-center">
          <p className="text-[10px] font-black tracking-[0.4em] uppercase" style={{ color: `${G}66` }}>
            ◆ Meet the Desk ◆
          </p>
          <p className="mt-2 text-[9px] tracking-[0.25em] uppercase" style={{ color: "rgba(255,255,255,0.22)" }}>
            Seven agents. One verdict.
          </p>
        </div>

        {/* Vignette + faint grid stage */}
        <div className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(ellipse 80% 65% at 50% 50%, transparent 25%, rgba(6,6,6,0.92) 100%)" }} />
        <div className="pointer-events-none absolute inset-0 opacity-[0.014]"
          style={{
            backgroundImage: "linear-gradient(rgba(201,168,85,1) 1px,transparent 1px),linear-gradient(90deg,rgba(201,168,85,1) 1px,transparent 1px)",
            backgroundSize: "56px 56px",
          }} />

        {/* Cast slides — absolutely stacked title cards */}
        {AGENTS.map((a, i) => (
          <div
            key={a.num}
            data-credit-slide
            className="absolute inset-0 z-[2] flex flex-col items-center justify-center px-6 text-center"
            style={i === 0 ? undefined : { opacity: 0 }}
          >
            {/* Ghost number behind the name */}
            <span
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-black select-none"
              style={{
                fontSize: "clamp(14rem, 42vw, 30rem)",
                lineHeight: 1,
                color: "transparent",
                WebkitTextStroke: "1px rgba(201,168,85,0.10)",
              }}
            >
              {a.num}
            </span>

            <p className="text-[10px] font-black tracking-[0.5em] uppercase mb-5" style={{ color: `${G}99` }}>
              AGENT {a.num} / 07
            </p>
            <h3
              className="font-black leading-[0.95] tracking-tight"
              style={{ fontSize: "clamp(3rem, 11vw, 8.5rem)", color: "#fff" }}
            >
              {a.name}
            </h3>
            <p className="mt-4 text-xs md:text-sm font-black tracking-[0.45em] uppercase" style={{ color: G }}>
              {a.role}
            </p>
            <p className="mt-6 max-w-md text-sm md:text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.40)" }}>
              {a.line}
            </p>
          </div>
        ))}

        {/* Cast progress ticks */}
        <div className="absolute right-5 md:right-12 top-1/2 -translate-y-1/2 z-[3] flex flex-col gap-3" aria-hidden>
          {AGENTS.map((a) => (
            <span key={a.num} data-credit-tick className="w-1.5 h-6 rounded-[1px]"
              style={{ background: "rgba(201,168,85,0.14)" }} />
          ))}
        </div>

        {/* Bottom hint */}
        <p className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[3] text-[8px] tracking-[0.35em] uppercase font-bold"
          style={{ color: "rgba(201,168,85,0.30)" }}>
          keep scrolling
        </p>
      </div>
    </section>
  );
}

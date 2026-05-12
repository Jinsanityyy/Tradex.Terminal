import type { Metadata } from "next";
import { HeroSection } from "@/components/landing/HeroSection";
import { AgentGrid }   from "@/components/landing/AgentGrid";

export const metadata: Metadata = {
  title: "TradeX Terminal — Multi-Agent Intelligence System",
  description:
    "7 AI agents — Trend, Price Action, News, Risk Gate, Execution, Contrarian, Master — running in a structured pipeline to produce a single, auditable trade decision.",
};

export default function AboutPage() {
  return (
    <main className="bg-black min-h-screen">
      <HeroSection />
      <AgentGrid />

      {/* Footer */}
      <footer className="border-t border-slate-900 px-6 py-8 md:px-16 lg:px-24">
        <div className="max-w-5xl mx-auto flex flex-wrap justify-between items-center gap-4 font-mono text-[9px] text-slate-700 tracking-widest">
          <span>TRADEX TERMINAL © 2025</span>
          <span>NY SESSION LIQUIDITY MODEL · JADE CAP v2</span>
          <span>INTERNAL USE ONLY</span>
        </div>
      </footer>
    </main>
  );
}

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, X, Send } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { playJarvisActivate, playJarvisResponse } from "@/lib/sounds";

// ── Web Speech API types ──────────────────────────────────────────────────────
interface SpeechRecognitionEvent extends Event {
  results: { [i: number]: { [i: number]: { transcript: string }; isFinal: boolean }; length: number };
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}
declare global {
  interface Window {
    SpeechRecognition: { new(): SpeechRecognitionInstance };
    webkitSpeechRecognition: { new(): SpeechRecognitionInstance };
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Phase = "idle" | "listening" | "thinking" | "responding";

interface Message {
  id: number;
  role: "user" | "jarvis";
  text: string;
  displayed: string;
}

// ── Cyan palette ──────────────────────────────────────────────────────────────
const C = {
  primary:   "#00D4FF",
  dim:       "rgba(0,212,255,0.18)",
  dimBorder: "rgba(0,212,255,0.22)",
  text:      "#c6e8f5",
  muted:     "rgba(0,212,255,0.38)",
  bg:        "#030608",
  userBg:    "rgba(0,212,255,0.13)",
  jBg:       "rgba(0,212,255,0.055)",
};

// ── CSS injected once ─────────────────────────────────────────────────────────
const STYLES = `
@keyframes jv-pulse {
  0%,100%{box-shadow:0 0 0 0 rgba(0,212,255,.35),0 0 14px rgba(0,212,255,.15)}
  50%{box-shadow:0 0 0 7px rgba(0,212,255,0),0 0 22px rgba(0,212,255,.3)}
}
@keyframes jv-up {
  from{transform:translateY(100%);opacity:0}
  to{transform:translateY(0);opacity:1}
}
@keyframes jv-bar {
  0%,100%{height:3px}
  50%{height:22px}
}
@keyframes jv-blink {
  0%,100%{opacity:1}50%{opacity:0}
}
@keyframes jv-spin {
  to{transform:rotate(360deg)}
}
@keyframes jv-ping {
  0%{transform:scale(1);opacity:.7}
  100%{transform:scale(2);opacity:0}
}
`;

let stylesInjected = false;

export function JarvisAssistant() {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [msgCounter, setMsgCounter] = useState(0);

  const { settings } = useSettings();
  const symbol    = settings.selectedSymbol ?? "XAUUSD";
  const timeframe = (settings as Record<string, string>).selectedTimeframe ?? "H1";

  const recognitionRef  = useRef<SpeechRecognitionInstance | null>(null);
  const typeTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesEndRef  = useRef<HTMLDivElement>(null);
  const inputRef        = useRef<HTMLInputElement>(null);
  const greetedRef      = useRef(false);

  // Inject CSS once
  useEffect(() => {
    if (stylesInjected) return;
    const el = document.createElement("style");
    el.textContent = STYLES;
    document.head.appendChild(el);
    stylesInjected = true;
  }, []);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Typewriter ────────────────────────────────────────────────────────────
  const runTypewriter = useCallback((id: number, text: string, onDone: () => void) => {
    if (typeTimerRef.current) clearTimeout(typeTimerRef.current);
    let i = 0;
    const tick = () => {
      i++;
      setMessages(prev =>
        prev.map(m => m.id === id ? { ...m, displayed: text.slice(0, i) } : m)
      );
      if (i < text.length) {
        typeTimerRef.current = setTimeout(tick, 16);
      } else {
        onDone();
      }
    };
    tick();
  }, []);

  // ── TTS ───────────────────────────────────────────────────────────────────
  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const voice =
      voices.find(v => /Daniel|Moira|Samantha/.test(v.name) && v.lang.startsWith("en")) ??
      voices.find(v => /UK|GB|British/.test(v.name)) ??
      voices.find(v => v.lang === "en-US" && !v.localService) ??
      voices.find(v => v.lang.startsWith("en")) ??
      null;
    if (voice) utt.voice = voice;
    utt.rate  = 0.97;
    utt.pitch = 0.88;
    utt.volume = 0.88;
    window.speechSynthesis.speak(utt);
  }, []);

  // ── Send ──────────────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const userId = msgCounter;
    setMsgCounter(c => c + 2);
    const jarvisId = userId + 1;

    setMessages(prev => [
      ...prev,
      { id: userId, role: "user", text: trimmed, displayed: trimmed },
    ]);
    setInput("");
    setPhase("thinking");

    try {
      const res = await fetch("/api/jarvis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, symbol, timeframe }),
      });
      const data = await res.json() as { reply: string };
      const reply = data.reply ?? "Systems momentarily offline.";

      playJarvisResponse();

      setMessages(prev => [
        ...prev,
        { id: jarvisId, role: "jarvis", text: reply, displayed: "" },
      ]);
      setPhase("responding");

      // Run typewriter + TTS in parallel
      speak(reply);
      runTypewriter(jarvisId, reply, () => setPhase("idle"));
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: jarvisId,
          role: "jarvis",
          text: "Connection to J.A.R.V.I.S. servers interrupted. Please try again.",
          displayed: "Connection to J.A.R.V.I.S. servers interrupted. Please try again.",
        },
      ]);
      setPhase("idle");
    }
  }, [msgCounter, symbol, timeframe, speak, runTypewriter]);

  // ── Voice input ───────────────────────────────────────────────────────────
  const startListening = useCallback(() => {
    const SR = typeof window !== "undefined"
      ? (window.SpeechRecognition || window.webkitSpeechRecognition)
      : null;
    if (!SR) {
      alert("Voice input not supported in this browser.");
      return;
    }
    window.speechSynthesis?.cancel();
    const rec = new SR();
    rec.continuous     = false;
    rec.interimResults = false;
    rec.lang           = "en-US";
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const t = e.results[0][0].transcript;
      setPhase("thinking");
      sendMessage(t);
    };
    rec.onerror = () => setPhase("idle");
    rec.onend   = () => { if (phase === "listening") setPhase("idle"); };
    recognitionRef.current = rec;
    rec.start();
    setPhase("listening");
  }, [phase, sendMessage]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setPhase("idle");
  }, []);

  // ── Open panel ────────────────────────────────────────────────────────────
  const handleOpen = useCallback(() => {
    playJarvisActivate();
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 350);
    if (!greetedRef.current) {
      greetedRef.current = true;
      setTimeout(() => sendMessage("hello jarvis"), 500);
    }
  }, [sendMessage]);

  // ── Close ─────────────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    setOpen(false);
    window.speechSynthesis?.cancel();
    recognitionRef.current?.abort();
    if (typeTimerRef.current) clearTimeout(typeTimerRef.current);
    setPhase("idle");
  }, []);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => () => {
    if (typeTimerRef.current) clearTimeout(typeTimerRef.current);
    recognitionRef.current?.abort();
    window.speechSynthesis?.cancel();
  }, []);

  const busy = phase !== "idle";

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Floating orb ── */}
      {!open && (
        <button
          onClick={handleOpen}
          aria-label="Open J.A.R.V.I.S."
          style={{
            position: "fixed",
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 68px)",
            right: 16,
            zIndex: 90,
            width: 50,
            height: 50,
            borderRadius: "50%",
            background: "radial-gradient(circle at 38% 38%, rgba(0,212,255,.22), rgba(2,8,18,.92))",
            border: "1.5px solid rgba(0,212,255,.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            animation: "jv-pulse 2.6s ease-in-out infinite",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <span style={{
            fontFamily: "var(--font-jetbrains-mono, monospace)",
            fontSize: 17,
            fontWeight: 800,
            color: C.primary,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}>J</span>
        </button>
      )}

      {/* ── Panel ── */}
      {open && (
        <div
          style={{
            position: "fixed",
            inset: "0 0 0 0",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            zIndex: 200,
            pointerEvents: "none",
          }}
        >
          {/* Backdrop */}
          <div
            onClick={handleClose}
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(2px)",
              pointerEvents: "all",
            }}
          />

          {/* Sheet */}
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 560,
              margin: "0 auto",
              height: "78vh",
              background: C.bg,
              borderTop: `1.5px solid ${C.dimBorder}`,
              borderLeft:  `1px solid rgba(0,212,255,0.08)`,
              borderRight: `1px solid rgba(0,212,255,0.08)`,
              borderRadius: "18px 18px 0 0",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              animation: "jv-up 0.32s cubic-bezier(0.32,0.72,0,1) both",
              boxShadow: "0 -8px 60px rgba(0,212,255,0.08), 0 -2px 0 rgba(0,212,255,0.15)",
              pointerEvents: "all",
            }}
          >
            {/* Scanlines */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.025,
              backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 11px, rgba(0,212,255,1) 11px, rgba(0,212,255,1) 12px)",
              borderRadius: "inherit",
            }} />

            {/* ── Header ── */}
            <div style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px 10px",
              borderBottom: `1px solid rgba(0,212,255,0.1)`,
              flexShrink: 0,
            }}>
              {/* Drag handle */}
              <div style={{
                position: "absolute", top: 8, left: "50%", transform: "translateX(-50%)",
                width: 38, height: 3.5, borderRadius: 2, background: C.muted,
              }} />

              {/* Left: status + name */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
                {/* Status dot */}
                <div style={{ position: "relative", width: 8, height: 8 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: "50%",
                    background: phase === "thinking" ? "#FFB800" : phase === "listening" ? "#FF4C4C" : C.primary,
                  }} />
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: "50%",
                    background: phase === "thinking" ? "#FFB800" : C.primary,
                    animation: "jv-ping 1.4s ease-out infinite",
                  }} />
                </div>

                <div>
                  <div style={{
                    fontFamily: "var(--font-jetbrains-mono, monospace)",
                    fontSize: 11, fontWeight: 700, color: C.primary,
                    letterSpacing: "0.22em", lineHeight: 1.2,
                  }}>J.A.R.V.I.S.</div>
                  <div style={{
                    fontFamily: "var(--font-jetbrains-mono, monospace)",
                    fontSize: 8.5, color: C.muted,
                    letterSpacing: "0.14em", marginTop: 1,
                  }}>
                    {phase === "listening"  ? "● LISTENING"  :
                     phase === "thinking"   ? "● ANALYZING"  :
                     phase === "responding" ? "● RESPONDING" :
                     `MONITORING · ${symbol}`}
                  </div>
                </div>
              </div>

              {/* Close */}
              <button
                onClick={handleClose}
                style={{
                  marginTop: 4, padding: 6, borderRadius: 8,
                  background: "rgba(0,212,255,0.06)",
                  border: "1px solid rgba(0,212,255,0.12)",
                  color: C.muted, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <X size={15} />
              </button>
            </div>

            {/* ── Messages ── */}
            <div style={{
              flex: 1, overflowY: "auto", padding: "16px 14px",
              display: "flex", flexDirection: "column", gap: 14,
            }}>
              {messages.map((m, i) => {
                const isJ = m.role === "jarvis";
                const isLast = i === messages.length - 1;
                const showTyping = isJ && isLast && phase === "responding";
                const text = showTyping ? m.displayed : m.text;

                return (
                  <div key={m.id} style={{
                    display: "flex",
                    justifyContent: isJ ? "flex-start" : "flex-end",
                    alignItems: "flex-start",
                    gap: 8,
                  }}>
                    {isJ && (
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                        background: C.dim, border: `1px solid ${C.dimBorder}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <span style={{
                          fontFamily: "var(--font-jetbrains-mono, monospace)",
                          fontSize: 9, fontWeight: 800, color: C.primary,
                        }}>J</span>
                      </div>
                    )}
                    <div style={{
                      maxWidth: "80%",
                      padding: "10px 13px",
                      borderRadius: isJ ? "4px 14px 14px 14px" : "14px 4px 14px 14px",
                      background: isJ ? C.jBg : C.userBg,
                      border: `1px solid ${isJ ? "rgba(0,212,255,0.12)" : "rgba(0,212,255,0.28)"}`,
                      color: C.text,
                      fontFamily: "var(--font-dm-sans, system-ui, sans-serif)",
                      fontSize: 13.5,
                      lineHeight: 1.65,
                    }}>
                      {text || (isJ && <span style={{ color: C.muted }}>...</span>)}
                      {showTyping && (
                        <span style={{
                          display: "inline-block",
                          width: 2, height: 14,
                          background: C.primary,
                          marginLeft: 2,
                          verticalAlign: "middle",
                          animation: "jv-blink 0.75s step-end infinite",
                        }} />
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Thinking dots */}
              {phase === "thinking" && (
                <div style={{ display: "flex", justifyContent: "flex-start", gap: 8, alignItems: "flex-start" }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                    background: C.dim, border: `1px solid ${C.dimBorder}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{
                      fontFamily: "var(--font-jetbrains-mono, monospace)",
                      fontSize: 9, fontWeight: 800, color: C.primary,
                    }}>J</span>
                  </div>
                  <div style={{
                    padding: "12px 14px",
                    borderRadius: "4px 14px 14px 14px",
                    background: C.jBg,
                    border: "1px solid rgba(0,212,255,0.12)",
                    display: "flex", gap: 5, alignItems: "center",
                  }}>
                    {[0, 140, 280].map(d => (
                      <div key={d} style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: C.primary, opacity: 0.7,
                        animation: `jv-ping 1.2s ease-out ${d}ms infinite`,
                      }} />
                    ))}
                  </div>
                </div>
              )}

              {/* Listening waveform */}
              {phase === "listening" && (
                <div style={{ display: "flex", justifyContent: "center", padding: "8px 0" }}>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 28 }}>
                    {Array.from({ length: 9 }).map((_, i) => (
                      <div key={i} style={{
                        width: 3, borderRadius: 2,
                        background: C.primary,
                        animation: `jv-bar ${0.55 + (i % 3) * 0.18}s ease-in-out ${i * 55}ms infinite alternate`,
                        height: 3,
                      }} />
                    ))}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* ── Input ── */}
            <div style={{
              padding: "10px 14px 32px",
              borderTop: "1px solid rgba(0,212,255,0.09)",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !busy && sendMessage(input)}
                  placeholder="Ask J.A.R.V.I.S. anything…"
                  disabled={busy}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    borderRadius: 12,
                    background: "rgba(0,212,255,0.055)",
                    border: `1px solid ${busy ? "rgba(0,212,255,0.1)" : C.dimBorder}`,
                    color: C.text,
                    fontFamily: "var(--font-dm-sans, system-ui, sans-serif)",
                    fontSize: 13,
                    outline: "none",
                    opacity: busy ? 0.45 : 1,
                    transition: "border-color 0.2s",
                  }}
                />

                {/* Send */}
                <button
                  onClick={() => !busy && sendMessage(input)}
                  disabled={!input.trim() || busy}
                  style={{
                    width: 40, height: 40, flexShrink: 0,
                    borderRadius: 11,
                    background: input.trim() && !busy ? C.dim : "rgba(0,212,255,0.04)",
                    border: `1px solid ${input.trim() && !busy ? C.dimBorder : "rgba(0,212,255,0.1)"}`,
                    color: C.primary,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: input.trim() && !busy ? "pointer" : "default",
                    opacity: input.trim() && !busy ? 1 : 0.35,
                    transition: "all 0.2s",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  <Send size={15} />
                </button>

                {/* Mic */}
                <button
                  onClick={phase === "listening" ? stopListening : startListening}
                  disabled={phase === "thinking" || phase === "responding"}
                  style={{
                    width: 40, height: 40, flexShrink: 0,
                    borderRadius: 11,
                    background: phase === "listening" ? "rgba(255,76,76,0.14)" : "rgba(0,212,255,0.06)",
                    border: `1px solid ${phase === "listening" ? "rgba(255,76,76,0.38)" : "rgba(0,212,255,0.16)"}`,
                    color: phase === "listening" ? "#FF4C4C" : C.primary,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: (phase === "thinking" || phase === "responding") ? "default" : "pointer",
                    opacity: (phase === "thinking" || phase === "responding") ? 0.3 : 1,
                    animation: phase === "listening" ? "jv-pulse 1s ease-in-out infinite" : "none",
                    transition: "all 0.2s",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {phase === "listening" ? <MicOff size={15} /> : <Mic size={15} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

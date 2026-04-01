"use client";

import React, { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const TRADER_NAME_KEY = "tradex_trader_name";

interface Message {
  id: string;
  user_id: string;
  display_name: string | null;
  content: string;
  created_at: string;
}

function timeShort(ts: string) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getInitial(name: string | null) {
  return (name ?? "?")[0].toUpperCase();
}

const COLORS = [
  "bg-emerald-500", "bg-blue-500", "bg-purple-500",
  "bg-amber-500", "bg-pink-500", "bg-cyan-500",
];
function avatarColor(userId: string) {
  let n = 0;
  for (let i = 0; i < userId.length; i++) n += userId.charCodeAt(i);
  return COLORS[n % COLORS.length];
}

export function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [traderName, setTraderName] = useState("Trader");
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
    const saved = localStorage.getItem(TRADER_NAME_KEY);
    if (saved) setTraderName(saved);
  }, []);

  // Load initial messages
  useEffect(() => {
    supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }) => {
        if (data) setMessages(data as Message[]);
      });
  }, []);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("public:messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);
          if (!open) setUnread((n) => n + 1);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [open]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setUnread(0);
    }
  }, [messages, open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || !userId || sending) return;
    setSending(true);
    setInput("");
    await supabase.from("messages").insert({
      user_id: userId,
      display_name: traderName,
      content: text,
    });
    setSending(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-[340px] max-h-[500px] flex flex-col rounded-2xl border border-[hsl(var(--border))] bg-[hsl(220,18%,6%)] shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(220,18%,8%)] shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-semibold text-white">Member Chat</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <MessageCircle className="h-8 w-8 text-gray-700 mx-auto mb-2" />
                <p className="text-xs text-gray-600">No messages yet. Say hello!</p>
              </div>
            )}
            {messages.map((msg, i) => {
              const isMe = msg.user_id === userId;
              const prevMsg = messages[i - 1];
              const sameSender = prevMsg?.user_id === msg.user_id;

              return (
                <div key={msg.id} className={cn("flex gap-2", isMe && "flex-row-reverse")}>
                  {/* Avatar */}
                  {!sameSender ? (
                    <div className={cn(
                      "h-6 w-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white mt-0.5",
                      avatarColor(msg.user_id)
                    )}>
                      {getInitial(msg.display_name)}
                    </div>
                  ) : (
                    <div className="w-6 shrink-0" />
                  )}

                  <div className={cn("flex flex-col gap-0.5 max-w-[220px]", isMe && "items-end")}>
                    {!sameSender && (
                      <span className="text-[10px] text-gray-500 px-1">
                        {isMe ? "You" : (msg.display_name ?? "Trader")}
                        <span className="ml-1.5">{timeShort(msg.created_at)}</span>
                      </span>
                    )}
                    <div className={cn(
                      "rounded-2xl px-3 py-2 text-xs leading-relaxed break-words",
                      isMe
                        ? "bg-[hsl(142,71%,45%)]/20 text-[hsl(142,71%,55%)] rounded-tr-sm"
                        : "bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] rounded-tl-sm"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-[hsl(var(--border))] px-3 py-2.5 bg-[hsl(220,18%,8%)]">
            {userId ? (
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKey}
                  placeholder="Message members..."
                  maxLength={500}
                  className="flex-1 rounded-xl bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-[hsl(var(--primary))]/40 transition-colors"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="rounded-xl bg-[hsl(142,71%,45%)]/20 border border-[hsl(142,71%,45%)]/30 p-2 text-[hsl(142,71%,45%)] hover:bg-[hsl(142,71%,45%)]/30 disabled:opacity-40 transition-colors"
                >
                  {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                </button>
              </div>
            ) : (
              <p className="text-xs text-gray-600 text-center py-1">Sign in to chat</p>
            )}
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => { setOpen(!open); setUnread(0); }}
        className="fixed bottom-5 right-5 z-50 h-12 w-12 rounded-full bg-[hsl(142,71%,45%)] shadow-lg hover:bg-[hsl(142,71%,50%)] transition-all hover:scale-105 flex items-center justify-center"
      >
        {open ? (
          <X className="h-5 w-5 text-[#0a0e1a]" />
        ) : (
          <>
            <MessageCircle className="h-5 w-5 text-[#0a0e1a]" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </>
        )}
      </button>
    </>
  );
}

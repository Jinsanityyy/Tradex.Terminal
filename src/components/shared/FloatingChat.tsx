"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { MessageCircle, X, Send, Loader2, ArrowLeft, Users, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const TRADER_NAME_KEY = "tradex_trader_name";

interface Message {
  id: string;
  user_id: string;
  display_name: string | null;
  content: string;
  created_at: string;
  recipient_id: string | null;
}

interface Member {
  id: string;
  display_name: string | null;
  email: string | null;
}

type View = "list" | "group" | "dm";

function timeShort(ts: string) {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
}

function getInitial(name: string | null, email: string | null) {
  return (name ?? email ?? "?")[0].toUpperCase();
}

const COLORS = [
  "bg-emerald-500", "bg-blue-500", "bg-purple-500",
  "bg-amber-500", "bg-pink-500", "bg-cyan-500", "bg-orange-500",
];
function avatarColor(userId: string) {
  let n = 0;
  for (let i = 0; i < userId.length; i++) n += userId.charCodeAt(i);
  return COLORS[n % COLORS.length];
}

function Avatar({ userId, name, email, size = "sm" }: { userId: string; name: string | null; email: string | null; size?: "sm" | "md" }) {
  return (
    <div className={cn(
      "rounded-full shrink-0 flex items-center justify-center font-bold text-white",
      avatarColor(userId),
      size === "sm" ? "h-6 w-6 text-[10px]" : "h-8 w-8 text-xs"
    )}>
      {getInitial(name, email)}
    </div>
  );
}

export function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("list");
  const [dmTarget, setDmTarget] = useState<Member | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [groupMessages, setGroupMessages] = useState<Message[]>([]);
  const [dmMessages, setDmMessages] = useState<Message[]>([]);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [traderName, setTraderName] = useState("Trader");
  const [unread, setUnread] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Auth + trader name
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const saved = localStorage.getItem(TRADER_NAME_KEY);
    if (saved) setTraderName(saved);
  }, []);

  // Load members from profiles
  useEffect(() => {
    supabase
      .from("profiles")
      .select("id, display_name, email")
      .then(({ data }) => { if (data) setMembers(data as Member[]); });
  }, []);

  // Load group messages
  useEffect(() => {
    supabase
      .from("messages")
      .select("*")
      .is("recipient_id", null)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }) => { if (data) setGroupMessages(data as Message[]); });
  }, []);

  // Load DM messages when target changes
  useEffect(() => {
    if (!dmTarget || !userId) return;
    supabase
      .from("messages")
      .select("*")
      .or(`and(user_id.eq.${userId},recipient_id.eq.${dmTarget.id}),and(user_id.eq.${dmTarget.id},recipient_id.eq.${userId})`)
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }) => { if (data) setDmMessages(data as Message[]); });
  }, [dmTarget, userId]);

  // Real-time: group + DMs
  useEffect(() => {
    const channel = supabase
      .channel("chat_realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as Message;
        if (!msg.recipient_id) {
          setGroupMessages((prev) => [...prev, msg]);
          if (!open || view !== "group") setUnread((n) => n + 1);
        } else if (
          userId &&
          (msg.recipient_id === userId || msg.user_id === userId)
        ) {
          setDmMessages((prev) => {
            if (
              dmTarget &&
              (msg.user_id === dmTarget.id || msg.recipient_id === dmTarget.id)
            ) {
              return [...prev, msg];
            }
            return prev;
          });
          if (!open || view !== "dm") setUnread((n) => n + 1);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [open, view, userId, dmTarget]);

  // Scroll to bottom
  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }, [groupMessages, dmMessages, open, view]);

  // Clear unread when opening
  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || !userId || sending) return;
    setSending(true);
    setInput("");
    await supabase.from("messages").insert({
      user_id: userId,
      display_name: traderName,
      content: text,
      recipient_id: view === "dm" ? dmTarget?.id ?? null : null,
    });
    setSending(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function openDm(member: Member) {
    setDmTarget(member);
    setView("dm");
  }

  const messages = view === "dm" ? dmMessages : groupMessages;

  const headerTitle =
    view === "list" ? "Members" :
    view === "group" ? "Group Chat" :
    dmTarget?.display_name ?? dmTarget?.email ?? "DM";

  const otherMembers = members.filter((m) => m.id !== userId);

  return (
    <>
      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-[340px] flex flex-col rounded-2xl border border-[hsl(var(--border))] bg-[hsl(220,18%,6%)] shadow-2xl overflow-hidden"
          style={{ maxHeight: "520px" }}>

          {/* Header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(220,18%,8%)] shrink-0">
            {view !== "list" && (
              <button onClick={() => setView("list")} className="rounded-md p-1 text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="flex items-center gap-2 flex-1">
              {view === "group" && <Hash className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />}
              {view === "list" && <Users className="h-3.5 w-3.5 text-[hsl(var(--primary))]" />}
              {view === "dm" && dmTarget && (
                <Avatar userId={dmTarget.id} name={dmTarget.display_name} email={dmTarget.email} size="sm" />
              )}
              <span className="text-sm font-semibold text-white">{headerTitle}</span>
              {view === "list" && (
                <span className="text-[10px] text-gray-500 ml-1">{otherMembers.length} members</span>
              )}
            </div>
            <button onClick={() => setOpen(false)} className="rounded-md p-1 text-gray-500 hover:text-white hover:bg-white/10 transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Members List */}
          {view === "list" && (
            <div className="flex-1 overflow-y-auto">
              {/* Group Chat button */}
              <button
                onClick={() => setView("group")}
                className="w-full flex items-center gap-3 px-4 py-3 border-b border-[hsl(var(--border))] hover:bg-[hsl(var(--secondary))] transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-[hsl(var(--primary))]/20 border border-[hsl(var(--primary))]/30 flex items-center justify-center shrink-0">
                  <Hash className="h-4 w-4 text-[hsl(var(--primary))]" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold text-white">Group Chat</p>
                  <p className="text-[10px] text-gray-500">All members</p>
                </div>
                <span className="ml-auto text-[10px] text-gray-600">{groupMessages.length > 0 ? `${groupMessages.length} msgs` : ""}</span>
              </button>

              {/* Member list */}
              <div className="divide-y divide-[hsl(var(--border))]/50">
                {otherMembers.length === 0 && (
                  <p className="text-xs text-gray-600 text-center py-8">No other members yet</p>
                )}
                {otherMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => openDm(member)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[hsl(var(--secondary))] transition-colors"
                  >
                    <Avatar userId={member.id} name={member.display_name} email={member.email} size="md" />
                    <div className="text-left min-w-0">
                      <p className="text-xs font-semibold text-white truncate">
                        {member.display_name ?? member.email?.split("@")[0] ?? "Trader"}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate">{member.email}</p>
                    </div>
                    <span className="ml-auto text-[10px] text-[hsl(var(--primary))]">DM</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat view (group or DM) */}
          {view !== "list" && (
            <>
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0" style={{ minHeight: 0 }}>
                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <MessageCircle className="h-8 w-8 text-gray-700 mx-auto mb-2" />
                    <p className="text-xs text-gray-600">
                      {view === "dm" ? `Start a conversation with ${dmTarget?.display_name ?? "this member"}` : "No messages yet. Say hello!"}
                    </p>
                  </div>
                )}
                {messages.map((msg, i) => {
                  const isMe = msg.user_id === userId;
                  const sameSender = messages[i - 1]?.user_id === msg.user_id;
                  return (
                    <div key={msg.id} className={cn("flex gap-2", isMe && "flex-row-reverse")}>
                      {!sameSender ? (
                        <Avatar userId={msg.user_id} name={msg.display_name} email={null} size="sm" />
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
                      placeholder={view === "dm" ? `Message ${dmTarget?.display_name ?? "member"}...` : "Message group..."}
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
            </>
          )}
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

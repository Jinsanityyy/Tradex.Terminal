"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import { Send, Loader2, Hash } from "lucide-react";
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

function timeShort(ts: string) {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function dateSep(ts: string) {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const COLORS = ["bg-emerald-500","bg-blue-500","bg-purple-500","bg-amber-500","bg-pink-500","bg-cyan-500","bg-orange-500"];
function avatarColor(userId: string) {
  let n = 0;
  for (let i = 0; i < userId.length; i++) n += userId.charCodeAt(i);
  return COLORS[n % COLORS.length];
}
function getInitial(name: string | null, email: string | null) {
  return (name ?? email ?? "T")[0].toUpperCase();
}

function Avatar({ userId, name, email, photo }: { userId: string; name: string | null; email: string | null; photo?: string | null }) {
  if (photo) {
    return (
      <img src={photo} alt={name ?? "avatar"} className={cn("h-6 w-6 rounded-full object-cover shrink-0")} />
    );
  }
  return (
    <div className={cn("h-6 w-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white", avatarColor(userId))}>
      {getInitial(name, email)}
    </div>
  );
}

// Extract the @query at the end of the current input (null if no active @)
function getAtQuery(text: string): string | null {
  const m = text.match(/@(\S*)$/);
  return m ? m[1] : null;
}

// Render message content — highlight @mentions, bold @me
function renderContent(content: string, myName: string): React.ReactNode {
  const parts = content.split(/(@\S+)/g);
  return parts.map((part, i) => {
    if (!part.startsWith("@")) return part;
    const mentioned = part.slice(1).toLowerCase();
    const isMe = myName && mentioned === myName.toLowerCase();
    return (
      <span key={i} className={cn(
        "font-semibold rounded px-0.5",
        isMe ? "text-amber-300 bg-amber-400/10" : "text-blue-400"
      )}>
        {part}
      </span>
    );
  });
}

export function CommunityPanel() {
  const [messages, setMessages]       = useState<Message[]>([]);
  const [members, setMembers]         = useState<Member[]>([]);
  const [input, setInput]             = useState("");
  const [sending, setSending]         = useState(false);
  const [userId, setUserId]           = useState<string | null>(null);
  const [traderName, setTraderName]   = useState("Trader");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [myAvatar, setMyAvatar]       = useState<string | null>(null);
  const [avatarMap, setAvatarMap]     = useState<Record<string, string>>({});
  const [tagQuery, setTagQuery]       = useState<string | null>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLInputElement>(null);
  const typingTimer = useRef<NodeJS.Timeout | null>(null);

  // Build tag candidates from actual message senders — more reliable than
  // the profiles table which may have display_name = null for some users.
  const messageSenders = useMemo(() => {
    const seen = new Map<string, Member>();
    for (const msg of messages) {
      if (msg.display_name && !seen.has(msg.user_id)) {
        seen.set(msg.user_id, { id: msg.user_id, display_name: msg.display_name, email: null });
      }
    }
    return Array.from(seen.values());
  }, [messages]);

  // Members filtered by current @query (search message senders first, fall back to profiles)
  const tagMatches = useMemo(() => {
    if (tagQuery === null) return [];
    const q = tagQuery.toLowerCase();
    const fromMessages = messageSenders.filter(m =>
      (m.display_name ?? "").toLowerCase().startsWith(q) && (m.display_name ?? "").length > 0
    );
    const fromProfiles = members.filter(m => {
      const name = (m.display_name ?? m.email ?? "").toLowerCase();
      return name.startsWith(q) && name.length > 0 &&
        !fromMessages.some(s => s.id === m.id);
    });
    return [...fromMessages, ...fromProfiles].slice(0, 6);
  }, [tagQuery, messageSenders, members]);

  const supabase = createClient();

  useEffect(() => {
    const sb = createClient();
    if (!sb) return;
    // Use getSession first (faster, cached), fallback to getUser
    sb.auth.getSession().then(({ data: sessionData }) => {
      const user = sessionData.session?.user;
      if (user) {
        setUserId(user.id);
        const saved = localStorage.getItem(TRADER_NAME_KEY);
        if (!saved) {
          sb.from("profiles").select("display_name").eq("id", user.id).maybeSingle()
            .then(({ data: profile }) => {
              const name = profile?.display_name ?? user.email?.split("@")[0] ?? "Trader";
              setTraderName(name);
              localStorage.setItem(TRADER_NAME_KEY, name);
            });
        } else {
          setTraderName(saved);
        }
      } else {
        // Fallback to getUser
        sb.auth.getUser().then(({ data }) => {
          if (data.user) {
            setUserId(data.user.id);
            const saved = localStorage.getItem(TRADER_NAME_KEY);
            setTraderName(saved ?? data.user.email?.split("@")[0] ?? "Trader");
          }
        });
      }
    });
    const savedAvatar = localStorage.getItem("tradex_avatar");
    if (savedAvatar) setMyAvatar(savedAvatar);
    const onStorage = (e: StorageEvent) => {
      if (e.key === "tradex_avatar") setMyAvatar(e.newValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.from("profiles").select("id, display_name, email")
      .then(({ data }) => { if (data) setMembers(data as Member[]); });
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;
    supabase.from("messages").select("*").is("recipient_id", null)
      .order("created_at", { ascending: true }).limit(100)
      .then(({ data }) => { if (data) setMessages(data as Message[]); });
  }, [supabase]);

  useEffect(() => {
    if (!supabase || messages.length === 0) return;
    const ids = [...new Set(messages.map(m => m.user_id).filter(id => id !== userId && !avatarMap[id]))];
    if (ids.length === 0) return;
    supabase.from("profiles").select("id, avatar_url").in("id", ids)
      .then(({ data }) => {
        if (!data) return;
        const patch: Record<string, string> = {};
        for (const p of data) { if (p.avatar_url) patch[p.id] = p.avatar_url; }
        if (Object.keys(patch).length > 0) setAvatarMap(prev => ({ ...prev, ...patch }));
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, supabase, userId]);

  useEffect(() => {
    if (!supabase || !userId) return;
    const channel = supabase.channel("community_chat", { config: { broadcast: { self: false } } })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as Message;
        if (msg.recipient_id) return;
        if (msg.user_id === userId) return;
        setMessages(prev => [...prev, msg]);
      })
      .on("broadcast", { event: "typing" }, (payload) => {
        const { user_id, display_name } = payload.payload as { user_id: string; display_name: string };
        if (user_id === userId) return;
        setTypingUsers(prev => prev.includes(display_name) ? prev : [...prev, display_name]);
        setTimeout(() => setTypingUsers(prev => prev.filter(n => n !== display_name)), 2000);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function broadcastTyping() {
    if (!supabase || !userId) return;
    supabase.channel("community_chat").send({
      type: "broadcast", event: "typing",
      payload: { user_id: userId, display_name: traderName },
    });
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || !userId || !supabase || sending) return;
    setSending(true);
    setInput("");
    setTagQuery(null);
    const optimistic: Message = {
      id: crypto.randomUUID(), user_id: userId, display_name: traderName,
      content: text, created_at: new Date().toISOString(), recipient_id: null,
    };
    setMessages(prev => [...prev, optimistic]);
    const { data } = await supabase.from("messages").insert({
      user_id: userId, display_name: traderName, content: text, recipient_id: null,
    }).select().single();
    if (data) setMessages(prev => prev.map(m => m.id === optimistic.id ? (data as Message) : m));
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") { setTagQuery(null); return; }
    if (tagMatches.length > 0 && e.key === "Enter") {
      e.preventDefault();
      handleTagSelect(tagMatches[0]);
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setInput(val);
    setTagQuery(getAtQuery(val));
    if (typingTimer.current) clearTimeout(typingTimer.current);
    broadcastTyping();
  }

  function handleTagSelect(member: Member) {
    const name = (member.display_name ?? member.email ?? "Trader").replace(/\s+/g, "");
    // Replace the trailing @query with @name
    setInput(prev => prev.replace(/@(\S*)$/, `@${name} `));
    setTagQuery(null);
    inputRef.current?.focus();
  }

  // Group by date
  const grouped: { date: string; msgs: Message[] }[] = [];
  for (const msg of messages) {
    const d = dateSep(msg.created_at);
    const last = grouped[grouped.length - 1];
    if (last?.date === d) last.msgs.push(msg);
    else grouped.push({ date: d, msgs: [msg] });
  }

  return (
    <div className="flex flex-col h-full">

      {/* Header - no usernames for privacy */}
      <div className="px-3 py-2 border-b border-[hsl(var(--border))] shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Hash className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
            <span className="text-[11px] font-semibold text-[hsl(var(--foreground))]">Community</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
              {Math.max(1, members.length)} online
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-2 py-2 min-h-0 space-y-2">
        {!supabase && (
          <div className="text-center py-8">
            <p className="text-[10px] text-[hsl(var(--muted-foreground))]">Connect Supabase to enable chat</p>
          </div>
        )}
        {supabase && messages.length === 0 && (
          <div className="text-center py-8">
            <Hash className="h-5 w-5 text-[hsl(var(--muted-foreground))] mx-auto mb-2 opacity-40" />
            <p className="text-[10px] text-[hsl(var(--muted-foreground))]">No messages yet  -  share a setup!</p>
          </div>
        )}

        {grouped.map(({ date, msgs }) => (
          <div key={date}>
            <div className="flex items-center gap-2 my-1.5">
              <div className="flex-1 h-px bg-[hsl(var(--border))]" />
              <span className="text-[9px] text-[hsl(var(--muted-foreground))] shrink-0">{date}</span>
              <div className="flex-1 h-px bg-[hsl(var(--border))]" />
            </div>
            {msgs.map((msg, idx) => {
              const isOwn = msg.user_id === userId;
              const showAvatar = idx === 0 || msgs[idx - 1].user_id !== msg.user_id;
              return (
                <div key={msg.id} className={cn("flex gap-2 mb-1.5", isOwn && "flex-row-reverse")}>
                  <div className="w-6 shrink-0 flex items-end">
                    {showAvatar && <Avatar userId={msg.user_id} name={msg.display_name} email={null} photo={isOwn ? myAvatar : (avatarMap[msg.user_id] ?? null)} />}
                  </div>
                  <div className={cn("flex-1 min-w-0", isOwn && "flex flex-col items-end")}>
                    {showAvatar && (
                      <div className={cn("flex items-baseline gap-1.5 mb-0.5", isOwn && "flex-row-reverse")}>
                        <span className="text-[10px] font-semibold text-[hsl(var(--foreground))]">
                          {isOwn ? traderName : (msg.display_name ?? "Trader")}
                        </span>
                        <span className="text-[9px] text-[hsl(var(--muted-foreground))]">{timeShort(msg.created_at)}</span>
                      </div>
                    )}
                    <div className={cn(
                      "rounded-lg px-2.5 py-1.5 text-[11px] leading-relaxed max-w-[85%] break-words",
                      isOwn
                        ? "bg-[hsl(var(--primary))]/20 text-[hsl(var(--primary))] rounded-tr-none"
                        : msg.content.toLowerCase().includes(`@${traderName.replace(/\s+/g,"").toLowerCase()}`)
                          ? "bg-amber-400/10 border border-amber-400/20 text-[hsl(var(--foreground))] rounded-tl-none"
                          : "bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))] rounded-tl-none"
                    )}>
                      {renderContent(msg.content, traderName.replace(/\s+/g, ""))}
                    </div>
                    {!showAvatar && (
                      <span className={cn("text-[9px] text-[hsl(var(--muted-foreground))] mt-0.5 px-1", isOwn && "text-right")}>
                        {timeShort(msg.created_at)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {typingUsers.length > 0 && (
          <div className="flex items-center gap-1.5 px-2">
            <div className="flex gap-0.5">
              {[0,1,2].map(i => (
                <div key={i} className="h-1 w-1 rounded-full bg-[hsl(var(--muted-foreground))] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <span className="text-[9px] text-[hsl(var(--muted-foreground))]">
              {typingUsers.slice(0, 2).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing…
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-2 py-2 border-t border-[hsl(var(--border))] shrink-0">
        {/* @mention dropdown */}
        {tagMatches.length > 0 && (
          <div className="mb-1.5 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-hidden shadow-lg">
            {tagMatches.map((m) => {
              const name = m.display_name ?? m.email ?? "Trader";
              return (
                <button
                  key={m.id}
                  onMouseDown={(e) => { e.preventDefault(); handleTagSelect(m); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[hsl(var(--secondary))] active:bg-[hsl(var(--secondary))] transition-colors"
                >
                  <div className={cn("h-5 w-5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold text-white", avatarColor(m.id))}>
                    {name[0].toUpperCase()}
                  </div>
                  <span className="text-[11px] text-[hsl(var(--foreground))]">{name}</span>
                  <span className="text-[9px] text-[hsl(var(--muted-foreground))] ml-auto">@{name.replace(/\s+/g,"")}</span>
                </button>
              );
            })}
          </div>
        )}

        {!supabase || !userId ? (
          <p className="text-[9px] text-[hsl(var(--muted-foreground))] text-center py-1">Sign in to chat</p>
        ) : (
          <div className="flex gap-1.5 items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Share a setup… or @mention"
              maxLength={500}
              className="flex-1 min-w-0 rounded-lg bg-[hsl(var(--secondary))] border border-[hsl(var(--border))] px-2.5 py-1.5 text-[11px] text-[hsl(var(--foreground))] placeholder-[hsl(var(--muted-foreground))] outline-none focus:border-[hsl(var(--primary))]/50 transition-colors"
            />
            <button
              onClick={sendMessage}
              disabled={sending || !input.trim()}
              className="h-7 w-7 rounded-lg bg-[hsl(var(--primary))]/20 border border-[hsl(var(--primary))]/30 flex items-center justify-center text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all shrink-0"
            >
              {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

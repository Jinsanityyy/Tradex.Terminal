"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { createClient } from "@/lib/supabase/client";

/**
 * Gumroad license redemption.
 *
 * A buyer receives a license key on their Gumroad receipt, pastes it here, and
 * the server verifies it against Gumroad before upgrading the account. Binding
 * a key to an account requires knowing *which* account, so redemption needs a
 * signed-in session — check for one up front instead of letting a signed-out
 * visitor type a key and only find out on submit.
 */
export function LicenseRedeemCard() {
  const { subscription, loading } = useSubscription();
  const [key, setKey]         = useState("");
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) { setSignedIn(false); return; }
    supabase.auth.getUser().then(({ data: { user } }) => setSignedIn(!!user));
  }, []);

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    if (!key.trim() || busy) return;

    setBusy(true);
    setError(null);

    try {
      const res  = await fetch("/api/gumroad/redeem", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ licenseKey: key.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not activate that key.");
        return;
      }

      setSuccess(true);
      setKey("");
      // Re-read entitlement everywhere (sidebar badge, gated routes).
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (loading || signedIn === null) return null;

  // No session yet — a key can't be bound to an account we don't know. Send
  // them to sign in instead of letting them type a key that will only fail.
  if (!signedIn) {
    return (
      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
        <div className="mb-3 flex items-center gap-2">
          <KeyRound className="h-3.5 w-3.5 text-zinc-500" />
          <h3 className="text-[13px] font-semibold text-zinc-200">Activate your license</h3>
        </div>
        <p className="mb-3 text-[11px] leading-relaxed text-zinc-500">
          Bought TradeX on Gumroad? Sign in (or create an account) first — your
          license key gets linked to your account.
        </p>
        <Link
          href="/login?next=/pricing"
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors",
            "bg-[hsl(var(--primary))]/12 text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/30",
            "hover:bg-[hsl(var(--primary))]/20"
          )}
        >
          Sign in to activate
        </Link>
      </div>
    );
  }

  // Already on a paid plan — show status instead of the form.
  if (subscription.isPro) {
    return (
      <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <div>
            <p className="text-[13px] font-semibold text-emerald-300">
              TradeX {subscription.plan === "elite" ? "Elite" : "Pro"} is active
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-500">
              Full access to the agent terminal and all Pro features.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center gap-2">
        <KeyRound className="h-3.5 w-3.5 text-zinc-500" />
        <h3 className="text-[13px] font-semibold text-zinc-200">Activate your license</h3>
      </div>

      <p className="mb-3 text-[11px] leading-relaxed text-zinc-500">
        Bought TradeX on Gumroad? Paste the license key from your receipt to unlock Pro.
      </p>

      <form onSubmit={handleRedeem} className="space-y-2.5">
        <input
          type="text"
          value={key}
          onChange={(e) => { setKey(e.target.value); setError(null); }}
          placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
          autoComplete="off"
          spellCheck={false}
          disabled={busy || success}
          className={cn(
            "w-full rounded-lg border bg-black/30 px-3 py-2 font-mono text-[12px] text-zinc-200",
            "placeholder:text-zinc-700 focus:outline-none focus:ring-1",
            error
              ? "border-red-500/40 focus:ring-red-500/40"
              : "border-white/10 focus:border-white/20 focus:ring-white/20"
          )}
        />

        {error && <p className="text-[11px] leading-snug text-red-400">{error}</p>}

        {success && (
          <p className="flex items-center gap-1.5 text-[11px] text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> Activated. Reloading…
          </p>
        )}

        <button
          type="submit"
          disabled={!key.trim() || busy || success}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold transition-colors",
            "bg-[hsl(var(--primary))]/12 text-[hsl(var(--primary))] border border-[hsl(var(--primary))]/30",
            "hover:bg-[hsl(var(--primary))]/20 disabled:opacity-40 disabled:hover:bg-[hsl(var(--primary))]/12"
          )}
        >
          {busy ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> Verifying…</>) : "Activate"}
        </button>
      </form>

      <p className="mt-2.5 text-[10px] leading-relaxed text-zinc-600">
        One license activates one account. Lost your key? Check your Gumroad receipt email.
      </p>
    </div>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-helper";

export const dynamic = "force-dynamic";

// POST /api/analytics/track
// Body: { type, payload }
//
// type = "session_start"   payload: { sessionToken, device, browser, os, timezone, referrer }
// type = "session_end"     payload: { sessionToken, durationSec }
// type = "pageview_start"  payload: { sessionToken, page, pageTitle }
// type = "pageview_end"    payload: { pageViewId, durationSec, scrollDepth, isBounce }
// type = "event"           payload: { sessionToken, page, eventType, eventName, properties }

export async function POST(req: NextRequest) {
  try {
    const { user, supabase } = await getAuthUser(req);
    const body = await req.json();
    const { type, payload } = body;

    const userId = user?.id ?? null;

    switch (type) {

      // ── Session start ─────────────────────────────────────────────
      case "session_start": {
        const { sessionToken, device, browser, os, timezone, referrer } = payload;

        // Geo from Cloudflare headers (free, no extra API needed)
        const country = req.headers.get("cf-ipcountry") ?? null;
        const city    = req.headers.get("cf-ipcity") ?? null;

        const { data, error } = await supabase
          .from("user_sessions")
          .insert({
            user_id: userId,
            session_token: sessionToken,
            device_type: device,
            browser,
            os,
            timezone,
            referrer,
            country,
            city,
          })
          .select("id")
          .single();

        if (error) throw error;

        // Upsert demographics
        if (userId) {
          await supabase.from("user_demographics").upsert({
            user_id: userId,
            country,
            city,
            timezone,
            device_type: device,
            browser,
            os,
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });

          // Increment total_sessions
          await supabase.rpc("increment_user_sessions", { uid: userId }).maybeSingle();
        }

        return NextResponse.json({ sessionId: data.id });
      }

      // ── Session end ───────────────────────────────────────────────
      case "session_end": {
        const { sessionToken, durationSec } = payload;
        await supabase
          .from("user_sessions")
          .update({ ended_at: new Date().toISOString(), duration_sec: durationSec })
          .eq("session_token", sessionToken);

        if (userId) {
          await supabase
            .from("user_demographics")
            .update({
              last_seen_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
        }
        return NextResponse.json({ ok: true });
      }

      // ── Page view start ───────────────────────────────────────────
      case "pageview_start": {
        const { sessionToken, page, pageTitle } = payload;

        // Resolve session ID from token
        const { data: session } = await supabase
          .from("user_sessions")
          .select("id")
          .eq("session_token", sessionToken)
          .maybeSingle();

        const { data, error } = await supabase
          .from("page_views")
          .insert({
            session_id: session?.id ?? null,
            user_id: userId,
            page,
            page_title: pageTitle,
          })
          .select("id")
          .single();

        if (error) throw error;
        return NextResponse.json({ pageViewId: data.id });
      }

      // ── Page view end ─────────────────────────────────────────────
      case "pageview_end": {
        const { pageViewId, durationSec, scrollDepth, isBounce } = payload;
        await supabase
          .from("page_views")
          .update({
            exited_at: new Date().toISOString(),
            duration_sec: durationSec,
            scroll_depth: scrollDepth ?? 0,
            is_bounce: isBounce ?? false,
          })
          .eq("id", pageViewId);

        return NextResponse.json({ ok: true });
      }

      // ── Custom event ──────────────────────────────────────────────
      case "event": {
        const { sessionToken, page, eventType, eventName, properties } = payload;

        const { data: session } = await supabase
          .from("user_sessions")
          .select("id")
          .eq("session_token", sessionToken)
          .maybeSingle();

        await supabase.from("user_events").insert({
          session_id: session?.id ?? null,
          user_id: userId,
          page,
          event_type: eventType,
          event_name: eventName,
          properties: properties ?? {},
        });

        return NextResponse.json({ ok: true });
      }

      default:
        return NextResponse.json({ error: "Unknown type" }, { status: 400 });
    }
  } catch (err: any) {
    // Never crash  -  analytics should be silent
    console.error("Analytics track error:", err?.message);
    return NextResponse.json({ ok: true });
  }
}

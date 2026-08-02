import { ImageResponse } from "next/og";

/**
 * Social share card, rendered at build/request time by next/og.
 *
 * Kept to plain flex + system fonts on purpose: the OG runtime has no access
 * to the app's CSS variables or the bundled webfonts, so anything fancier
 * silently falls back and looks broken in the preview.
 */
export const runtime = "edge";
export const alt = "TradeX Terminal";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #07090f 0%, #0d1420 55%, #0a1a14 100%)",
          padding: "72px 80px",
          fontFamily: "monospace",
        }}
      >
        {/* Top row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: "#5fc77a",
              boxShadow: "0 0 24px #5fc77a",
            }}
          />
          <div
            style={{
              fontSize: 22,
              letterSpacing: 8,
              color: "#7c8899",
              textTransform: "uppercase",
            }}
          >
            Multi-Agent Market Intelligence
          </div>
        </div>

        {/* Wordmark */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 128,
              fontWeight: 800,
              color: "#ffffff",
              lineHeight: 1,
              letterSpacing: -4,
              display: "flex",
            }}
          >
            TRADEX
          </div>
          <div
            style={{
              fontSize: 128,
              fontWeight: 800,
              color: "#5fc77a",
              lineHeight: 1,
              letterSpacing: -4,
              display: "flex",
            }}
          >
            TERMINAL
          </div>
        </div>

        {/* Bottom row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 26, color: "#9aa7b8", display: "flex", maxWidth: 760 }}>
            Seven agents read trend, price action, news, risk and positioning.
          </div>
          <div style={{ fontSize: 22, color: "#5fc77a", display: "flex" }}>
            tradexterminal.online
          </div>
        </div>
      </div>
    ),
    size
  );
}

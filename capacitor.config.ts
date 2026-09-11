import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "online.tradexterminal.twa",
  appName: "TradeX",
  webDir: "out",
  server: {
    url: "https://tradexterminal.online/m",
    cleartext: false,
    // Google sign-in is a round trip through Google and Supabase before landing
    // back here. Capacitor hands off-origin URLs to the system browser by
    // default, which finishes the flow in a different cookie jar from the one
    // holding the PKCE verifier — so the exchange fails every time. Keeping
    // these hosts in the webview keeps the whole round trip in one jar.
    allowNavigation: [
      "accounts.google.com",
      "*.google.com",
      "*.supabase.co",
      "tradexterminal.online",
    ],
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0a0e1a",
  },
  plugins: {
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0a0e1a",
      overlaysWebView: true,
    },
  },
};

export default config;

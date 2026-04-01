import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.tradex.terminal",
  appName: "TradeX",
  webDir: "out",
  server: {
    url: "https://tradex-ten.vercel.app/m",
    cleartext: false,
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
